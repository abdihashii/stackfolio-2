import '../setup-dom';
import { expect, spyOn, test } from 'bun:test';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';

import { Route } from '../../src/routes/index';
import type { HistoryResponse } from '../../src/types/inventory.types';

function mockChartBounds() {
  // Happy DOM has no layout. Give the responsive chart a measurable viewport.
  const measure = HTMLElement.prototype.getBoundingClientRect;
  return spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('recharts-wrapper') ? new DOMRect(0, 0, 800, 280) : measure.call(this);
  });
}

test('purchase correction updates both gains after save and a fresh mount', async () => {
  const bought = '2026-11-22';
  const sold = '2026-11-23';
  const type = { id: 'round', name: 'Silver round', metal: 'silver', weight: 1, weight_unit: 'ozt', purity: 1 };
  const item = { id: 'coin', item_type: type, quantity: 2, acquisition_date: bought, created_at: bought };
  const quote = { timestamp: bought, prices: { silver: 40 } };
  const quoteTimestamps = { silver: Date.parse(bought) / 1000 };
  const points = [
    { date: bought, totalValue: 120, quoteTimestamps },
    { date: sold, totalValue: 80, quoteTimestamps },
  ];
  let paid = '100.00';
  const browser: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> } = globalThis;
  const fetchSpy = spyOn(browser, 'fetch').mockImplementation(async (url, options) => {
    const path = String(url).replace(/^.*?(?=\/(?:inventory|item-types))/, '');
    const balance = { remaining_quantity: 2, remaining_purchase_cost: String((Number(paid) * 2) / 3) };
    if (path === '/inventory/coin/transactions/buy' && options?.method === 'PATCH') {
      paid = JSON.parse(String(options.body)).total_paid;
      return Response.json({});
    }
    if (path === '/inventory/coin/transactions?page=1')
      return Response.json({
        total: 2,
        transactions: [
          {
            id: 'buy',
            type: 'buy',
            quantity: 3,
            created_at: bought,
            effective_date: bought,
            total_paid: paid,
            ...balance,
          },
          { id: 'sale', type: 'sell', quantity: 1, created_at: sold, effective_date: sold, total_paid: null },
        ],
      });
    if (path === '/inventory/valuation')
      return Response.json({ quote, totalValue: 80, buyBalances: [{ ...type, ...balance }] });
    if (path === '/inventory/history?range=30D') return Response.json({ range: '30D', currency: 'USD', points: [] });
    if (path === '/inventory/history?range=ALL')
      return Response.json({
        range: 'ALL',
        currency: 'USD',
        points: points.map((point) => ({
          ...point,
          costBasis: point.date === bought ? paid : balance.remaining_purchase_cost,
        })) satisfies HistoryResponse['points'],
      });
    if (path === '/inventory?page=1&limit=12') return Response.json({ inventory: [item], total: 1 });
    if (path === '/item-types') return Response.json([type]);
    throw new Error('Unexpected request ' + path);
  });
  const bounds = mockChartBounds();
  const Home = Route.options.component!;
  const mount = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <Home />
      </QueryClientProvider>,
    );
    expect((view.getByRole('radio', { name: '30D' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(view.getByRole('radio', { name: 'All' }));
    fireEvent.click(await view.findByRole('button', { name: 'manage' }));
    fireEvent.click(view.getByRole('button', { name: 'edit transactions' }));
    return { client, view };
  };
  const verify = async ({ view }: Awaited<ReturnType<typeof mount>>, gain: string) => {
    await waitFor(() => expect(view.getAllByText('Unrealized gain/loss: ' + gain)).toHaveLength(2));
    expect(view.getByText('Total Stack Value: $80.00')).toBeDefined();
    const chart = view.getByRole('application');
    await waitFor(() => {
      const dots = chart.querySelectorAll('.recharts-line-dots')[0]!.querySelectorAll('.recharts-line-dot');
      expect(dots).toHaveLength(points.length);
      const tick = (label: string) => view.getByText(label, { selector: 'tspan' }).parentElement!;
      const zeroY = Number(tick('$0').getAttribute('y'));
      const topY = Number(tick('$120').getAttribute('y'));
      for (const [index, point] of points.entries()) {
        expect(dots[index].getAttribute('cx')).toBe(tick(point.date).getAttribute('x'));
        const fractionOfScale = (zeroY - Number(dots[index].getAttribute('cy'))) / (zeroY - topY);
        expect(fractionOfScale * 120).toBeCloseTo(point.totalValue);
      }
    });
  };
  try {
    const first = await mount();
    await verify(first, '$13.33');
    fireEvent.click(first.view.getAllByRole('button', { name: 'edit' })[0]!);
    fireEvent.change(first.view.getByLabelText('Total paid:'), { target: { value: '90.00' } });
    fireEvent.click(first.view.getByRole('button', { name: 'Save' }));
    await verify(first, '$20.00');
    cleanup();
    first.client.clear();
    const fresh = await mount();
    await verify(fresh, '$20.00');
    fresh.client.clear();
  } finally {
    cleanup();
    fetchSpy.mockRestore();
    bounds.mockRestore();
  }
});

test('selecting Jan 6 highlights both points and shows stack value and cost basis in one tooltip', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(['inventory', 1, 12], { inventory: [], total: 0 });
  client.setQueryData(['itemTypes'], []);
  client.setQueryData(['valuation'], { totalValue: 42, buyBalances: [] });
  client.setQueryData(['history', '30D'], {
    currency: 'USD',
    range: '30D',
    points: [
      { date: '2026-01-05', totalValue: 40, costBasis: '35.00', quoteTimestamps: { silver: 1767571200 } },
      { date: '2026-01-06', totalValue: 42, costBasis: '35.00', quoteTimestamps: { silver: 1767657600 } },
    ],
  });
  const bounds = mockChartBounds();
  const Home = Route.options.component!;
  try {
    const view = render(<QueryClientProvider client={client}><Home /></QueryClientProvider>);
    const chart = view.getByRole('application');
    await waitFor(() => expect(chart.querySelectorAll('.recharts-line-dot')).toHaveLength(4));
    fireEvent.focus(chart);
    await view.findByText('2026-01-05', { selector: 'p' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    await waitFor(() => {
      const tooltip = within(view.getByRole('status'));
      expect(tooltip.getByText('2026-01-06')).toBeDefined();
      expect(tooltip.getByText('Stack value: $42.00')).toBeDefined();
      expect(tooltip.getByText('Cost basis: $35.00')).toBeDefined();
      const markers = chart.querySelectorAll('.recharts-active-dot circle');
      expect(markers).toHaveLength(2);
      expect(markers[0].getAttribute('cx')).toBe(markers[1].getAttribute('cx'));
      expect(markers[0].getAttribute('cy')).not.toBe(markers[1].getAttribute('cy'));
    });
  } finally {
    cleanup();
    client.clear();
    bounds.mockRestore();
  }
});
