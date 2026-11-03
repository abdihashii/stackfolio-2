import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { Item } from './entities/item.entity.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
  ) {}

  create(createItemDto: CreateItemDto): Promise<Item> {
    return this.itemsRepository.save(createItemDto);
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
