import type { Item, CreateItemInput, ItemType } from '../types/inventory.types';

const backendUrlPath = import.meta.env.VITE_API_URL;

export const fetchSpotPrices = async () => {
  const res = await fetch(`${backendUrlPath}/spot-prices`);
  if (!res.ok) {
    throw new Error(`Could not fetch spot prices.`);
  }
  const data = (await res.json()) as { timestamp: string; prices: { gold: number; silver: number } };
  return data;
};

export const fetchInventory = async (): Promise<Item[]> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/inventory`, { headers: { 'Content-Type': 'application/json' } });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw Error(typeof message === 'string' && message.trim() ? message : 'Could not load inventory.');
  }
  return data;
};

export const createItem = async (payload: CreateItemInput): Promise<Item> => {
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

export const updateItem = async (id: string, newPayload: CreateItemInput): Promise<void> => {
  const res = await fetch(`${backendUrlPath}/inventory/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(newPayload),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not update item.');
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
