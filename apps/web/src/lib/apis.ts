import { BuyFormValues } from '@/types/form.schema';

import type { HistoryRange, HistoryResponse, Item, ItemType, Transaction } from '../types/inventory.types';

import { transactionListSchema } from '../types/inventory.types';

const backendUrlPath = import.meta.env.VITE_API_URL;

export const fetchInventory = async (page = 1, limit = 12): Promise<{ inventory: Item[]; total: number }> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/inventory?page=${page}&limit=${limit}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw Error(typeof message === 'string' && message.trim() ? message : 'Could not load inventory.');
  }
  return data;
};

export const recordBuy = async (payload: BuyFormValues): Promise<Item> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/inventory`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not create item.');
  }
  return data;
};

export const deleteItem = async (id: string): Promise<void> => {
  const res = await fetch(`${backendUrlPath}/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Could not delete item.');
  }
};

export const fetchItemTypes = async (): Promise<ItemType[]> => {
  const res = await fetch(`${backendUrlPath}/item-types`, {
    headers: {
      'Content-type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Could not fetch item types.');
  }
  return await res.json();
};

export const fetchTransactions = async (
  id: string,
  page = 1,
): Promise<{ transactions: Transaction[]; total: number }> => {
  const res = await fetch(`${backendUrlPath}/inventory/${id}/transactions?page=${page}`, {
    headers: {
      'Content-type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Could not fetch transactions.');
  }
  return transactionListSchema.parse(await res.json());
};

export const updateTransaction = async (
  itemId: string,
  transactionId: string,
  body: {
    quantity?: number;
    effective_date?: string;
    total_paid?: string | null;
  },
): Promise<void> => {
  const res = await fetch(`${backendUrlPath}/inventory/${itemId}/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not update transaction.');
  }
};

export const fetchValuation = async (): Promise<{
  totalValue: number;
  buyBalances: {
    remaining_quantity: string;
    remaining_purchase_cost: string | null;
    metal: 'gold' | 'silver';
    weight_unit: 'gram' | 'ozt';
    weight: number;
  }[];
  quote: { timestamp: string; currency: 'USD'; unit: 'toz'; prices: { gold: number; silver: number } };
}> => {
  const res = await fetch(`${backendUrlPath}/inventory/valuation`, {
    headers: {
      'Content-type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Could not fetch valuation.');
  }
  return await res.json();
};

export const recordSale = async (
  itemId: string,
  payload: { buy_id: string; quantity: number; sale_date: string },
): Promise<void> => {
  const res = await fetch(`${backendUrlPath}/inventory/${itemId}/sales`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not record sale.');
  }
};

export const deleteTransaction = async (itemId: string, transactionId: string): Promise<void> => {
  const res = await fetch(`${backendUrlPath}/inventory/${itemId}/transactions/${transactionId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not delete transaction.');
  }
};

export const fetchHistory = async (range: HistoryRange): Promise<HistoryResponse> => {
  const res = await fetch(`${backendUrlPath}/inventory/history?range=${range}`);
  if (!res.ok) {
    throw new Error('Could not fetch history.');
  }
  return await res.json();
};
