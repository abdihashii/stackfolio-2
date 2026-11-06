import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpotPricesService } from '../spot-prices/spot-prices.service.js';
import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  let service: InventoryService;

  const findMock = vi.fn().mockResolvedValue([]);
  const findAndCountMock = vi.fn().mockResolvedValue([[], 0]);
  const findOneMock = vi.fn().mockResolvedValue({ type: 'buy' });
  const updateMock = vi.fn().mockResolvedValue({ affected: 1 });
  const getRawManyMock = vi.fn();
  const createQueryBuilderMock = vi.fn();
  const getSpotPricesMock = vi.fn().mockResolvedValue({
    timestamp: '2026-01-01T00:00:00.000Z',
    currency: 'USD',
    unit: 'toz',
    prices: { gold: 2000, silver: 25 },
  });

  beforeEach(async () => {
    findMock.mockReset().mockResolvedValue([]);
    findAndCountMock.mockReset().mockResolvedValue([[], 0]);
    findOneMock.mockReset().mockResolvedValue({ type: 'buy' });
    updateMock.mockReset().mockResolvedValue({ affected: 1 });
    getRawManyMock.mockReset().mockResolvedValue([]);
    createQueryBuilderMock.mockReset().mockReturnValue({
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      getRawMany: getRawManyMock,
    });
    getSpotPricesMock.mockReset().mockResolvedValue({
      timestamp: '2026-01-01T00:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: { gold: 2000, silver: 25 },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Item), useValue: {} },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: findMock,
            findAndCount: findAndCountMock,
            createQueryBuilder: createQueryBuilderMock,
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: async (callback: (manager: unknown) => Promise<unknown>) =>
              callback({
                getRepository: (entity: unknown) => {
                  expect(entity).toBe(Transaction);
                  return { findOne: findOneMock, update: updateMock };
                },
              }),
          },
        },
        { provide: SpotPricesService, useValue: { getSpotPrices: getSpotPricesMock } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should value each metal using one quote and return that quote', async () => {
    const quote = {
      timestamp: '2026-11-05T22:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: { gold: 4088.57, silver: 51.7925 },
    };
    getSpotPricesMock.mockResolvedValueOnce(quote);
    getRawManyMock.mockResolvedValueOnce([
      { metal: 'silver', total_ozt: 12 },
      { metal: 'gold', total_ozt: 0.5 },
    ]);

    const result = await service.getValuation();

    expect(result.totalValue).toBeCloseTo(2665.795, 6);
    expect(result.quote).toEqual(quote);
    expect(getSpotPricesMock).toHaveBeenCalledTimes(1);
  });

  it('should return zero value for empty inventory with an available quote', async () => {
    const result = await service.getValuation();

    expect(result).toEqual({
      totalValue: 0,
      quote: {
        timestamp: '2026-01-01T00:00:00.000Z',
        currency: 'USD',
        unit: 'toz',
        prices: { gold: 2000, silver: 25 },
      },
    });
  });

  it('should propagate quote failure rather than return a misleading value', async () => {
    const error = new BadGatewayException('Could not fetch spot prices.');
    getSpotPricesMock.mockRejectedValueOnce(error);

    await expect(service.getValuation()).rejects.toBe(error);
  });

  it.each([
    { page: 1, skip: 0 },
    { page: 2, skip: 2 },
    { page: 4, skip: 6 },
  ])(
    'should fetch transaction page $page for the specified item in stable newest-first order',
    async ({ page, skip }) => {
      findAndCountMock.mockResolvedValueOnce([[], 5]);
      const result = await service.findAllTransactions('test-item-id-1', page);

      expect(findAndCountMock).toHaveBeenCalledWith({
        where: { item: { id: 'test-item-id-1' } },
        order: { effective_date: 'DESC', created_at: 'DESC', id: 'DESC' },
        take: 2,
        skip,
      });
      expect(result).toEqual({ transactions: [], total: 5 });
    },
  );

  it("should update a buy's quantity", async () => {
    const result = await service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 });

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } },
      lock: { mode: 'pessimistic_write' },
    });
    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', { quantity: 4 });
    expect(result).toEqual({ affected: 1 });
  });

  it('should reject a transaction not found for the specified item without updating', async () => {
    findOneMock.mockResolvedValueOnce(null);

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } },
      lock: { mode: 'pessimistic_write' },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should reject a sell without updating', async () => {
    findOneMock.mockResolvedValueOnce({ type: 'sell' });

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
