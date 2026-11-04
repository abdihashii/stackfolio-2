import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ItemType } from './entities/item-type.entity.js';

@Controller('item-types')
export class ItemTypesController {
  constructor(
    @InjectRepository(ItemType)
    private itemsRepository: Repository<ItemType>,
  ) {}

  @Get()
  findAll() {
    return this.itemsRepository.find();
  }
}
