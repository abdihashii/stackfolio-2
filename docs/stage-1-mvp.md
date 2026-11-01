# StackFolio 2: Staged Product Scope

## Long-Term Stages

1. **Current Stack Value:** Add holdings and see their current metal value at spot prices.
2. **Historical Stack Value:** Track stack value over time. History start dates and handling changes to holdings will be defined in this stage.
3. **Graphs:** Visualize stack value history.
4. **TBD.**

## Stage 1: Current Stack Value

**The question:** _What's my precious metal stack worth right now?_

**Stack Value** is the current metal value at spot prices. It is not Liquidation Value or necessarily what someone could sell the stack for.

### Three Capabilities

| Capability | Purpose                                       |
| ---------- | --------------------------------------------- |
| Add        | Record metal, weight, purity, and quantity    |
| Value      | Calculate current spot-based metal value      |
| View       | See total Stack Value and individual holdings |

### Holding Entry

Use one manual add flow for gold and silver holdings. No product catalog is required.

| Field           | Requirement                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| Metal           | Required: gold or silver                                                                |
| Weight per item | Required: positive metal-bearing weight, excluding stones and other non-metal materials |
| Weight unit     | Required: grams or troy ounces                                                          |
| Purity          | Required: select from predefined options for the metal                                  |
| Quantity        | Required: positive whole number; defaults to 1                                          |
| Holding type    | Optional: select from predefined options                                                |

Weight is the metal alloy's weight before adjusting for purity. Purity is applied once to calculate fine-metal content. Items with different weights or purities belong in separate entries.

Purity options: gold uses 9K, 14K, 18K, 24K (100%, nominal), .999, and .9999; silver uses .925, .999, and .9999. Karat values are divided by 24 for calculation.

Optional holding types for both metals: Coin, Bar, Round, Jewelry. Holding type is descriptive and does not change the valuation formula.

**Add flow:** Select metal → enter per-item weight and unit → select purity → enter quantity → optionally select holding type → save.

Show total weight automatically as weight per item × quantity. Users do not enter it separately.

**Example: eight quarter-ounce gold rounds**

- Weight per item: 0.25 troy oz
- Quantity: 8
- Total weight: 2 troy oz, calculated automatically
- Fine-metal weight: 2 troy oz × selected purity

For a single piece of jewelry, quantity is 1.

### Valuation

```text
Total Weight = Weight per Item × Quantity
Fine-Metal Weight = Total Weight × Purity
Holding Value = Weight per Item × Purity × Quantity × Spot Price
Stack Value = sum of all Holding Values
```

Purity is a fraction in the calculation, for example 75% = 0.75.

Weight and spot price must use consistent units. One troy ounce equals 31.1034768 grams. Convert weights or the price unit before calculating value; never treat a troy ounce as an ordinary ounce.

Use the latest available spot price for each metal and show the price timestamp. Explain Stack Value in the interface as **“Metal value calculated from weight, purity, quantity, and current spot prices.”**

If a metal's price is unavailable, show affected holding values as unavailable, not zero. Do not present a partial sum as the total Stack Value.

### View

- Total Stack Value, with the calculation explained
- Individual holdings with metal, per-item weight and unit, purity, quantity, calculated total weight, and current value
- Holding type when supplied
- Timestamps for the spot prices used
- An invitation to add a holding when the stack is empty

### Outside Stage 1

- Acquisition costs and dates
- Profit/loss and returns
- Historical tracking, snapshots, and historical reconstruction
- Graphs
- Liquidation estimates, dealer buyback prices, and scrap-payout assumptions
- Product catalogs and product-specific premiums
- Selling and partial-sale workflows
- Gemstone, craftsmanship, brand, and collectible valuations

Historical Stack Value belongs to stage 2 and graphs to stage 3. Other excluded features are not committed to a future stage.

### Slices

#### 1. Add, save, and reload holdings (completed)

- [x] Add a holding through the form, save it, reload, and see it again.
- [x] Eight 0.25 ozt items display a calculated total weight of 2 ozt.

#### 2. Fixed-price valuation (completed)

Use fixed spot prices for gold and silver. Live prices come in a later slice.

- [x] Holding value equals weight (ozt) × purity × quantity × the matching metal's spot price ($/ozt).
- [x] Two holdings with equivalent weights, one in grams and one in ozt, have equal holding values when quantity, purity, and metal match.
- [x] Total Stack Value equals the sum of all holding values.

#### 3. Latest-available spot prices (planned)

Replace fixed spot prices with latest-available fetched prices.

- [x] After page load, holding values and Stack Value use fetched gold/silver spot prices with confirmed currency and units.
- [x] Show the price timestamp so users know how recent the data is.
- [x] While prices load, show a loading state. If a required price is unavailable, show affected values and Stack Value as unavailable.

### Decisions Still Open for Stage 1

- Predefined purity options for each metal
- Predefined optional holding types
- Display currency and confirmation of the existing spot-price units
- Price refresh frequency and stale-price behavior
