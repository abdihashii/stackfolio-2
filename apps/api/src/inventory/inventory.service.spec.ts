import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  let service: InventoryService;

  const findByMock = vi.fn().mockResolvedValue([]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Item), useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: { findBy: findByMock } },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch transactions for the specified item', async () => {
    await service.findTransactions('test-item-id-1');

    expect(findByMock).toHaveBeenCalledWith({ item: { id: 'test-item-id-1' } });
  });
});
