import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { SpotPricesService } from '../spot-prices/spot-prices.service.js';
import { RecordBuyDto } from './dto/record-buy.dto.js';
import { RecordSaleDto } from './dto/record-sale.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { ItemType } from './entities/item-type.entity.js';
import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';

export interface ItemWithQuantity extends Item {
  quantity: number;
}

async function getSoldQuantity(transactionRepository: Repository<Transaction>, buyId: string): Promise<number> {
  const salesTotalResult = await transactionRepository
    .createQueryBuilder('transaction')
    .select('SUM(transaction.quantity)', 'soldQuantity')
    .where('transaction.buy_id = :buyId AND transaction.type = :type', { buyId, type: 'sell' })
    .getRawOne();
  return salesTotalResult.soldQuantity === null ? 0 : Number(salesTotalResult.soldQuantity);
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
    private spotPricesService: SpotPricesService,
  ) {}

  async recordBuy(recordBuyDto: RecordBuyDto): Promise<Item> {
    if (recordBuyDto.acquisition_date && recordBuyDto.acquisition_date > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Acquisition date cannot be in the future.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const itemRepository = manager.getRepository(Item);
      const itemTypeRepository = manager.getRepository(ItemType);
      const transactionRepository = manager.getRepository(Transaction);

      const itemType = await itemTypeRepository.findOne({
        where: { id: recordBuyDto.item_type_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!itemType) {
        throw new NotFoundException(`Item type id ${recordBuyDto.item_type_id} not found.`);
      }

      const recordBuyDtoWithItemType = {
        item_type: itemType,
        acquisition_date: recordBuyDto.acquisition_date,
      };

      // Look for an existing item before creating one
      let item = await itemRepository.findOneBy({ item_type: { id: itemType.id } });
      if (!item) {
        item = await itemRepository.save(recordBuyDtoWithItemType);
      }

      await transactionRepository.save({
        effective_date: recordBuyDto.acquisition_date ?? new Date().toISOString().slice(0, 10),
        type: 'buy',
        item,
        quantity: recordBuyDto.quantity,
      });

      return item;
    });
  }

  async findAll(page: number, limit: number): Promise<{ inventory: ItemWithQuantity[]; total: number }> {
    const skip = (page - 1) * limit;

    return await this.dataSource.transaction(async (manager) => {
      const itemsRepository = manager.getRepository(Item);

      const itemQuantities = await manager
        .createQueryBuilder(Transaction, 'transaction')
        .select(
          "SUM(CASE WHEN transaction.type = 'buy' THEN transaction.quantity ELSE -transaction.quantity END)",
          'quantity',
        ) // sum quantities
        .addSelect('transaction.item_id', 'item_id') // select the item ID
        .groupBy('item_id') // and group by it
        .getRawMany(); // execute the aggregate query

      const [allItems, totalItems] = await itemsRepository.findAndCount({
        relations: { item_type: true },
        order: { created_at: 'DESC', id: 'DESC' },
        take: limit,
        skip,
      });

      const allItemsWithQuantities = allItems.map((item) => {
        const matchingTotal = itemQuantities.find((itemQuantity) => itemQuantity.item_id === item.id);
        return {
          id: item.id,
          created_at: item.created_at,
          item_type: item.item_type,
          acquisition_date: item.acquisition_date,
          quantity: Number(matchingTotal?.quantity ?? 0),
        };
      });

      return { inventory: allItemsWithQuantities, total: totalItems };
    });
  }

  findOne(id: string): Promise<Item | null> {
    return this.itemsRepository.findOneBy({ id });
  }

  async findAllTransactions(id: string, page: number): Promise<{ transactions: Transaction[]; total: number }> {
    const skip = (page - 1) * 2;

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { item: { id } },
      order: { effective_date: 'DESC', created_at: 'DESC', id: 'DESC' },
      take: 2,
      skip,
    });

    const transactionsWithAvailability = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.type !== 'buy') return transaction;

        const soldQuantity = await getSoldQuantity(this.transactionRepository, transaction.id);

        const { id, created_at, effective_date, type, quantity, item, buy } = transaction;
        return {
          id,
          created_at,
          effective_date,
          type,
          quantity,
          item,
          buy,
          remaining_quantity: transaction.quantity - soldQuantity,
        };
      }),
    );

    return { transactions: transactionsWithAvailability, total };
  }

  async updateTransaction(itemId: string, transactionId: string, updateTransactionDto: UpdateTransactionDto) {
    if (
      updateTransactionDto.effective_date &&
      updateTransactionDto.effective_date > new Date().toISOString().slice(0, 10)
    ) {
      throw new BadRequestException('Effective date cannot be in the future.');
    }
    return await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);
      const transaction = await transactionRepository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }
      const effectiveDate = updateTransactionDto.effective_date ?? transaction.effective_date;
      if (transaction.type === 'buy') {
        const soldQuantity = await getSoldQuantity(transactionRepository, transactionId);
        if (updateTransactionDto.quantity < soldQuantity) {
          throw new BadRequestException(
            `You’ve already sold ${soldQuantity} from this purchase. Quantity must be at least ${soldQuantity}.`,
          );
        }
        const firstSale = await transactionRepository.findOne({
          where: { buy: { id: transactionId }, type: 'sell' },
          order: { effective_date: 'ASC' },
        });
        if (firstSale && effectiveDate > firstSale.effective_date) {
          throw new BadRequestException(`Buy date must be on or before its first sale on ${firstSale.effective_date}.`);
        }
      } else {
        const sale = await transactionRepository.findOneOrFail({
          where: { id: transactionId },
          relations: { buy: true },
        });
        const buy = await transactionRepository.findOne({
          where: { id: sale.buy!.id, item: { id: itemId }, type: 'buy' },
          lock: { mode: 'pessimistic_write' },
        });
        if (!buy) throw new NotFoundException('Buy transaction not found for this item.');
        if (effectiveDate < buy.effective_date) {
          throw new BadRequestException(`Sale date must be on or after the buy date ${buy.effective_date}.`);
        }
        const soldQuantity = await getSoldQuantity(transactionRepository, buy.id);
        const available = buy.quantity - soldQuantity + transaction.quantity;
        if (updateTransactionDto.quantity > available) {
          throw new BadRequestException(`Sale quantity cannot exceed ${available} available from this purchase.`);
        }
      }

      const updateResult = await transactionRepository.update(transactionId, {
        quantity: updateTransactionDto.quantity,
        ...(updateTransactionDto.effective_date !== undefined ? { effective_date: effectiveDate } : {}),
      });
      if (updateResult.affected === 0) {
        throw new NotFoundException('Transaction not found.');
      }

      return updateResult;
    });
  }

  async removeTransaction(itemId: string, transactionId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Transaction);
      const transaction = await repository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) throw new NotFoundException('Transaction not found.');
      if (transaction.type === 'buy') {
        if (await repository.existsBy({ buy: { id: transactionId } })) {
          throw new BadRequestException('Delete its sales first.');
        }
      } else {
        const sale = await repository.findOneOrFail({ where: { id: transactionId }, relations: { buy: true } });
        // Serialize changes to availability with sales and edits against this buy.
        await repository.findOneOrFail({ where: { id: sale.buy!.id }, lock: { mode: 'pessimistic_write' } });
      }
      await repository.delete(transactionId);
    });
  }

  async remove(id: string): Promise<void> {
    await this.itemsRepository.delete(id);
  }

  async getValuation(): Promise<{
    totalValue: number;
    quote: { timestamp: string; currency: 'USD'; unit: 'toz'; prices: { gold: number; silver: number } };
  }> {
    const spotPrices = await this.spotPricesService.getSpotPrices();
    const metalTotals = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.item', 'item')
      .innerJoin('item.item_type', 'item_type')
      .select('item_type.metal', 'metal')
      .groupBy('item_type.metal')
      .addSelect(
        `SUM(CASE WHEN transaction.type = 'buy' THEN transaction.quantity ELSE -transaction.quantity END * CASE
          WHEN item_type.weight_unit = 'gram'
            THEN item_type.weight / 31.1034768
          ELSE item_type.weight
          END)`,
        'total_ozt',
      )
      .getRawMany<{
        metal: 'gold' | 'silver';
        total_ozt: number;
      }>();
    const totalValue = metalTotals.reduce((acc, row) => acc + row.total_ozt * spotPrices.prices[row.metal], 0);
    return {
      totalValue,
      quote: spotPrices,
    };
  }

  async recordSale(recordSaleDto: RecordSaleDto, itemId: string) {
    if (recordSaleDto.sale_date > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Sale date cannot be in the future.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);

      // Check the selected buy transaction exists and it belongs to the item
      const buyTransaction = await transactionRepository.findOne({
        where: { id: recordSaleDto.buy_id, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyTransaction) {
        throw new NotFoundException('Buy transaction not found for this item.');
      }

      // Reject non-purchase transactions
      if (buyTransaction.type !== 'buy') throw new BadRequestException('Sales must reference a buy transaction.');

      // Reject a sale dated before its purchase
      if (recordSaleDto.sale_date < buyTransaction.effective_date)
        throw new BadRequestException('Sale date cannot be before the buy date.');

      const soldQuantity = await getSoldQuantity(transactionRepository, recordSaleDto.buy_id);

      const remainingQuantity = buyTransaction.quantity - soldQuantity;

      // Quantity cannot exceed what remains in the selected buy
      if (recordSaleDto.quantity > remainingQuantity)
        throw new BadRequestException('Sale quantity cannot exceed the remaining buy quantity.');

      return await transactionRepository.save({
        type: 'sell',
        quantity: recordSaleDto.quantity,
        effective_date: recordSaleDto.sale_date,
        buy: buyTransaction,
        item: { id: itemId },
      });
    });
  }
}
