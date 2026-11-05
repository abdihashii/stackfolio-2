import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  let service: InventoryService;

  const findMock = vi.fn().mockResolvedValue([]);
  const findAndCountMock = vi.fn().mockResolvedValue([[], 0]);
  const findOneByMock = vi.fn().mockResolvedValue({ type: 'buy' });
  const updateMock = vi.fn().mockResolvedValue({ affected: 1 });

  beforeEach(async () => {
    findMock.mockReset().mockResolvedValue([]);
    findAndCountMock.mockReset().mockResolvedValue([[], 0]);
    findOneByMock.mockReset().mockResolvedValue({ type: 'buy' });
    updateMock.mockReset().mockResolvedValue({ affected: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Item), useValue: {} },
        {
          provide: getRepositoryToken(Transaction),
          useValue: { find: findMock, findAndCount: findAndCountMock, findOneBy: findOneByMock, update: updateMock },
        },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch transactions for the specified item in stable newest-first order', async () => {
    await service.findAllTransactions('test-item-id-1');

    expect(findAndCountMock).toHaveBeenCalledWith({
      where: { item: { id: 'test-item-id-1' } },
      order: { effective_date: 'DESC', created_at: 'DESC', id: 'DESC' },
      take: 3,
    });
  });

  it("should update a buy's quantity", async () => {
    const result = await service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 });

    expect(findOneByMock).toHaveBeenCalledWith({ id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } });
    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', { quantity: 4 });
    expect(result).toEqual({ affected: 1 });
  });

  it('should reject a transaction not found for the specified item without updating', async () => {
    findOneByMock.mockResolvedValueOnce(null);

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findOneByMock).toHaveBeenCalledWith({ id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should reject a sell without updating', async () => {
    findOneByMock.mockResolvedValueOnce({ type: 'sell' });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should report not found when the transaction disappears before the update', async () => {
    updateMock.mockResolvedValueOnce({ affected: 0 });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
