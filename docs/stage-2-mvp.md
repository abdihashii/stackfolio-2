# StackFolio 2: Stage 2 MVP

## Buys, Sells, and Corrections

**The question:** _What do I own, and how have my buys and sells changed my stack?_

Record ownership changes, correct mistakes, and show current quantities. Historical valuation and charts move to Stage 3.

### Rules

- **Buy:** increases quantity from its effective date onward.
- **Sell:** decreases quantity from its effective date onward; earlier ownership stays unchanged.
- **Correct:** edits an existing buy or sell, not a separate transaction type. Recalculate ownership from the affected date, or the earlier of the old/new dates if the date changes.
- Derive quantities from transactions. Direct quantity edits must not bypass them.
- Reject changes that cause negative ownership at any point, including later transactions. Failed changes leave records unchanged.
- Use UTC date-only effective dates. Unknown acquisition dates fall back to the UTC recorded date. Preserve the separate server-managed recorded timestamp through corrections.
- Fully sold items retain their transactions. Deleting a record is not a sale.

**Example:** Buy three coins in November, sell one today: three before today, two afterward. Correct the original buy to two: ownership changes back to November, leaving one after the sale.

### Slices

#### 1. Inventory and dates: completed groundwork

- [x] Inventory CRUD, optional acquisition dates, and stable recorded timestamps.

#### 2. Acquisitions and current ownership

- [ ] Define how items and transactions relate.
- [ ] Convert existing inventory without losing quantities or known dates, or inventing purchase history.
- [ ] Record and view acquisitions through the app and API; derive current quantities and spot value from them.
- [ ] Replace direct quantity edits with transaction-based behavior.

**Verify:** Buy one coin in January and another in March. After reload, both buys remain and current quantity is two; ownership in February is one.

#### 3. Full and partial sales

- [ ] Record sales through the app and API; update current quantity and spot value.
- [ ] Reject overselling, including backdated or concurrent changes that would create negative ownership.
- [ ] Keep fully sold items’ records accessible; prevent deletion from substituting for a sale.

**Verify:** Buy three, sell one, reload to see two. Sell the remaining two and retain the records. An excess sale is rejected without changes.

#### 4. Corrections

- [ ] Edit a buy or sell's quantity or effective date while preserving its identity and recorded timestamp.
- [ ] Recalculate affected ownership; reject corrections that invalidate later sales.
- [ ] Define safe removal of erroneous records with dependent transactions.

**Verify:** Buy three, sell one, then correct the buy to four: three remain after reload. Reducing that buy below the sold quantity is rejected.

**Stage gate:** Demonstrate these flows in the app; verify data conversion; pass workspace typecheck, lint, and available tests. Commit slices only after sign-off.

### Outside Stage 2

- Historical price selection, stack-value history APIs, charts, and range filters: Stage 3.
- Purchase costs, sale proceeds, fees, cash balances, profit/loss, investment returns, and tax accounting.
- Liquidation estimates and premiums.
- Immutable edit audit trails or a separate correction transaction type.

Existing historical-price fetching and valuation work remains Stage 3 groundwork. Price selection is still a stub with intentionally failing tests; resolve or isolate that work before claiming a green stage gate.

### Decide Before Implementation

- How acquisitions are grouped into items and which item a sale reduces.
- Same-day ordering, future-date rules, and unknown acquisition-date handling.
- How to correct item details or remove erroneous records with dependent sales.
- Safe conversion and rollout for existing data; backfilled timestamps are not original purchase dates.
