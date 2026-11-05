import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { RecordBuyDto } from './dto/record-buy.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() recordBuyDto: RecordBuyDto) {
    return this.inventoryService.create(recordBuyDto);
  }

  @Get()
  findAll(@Query('page', new DefaultValuePipe('1'), new ParseIntPipe()) page = 1) {
    if (page < 1) throw new BadRequestException('Page number must be greater than 0.');
    return this.inventoryService.findAll(page);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/transactions')
  findAllTransactions(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findAllTransactions(id);
  }

  @Patch(':itemId/transactions/:transactionId')
  updateTransaction(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.inventoryService.updateTransaction(itemId, transactionId, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.remove(id);
  }
}
