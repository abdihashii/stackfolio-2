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

  update(id: string, updateHoldingDto: UpdateHoldingDto) {
    return this.holdingsRepository.update(id, updateHoldingDto);
  }

  async remove(id: string): Promise<void> {
    await this.holdingsRepository.delete(id);
  }
}
