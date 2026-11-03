import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { ItemType } from './entities/item-type.entity.js';
import { Item } from './entities/item.entity.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(ItemType)
    private itemTypeRepository: Repository<ItemType>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<Item> {
    const itemType = await this.itemTypeRepository.findOneBy({ id: createItemDto.item_type_id });
    if (!itemType) {
      throw new NotFoundException(`Item type id ${createItemDto.item_type_id} not found.`);
    }
    const createItemDtoWithItemType = {
      ...createItemDto,
      item_type: itemType,
    };
    return this.itemsRepository.save(createItemDtoWithItemType);
  }

  findAll(): Promise<Item[]> {
    return this.itemsRepository.find();
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
