import '../../test/setup-dom';

import { expect, spyOn, test } from 'bun:test';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import type { Item, Transaction } from '@/types/inventory.types';

import { ItemCard } from './item-card';

const date = '2026-11-01';
const item: Item = {
  id: 'silver',
  created_at: new Date(date),
  acquisition_date: date,
  quantity: 0,
  item_type: { id: 'round', name: 'Silver round', metal: 'silver', weight: 1, weight_unit: 'ozt', purity: 0.999 },
};
const buy: Transaction = {
  id: 'buy',
  type: 'buy',
  quantity: 2,
  effective_date: date,
  created_at: date,
  total_paid: '50.00',
};
const sale: Transaction = { ...buy, id: 'sale', type: 'sell', quantity: 1, total_paid: null };

test.each(['51.00', ''])(
  'page correction preserves submitted amount %j during a pending and rejected edit',
  async (amount) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const save = Promise.withResolvers<Response>();
    let rows = [{ ...sale, id: 'other-sale' }, sale, buy];
    let submittedBody: unknown;
    const browser: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> } = globalThis;
    const fetchSpy = spyOn(browser, 'fetch').mockImplementation(async (url, options) => {
      const path = String(url).split('/inventory/')[1];
      if (path === 'silver/transactions/buy' && options?.method === 'PATCH') {
        submittedBody = JSON.parse(String(options.body));
        return save.promise;
      }
      const match = /^silver\/transactions\?page=([12])$/.exec(path);
      if (!match) throw new Error('Unexpected request: ' + url);
      const start = (Number(match[1]) - 1) * 2;
      return Response.json({ transactions: rows.slice(start, start + 2), total: rows.length });
    });
    try {
      const view = render(
        <QueryClientProvider client={client}>
          <ItemCard
            item={item}
            isBusy={false}
            isSpotPricesLoading={false}
            spotPricesError=""
            spotPrice={undefined}
            spotPricesTimestamp=""
            onDelete={async () => {}}
          />
        </QueryClientProvider>,
      );
      const button = (name: string) => view.getByRole('button', { name }) as HTMLButtonElement;
      const paid = () => view.getByLabelText('Total paid:') as HTMLInputElement;
      fireEvent.click(button('manage'));
      fireEvent.click(button('edit transactions'));
      await view.findByText('Page 1 of 2');
      fireEvent.click(button('Next page'));
      await view.findByText('Page 2 of 2');
      fireEvent.click(button('edit'));
      const originalInput = paid();
      fireEvent.change(originalInput, { target: { value: amount } });
      fireEvent.click(button('Save'));
      await waitFor(() => expect(submittedBody).toEqual({ total_paid: amount || null }));

      // A sale disappears on the server while the edit request is still pending.
      rows = [sale, buy];
      await client.invalidateQueries({ queryKey: ['itemTransactions', item.id] });
      await view.findByText('Page 1 of 1');
      expect(paid()).not.toBe(originalInput);
      expect(paid().value).toBe(amount);
      expect(button('Cancel edit').disabled).toBe(true);

      save.resolve(Response.json({ message: 'Save failed' }, { status: 400 }));
      await view.findByRole('alert');
      expect(paid().value).toBe(amount);
      expect(button('Cancel edit').disabled).toBe(false);
    } finally {
      cleanup();
      client.clear();
      fetchSpy.mockRestore();
    }
  },
);
