import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';

import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryController pagination', () => {
  let app: INestApplication<App>;
  const itemId = randomUUID();
  const findAll = vi.fn();
  const findAllTransactions = vi.fn();

  beforeEach(async () => {
    findAll.mockReset().mockResolvedValue({ inventory: [], total: 0 });
    findAllTransactions.mockReset().mockResolvedValue({ transactions: [], total: 0 });
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: { findAll, findAllTransactions } }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([
    { query: '', page: 1, limit: 12 },
    { query: '?page=2&limit=2', page: 2, limit: 2 },
    { query: '?limit=1', page: 1, limit: 1 },
    { query: '?limit=100', page: 1, limit: 100 },
  ])('parses inventory pagination $query', async ({ query, page, limit }) => {
    await request(app.getHttpServer()).get(`/inventory${query}`).expect(200).expect({ inventory: [], total: 0 });
    expect(findAll).toHaveBeenCalledExactlyOnceWith(page, limit);
  });

  it.each(['page=0', 'page=-1', 'page=1.5', 'page=abc', 'limit=0', 'limit=-1', 'limit=101', 'limit=1.5', 'limit=abc'])(
    'rejects invalid inventory pagination %s',
    async (query) => {
      await request(app.getHttpServer()).get(`/inventory?${query}`).expect(400);
      expect(findAll).not.toHaveBeenCalled();
    },
  );

  it.each([
    { query: '', page: 1 },
    { query: '?page=2', page: 2 },
  ])('parses transaction pagination $query', async ({ query, page }) => {
    await request(app.getHttpServer())
      .get(`/inventory/${itemId}/transactions${query}`)
      .expect(200)
      .expect({ transactions: [], total: 0 });
    expect(findAllTransactions).toHaveBeenCalledExactlyOnceWith(itemId, page);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid transaction page %s', async (page) => {
    await request(app.getHttpServer()).get(`/inventory/${itemId}/transactions?page=${page}`).expect(400);
    expect(findAllTransactions).not.toHaveBeenCalled();
  });

  it('rejects an invalid item UUID before querying transactions', async () => {
    await request(app.getHttpServer()).get('/inventory/not-a-uuid/transactions').expect(400);
    expect(findAllTransactions).not.toHaveBeenCalled();
  });
});
