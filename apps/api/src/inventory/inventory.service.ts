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

  async create(recordBuyDto: RecordBuyDto): Promise<Item> {
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
        .select('SUM(transaction.quantity)', 'quantity') // sum quantities
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
    return { transactions, total };
  }

  findTransactionForItem(itemId: string, transactionId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOneBy({ item: { id: itemId }, id: transactionId });
  }

  async updateTransaction(itemId: string, transactionId: string, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.findTransactionForItem(itemId, transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }
    if (transaction.type !== 'buy') throw new BadRequestException('Only buy transactions can be updated.');
    const res = await this.transactionRepository.update(transactionId, { quantity: updateTransactionDto.quantity });
    if (res.affected === 0) {
      throw new NotFoundException('Transaction not found.');
    }
    return res;
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
        `SUM(transaction.quantity * CASE
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

  async recordSale(recordSaleDto: RecordSaleDto, itemId: string, buyId: string) {
    if (recordSaleDto.sale_date > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Sale date cannot be in the future.');
    }

    
  }
}
