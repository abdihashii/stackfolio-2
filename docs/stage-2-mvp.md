# StackFolio 2: Stage 2 MVP

## Items, Buys, Sells, and Corrections

**The question:** _What do I own, and how have my buys and sells changed my stack?_

Record ownership changes and show current quantities and spot value. This scope replaces Stage 1’s manual item-entry flow. Historical valuation and charts belong to Stage 3.

### Product Model

- **ItemType:** a shared catalog definition, such as a 1 oz American Silver Eagle, with its metal, weight, and purity.
- **Item:** an inventory entry referencing an item type. Use “item” consistently in the UI, API, code, and database.
- **Inventory:** the collection of items; Stage 2 uses one implicit inventory.
- **Transaction:** a buy or sell belonging to an item. Repeated purchases of the same preset belong to one item, with separate transactions.
- **Quantity owned:** derived from transactions, never edited directly. Items and their history remain after quantity reaches zero.

Named coin products remain separate. Generic bars and rounds group by metal, weight, and purity, regardless of brand or dealer. Mint years are not tracked.

See [ADR 003: Inventory ownership](adr/003-inventory-ownership.md) for the model rationale and future ownership design.

### Preset Catalog

Presets are stored as `ItemType` records in `item_types`. Only presets can be selected; no custom-item creation.

| Silver                           | Gold                           |
| -------------------------------- | ------------------------------ |
| American Silver Eagle, 1 oz      | American Gold Eagle, 1 oz      |
| Canadian Silver Maple Leaf, 1 oz | American Gold Buffalo, 1 oz    |
| Generic silver round, 1 oz       | Canadian Gold Maple Leaf, 1 oz |
| Generic silver bar, 1 oz         | Generic gold bar, 1 oz         |
| Generic silver bar, 10 oz        |                                |

All ounces are troy ounces. For every preset, `weight` and `weight_unit` describe fine-metal content, not gross alloy weight. Purity remains a product fact; do not multiply it into fine-metal weight. Current spot value is fine-metal weight converted to troy ounces × quantity × spot price. Verify each preset's fine-metal content before seeding.

**Example:** The 1 oz American Gold Eagle contains 1 troy oz of fine gold at .9167 purity; its gross coin weight is 33.931 g (1.0909 troy oz). Store its fine-metal weight as 1 ozt, so one coin's gold spot value equals the price of one troy ounce of gold. The published gross weight and purity are rounded. Sources: [U.S. Mint specifications](https://www.usmint.gov/coins-precious-metal-coins/bullion-coin-programs/) and [APMEX random-year listing](https://www.apmex.com/product/1/1-oz-american-gold-eagle-coin-bu-random-year).

### Buy Flow

Select a preset → enter quantity and acquisition date → save.

The first buy creates the inventory item and transaction together; later buys add transactions to that same item. Users do not separately create or manage item definitions. Show current inventory quantities and the acquisitions behind them.

**Example:** Buy three Silver Eagles in January and two in March. Show one item with quantity five and two buys; February ownership is three.

### Transaction Rules

- A buy increases ownership from its effective date; a sell decreases it without changing earlier ownership.
- A correction edits an existing buy or sell, not a separate transaction type. Recalculate from the affected date, or the earlier of the old/new dates when changing a date.
- Reject changes that cause negative ownership at any point, including later transactions. Failed changes leave records unchanged.
- Effective dates are UTC date-only values. Unknown acquisition dates fall back to the UTC recorded date; keep the separate server-managed recorded timestamp unchanged through corrections.
- Deleting a record is not a sale. Fully sold items retain their transactions.
- Current spot value uses derived quantity and fine-metal content. Stage 1’s spot-price and unavailable-value behavior still applies.

### Slices

#### 1. Inventory and dates: completed

- [x] Create, view, edit, and delete inventory items with optional acquisition dates; recorded timestamps remain unchanged through edits.

#### 2. Acquisitions and current ownership

Inventory is empty and the app is not in production; no existing-data conversion is needed.

- [ ] Record and view buys for the nine presets through the app and API; repeated buys appear under one item with separate transactions.
- [ ] Show current quantities derived from transactions and correct spot values for every preset’s fine-metal content.
- [ ] Quantity cannot be edited directly through the app or API.

**Verify:** Buy one Silver Eagle in January and another in March. After reload, one item shows quantity two and both buys; ownership in February is one.

#### 3. Full and partial sales

- [ ] Record sales through the app and API; update current quantity and spot value.
- [ ] Reject overselling, including backdated or concurrent changes that would create negative ownership.
- [ ] Keep fully sold items and their history accessible.

**Verify:** Buy three, sell one, reload to see two. Sell the remaining two and retain the records. An excess sale is rejected without changes.

#### 4. Corrections

- [ ] Edit a buy or sell’s quantity or effective date while preserving its identity and recorded timestamp.
- [ ] Reject corrections that invalidate later sales.
- [ ] Remove erroneous transactions without leaving invalid dependent records or negative ownership; rejected removals leave records unchanged.

**Verify:** Buy three, sell one, then correct the buy to four: three remain after reload. Reducing that buy below the sold quantity is rejected without changes.

**Stage gate:** Demonstrate the flows in the app; pass workspace typecheck, lint, and available tests. Commit slices only after sign-off.

### Open Decisions

- Whether sales identify only the item or also an acquisition batch. Item-only sales are recommended, not yet explicitly settled.
- Same-day ordering, future-date rules, and how unknown acquisition dates appear in the form and history.
- How to correct an incorrectly selected preset or remove erroneous records with dependent sales.

### Outside Stage 2

- Auth, the `inventories` table, ownership enforcement, and personal item metadata.
- Custom items, mint years, brand/dealer tracking, and collectible distinctions.
- Purchase costs, sale proceeds, fees, cash balances, profit/loss, investment returns, and tax accounting.
- Liquidation estimates and premiums.
- Immutable edit audit trails or a separate correction transaction type.
- Historical price selection, stack-value history APIs, charts, and range filters: Stage 3. Existing historical-price fetching and valuation code remains groundwork for that stage.
