import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateHoldingDto } from './dto/create-holding.dto.js';
import { UpdateHoldingDto } from './dto/update-holding.dto.js';
import { Holding } from './entities/holding.entity.js';

@Injectable()
export class HoldingsService {
  constructor(
    @InjectRepository(Holding)
    private holdingsRepository: Repository<Holding>,
  ) {}

  create(createHoldingDto: CreateHoldingDto): Promise<Holding> {
    return this.holdingsRepository.save(createHoldingDto);
  }

  findAll(): Promise<Holding[]> {
    return this.holdingsRepository.find();
  }

  findOne(id: string): Promise<Holding | null> {
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
