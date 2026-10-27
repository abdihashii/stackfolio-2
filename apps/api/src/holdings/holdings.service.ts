import { Injectable } from '@nestjs/common';
import { CreateHoldingDto } from './dto/create-holding.dto.js';
import { UpdateHoldingDto } from './dto/update-holding.dto.js';

@Injectable()
export class HoldingsService {
  create(createHoldingDto: CreateHoldingDto) {
    return 'This action adds a new holding';
  }

  findAll() {
    return `This action returns all holdings`;
  }

  findOne(id: string) {
    return `This action returns a #${id} holding`;
  }

  update(id: string, updateHoldingDto: UpdateHoldingDto) {
    return `This action updates a #${id} holding`;
  }

  remove(id: string) {
    return `This action removes a #${id} holding`;
  }
}
