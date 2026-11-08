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
import { RecordSaleDto } from './dto/record-sale.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  recordBuy(@Body() recordBuyDto: RecordBuyDto) {
    return this.inventoryService.recordBuy(recordBuyDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe('1'), new ParseIntPipe()) page = 1,
    @Query('limit', new DefaultValuePipe('12'), new ParseIntPipe()) limit: number,
  ) {
    if (page < 1) throw new BadRequestException('Page number must be greater than 0.');
    if (limit < 1) throw new BadRequestException('Limit must be greater than 0.');
    if (limit > 100) throw new BadRequestException('Limit must be less than or equal to 100.');
    return this.inventoryService.findAll(page, limit);
  }

  @Get('valuation')
  getValuation() {
    return this.inventoryService.getValuation();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/transactions')
  findAllTransactions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page', new DefaultValuePipe('1'), new ParseIntPipe()) page = 1,
  ) {
    if (page < 1) throw new BadRequestException('Page number must be greater than 0.');
    return this.inventoryService.findAllTransactions(id, page);
  }

  @Patch(':itemId/transactions/:transactionId')
  updateTransaction(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.inventoryService.updateTransaction(itemId, transactionId, updateTransactionDto);
  }

  @Post(':itemId/sales')
  recordSale(@Param('itemId', new ParseUUIDPipe()) itemId: string, @Body() recordSaleDto: RecordSaleDto) {
    return this.inventoryService.recordSale(recordSaleDto, itemId);
  }

  @Delete(':itemId/transactions/:transactionId')
  removeTransaction(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
  ) {
    return this.inventoryService.removeTransaction(itemId, transactionId);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.remove(id);
  }
}
