import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';

import { ItemType } from '../src/inventory/entities/item-type.entity.js';
import { Item } from '../src/inventory/entities/item.entity.js';
import { Transaction } from '../src/inventory/entities/transaction.entity.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
      expect(inventory.body.filter((item: { id: string }) => item.id === first.body.id)).toEqual([
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

  afterEach(async () => {
    await app.close();
  });
});
