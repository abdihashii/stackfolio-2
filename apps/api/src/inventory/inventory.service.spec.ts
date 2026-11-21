import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpotPricesService } from '../spot-prices/spot-prices.service.js';
import { ItemType } from './entities/item-type.entity.js';
import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  let service: InventoryService;

  const findMock = vi.fn().mockResolvedValue([]);
  const findAndCountMock = vi.fn().mockResolvedValue([[], 0]);
  const findOneMock = vi.fn().mockResolvedValue({ type: 'buy' });
  const saveMock = vi.fn();
  const updateMock = vi.fn().mockResolvedValue({ affected: 1 });
  const getRawManyMock = vi.fn();
  const getRawOneMock = vi.fn();
  const salesWhereMock = vi.fn();
  const salesQueryBuilderMock = vi.fn();
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
    findOneMock
      .mockReset()
      .mockImplementation(async ({ where }) =>
        where.type === 'sell'
          ? null
          : { id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' },
      );
    saveMock.mockReset().mockResolvedValue({ id: 'sale-id' });
    updateMock.mockReset().mockResolvedValue({ affected: 1 });
    getRawManyMock.mockReset().mockResolvedValue([]);
    getRawOneMock.mockReset().mockResolvedValue({ soldQuantity: null });
    salesWhereMock.mockReset().mockReturnThis();
    salesQueryBuilderMock.mockReset().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      where: salesWhereMock,
      getRawOne: getRawOneMock,
    });
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
                  if (entity === Item) return { findOneBy: vi.fn().mockResolvedValue({ id: 'item-id' }) };
                  if (entity === ItemType) return { findOne: vi.fn().mockResolvedValue({ id: 'type-id' }) };
                  expect(entity).toBe(Transaction);
                  return {
                    findOne: findOneMock,
                    update: updateMock,
                    save: saveMock,
                    createQueryBuilder: salesQueryBuilderMock,
                  };
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

  it('rejects a future buy date without saving a transaction', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T23:59:59.000Z'));
    try {
      await expect(
        service.recordBuy({
          item_type_id: 'type-id',
          quantity: 1,
          acquisition_date: '2026-11-08',
        }),
      ).rejects.toThrow(new BadRequestException('Acquisition date cannot be in the future.'));
      expect(saveMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['2026-11-06', '2026-11-07', undefined, null])(
    'accepts buy date %s and defaults missing dates to today in UTC',
    async (acquisition_date) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-07T00:00:00.000Z'));
      try {
        await expect(service.recordBuy({ item_type_id: 'type-id', quantity: 1, acquisition_date })).resolves.toEqual({
          id: 'item-id',
        });
        expect(saveMock).toHaveBeenCalledExactlyOnceWith({
          effective_date: acquisition_date ?? '2026-11-07',
          total_paid: null,
          type: 'buy',
          item: { id: 'item-id' },
          quantity: 1,
        });
      } finally {
        vi.useRealTimers();
      }
    },
  );

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

  it('should return remaining buy availability without changing the purchased quantity', async () => {
    const buy = { id: 'buy-id', type: 'buy', quantity: 5 };
    findAndCountMock.mockResolvedValueOnce([[buy], 3]);
    createQueryBuilderMock.mockReturnValueOnce(salesQueryBuilderMock());
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: '2' });

    const result = await service.findAllTransactions('item-id', 1);

    expect(result).toEqual({
      transactions: [expect.objectContaining({ id: 'buy-id', type: 'buy', quantity: 5, remaining_quantity: 3 })],
      total: 3,
    });
    expect(salesWhereMock).toHaveBeenCalledExactlyOnceWith('transaction.buy_id = :buyId AND transaction.type = :type', {
      buyId: 'buy-id',
      type: 'sell',
    });
    expect(buy.quantity).toBe(5);
  });

  it.each([
    { patch: { quantity: 3 }, expectedQuantity: 3, expectedTotal: '80.21' },
    { patch: { total_paid: null }, expectedQuantity: 2, expectedTotal: null },
  ])('applies $patch to a buy with a saved receipt', async ({ patch, expectedQuantity, expectedTotal }) => {
    const buy = { id: 'buy-id', type: 'buy', quantity: 2, effective_date: '2020-01-10', total_paid: '80.21' };
    findOneMock.mockResolvedValueOnce(buy).mockResolvedValueOnce(buy).mockResolvedValueOnce(buy);

    await service.updateTransaction('item-id', buy.id, patch);
    expect(updateMock).toHaveBeenCalledWith(buy.id, {
      quantity: expectedQuantity,
      effective_date: buy.effective_date,
      total_paid: expectedTotal,
    });
  });

  it("should update a buy's quantity", async () => {
    const result = await service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 });

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } },
      lock: { mode: 'pessimistic_write' },
    });
    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', {
      quantity: 4,
      effective_date: '2020-01-10',
    });
    expect(result).toEqual({ affected: 1 });
  });

  it('should save a corrected buy date when there are no linked sales', async () => {
    const result = await service.updateTransaction('test-item-id-1', 'test-transaction-id-1', {
      quantity: 5,
      effective_date: '2020-01-12',
    });

    expect(findOneMock).toHaveBeenNthCalledWith(4, {
      where: { buy: { id: 'test-transaction-id-1' }, type: 'sell' },
      order: { effective_date: 'ASC' },
    });
    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', {
      quantity: 5,
      effective_date: '2020-01-12',
    });
    expect(result).toEqual({ affected: 1 });
  });

  it('should preserve the buy quantity when only its date is corrected', async () => {
    findOneMock.mockResolvedValueOnce({
      id: 'test-transaction-id-1',
      type: 'buy',
      quantity: 5,
      effective_date: '2020-01-10',
    });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', {
        effective_date: '2020-01-12',
      }),
    ).resolves.toEqual({ affected: 1 });

    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', {
      quantity: 5,
      effective_date: '2020-01-12',
    });
  });

  it('should reject moving a buy after its earliest linked sale without updating', async () => {
    findOneMock
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ type: 'sell', quantity: 2, effective_date: '2020-01-15' });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', {
        quantity: 5,
        effective_date: '2020-01-16',
      }),
    ).rejects.toThrow(new BadRequestException('Purchase date cannot be after sale date.'));

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should allow moving a buy to the same date as its earliest linked sale', async () => {
    findOneMock
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ id: 'test-transaction-id-1', type: 'buy', quantity: 5, effective_date: '2020-01-10' })
      .mockResolvedValueOnce({ type: 'sell', quantity: 2, effective_date: '2020-01-15' });
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: '2' });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', {
        quantity: 5,
        effective_date: '2020-01-15',
      }),
    ).resolves.toEqual({ affected: 1 });

    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', {
      quantity: 5,
      effective_date: '2020-01-15',
    });
  });

  it('should reject moving a buy to a future date without updating', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-15T23:59:59.000Z'));
    try {
      await expect(
        service.updateTransaction('test-item-id-1', 'test-transaction-id-1', {
          quantity: 5,
          effective_date: '2020-01-16',
        }),
      ).rejects.toThrow(new BadRequestException('Transaction date cannot be in the future.'));
      expect(updateMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should reject reducing a buy below its linked sales without updating', async () => {
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: '3' });

    await expect(service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 2 })).rejects.toThrow(
      'Buy quantity cannot be less than the quantity already sold.',
    );

    expect(salesWhereMock).toHaveBeenCalledExactlyOnceWith('transaction.buy_id = :buyId AND transaction.type = :type', {
      buyId: 'test-transaction-id-1',
      type: 'sell',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it.each([3, 4])('should allow a buy quantity of %i when three units have been sold', async (quantity) => {
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: '3' });

    await expect(service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity })).resolves.toEqual({
      affected: 1,
    });
    expect(updateMock).toHaveBeenCalledExactlyOnceWith('test-transaction-id-1', {
      quantity,
      effective_date: '2020-01-10',
    });
  });

  it('should reject a transaction not found for the specified item without updating', async () => {
    findOneMock.mockResolvedValueOnce(null);

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'test-transaction-id-1', item: { id: 'test-item-id-1' } },
      relations: { buy: true },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should reject a sale without a linked purchase without updating', async () => {
    findOneMock.mockResolvedValueOnce({ type: 'sell' });

    await expect(service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 })).rejects.toThrow(
      'Sale must reference a buy transaction.',
    );

    expect(updateMock).not.toHaveBeenCalled();
  });

  describe('sale edits', () => {
    const buy = { id: 'buy-id', type: 'buy', quantity: 5, effective_date: '2020-01-10' };
    const sale = { id: 'sale-id', type: 'sell', quantity: 2, effective_date: '2020-01-15', buy };

    beforeEach(() => {
      findOneMock.mockResolvedValueOnce(sale).mockResolvedValueOnce(buy).mockResolvedValueOnce(sale);
      getRawOneMock.mockResolvedValueOnce({ soldQuantity: '3' });
    });

    it.each(['80.21', null])('rejects a receipt edit of %s on a sale', async (total_paid) => {
      await expect(service.updateTransaction('item-id', sale.id, { total_paid })).rejects.toThrow(BadRequestException);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it.each([1, 4])('should allow a sale quantity of %i, excluding its old quantity', async (quantity) => {
      await expect(service.updateTransaction('item-id', 'sale-id', { quantity })).resolves.toEqual({ affected: 1 });

      expect(findOneMock).toHaveBeenNthCalledWith(1, {
        where: { id: 'sale-id', item: { id: 'item-id' } },
        relations: { buy: true },
      });
      expect(findOneMock).toHaveBeenNthCalledWith(2, {
        where: { id: 'buy-id', type: 'buy', item: { id: 'item-id' } },
        lock: { mode: 'pessimistic_write' },
      });
      expect(findOneMock).toHaveBeenNthCalledWith(3, {
        where: { id: 'sale-id', item: { id: 'item-id' } },
        lock: { mode: 'pessimistic_write' },
      });
      expect(salesWhereMock).toHaveBeenCalledExactlyOnceWith(
        'transaction.buy_id = :buyId AND transaction.type = :type',
        {
          buyId: 'buy-id',
          type: 'sell',
        },
      );
      expect(updateMock).toHaveBeenCalledExactlyOnceWith('sale-id', {
        quantity,
        effective_date: '2020-01-15',
      });
    });

    it('should reject a sale quantity exceeding the purchase availability without updating', async () => {
      await expect(service.updateTransaction('item-id', 'sale-id', { quantity: 5 })).rejects.toThrow(
        'Sale quantity cannot be larger than available quantity.',
      );
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('should allow a date-only edit to the purchase date and preserve sale quantity', async () => {
      await expect(service.updateTransaction('item-id', 'sale-id', { effective_date: '2020-01-10' })).resolves.toEqual({
        affected: 1,
      });
      expect(updateMock).toHaveBeenCalledExactlyOnceWith('sale-id', {
        quantity: 2,
        effective_date: '2020-01-10',
      });
    });

    it('should reject a sale date before the purchase without updating', async () => {
      await expect(service.updateTransaction('item-id', 'sale-id', { effective_date: '2020-01-09' })).rejects.toThrow(
        'Sale date cannot be before the purchase date.',
      );
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('should reject a future sale date without updating', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2020-01-15T23:59:59.000Z'));
      try {
        await expect(service.updateTransaction('item-id', 'sale-id', { effective_date: '2020-01-16' })).rejects.toThrow(
          'Transaction date cannot be in the future.',
        );
        expect(updateMock).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should use the sale quantity reread after locking its purchase', async () => {
      findOneMock
        .mockReset()
        .mockResolvedValueOnce(sale)
        .mockResolvedValueOnce(buy)
        .mockResolvedValueOnce({ ...sale, quantity: 1 });
      // The total is three, including the reread sale of one: only three remain available to this sale.
      await expect(service.updateTransaction('item-id', 'sale-id', { quantity: 4 })).rejects.toThrow(
        'Sale quantity cannot be larger than available quantity.',
      );
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('should reject a missing purchase without updating', async () => {
      findOneMock.mockReset().mockResolvedValueOnce(sale).mockResolvedValueOnce(null);
      await expect(service.updateTransaction('item-id', 'sale-id', { quantity: 1 })).rejects.toThrow(
        'Purchase transaction not found for this item.',
      );
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('should reject a sale missing on the locked reread without updating', async () => {
      findOneMock.mockReset().mockResolvedValueOnce(sale).mockResolvedValueOnce(buy).mockResolvedValueOnce(null);
      await expect(service.updateTransaction('item-id', 'sale-id', { quantity: 1 })).rejects.toThrow(
        'Transaction not found.',
      );
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  it('should report not found when the transaction disappears before the update', async () => {
    updateMock.mockResolvedValueOnce({ affected: 0 });

    await expect(
      service.updateTransaction('test-item-id-1', 'test-transaction-id-1', { quantity: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    { sold: null, quantity: 5 },
    { sold: '2', quantity: 1 },
    { sold: '2', quantity: 3 },
  ])('should save a sale of $quantity with a previous total of $sold', async ({ sold, quantity }) => {
    const buy = { id: 'buy-id', type: 'buy', quantity: 5, effective_date: '2020-01-01' };
    findOneMock.mockResolvedValueOnce(buy);
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: sold });

    const result = await service.recordSale({ buy_id: 'buy-id', sale_date: '2020-01-01', quantity }, 'item-id');

    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'buy-id', item: { id: 'item-id' } },
      lock: { mode: 'pessimistic_write' },
    });
    expect(salesWhereMock).toHaveBeenCalledExactlyOnceWith('transaction.buy_id = :buyId AND transaction.type = :type', {
      buyId: 'buy-id',
      type: 'sell',
    });
    expect(saveMock).toHaveBeenCalledExactlyOnceWith({
      type: 'sell',
      quantity,
      effective_date: '2020-01-01',
      buy,
      item: { id: 'item-id' },
    });
    expect(result).toEqual({ id: 'sale-id' });
  });

  it('should reject a sale exceeding the remaining buy quantity without saving', async () => {
    findOneMock.mockResolvedValueOnce({ type: 'buy', quantity: 5, effective_date: '2020-01-01' });
    getRawOneMock.mockResolvedValueOnce({ soldQuantity: '2' });

    await expect(
      service.recordSale({ buy_id: 'buy-id', sale_date: '2020-01-02', quantity: 4 }, 'item-id'),
    ).rejects.toThrow('Sale quantity cannot exceed the remaining buy quantity.');
    expect(saveMock).not.toHaveBeenCalled();
  });
});
