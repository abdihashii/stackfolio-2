# StackFolio 2: Stage 2 Product Scope

## Stage 2: Historical Stack Value

**The question:** _How's my stack's value changed over time?_

Show historical Stack Value at spot prices, reflecting both price movements and changes to recorded holdings. A rise in value does not necessarily mean a gain: adding holdings also increases Stack Value.

### Capabilities

| Capability | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| Manage     | Add, view, update, and delete holdings                  |
| Date       | Optionally record when a holding was acquired         |
| Track      | View historical Stack Value with simple range filters |

### Holdings and History

- Acquisition date is optional and date-only, interpreted in UTC.
- With a known acquisition date, include the holding from that date onward.
- With an unknown acquisition date, include it from the UTC date it was added. Exclude it from earlier history.
- Edits correct the holding record, including its acquisition date, and update affected history.
- Deleting a holding removes it from historical values too. Deletion corrects a record; it does not represent a sale.

History reflects the current corrected records, not an immutable audit trail. Recording sales and partial disposals is outside this stage.

### Historical Chart

- Show total Stack Value in USD, using Stage 1's weight, purity, and quantity calculation with historical spot prices.
- Provide **1W · 1M · 3M · 1Y · All** range filters.
- Historical prices are available from 2017-01-02 for gold and silver. This is the earliest supported chart date. **All** starts at the later of 2017-01-02 or the earliest current holding's effective date (acquisition date, otherwise added date in UTC), using the first weekday on or after that date, and runs through today.
- Show one point per UTC weekday, Monday through Friday. Omit weekends.
- Include only holdings whose acquisition date, or added date when unknown, is on or before the chart date.
- Use the last available spot-price snapshot for each UTC weekday. Today's point uses the latest available snapshot.
- If a weekday has no snapshot, use the most recent earlier snapshot. Never use a future price for an earlier date.
- A holding acquired over a weekend first contributes to Monday's chart point.
- If a required metal has no price at or before a chart date, show that value as unavailable, not zero or a partial stack total.

### Outside Stage 2

- Acquisition costs, profit/loss, and investment returns
- Liquidation estimates and product premiums
- Sales and partial-sale workflows
- Intraday charts and weekend points
- Separate attribution of value changes to prices versus holdings

### Slices

#### 1. Manage holdings and acquisition dates

- [x] Add, view, update, and delete holdings; changes persist after reload.
- [x] Save a holding with or without an acquisition date, and correct that date later.
- [x] Automatically record when each holding is first added. Keep that timestamp unchanged through updates, and use its UTC date as the historical start date whenever no acquisition date is provided.

#### 2. Calculate historical values

- [ ] A holding with a known acquisition date contributes from that date's first eligible weekday point.
- [ ] A holding without an acquisition date contributes from its added date's first eligible weekday point, never earlier.
- [ ] Correcting a holding updates affected historical values; deleting it removes its contribution throughout history.
- [ ] With holdings unchanged, historical values follow the selected historical spot prices.
- [ ] Missing weekday snapshots use earlier prices; missing price history never appears as zero or a partial total.
- [ ] Historical API results match a manually calculated example with known holdings and spot prices.

#### 3. Display historical chart

- [ ] Chart values match historical API results, with one point per UTC weekday and weekends omitted.
- [ ] **1W · 1M · 3M · 1Y · All** range filters change the displayed period while retaining weekday daily points.
- [ ] Unavailable historical values appear as gaps, not zero or partial stack totals.

### Open Before Implementation

- Define acquisition-date validation, default range, and empty-chart behavior.
- Define models, API contracts, and measurable latency and freshness requirements. Start by evaluating calculation on request before introducing stored stack totals.
