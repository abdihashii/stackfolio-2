import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Repository } from 'typeorm';

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
  const getHistoricalSpotPrices = vi.fn(async () => [{ ts: Date.UTC(2026, 0, 1) / 1000, ...quote.prices }]);

  beforeEach(async () => {
    getHistoricalSpotPrices.mockClear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SpotPricesService)
      .useValue({ getSpotPrices: async () => quote, getHistoricalSpotPrices })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('values transactions beyond the first page with one historical price fetch', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const today = new Date().toISOString().slice(0, 10);
    const path = '/inventory/history?range=30D';
    const baseline = await request(app.getHttpServer()).get(path).expect(200);
    getHistoricalSpotPrices.mockClear();

    const preset = await itemTypes.save({
      name: `History test ${randomUUID()}`,
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });

    try {
      const item = await items.save({ item_type: preset });
      await transactions.save(
        [1, 2, 3].map((quantity) => ({ item, type: 'buy' as const, quantity, effective_date: today })),
      );

      const firstPage = await request(app.getHttpServer()).get(`/inventory/${item.id}/transactions`).expect(200);
      expect(firstPage.body.total).toBe(3);
      expect(firstPage.body.transactions).toHaveLength(2);

      const history = await request(app.getHttpServer()).get(path).expect(200);
      const before = baseline.body.points.find((point: { date: string }) => point.date === today);
      const after = history.body.points.find((point: { date: string }) => point.date === today);
      expect(after.totalValue - (before?.totalValue ?? 0)).toBeCloseTo(150, 6);
      expect(getHistoricalSpotPrices).toHaveBeenCalledTimes(1);
    } finally {
      await items.delete({ item_type: { id: preset.id } });
      await itemTypes.delete(preset.id);
    }
  });

  it('returns empty history without fetching prices for an empty stack', async () => {
    const transactions = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    vi.spyOn(transactions, 'find').mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/inventory/history')
      .expect(200)
      .expect({ currency: 'USD', range: 'ALL', points: [] });
    expect(getHistoricalSpotPrices).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'quoted', pricesAvailable: true, buyValue: 25 },
    { label: 'unquoted', pricesAvailable: false, buyValue: null },
  ])('preserves $label history and returns zero after full liquidation', async ({ pricesAvailable, buyValue }) => {
    const transactions = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    const item = { id: randomUUID(), item_type: { metal: 'silver' as const, weight: 1, weight_unit: 'ozt' as const } };
    const buy = transactions.create({ item, type: 'buy', quantity: 1, effective_date: '2026-01-01' });
    const sale = transactions.create({ item, type: 'sell', quantity: 1, effective_date: '2026-01-02' });
    vi.spyOn(transactions, 'find').mockResolvedValueOnce([buy, sale]);
    if (!pricesAvailable) getHistoricalSpotPrices.mockResolvedValueOnce([]);

    const history = await request(app.getHttpServer()).get('/inventory/history?range=ALL').expect(200);
    expect(history.body.points[0]).toMatchObject({ date: '2026-01-01', totalValue: buyValue });
    expect(history.body.points[1]).toMatchObject({ date: '2026-01-02', totalValue: 0 });
    expect(history.body.points.slice(1).every((point: { totalValue: number | null }) => point.totalValue === 0)).toBe(
      true,
    );
  });

  it('reflects inventory mutations in the next history response', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    now.setUTCDate(now.getUTCDate() - 1);
    const yesterday = now.toISOString().slice(0, 10);
    const historyValues = async () => {
      const history = await request(app.getHttpServer()).get('/inventory/history?range=30D').expect(200);
      const points: { date: string; totalValue: number | null }[] = history.body.points;
      if (points.length === 0) return [0, 0];
      return [yesterday, today].map((date) => {
        const totalValue = points.find((point) => point.date === date)?.totalValue;
        expect(typeof totalValue).toBe('number');
        return totalValue!;
      });
    };
    const baseline = await historyValues();
    const expectChange = async (yesterdayDelta: number, todayDelta: number) => {
      const values = await historyValues();
      expect(values[0] - baseline[0]).toBeCloseTo(yesterdayDelta, 6);
      expect(values[1] - baseline[1]).toBeCloseTo(todayDelta, 6);
    };
    const preset = await itemTypes.save({
      name: `History mutation test ${randomUUID()}`,
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });

    try {
      const purchase = await request(app.getHttpServer())
        .post('/inventory')
        .send({ item_type_id: preset.id, quantity: 3, acquisition_date: yesterday })
        .expect(201);
      const itemId: string = purchase.body.id;
      const buy = await transactions.findOneByOrFail({ item: { id: itemId }, type: 'buy' });
      await expectChange(75, 75);

      const sale = await request(app.getHttpServer())
        .post(`/inventory/${itemId}/sales`)
        .send({ buy_id: buy.id, quantity: 1, sale_date: today })
        .expect(201);
      const salePath = `/inventory/${itemId}/transactions/${sale.body.id}`;
      await expectChange(75, 50);

      await request(app.getHttpServer()).patch(salePath).send({ quantity: 2 }).expect(200);
      await expectChange(75, 25);

      await request(app.getHttpServer()).patch(salePath).send({ quantity: 4 }).expect(400);
      await expectChange(75, 25);

      await request(app.getHttpServer()).delete(salePath).expect(200);
      await expectChange(75, 75);

      await request(app.getHttpServer()).delete(`/inventory/${itemId}`).expect(200);
      await expectChange(0, 0);
    } finally {
      await items.delete({ item_type: { id: preset.id } });
      await itemTypes.delete(preset.id);
    }
  });

  it('deletes sales before their purchase and preserves unrelated transactions', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const preset = await itemTypes.save({
      name: `Transaction deletion test ${randomUUID()}`,
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });
    const presetIds = [preset.id];
    try {
      const item = await items.save({ item_type: preset });
      const otherPreset = await itemTypes.save({
        name: `Unrelated deletion test ${randomUUID()}`,
        metal: 'silver',
        weight: 1,
        weight_unit: 'ozt',
        purity: 0.999,
      });
      presetIds.push(otherPreset.id);
      const otherItem = await items.save({ item_type: otherPreset });
      const buy = await transactions.save({ item, type: 'buy', quantity: 5, effective_date: '2025-04-02' });
      const sale = await transactions.save({ item, buy, type: 'sell', quantity: 3, effective_date: '2025-04-04' });
      const unrelated = await transactions.save({
        item: otherItem,
        type: 'buy',
        quantity: 7,
        effective_date: '2025-04-02',
      });
      const before = await transactions.find({ where: { item: { id: item.id } }, order: { id: 'ASC' } });
      const buyPath = `/inventory/${item.id}/transactions/${buy.id}`;
      const salePath = `/inventory/${item.id}/transactions/${sale.id}`;

      const rejected = await request(app.getHttpServer()).delete(buyPath).expect(400);
      expect(rejected.body.message).toBe('Sales must be deleted first.');
      for (const [path, status] of [
        [`/inventory/${otherItem.id}/transactions/${sale.id}`, 404],
        [`/inventory/${item.id}/transactions/${randomUUID()}`, 404],
        [`/inventory/invalid/transactions/${sale.id}`, 400],
        [`/inventory/${item.id}/transactions/invalid`, 400],
      ] as const) {
        await request(app.getHttpServer()).delete(path).expect(status);
      }
      expect(await transactions.find({ where: { item: { id: item.id } }, order: { id: 'ASC' } })).toEqual(before);

      const deletedSale = await request(app.getHttpServer()).delete(salePath).expect(200);
      expect(deletedSale.body.affected).toBe(1);
      expect(await transactions.findOneBy({ id: sale.id })).toBeNull();
      const history = await request(app.getHttpServer()).get(`/inventory/${item.id}/transactions`).expect(200);
      expect(history.body.transactions).toEqual([
        expect.objectContaining({ id: buy.id, quantity: 5, remaining_quantity: 5 }),
      ]);
      await request(app.getHttpServer()).delete(salePath).expect(404);

      const deletedBuy = await request(app.getHttpServer()).delete(buyPath).expect(200);
      expect(deletedBuy.body.affected).toBe(1);
      expect(await transactions.countBy({ item: { id: item.id } })).toBe(0);
      expect(await items.existsBy({ id: item.id })).toBe(true);
      await request(app.getHttpServer()).delete(buyPath).expect(404);
      expect(await transactions.findOneByOrFail({ id: unrelated.id })).toEqual(
        expect.objectContaining({
          id: unrelated.id,
          quantity: 7,
          effective_date: unrelated.effective_date,
          created_at: unrelated.created_at,
        }),
      );
    } finally {
      for (const presetId of presetIds) {
        for (const item of await items.findBy({ item_type: { id: presetId } })) {
          await transactions.delete({ item: { id: item.id } });
          await items.delete(item.id);
        }
        await itemTypes.delete(presetId);
      }
    }
  });

  it('persists buy and sale corrections and leaves rejected edits unchanged', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const preset = await itemTypes.save({
      name: `Sale edit test ${randomUUID()}`,
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });

    try {
      const buyResponse = await request(app.getHttpServer())
        .post('/inventory')
        .send({ item_type_id: preset.id, quantity: 5, acquisition_date: '2026-01-10' })
        .expect(201);
      const buy = await transactions.findOneByOrFail({
        item: { id: buyResponse.body.id },
        type: 'buy',
      });
      const saleResponse = await request(app.getHttpServer())
        .post(`/inventory/${buyResponse.body.id}/sales`)
        .send({ buy_id: buy.id, quantity: 2, sale_date: '2026-01-11' })
        .expect(201);
      const sale = await transactions.findOneOrFail({
        where: { id: saleResponse.body.id },
        relations: { buy: true, item: true },
      });

      expect(buy.quantity).toBe(5);
      expect(sale.quantity).toBe(2);
      expect(sale.buy?.id).toBe(buy.id);
      expect(sale.item.id).toBe(buyResponse.body.id);
      await request(app.getHttpServer())
        .patch(`/inventory/${buyResponse.body.id}/transactions/${sale.id}`)
        .send({ quantity: 3, effective_date: '2026-01-12' })
        .expect(200);

      const updatedSale = await transactions.findOneOrFail({
        where: { id: sale.id },
        relations: { buy: true, item: true },
      });
      expect(updatedSale.quantity).toBe(3);
      expect(updatedSale.effective_date).toBe('2026-01-12');
      expect(updatedSale.id).toBe(sale.id);
      expect(updatedSale.buy?.id).toBe(sale.buy?.id);
      expect(updatedSale.item.id).toBe(sale.item.id);
      expect(updatedSale.created_at).toEqual(sale.created_at);

      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      for (const changes of [
        { quantity: 6, effective_date: '2026-01-13' },
        { quantity: 1, effective_date: '2026-01-09' },
        { effective_date: tomorrow.toISOString().slice(0, 10) },
        { quantity: null },
        { quantity: 0 },
        { quantity: 1.5 },
        { quantity: '3' },
        { effective_date: null },
        { effective_date: '2026-02-30' },
        { effective_date: '2026-01-12T00:00:00Z' },
        { buy_id: randomUUID() },
      ]) {
        await request(app.getHttpServer())
          .patch(`/inventory/${buyResponse.body.id}/transactions/${sale.id}`)
          .send(changes)
          .expect(400);
        expect(
          await transactions.findOneOrFail({
            where: { id: sale.id },
            relations: { buy: true, item: true },
          }),
        ).toEqual(updatedSale);
      }

      for (const changes of [
        { quantity: 2, effective_date: '2026-01-09' },
        { quantity: 6, effective_date: '2026-01-13' },
        { effective_date: tomorrow.toISOString().slice(0, 10) },
      ]) {
        await request(app.getHttpServer())
          .patch(`/inventory/${buyResponse.body.id}/transactions/${buy.id}`)
          .send(changes)
          .expect(400);
        expect(await transactions.findOneByOrFail({ id: buy.id })).toEqual(buy);
      }

      await request(app.getHttpServer())
        .patch(`/inventory/${buyResponse.body.id}/transactions/${buy.id}`)
        .send({ quantity: 4, effective_date: '2026-01-11' })
        .expect(200);
      expect(await transactions.findOneByOrFail({ id: buy.id })).toEqual({
        id: buy.id,
        type: buy.type,
        created_at: buy.created_at,
        quantity: 4,
        effective_date: '2026-01-11',
      });

      await request(app.getHttpServer())
        .patch(`/inventory/${buyResponse.body.id}/transactions/${sale.id}`)
        .send({ effective_date: '2026-01-11' })
        .expect(200);
      expect(
        await transactions.findOneOrFail({
          where: { id: sale.id },
          relations: { buy: true, item: true },
        }),
      ).toEqual({
        id: updatedSale.id,
        type: updatedSale.type,
        quantity: updatedSale.quantity,
        created_at: updatedSale.created_at,
        item: updatedSale.item,
        effective_date: '2026-01-11',
        buy: expect.objectContaining({ id: buy.id, quantity: 4, effective_date: '2026-01-11' }),
      });

      await request(app.getHttpServer())
        .patch(`/inventory/${buyResponse.body.id}/transactions/${sale.id}`)
        .send({ quantity: 4 })
        .expect(200);
      expect(await transactions.findOneByOrFail({ id: sale.id })).toEqual(
        expect.objectContaining({
          quantity: 4,
          effective_date: '2026-01-11',
          created_at: sale.created_at,
        }),
      );
      await request(app.getHttpServer())
        .patch(`/inventory/${buyResponse.body.id}/transactions/${buy.id}`)
        .send({ effective_date: '2026-01-10' })
        .expect(200);
      expect(await transactions.findOneByOrFail({ id: buy.id })).toEqual({
        id: buy.id,
        type: buy.type,
        created_at: buy.created_at,
        effective_date: buy.effective_date,
        quantity: 4,
      });
      expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(2);
    } finally {
      for (const item of await items.findBy({ item_type: { id: preset.id } })) {
        await transactions.delete({ item: { id: item.id } });
        await items.delete(item.id);
      }
      await itemTypes.delete(preset.id);
    }
  });

  it('records partial and full sales while retaining the item and its history', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const preset = await itemTypes.save({
      name: `Sale test ${randomUUID()}`,
      metal: 'silver',
      weight: 1,
      weight_unit: 'ozt',
      purity: 0.999,
    });

    try {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      await request(app.getHttpServer())
        .post('/inventory')
        .send({ item_type_id: preset.id, quantity: 5, acquisition_date: tomorrow.toISOString().slice(0, 10) })
        .expect(400);
      expect(await items.countBy({ item_type: { id: preset.id } })).toBe(0);
      expect(await transactions.countBy({ item: { item_type: { id: preset.id } } })).toBe(0);

      const buyResponse = await request(app.getHttpServer())
        .post('/inventory')
        .send({
          item_type_id: preset.id,
          quantity: 5,
          acquisition_date: '2026-01-10',
        })
        .expect(201);

      expect(await items.existsBy({ id: buyResponse.body.id, item_type: { id: preset.id } })).toBe(true);
      const buy = await transactions.findOneByOrFail({
        item: { id: buyResponse.body.id },
        type: 'buy',
      });
      expect(buy.quantity).toBe(5);

      const validSale = { buy_id: buy.id, quantity: 1, sale_date: '2026-01-10' };
      for (const invalidFields of [
        { quantity: 0 },
        { quantity: -1 },
        { quantity: 1.5 },
        { quantity: 2147483648 },
        { quantity: '1' },
        { quantity: null },
        { quantity: undefined },
        { buy_id: 'invalid' },
        { buy_id: null },
        { buy_id: undefined },
        { sale_date: '2026-02-30' },
        { sale_date: '2026-01-10T00:00:00Z' },
        { sale_date: 'invalid' },
        { sale_date: null },
        { sale_date: undefined },
        { unexpected: true },
      ]) {
        await request(app.getHttpServer())
          .post(`/inventory/${buyResponse.body.id}/sales`)
          .send({ ...validSale, ...invalidFields })
          .expect(400);
        expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(1);
      }
      await request(app.getHttpServer()).post('/inventory/invalid/sales').send(validSale).expect(400);
      expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(1);

      const otherPreset = await itemTypes.save({
        name: `Other sale test ${randomUUID()}`,
        metal: 'silver',
        weight: 1,
        weight_unit: 'ozt',
        purity: 0.999,
      });
      try {
        const otherBuyResponse = await request(app.getHttpServer())
          .post('/inventory')
          .send({ item_type_id: otherPreset.id, quantity: 5, acquisition_date: '2026-01-10' })
          .expect(201);
        const otherBuy = await transactions.findOneByOrFail({
          item: { id: otherBuyResponse.body.id },
          type: 'buy',
        });

        await request(app.getHttpServer())
          .post(`/inventory/${buyResponse.body.id}/sales`)
          .send({ buy_id: otherBuy.id, quantity: 1, sale_date: '2026-01-10' })
          .expect(404);
        expect(await transactions.findBy({ item: { id: buyResponse.body.id } })).toEqual([buy]);
        expect(await transactions.findBy({ item: { id: otherBuyResponse.body.id } })).toEqual([otherBuy]);
      } finally {
        for (const item of await items.findBy({ item_type: { id: otherPreset.id } })) {
          await transactions.delete({ item: { id: item.id } });
          await items.delete(item.id);
        }
        await itemTypes.delete(otherPreset.id);
      }

      for (const sale_date of ['2026-01-09', tomorrow.toISOString().slice(0, 10)]) {
        await request(app.getHttpServer())
          .post(`/inventory/${buyResponse.body.id}/sales`)
          .send({ buy_id: buy.id, quantity: 1, sale_date })
          .expect(400);
        expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(1);
      }

      const saleResponse = await request(app.getHttpServer())
        .post(`/inventory/${buyResponse.body.id}/sales`)
        .send({
          buy_id: buy.id,
          quantity: 2,
          sale_date: '2026-01-10',
        })
        .expect(201);

      expect(saleResponse.body.quantity).toBe(2);

      const sale = await transactions.findOneOrFail({
        where: { id: saleResponse.body.id },
        relations: { buy: true, item: true },
      });

      expect(sale.type).toBe('sell');
      expect(sale.quantity).toBe(2);
      expect(sale.effective_date).toBe('2026-01-10');
      expect(sale.buy?.id).toBe(buy.id);
      expect(sale.item.id).toBe(buyResponse.body.id);

      const buyEditPath = `/inventory/${buyResponse.body.id}/transactions/${buy.id}`;
      await request(app.getHttpServer()).patch(buyEditPath).send({ quantity: 1 }).expect(400);
      expect((await transactions.findOneByOrFail({ id: buy.id })).quantity).toBe(5);
      for (const quantity of [2, 5]) {
        await request(app.getHttpServer()).patch(buyEditPath).send({ quantity }).expect(200);
        expect((await transactions.findOneByOrFail({ id: buy.id })).quantity).toBe(quantity);
        expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(2);
        expect(await transactions.findOneByOrFail({ id: sale.id })).toEqual(
          expect.objectContaining({ type: 'sell', quantity: 2, effective_date: '2026-01-10' }),
        );
      }

      for (const [buy_id, status] of [
        [randomUUID(), 404],
        [sale.id, 400],
      ] as const) {
        await request(app.getHttpServer())
          .post(`/inventory/${buyResponse.body.id}/sales`)
          .send({ buy_id, quantity: 1, sale_date: '2026-01-10' })
          .expect(status);
        expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(2);
      }

      const firstPage = await request(app.getHttpServer()).get('/inventory?limit=100').expect(200);
      let remainingItem = firstPage.body.inventory.find((item: { id: string }) => item.id === buyResponse.body.id);
      for (let page = 2; !remainingItem && page <= Math.ceil(firstPage.body.total / 100); page++) {
        const response = await request(app.getHttpServer()).get(`/inventory?page=${page}&limit=100`).expect(200);
        remainingItem = response.body.inventory.find((item: { id: string }) => item.id === buyResponse.body.id);
      }
      expect(remainingItem).toEqual(expect.objectContaining({ id: buyResponse.body.id, quantity: 3 }));

      await request(app.getHttpServer())
        .post(`/inventory/${buyResponse.body.id}/sales`)
        .send({ buy_id: buy.id, quantity: 4, sale_date: '2026-01-10' })
        .expect(400);
      expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(2);

      const finalSaleResponse = await request(app.getHttpServer())
        .post(`/inventory/${buyResponse.body.id}/sales`)
        .send({ buy_id: buy.id, quantity: 3, sale_date: '2026-01-10' })
        .expect(201);

      const soldOutPage = await request(app.getHttpServer()).get('/inventory?limit=100').expect(200);
      let soldOutItem = soldOutPage.body.inventory.find((item: { id: string }) => item.id === buyResponse.body.id);
      for (let page = 2; !soldOutItem && page <= Math.ceil(soldOutPage.body.total / 100); page++) {
        const response = await request(app.getHttpServer()).get(`/inventory?page=${page}&limit=100`).expect(200);
        soldOutItem = response.body.inventory.find((item: { id: string }) => item.id === buyResponse.body.id);
      }
      expect(soldOutItem).toEqual(expect.objectContaining({ id: buyResponse.body.id, quantity: 0 }));
      expect(await items.existsBy({ id: buyResponse.body.id })).toBe(true);

      const history = await request(app.getHttpServer())
        .get(`/inventory/${buyResponse.body.id}/transactions`)
        .expect(200);
      const nextHistoryPage = await request(app.getHttpServer())
        .get(`/inventory/${buyResponse.body.id}/transactions?page=2`)
        .expect(200);
      expect(history.body.total).toBe(3);
      expect(nextHistoryPage.body.total).toBe(3);
      expect([...history.body.transactions, ...nextHistoryPage.body.transactions]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: buy.id, type: 'buy', quantity: 5 }),
          expect.objectContaining({ id: sale.id, type: 'sell', quantity: 2 }),
          expect.objectContaining({ id: finalSaleResponse.body.id, type: 'sell', quantity: 3 }),
        ]),
      );

      await request(app.getHttpServer())
        .post(`/inventory/${buyResponse.body.id}/sales`)
        .send({ buy_id: buy.id, quantity: 1, sale_date: '2026-01-10' })
        .expect(400);
      expect(await transactions.countBy({ item: { id: buyResponse.body.id } })).toBe(3);
    } finally {
      for (const item of await items.findBy({ item_type: { id: preset.id } })) {
        await transactions.delete({ item: { id: item.id } });
        await items.delete(item.id);
      }
      await itemTypes.delete(preset.id);
    }
  });

  it.each(['sale', 'buy edit', 'sale edit', 'buy deletion'])(
    'serializes a sale competing with another %s against the same buy',
    async (competitor) => {
      const database = app.get(DataSource);
      const itemTypes = database.getRepository(ItemType);
      const items = database.getRepository(Item);
      const transactions = database.getRepository(Transaction);
      const preset = await itemTypes.save({
        name: `Concurrent sale test ${randomUUID()}`,
        metal: 'silver',
        weight: 1,
        weight_unit: 'ozt',
        purity: 0.999,
      });
      try {
        const item = await items.save({ item_type: preset, acquisition_date: '2026-01-10' });
        const buy = await transactions.save({ item, type: 'buy', quantity: 5, effective_date: '2026-01-10' });
        const existingSale =
          competitor === 'sale edit'
            ? await transactions.save({ item, buy, type: 'sell', quantity: 1, effective_date: '2026-01-10' })
            : undefined;
        const blocker = database.createQueryRunner();
        await blocker.connect();
        try {
          await blocker.startTransaction();
          await blocker.manager.getRepository(Transaction).findOneOrFail({
            where: { id: buy.id },
            lock: { mode: 'pessimistic_write' },
          });
          const [{ pid }] = await blocker.query('SELECT pg_backend_pid() AS pid');
          const competingRequest =
            competitor === 'buy deletion'
              ? request(app.getHttpServer()).delete(`/inventory/${item.id}/transactions/${buy.id}`)
              : competitor === 'sale'
                ? request(app.getHttpServer())
                    .post(`/inventory/${item.id}/sales`)
                    .send({ buy_id: buy.id, quantity: 3, sale_date: '2026-01-10' })
                : request(app.getHttpServer())
                    .patch(`/inventory/${item.id}/transactions/${existingSale?.id ?? buy.id}`)
                    .send({ quantity: existingSale ? 3 : 2 });
          const responses = Promise.allSettled([
            request(app.getHttpServer())
              .post(`/inventory/${item.id}/sales`)
              .send({ buy_id: buy.id, quantity: 3, sale_date: '2026-01-10' }),
            competingRequest,
          ]);
          try {
            // Prove both requests overlap at the database before releasing the buy lock.
            let waiting = 0;
            const deadline = Date.now() + 3000;
            while (waiting < 2 && Date.now() < deadline) {
              const [result] = await database.query(
                `WITH RECURSIVE blocked(pid) AS (
                SELECT pid FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))
                UNION
                SELECT activity.pid FROM pg_stat_activity activity
                JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
              ) SELECT COUNT(*)::int AS waiting FROM blocked`,
                [pid],
              );
              waiting = result.waiting;
              if (waiting < 2) await new Promise((resolve) => setTimeout(resolve, 10));
            }
            expect(waiting).toBe(2);
          } finally {
            await blocker.rollbackTransaction();
            await responses;
          }
          const statuses = (await responses).map((response) => {
            if (response.status === 'rejected') throw response.reason;
            return response.value.status;
          });
          if (competitor === 'buy deletion') {
            expect([
              [201, 400],
              [404, 200],
            ]).toContainEqual(statuses);
            const deletionWon = statuses[1] === 200;
            expect(await transactions.existsBy({ id: buy.id })).toBe(!deletionWon);
            expect(await transactions.countBy({ item: { id: item.id } })).toBe(deletionWon ? 0 : 2);
            expect(await items.existsBy({ id: item.id })).toBe(true);
            return;
          }
          if (competitor === 'sale') {
            expect(statuses.sort((a, b) => a - b)).toEqual([201, 400]);
          } else {
            // Either serial order is valid; accepting both would leave more sold than bought.
            expect([
              [201, 400],
              [400, 200],
            ]).toContainEqual(statuses);
          }
          const editWon = competitor === 'buy edit' && statuses[1] === 200;
          if (existingSale) {
            const saleEditWon = statuses[1] === 200;
            expect(await transactions.findOneByOrFail({ id: existingSale.id })).toEqual({
              id: existingSale.id,
              type: 'sell',
              quantity: saleEditWon ? 3 : 1,
              effective_date: existingSale.effective_date,
              created_at: existingSale.created_at,
            });
            const sales = await transactions.findBy({ buy: { id: buy.id } });
            expect(sales).toHaveLength(saleEditWon ? 1 : 2);
            expect(sales.reduce((total, sale) => total + sale.quantity, 0)).toBe(saleEditWon ? 3 : 4);
            expect(await transactions.findOneByOrFail({ id: buy.id })).toEqual(
              expect.objectContaining({ quantity: 5 }),
            );
          } else {
            expect(await transactions.findBy({ buy: { id: buy.id } })).toEqual(
              editWon ? [] : [expect.objectContaining({ type: 'sell', quantity: 3 })],
            );
            expect((await transactions.findOneByOrFail({ id: buy.id })).quantity).toBe(editWon ? 2 : 5);
            expect(await transactions.countBy({ item: { id: item.id } })).toBe(editWon ? 1 : 2);
          }
        } finally {
          if (blocker.isTransactionActive) await blocker.rollbackTransaction();
          await blocker.release();
        }
      } finally {
        for (const item of await items.findBy({ item_type: { id: preset.id } })) {
          await transactions.delete({ item: { id: item.id } });
          await items.delete(item.id);
        }
        await itemTypes.delete(preset.id);
      }
    },
    10000,
  );

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
    {
      label: 'converts grams to troy ounces without multiplying purity again',
      count: 1,
      unit: 'gram' as const,
      weight: 31.1034768,
      quantity: 2,
      metal: 'gold' as const,
      expected: 4000,
    },
    {
      label: 'values inventory across more than one page',
      count: 13,
      unit: 'ozt' as const,
      weight: 1,
      quantity: 1,
      metal: 'silver' as const,
      expected: 325,
    },
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
          const response =
            page === 1 ? firstPage : await request(app.getHttpServer()).get(`/inventory?page=${page}`).expect(200);
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

  it('paginates inventory with custom limits and transactions without overlap or cross-item leakage', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const presetIds: string[] = [];
    const fixtures: Item[] = [];

    try {
      for (let index = 0; index < 3; index++) {
        const preset = await itemTypes.save({
          name: `Pagination test ${randomUUID()}`,
          metal: 'silver',
          weight: 1,
          weight_unit: 'ozt',
          purity: 0.999,
        });
        presetIds.push(preset.id);
        fixtures.push(
          await items.save({
            item_type: preset,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          }),
        );
      }
      const buys: Transaction[] = [];
      for (const [effective_date, created_at] of [
        ['2026-01-01', '2026-03-01T00:00:00.000Z'],
        ['2026-02-01', '2026-02-01T00:00:00.000Z'],
        ['2026-02-01', '2026-02-02T00:00:00.000Z'],
        ['2026-02-01', '2026-02-02T00:00:00.000Z'],
        ['2026-02-01', '2026-02-02T00:00:00.000Z'],
      ]) {
        buys.push(
          await transactions.save({
            item: fixtures[0],
            type: 'buy',
            quantity: 1,
            effective_date,
            created_at: new Date(created_at),
          }),
        );
      }
      const unrelated = await transactions.save({
        item: fixtures[1],
        type: 'buy',
        quantity: 7,
        effective_date: '2026-12-01',
      });

      // Include existing local inventory without modifying it or assuming its size.
      const expectedItems = await items.find({ order: { created_at: 'DESC', id: 'DESC' } });
      const seenItems: string[] = [];
      for (let page = 1; page <= Math.ceil(expectedItems.length / 2); page++) {
        const response = await request(app.getHttpServer()).get(`/inventory?page=${page}&limit=2`).expect(200);
        expect(response.body.total).toBe(expectedItems.length);
        expect(response.body.inventory.map((item: Item) => item.id)).toEqual(
          expectedItems.slice((page - 1) * 2, page * 2).map((item) => item.id),
        );
        for (const item of response.body.inventory) {
          seenItems.push(item.id);
          if (item.id === fixtures[0].id) expect(item.quantity).toBe(5);
          if (item.id === fixtures[1].id) expect(item.quantity).toBe(7);
          if (item.id === fixtures[2].id) expect(item.quantity).toBe(0);
        }
      }
      expect(new Set(seenItems).size).toBe(expectedItems.length);
      await request(app.getHttpServer())
        .get(`/inventory?page=${expectedItems.length + 1}&limit=2`)
        .expect(200)
        .expect({ inventory: [], total: expectedItems.length });

      const expectedBuys = [...buys].sort(
        (a, b) =>
          b.effective_date.localeCompare(a.effective_date) ||
          b.created_at.getTime() - a.created_at.getTime() ||
          b.id.localeCompare(a.id),
      );
      const seenTransactions: string[] = [];
      for (let page = 1; page <= 3; page++) {
        const query = page === 1 ? '' : `?page=${page}`;
        const response = await request(app.getHttpServer())
          .get(`/inventory/${fixtures[0].id}/transactions${query}`)
          .expect(200);
        expect(response.body.total).toBe(5);
        const ids = response.body.transactions.map((transaction: Transaction) => transaction.id);
        expect(ids).toEqual(expectedBuys.slice((page - 1) * 2, page * 2).map((transaction) => transaction.id));
        seenTransactions.push(...ids);
      }
      expect(new Set(seenTransactions).size).toBe(5);
      await request(app.getHttpServer())
        .get(`/inventory/${fixtures[0].id}/transactions?page=4`)
        .expect(200)
        .expect({ transactions: [], total: 5 });
      const otherPage = await request(app.getHttpServer()).get(`/inventory/${fixtures[1].id}/transactions`).expect(200);
      expect(otherPage.body.total).toBe(1);
      expect(otherPage.body.transactions.map((transaction: Transaction) => transaction.id)).toEqual([unrelated.id]);
      await request(app.getHttpServer())
        .get(`/inventory/${fixtures[2].id}/transactions`)
        .expect(200)
        .expect({ transactions: [], total: 0 });
    } finally {
      for (const item of fixtures) {
        await transactions.delete({ item: { id: item.id } });
        await items.delete(item.id);
      }
      for (const id of presetIds) await itemTypes.delete(id);
    }
  });

  it('deletes an item and all its transactions while preserving unrelated records and item types', async () => {
    const database = app.get(DataSource);
    const itemTypes = database.getRepository(ItemType);
    const items = database.getRepository(Item);
    const transactions = database.getRepository(Transaction);
    const presetIds: string[] = [];
    const fixtures: Item[] = [];

    try {
      for (let index = 0; index < 2; index++) {
        const preset = await itemTypes.save({
          name: `Cascade test ${randomUUID()}`,
          metal: 'silver',
          weight: 1,
          weight_unit: 'ozt',
          purity: 0.999,
        });
        presetIds.push(preset.id);
        fixtures.push(await items.save({ item_type: preset, acquisition_date: '2026-01-01' }));
      }
      const [deletedItem, retainedItem] = fixtures;
      for (const quantity of [1, 2, 3]) {
        await transactions.save({ item: deletedItem, type: 'buy', quantity, effective_date: '2026-01-01' });
      }
      const retainedTransaction = await transactions.save({
        item: retainedItem,
        type: 'buy',
        quantity: 7,
        effective_date: '2026-02-01',
      });
      const itemBefore = await items.findOneByOrFail({ id: retainedItem.id });
      const transactionBefore = await transactions.findOneByOrFail({ id: retainedTransaction.id });
      expect(await transactions.countBy({ item: { id: deletedItem.id } })).toBe(3);

      await request(app.getHttpServer()).delete(`/inventory/${deletedItem.id}`).expect(200);

      expect(await items.findOneBy({ id: deletedItem.id })).toBeNull();
      expect(await transactions.countBy({ item: { id: deletedItem.id } })).toBe(0);
      expect(await items.findOneByOrFail({ id: retainedItem.id })).toEqual(itemBefore);
      expect(await transactions.findOneByOrFail({ id: retainedTransaction.id })).toEqual(transactionBefore);
      expect(await transactions.countBy({ item: { id: retainedItem.id } })).toBe(1);
      for (const id of presetIds) expect(await itemTypes.existsBy({ id })).toBe(true);
    } finally {
      for (const item of fixtures) {
        await transactions.delete({ item: { id: item.id } });
        await items.delete(item.id);
      }
      for (const id of presetIds) await itemTypes.delete(id);
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });
});
