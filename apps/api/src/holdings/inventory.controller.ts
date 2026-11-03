import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';

import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { HoldingsService } from './holdings.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly holdingsService: HoldingsService) {}

  @Post()
  create(@Body() createItemDto: CreateItemDto) {
    return this.holdingsService.create(createItemDto);
  }

  @Get()
  findAll() {
    return this.holdingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.holdingsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateHoldingDto: UpdateItemDto) {
    return this.holdingsService.update(id, updateHoldingDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.holdingsService.remove(id);
  }
}
