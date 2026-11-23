import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { SpotPricesService } from '../spot-prices/spot-prices.service.js';
import { RecordBuyDto } from './dto/record-buy.dto.js';
import { RecordSaleDto } from './dto/record-sale.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { ItemType } from './entities/item-type.entity.js';
import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { calculateDailyStackValues } from './historical-value.js';

export interface ItemWithQuantity extends Item {
  quantity: number;
}

export enum HistoryRange {
  Last30Days = '30D',
  LastYear = '1Y',
  ALL = 'ALL',
}

async function getBuyBalance(
  transactionRepository: Repository<Transaction>,
  buyId: string,
): Promise<{ soldQuantity: number; remainingPurchaseCost: string | null }> {
  const salesTotalResult = await transactionRepository
    .createQueryBuilder('buy')
    // Keep the buy in the result even after its last sale is deleted.
    .leftJoin(Transaction, 'sale', 'sale.buy_id = buy.id AND sale.type = :saleType', { saleType: 'sell' })
    .select('COALESCE(SUM(sale.quantity), 0)', 'soldQuantity')
    // Set a fractional scale before division so even large whole-dollar receipts retain sub-cent precision.
    .addSelect(
      'round(buy.total_paid, 32) * (buy.quantity - COALESCE(SUM(sale.quantity), 0)) / buy.quantity',
      'remainingPurchaseCost',
    )
    .where('buy.id = :buyId', { buyId })
    .groupBy('buy.id')
    .getRawOne();
  return {
    soldQuantity: Number(salesTotalResult.soldQuantity),
    remainingPurchaseCost: salesTotalResult.remainingPurchaseCost,
  };
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
    private spotPricesService: SpotPricesService,
  ) {}

  async recordBuy(recordBuyDto: RecordBuyDto): Promise<Item> {
    if (recordBuyDto.acquisition_date && recordBuyDto.acquisition_date > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Acquisition date cannot be in the future.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const itemRepository = manager.getRepository(Item);
      const itemTypeRepository = manager.getRepository(ItemType);
      const transactionRepository = manager.getRepository(Transaction);

      const itemType = await itemTypeRepository.findOne({
        where: { id: recordBuyDto.item_type_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!itemType) {
        throw new NotFoundException(`Item type id ${recordBuyDto.item_type_id} not found.`);
      }

      const recordBuyDtoWithItemType = {
        item_type: itemType,
        acquisition_date: recordBuyDto.acquisition_date,
      };

      // Look for an existing item before creating one
      let item = await itemRepository.findOneBy({ item_type: { id: itemType.id } });
      if (!item) {
        item = await itemRepository.save(recordBuyDtoWithItemType);
      }

      await transactionRepository.save({
        effective_date: recordBuyDto.acquisition_date ?? new Date().toISOString().slice(0, 10),
        total_paid: recordBuyDto.total_paid ?? null,
        type: 'buy',
        item,
        quantity: recordBuyDto.quantity,
      });

      return item;
    });
  }

  async findAll(page: number, limit: number): Promise<{ inventory: ItemWithQuantity[]; total: number }> {
    const skip = (page - 1) * limit;

    return await this.dataSource.transaction(async (manager) => {
      const itemsRepository = manager.getRepository(Item);

      const itemQuantities = await manager
        .createQueryBuilder(Transaction, 'transaction')
        .select(
          "SUM(CASE WHEN transaction.type = 'buy' THEN transaction.quantity ELSE -transaction.quantity END)",
          'quantity',
        ) // sum quantities
        .addSelect('transaction.item_id', 'item_id') // select the item ID
        .groupBy('item_id') // and group by it
        .getRawMany(); // execute the aggregate query

      const [allItems, totalItems] = await itemsRepository.findAndCount({
        relations: { item_type: true },
        order: { created_at: 'DESC', id: 'DESC' },
        take: limit,
        skip,
      });

      const allItemsWithQuantities = allItems.map((item) => {
        const matchingTotal = itemQuantities.find((itemQuantity) => itemQuantity.item_id === item.id);
        return {
          id: item.id,
          created_at: item.created_at,
          item_type: item.item_type,
          acquisition_date: item.acquisition_date,
          quantity: Number(matchingTotal?.quantity ?? 0),
        };
      });

      return { inventory: allItemsWithQuantities, total: totalItems };
    });
  }

  findOne(id: string): Promise<Item | null> {
    return this.itemsRepository.findOneBy({ id });
  }

  async findAllTransactions(id: string, page: number): Promise<{ transactions: Transaction[]; total: number }> {
    const skip = (page - 1) * 2;

    return this.transactionRepository.manager.transaction('REPEATABLE READ', async (manager) => {
      const repository = manager.getRepository(Transaction);
      const [transactions, total] = await repository.findAndCount({
        where: { item: { id } },
        order: { effective_date: 'DESC', created_at: 'DESC', id: 'DESC' },
        take: 2,
        skip,
      });

      for (const transaction of transactions) {
        if (transaction.type === 'buy') {
          const balance = await getBuyBalance(repository, transaction.id);
          Object.assign(transaction, {
            remaining_quantity: transaction.quantity - balance.soldQuantity,
            remaining_purchase_cost: balance.remainingPurchaseCost,
          });
        }
      }
      return { transactions, total };
    });
  }

  async updateTransaction(itemId: string, transactionId: string, updateTransactionDto: UpdateTransactionDto) {
    /**
     * The rules of updating transactions:
     */

    return await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);

      // Find either a purchase or sale transaction and include the linked purchase transaction if it's a sale.
      const transactionToEdit = await transactionRepository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        relations: { buy: true },
      });
      if (!transactionToEdit) throw new NotFoundException('Transaction not found.');

      const buyId = transactionToEdit.type === 'buy' ? transactionToEdit.id : transactionToEdit.buy?.id;
      if (!buyId) throw new BadRequestException('Sale must reference a buy transaction.'); // Buys use their own ID so a missing buyId means a sale has no linked purchases.

      // Find and lock the purchase transaction so changes to its sales cannot happen at the same time.
      const buyTransaction = await transactionRepository.findOne({
        where: { id: buyId, type: 'buy', item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyTransaction) throw new NotFoundException('Purchase transaction not found for this item.');

      // find the specific transaction by transactionId and make sure it belongs to this item.
      const transaction = await transactionRepository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      const transactionDate = updateTransactionDto.effective_date ?? transaction.effective_date;
      const transactionQuantity = updateTransactionDto.quantity ?? transaction.quantity;
      const transactionTotalPaid =
        updateTransactionDto.total_paid === undefined ? transaction.total_paid : updateTransactionDto.total_paid;

      // Reject a purchase dated in the future.
      if (transactionDate > new Date().toISOString().slice(0, 10))
        throw new BadRequestException('Transaction date cannot be in the future.');

      if (transaction.type === 'buy') {
        const earliestSale = await transactionRepository.findOne({
          where: { buy: { id: transactionId }, type: 'sell' },
          order: { effective_date: 'ASC' },
        });
        if (earliestSale && transactionDate > earliestSale.effective_date)
          throw new BadRequestException('Purchase date cannot be after sale date.');

        // This asks "how many were sold from the purchase being edited?"
        const { soldQuantity: totalQuantitySoldForBuy } = await getBuyBalance(transactionRepository, transactionId);
        if (transactionQuantity < totalQuantitySoldForBuy) {
          throw new BadRequestException('Buy quantity cannot be less than the quantity already sold.');
        }
      } else if (transaction.type === 'sell') {
        if (transactionDate < buyTransaction.effective_date)
          throw new BadRequestException('Sale date cannot be before the purchase date.');

        // Receipt totals belongs to buys, so even clearing one on a sale is invalid.
        if (updateTransactionDto.total_paid !== undefined)
          throw new BadRequestException('Updates to Total Paid are not allowed for sales transactions.');

        // Get the total sold from its purchase
        const { soldQuantity: totalQuantitySoldForBuy } = await getBuyBalance(transactionRepository, buyId);

        // Exclude this sale's old quantity to count only the other sales linked to the same purchase.
        const quantitySoldThroughOtherSales = totalQuantitySoldForBuy - transaction.quantity;

        // Calculate how much the edited sale is allowed to use: purchase quantity - quantity sold through other sales
        const availableQuantityForSale = buyTransaction.quantity - quantitySoldThroughOtherSales;

        // Reject the edit if the sale edit quantity is larger than the available
        if (transactionQuantity > availableQuantityForSale)
          throw new BadRequestException('Sale quantity cannot be larger than available quantity.');
      }

      // Save the corrected purchase quantity, effective_date, and total_paid;
      // remaining quantity is calculated from linked sales.
      const updateResult = await transactionRepository.update(transactionId, {
        quantity: transactionQuantity,
        effective_date: transactionDate,
        total_paid: transactionTotalPaid,
      });
      if (updateResult.affected === 0) {
        throw new NotFoundException('Transaction not found.');
      }

      return updateResult;
    });
  }

  async remove(id: string): Promise<void> {
    await this.itemsRepository.delete(id);
  }

  async getValuation(): Promise<{
    totalValue: number;
    buyBalances: {
      remaining_quantity: string;
      remaining_purchase_cost: string | null;
      metal: 'gold' | 'silver';
      weight_unit: 'gram' | 'ozt';
      weight: number;
    }[];
    quote: { timestamp: string; currency: 'USD'; unit: 'toz'; prices: { gold: number; silver: number } };
  }> {
    const spotPrices = await this.spotPricesService.getSpotPrices();

    return await this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);

      // Include every buy so stack gain/loss is correct even when the ledger is closed or paginated.
      const buyBalances = await transactionRepository
        .createQueryBuilder('buy')
        .innerJoin('buy.item', 'item')
        .innerJoin('item.item_type', 'item_type')
        .leftJoin(Transaction, 'sale', 'sale.buy_id = buy.id AND sale.type = :saleType', { saleType: 'sell' })
        .where('buy.type = :buyType', { buyType: 'buy' })
        .select('buy.quantity - COALESCE(SUM(sale.quantity), 0)', 'remaining_quantity')
        // Set a fractional scale before division so even large whole-dollar receipts retain sub-cent precision.
        .addSelect(
          'round(buy.total_paid, 32) * (buy.quantity - COALESCE(SUM(sale.quantity), 0)) / buy.quantity',
          'remaining_purchase_cost',
        )
        .addSelect('item_type.metal', 'metal')
        .addSelect('item_type.weight_unit', 'weight_unit')
        .addSelect('item_type.weight', 'weight')
        .groupBy('buy.id')
        .addGroupBy('item_type.id')
        .getRawMany<{
          remaining_quantity: string;
          remaining_purchase_cost: string | null;
          metal: 'gold' | 'silver';
          weight_unit: 'gram' | 'ozt';
          weight: number;
        }>();

      // Stack Value includes all held metal, even when its purchase cost is unknown.
      const metalTotals = await transactionRepository
        .createQueryBuilder('transaction')
        .innerJoin('transaction.item', 'item')
        .innerJoin('item.item_type', 'item_type')
        .select('item_type.metal', 'metal')
        .groupBy('item_type.metal')
        // Spot prices are per troy ounce, so convert any gram weights before summing buys minus sales.
        .addSelect(
          `SUM(CASE WHEN transaction.type = 'buy' THEN transaction.quantity ELSE -transaction.quantity END * CASE
            WHEN item_type.weight_unit = 'gram'
              THEN item_type.weight / 31.1034768
            ELSE item_type.weight
            END)`,
          'total_ozt',
        )
        .getRawMany<{
          metal: 'gold' | 'silver';
          total_ozt: number;
        }>();

      const totalValue = metalTotals.reduce((acc, row) => acc + row.total_ozt * spotPrices.prices[row.metal], 0);
      return {
        totalValue,
        buyBalances,
        quote: spotPrices,
      };
    });
  }

  async recordSale(recordSaleDto: RecordSaleDto, itemId: string) {
    if (recordSaleDto.sale_date > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Sale date cannot be in the future.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);

      // Check the selected buy transaction exists and it belongs to the item
      const buyTransaction = await transactionRepository.findOne({
        where: { id: recordSaleDto.buy_id, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyTransaction) {
        throw new NotFoundException('Buy transaction not found for this item.');
      }

      // Reject non-purchase transactions
      if (buyTransaction.type !== 'buy') throw new BadRequestException('Sales must reference a buy transaction.');

      // Reject a sale dated before its purchase
      if (recordSaleDto.sale_date < buyTransaction.effective_date)
        throw new BadRequestException('Sale date cannot be before the buy date.');

      const { soldQuantity: totalQuantitySoldForBuy } = await getBuyBalance(
        transactionRepository,
        recordSaleDto.buy_id,
      );

      const remainingQuantity = buyTransaction.quantity - totalQuantitySoldForBuy;

      // Quantity cannot exceed what remains in the selected buy
      if (recordSaleDto.quantity > remainingQuantity)
        throw new BadRequestException('Sale quantity cannot exceed the remaining buy quantity.');

      return await transactionRepository.save({
        type: 'sell',
        quantity: recordSaleDto.quantity,
        effective_date: recordSaleDto.sale_date,
        buy: buyTransaction,
        item: { id: itemId },
      });
    });
  }

  async deleteTransaction(itemId: string, transactionId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(Transaction);
      const transactionToDelete = await transactionRepository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        relations: { buy: true },
      });
      if (!transactionToDelete) throw new NotFoundException('Transaction not found.');

      const buyId = transactionToDelete.type === 'buy' ? transactionToDelete.id : transactionToDelete.buy?.id;
      if (!buyId) throw new BadRequestException('Sale must reference a buy transaction');

      // Find and lock the purchase transaction so changes to its sales cannot happen at the same time.
      const buyTransaction = await transactionRepository.findOne({
        where: { id: buyId, type: 'buy', item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyTransaction) throw new NotFoundException('Purchase transaction not found for this item.');

      // Reread and lock the transaction being deleted. Another request could have deleted the sale while this
      // request waited for the purchase lock.
      const transaction = await transactionRepository.findOne({
        where: { id: transactionId, item: { id: itemId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      if (transaction.type === 'buy') {
        // Check whether any sales reference it.
        const salesForBuyTransactionExists = await transactionRepository.existsBy({
          type: 'sell',
          buy: { id: transaction.id },
        });
        if (salesForBuyTransactionExists) throw new BadRequestException('Sales must be deleted first.');
      }

      // Delete the locked transaction
      return await transactionRepository.delete(transaction.id);
    });
  }

  async getHistory(range: HistoryRange) {
    const transactions = await this.transactionRepository.find({
      relations: { item: { item_type: true } },
      order: { effective_date: 'ASC', created_at: 'ASC', id: 'ASC' },
    });
    if (transactions.length === 0) {
      return {
        currency: 'USD',
        range,
        points: [],
      };
    }

    const historicalSpotPrices = await this.spotPricesService.getHistoricalSpotPrices();

    const windowEnd = new Date();
    let windowStart = new Date(transactions[0].effective_date);

    if (range !== HistoryRange.ALL) {
      windowStart = new Date(windowEnd);
      const days = range === HistoryRange.Last30Days ? 29 : 364;
      windowStart.setUTCDate(windowStart.getUTCDate() - days);
    }

    const startDate = windowStart.toISOString().slice(0, 10);
    const endDate = windowEnd.toISOString().slice(0, 10);

    const dailyStackValues = calculateDailyStackValues(transactions, startDate, endDate, historicalSpotPrices);

    return {
      currency: 'USD',
      range,
      points: dailyStackValues,
    };
  }
}
