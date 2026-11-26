import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { databaseOptions } from '../src/database-options.js';
import { ItemType } from '../src/inventory/entities/item-type.entity.js';
import { InventoryModule } from '../src/inventory/inventory.module.js';
import { SpotPricesService } from '../src/spot-prices/spot-prices.service.js';

afterEach(() => vi.useRealTimers());

it('persists a corrected cost in ledger and valuation while preserving fixed-quote history', async () => {
  const schema = 'ac3_' + randomUUID().replaceAll('-', '');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'));
  const today = new Date();
  const sold = today.toISOString().slice(0, 10);
  const bought = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  const timestamp = Date.parse(bought) / 1000;
  const quote = { timestamp: new Date(timestamp * 1000).toISOString(), currency: 'USD', unit: 'toz', prices: { silver: 40 } };
  if (databaseOptions.type !== 'postgres') throw new Error('Schema isolation requires Postgres');
  const module = await Test.createTestingModule({
    imports: [TypeOrmModule.forRoot({ ...databaseOptions, schema, synchronize: false }), InventoryModule],
  }).overrideProvider(SpotPricesService).useValue({
    getSpotPrices: async () => quote,
    getHistoricalSpotPrices: async () => [{ ts: timestamp, silver: 40 }],
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  const db = app.get(DataSource);
  try {
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    await app.init();
    const http = request(app.getHttpServer());
    const preset = await db.getRepository(ItemType).save({ name: 'Silver coin', metal: 'silver', weight: 1, weight_unit: 'ozt', purity: 1 });
    const purchase = await http.post('/inventory').send({ item_type_id: preset.id, acquisition_date: bought, quantity: 3, total_paid: '100.00' }).expect(201);
    const path = '/inventory/' + purchase.body.id;
    const ledger = path + '/transactions';
    const buyId = (await http.get(ledger).expect(200)).body.transactions[0].id;
    await http.post(path + '/sales').send({ buy_id: buyId, quantity: 1, sale_date: sold }).expect(201);

    const verify = async (receipt: string, gain: number) => {
      const buy = (await http.get(ledger).expect(200)).body.transactions.find((row: { id: string }) => row.id === buyId);
      expect(buy).toMatchObject({ total_paid: receipt, remaining_quantity: 2 });
      const { body: valuation } = await http.get('/inventory/valuation').expect(200);
      expect(valuation).toMatchObject({ totalValue: 80, quote });
      expect(valuation.buyBalances).toHaveLength(1);
      const [balance] = valuation.buyBalances;
      expect(Number(balance.remaining_quantity)).toBe(2);
      for (const row of [buy, balance]) {
        expect(valuation.totalValue - Number(row.remaining_purchase_cost)).toBeCloseTo(gain, 2);
      }
      const { body: history } = await http.get('/inventory/history?range=ALL').expect(200);
      expect(history.points).toMatchObject([
        { date: bought, totalValue: 120, costBasis: receipt, quoteTimestamps: { silver: timestamp } },
        { date: sold, totalValue: 80, quoteTimestamps: { silver: timestamp } },
      ]);
    };
    await verify('100.00', 13.33);
    await http.patch(ledger + '/' + buyId).send({ total_paid: '90.00' }).expect(200);
    await verify('90.00', 20);
  } finally {
    try {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await app.close();
    }
  }
});
