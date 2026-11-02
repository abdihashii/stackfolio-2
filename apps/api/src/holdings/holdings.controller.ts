import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';

import { CreateHoldingDto } from './dto/create-holding.dto.js';
import { UpdateHoldingDto } from './dto/update-holding.dto.js';
import { HoldingsService } from './holdings.service.js';

@Controller('holdings')
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

  @Post()
  create(@Body() createHoldingDto: CreateHoldingDto) {
    return this.holdingsService.create(createHoldingDto);
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
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateHoldingDto: UpdateHoldingDto) {
    return this.holdingsService.update(id, updateHoldingDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.holdingsService.remove(id);
  }
}
