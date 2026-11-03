import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateHoldingDto } from './dto/update-holding.dto.js';
import { Item } from './entities/item.entity.js';

@Injectable()
export class HoldingsService {
  constructor(
    @InjectRepository(Item)
    private holdingsRepository: Repository<Item>,
  ) {}

  create(createHoldingDto: CreateItemDto): Promise<Item> {
    return this.holdingsRepository.save(createHoldingDto);
  }

  findAll(): Promise<Item[]> {
    return this.holdingsRepository.find();
  }

  findOne(id: string): Promise<Item | null> {
    return this.holdingsRepository.findOneBy({ id });
  }

  async update(id: string, updateHoldingDto: UpdateHoldingDto) {
    const res = await this.holdingsRepository.update(id, updateHoldingDto);
    if (res.affected === 0) {
      throw new NotFoundException('Holding not found.');
    }
    return res;
  }

  async remove(id: string): Promise<void> {
    await this.holdingsRepository.delete(id);
  }
}
