import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { RecordBuyDto } from './dto/record-buy.dto.js';
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

  async findAll(page: number): Promise<{ inventory: ItemWithQuantity[]; total: number }> {
    const skip = (page - 1) * 12;

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
        take: 12,
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

  async findAllTransactions(id: string): Promise<{ transactions: Transaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { item: { id } },
      order: { effective_date: 'DESC', created_at: 'DESC', id: 'DESC' },
      take: 3,
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
}
