import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { RecordBuyDto } from './dto/record-buy.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
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
        ...recordBuyDto,
        item_type: itemType,
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

  async findAll(): Promise<ItemWithQuantity[]> {
    return await this.dataSource.transaction(async (manager) => {
      const itemsRepository = manager.getRepository(Item);
      const transactionRepository = manager.getRepository(Transaction);

      const itemQuantities = await manager
        .createQueryBuilder(Transaction, 'transaction')
        .select('SUM(transaction.quantity)', 'quantity') // sum quantities
        .addSelect('transaction.item_id', 'item_id') // select the item ID
        .groupBy('item_id') // and group by it
        .getRawMany(); // execute the aggregate query

      // Fetch all buy transactions including their item relation to match each buy to its item
      

      const allItems = await itemsRepository.find({ relations: { item_type: true } });

      return allItems.map((item) => {
        const matchingTotal = itemQuantities.find((itemQuantity) => itemQuantity.item_id === item.id);
        return {
          ...item,
          quantity: Number(matchingTotal?.quantity ?? 0),
        };
      });
    });
  }

  findOne(id: string): Promise<Item | null> {
    return this.itemsRepository.findOneBy({ id });
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    const res = await this.itemsRepository.update(id, updateItemDto);
    if (res.affected === 0) {
      throw new NotFoundException('Item not found.');
    }
    return res;
  }

  async remove(id: string): Promise<void> {
    await this.itemsRepository.delete(id);
  }
}
