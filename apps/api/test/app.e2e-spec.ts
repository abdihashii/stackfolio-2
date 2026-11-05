import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';

import { ItemType } from '../src/inventory/entities/item-type.entity.js';
import { Item } from '../src/inventory/entities/item.entity.js';
import { Transaction } from '../src/inventory/entities/transaction.entity.js';
import { SpotPricesService } from '../src/spot-prices/spot-prices.service.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const quote = {
    timestamp: '2026-01-01T00:00:00.000Z',
    currency: 'USD',
    unit: 'toz',
    prices: { gold: 2000, silver: 25 },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SpotPricesService)
      .useValue({ getSpotPrices: async () => quote })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('keeps two buys under one item and calculates its quantity from transactions', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const preset = await itemTypes.save({
      name: 'Inventory regression test',
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });

    try {
      const first = await request(app.getHttpServer())
        .post('/inventory')
        .send({
          item_type_id: preset.id,
          quantity: 3,
          acquisition_date: '2026-01-10',
        })
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/inventory')
        .send({
          item_type_id: preset.id,
          quantity: 2,
          acquisition_date: '2026-03-10',
        })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);
      expect(await items.countBy({ item_type: { id: preset.id } })).toBe(1);
      const inventory = await request(app.getHttpServer()).get('/inventory').expect(200);
      expect(inventory.body.inventory.filter((item: { id: string }) => item.id === first.body.id)).toEqual([
        expect.objectContaining({
          id: first.body.id,
          quantity: 5,
          item_type: expect.objectContaining({ id: preset.id }),
        }),
      ]);
      const buys = await transactions.find({
        where: { item: { id: first.body.id } },
        order: { effective_date: 'ASC' },
      });
      expect(buys.map(({ type, quantity, effective_date }) => ({ type, quantity, effective_date }))).toEqual([
        { type: 'buy', quantity: 3, effective_date: '2026-01-10' },
        { type: 'buy', quantity: 2, effective_date: '2026-03-10' },
      ]);
    } finally {
      for (const item of await items.findBy({ item_type: { id: preset.id } })) {
        await transactions.delete({ item: { id: item.id } });
        await items.delete(item.id);
      }
      await itemTypes.delete(preset.id);
    }
  });

  it.each([
    { label: 'converts grams to troy ounces without multiplying purity again', count: 1, unit: 'gram' as const, weight: 31.1034768, quantity: 2, metal: 'gold' as const, expected: 4000 },
    { label: 'values inventory across more than one page', count: 13, unit: 'ozt' as const, weight: 1, quantity: 1, metal: 'silver' as const, expected: 325 },
  ])('$label', async ({ count, unit, weight, quantity, metal, expected }) => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const presetIds: string[] = [];
    const itemIds: string[] = [];
    const baseline = await request(app.getHttpServer()).get('/inventory/valuation').expect(200);

    try {
      for (let index = 0; index < count; index++) {
        const preset = await itemTypes.save({
          name: `Valuation test ${randomUUID()}`,
          metal,
          weight,
          weight_unit: unit,
          purity: 0.9167,
        });
        presetIds.push(preset.id);
        const item = await items.save({ item_type: preset, acquisition_date: '2026-01-01' });
        itemIds.push(item.id);
        await transactions.save({ item, type: 'buy', quantity, effective_date: '2026-01-01' });
      }

      const valuation = await request(app.getHttpServer()).get('/inventory/valuation').expect(200);
      expect(valuation.body.totalValue - baseline.body.totalValue).toBeCloseTo(expected, 6);
      expect(valuation.body.quote).toEqual(quote);

      if (count > 12) {
        const firstPage = await request(app.getHttpServer()).get('/inventory?page=1').expect(200);
        expect(firstPage.body.inventory).toHaveLength(12);
        const seenIds = new Set<string>();
        for (let page = 1; page <= Math.ceil(firstPage.body.total / 12); page++) {
          const response = page === 1
            ? firstPage
            : await request(app.getHttpServer()).get(`/inventory?page=${page}`).expect(200);
          for (const item of response.body.inventory) {
            expect(seenIds.has(item.id)).toBe(false);
            seenIds.add(item.id);
          }
        }
        for (const id of itemIds) expect(seenIds.has(id)).toBe(true);
      }
    } finally {
      for (const id of itemIds) {
        await transactions.delete({ item: { id } });
        await items.delete(id);
      }
      for (const id of presetIds) await itemTypes.delete(id);
    }
  });

  afterEach(async () => {
    await app.close();
  });
});
