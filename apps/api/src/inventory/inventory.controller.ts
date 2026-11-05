import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

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
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/transactions')
  findTransactions(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findTransactions(id);
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
