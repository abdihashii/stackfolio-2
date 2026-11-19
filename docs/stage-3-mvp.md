# StackFolio 2: Stage 3 MVP

## Historical Stack Value

**The question:** _What was my stack worth over time?_

Show one chart of the stack's historical spot value. Both ownership and spot prices change the line. Adding coins is not profit; removing coins is not a loss calculation. Sale cash is excluded.

### Valuation Rules

- One point per UTC date, including today. Use quantities after all recorded buys and sales effective on or before that date.
- Value fine-metal weight in troy ounces × quantity × spot price. Do not apply purity again to preset fine-metal weights.
- For each metal held, use the latest available quote on or before that date, with no age cutoff. Never fill an earlier date with a future quote.
- Zero holdings means $0. If a held metal has no usable quote, the whole-stack value is unavailable, not a partial total.
- Follow [Stage 2's date and correction rules](stage-2-mvp.md#transaction-rules). Omitted purchase dates use the recorded UTC date. Corrections recalculate history; selling everything preserves it; deleting an item removes its history.

### Chart

- One whole-stack line near Total Stack Value, with date and USD axes.
- Range buttons: **30D**, **1Y**, **All** (default). Daily points in every range; include earlier transactions and quotes when calculating the range's opening value.
- Today is an ordinary final point, updated when data refreshes. No special label or polling timer.
- Point details show date, value, and quote dates, accessible by pointer, keyboard, and touch.
- Straight segments, gaps for unavailable values, and visible single points.
- Show loading, empty, unavailable, and error/retry states. No transactions means an invitation to record a purchase. A chart error does not hide inventory.

### Example

Invented silver prices; each coin contains one troy ounce of fine silver.

| Date       | Activity                        | Silver/oz | Coins owned | Stack value |
| ---------- | ------------------------------- | --------: | ----------: | ----------: |
| 2024-01-01 | Buy 3 Eagles                    |       $24 |           3 |         $72 |
| 2024-06-30 | No transaction                  |       $30 |           3 |         $90 |
| 2024-07-01 | Buy 2 Maples                    |       $30 |           5 |        $150 |
| 2024-12-31 | No transaction                  |       $28 |           5 |        $140 |
| 2025-01-01 | Buy 2 Eagles                    |       $32 |           7 |        $224 |
| 2025-06-30 | No transaction                  |       $30 |           7 |        $210 |
| 2025-07-01 | Sell 1 Eagle from the first buy |       $30 |           6 |        $180 |
| 2025-12-31 | No transaction                  |       $40 |           6 |        $240 |

The sale drops value from **$210 to $180** at an unchanged spot price. The remaining six coins reach **$240** when silver rises to $40.

### Slices

#### 1. Verify historical prices

- [x] Check the live daily-history response: date coverage, timestamp units, ordering, missing metals, and USD per troy ounce.
- [x] Preserve partial quotes and empty history. Reject malformed responses, wrong metadata, invalid prices, and unusable timestamps.
- [x] Add missing contract tests; change the existing client only where needed.

**AC1 evidence (2026-11-17):** Live response spans 2017-01-02 through 2026-11-17 UTC, with strictly ascending Unix-second timestamps and both metals present in every entry. The upstream collector requests USD per troy ounce; history omits unit metadata. Dates are missing, including 2024-12-25 through 2025-01-01; the MVP uses the last available quote. Gap causes and older imported prices' provenance remain unverified.

**Verify:** Inspect [the history endpoint](https://api.stackfolio.app/api/spot-price/history?range=ALL&granularity=daily), record its coverage, and run `rtk bun run --cwd apps/api test spot-prices.service.spec.ts`. Repeatable tests use fixtures, not live requests.

#### 2. Calculate daily stack values

- [x] Calculate one UTC date's value from transactions and supplied prices, following the valuation rules above.
- [x] Generate ordered daily values and quote timestamps through today. Include pre-range history; carry each metal's latest prior quote, never a future quote.
- [x] Test the two-year example, same-day trades, liquidation, missing/carried/future quotes, pre-range history, grams, purity, leap day, and corrections.

**Verify:** `rtk bun run --cwd apps/api test historical-value.spec.ts`. Assert every example value, especially the $210 → $180 sale. One 1 ozt Gold Eagle at a $3,000 gold quote must equal $3,000 despite .9167 purity.

#### 3. Expose the history API

- [x] Add one history endpoint using all transactions, independent of list pagination, and one historical-price fetch per request.
- [x] Support the three ranges; reject invalid ranges. Return empty history for no transactions, zeros after full liquidation, and unavailable values or safe errors when prices cannot be used.
- [x] Reflect buys, sales, edits, transaction deletions, and item deletions on the next request. Preserve existing mutation validation.
- [x] Add deterministic API/integration coverage and update price-service test doubles. Clean up test fixtures without changing unrelated inventory.

**Verify:** Run API tests, then inspect `rtk curl -fsS 'http://localhost:8787/inventory/history?range=30D'` with the local API running. Change a fixture and confirm the affected value changes. Complete this smoke before adding the chart.

#### 4. Show the chart

- [x] Add the chart, range buttons, point details, and states described above.
- [ ] Refresh history after every successful ownership change, including corrections and deletions. Failed changes preserve saved history.
- [ ] Add the purchase-date hint: "Leave blank to use today's UTC date."

**Verify:** Run `rtk bun run --cwd apps/web build`. In the browser, reproduce the example with fixed test quotes, switch ranges, correct and delete transactions, then reload. Check mobile layout, keyboard/touch details, zero holdings, a single point, and missing-price gaps.

**AC1 evidence (`8085c85`).** Firefox checks covered range switching, 365 points for `1Y`, narrow layout, and point details by pointer, keyboard, and emulated touch. Fixtures verified a visible single point and a gap for a missing value. Loading, empty, unavailable, and error/retry states were checked. Workspace typecheck, lint, and the web production build passed. Vite warned that the minified routes chunk was 531 kB. Screen-reader output and large-value axis labels remain unverified in the browser. API suites remain part of the Slice 4 gate.

**Stage gate:** Complete one slice at a time. Run the checks below after each slice and at completion; demonstrate the chart and report actual results. Show the diff and proposed commit, then wait for commit sign-off. Pushing needs separate approval.

```sh
rtk bun run typecheck
rtk bun run lint
rtk bun run --cwd apps/api test
rtk bun run --cwd apps/api test:e2e
```

Integration tests need local PostgreSQL and HTTP listener access. Give user-run smoke checks one step at a time.

### Outside Stage 3

- Individual-item charts, P/L, cost basis, purchase costs, sale proceeds, fees, cash balances, and taxes.
- Intraday charts, granularity controls, custom ranges, zoom, transaction markers, and automatic polling.
- Stored daily snapshots, audit trails, new infrastructure, or upstream application changes.
- Preset-correction workflows and redesigning unknown-date entry. Keep Stage 2 behavior.

### Implementation Notes

**Existing groundwork:** The price collector in `~/dev/stackfolio/` runs hourly on UTC weekdays. The existing client requests `ALL`/`daily`; the source returns the last timestamp's row per day. A later partial row can omit a metal, so carry its prior returned quote. Live coverage remains unverified.

`historical-value.ts` now nets transaction quantities per item through the cutoff date before converting to fine-metal weight and applying supplied prices. This preserves exact zero after full liquidation. Daily points and quote selection remain in Slice 2 AC2. Saved transactions do not identify whether a date was defaulted or entered explicitly.

**Proposed API:** `GET /inventory/history?range=30D|1Y|ALL`, default `ALL`, through the existing API base path. Register before `:id`. Return `currency: 'USD'`, `range`, and `points` with `date`, `totalValue: number | null`, and per-metal `quoteTimestamps`.

**Proposed boundaries:** Capture today once in UTC. `30D` includes today and the previous 29 dates; `1Y`, the previous 364; `All`, the earliest remaining buy through today. Current valuation and today's point should agree when ownership and quotes match; do not force equality across different quotes.

**Proposed chart library:** Recharts, subject to React-version compatibility. None is installed. Add only in Slice 4; keep calculation tests in the API's existing suite.

API paths below are relative to `apps/api/src/`; web paths to `apps/web/src/`.

| Slice | Critical files                                                                                                                                                                                                                                            | Proposed commit                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1     | API `spot-prices/spot-prices.service.ts` and spec                                                                                                                                                                                                         | `test: verify historical spot price contract`     |
| 2     | API `inventory/historical-value.ts` and spec                                                                                                                                                                                                              | `feat: calculate transaction-based stack history` |
| 3     | API `inventory/inventory.controller.ts`, `inventory.service.ts`, their specs; `apps/api/test/app.e2e-spec.ts`                                                                                                                                             | `feat: expose whole-stack value history`          |
| 4     | Web `lib/apis.ts`, `types/inventory.types.ts`, `routes/index.tsx`, new `components/stack-value-chart.tsx`, `components/item-card.tsx`, `components/form.tsx`, `hooks/use-create-item.ts`, `hooks/use-delete-item.ts`; `apps/web/package.json`, `bun.lock` | `feat: show daily stack value history`            |
