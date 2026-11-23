# StackFolio 2: Stage 4 MVP

## Purchase Cost and Unrealized Gain/Loss

**The question:** What did I pay for the coins I still hold, and how does that compare with their spot value today?

### Purchase entry and corrections

- Add **Total paid (USD, optional)** to the buy form and buy editor. Enter one receipt total for the purchase, including premiums, tax, and shipping.
- Accept nonnegative USD amounts to the cent. Blank means unknown, including for existing buys. Users can add, correct, or clear the amount later.
- Edit quantity, date, and total paid independently. When quantity changes on a buy with a recorded cost, show this hint beside Total paid: “Check the purchase total. We’ll divide it across the updated quantity.”
- In a buy PATCH, send only changed fields. Omitted fields keep their saved values. Send `total_paid: null` to clear the receipt total. Reject `effective_date: null` because every transaction needs a date.
- A cost-only edit affects gain/loss. Current and historical Stack Value continue to use holdings and spot prices.

### Ledger

Show each buy’s total paid, remaining quantity, cost of the remaining coins, current spot value, and unrealized gain/loss in USD.

- Remaining quantity follows Stage 2’s purchase-linked sales.
- Remaining cost = total paid × remaining quantity ÷ purchased quantity. Round only for display, including when summing purchases.
- Unrealized gain/loss = current spot value of the remaining coins − remaining cost. With coins still held, unknown cost or unavailable spot value makes gain/loss unavailable.
- Show whole-stack unrealized gain/loss beside Stack Value. A fully sold buy contributes zero. If any held buy lacks cost or spot value, show the total gain/loss as unavailable.

**Example:** Buy 3 one-ounce coins for $100 and sell 1. At $40/oz the remaining 2 are worth $80, their cost is $66.67, and their unrealized gain is $13.33.

### Slices

#### 1. Record purchase cost

- [x] Save a buy with $100 paid and reload. It still shows $100. A blank amount shows as unknown, and an entered $0 stays $0.
- [x] Open an older buy, add a cost, correct it, then clear it. Each change survives reload. Verified on the 2026-11-01 buy with quantity 2. After each reload, the total showed $80.21, then $80.25, then Unknown. Quantity and date stayed the same.
- [x] Change a buy from 3 coins to 4. The $100 total stays in the editor and the reminder appears. Changing only the date leaves the total alone. Verified after reload on the Generic Silver Round buy: 4 coins and $100.00 persisted after the quantity edit and again after the date changed from 2026-11-01 to 2026-11-02.
- [x] Try saving a negative amount or an amount with more than two decimal places. The app explains the problem and keeps the last saved amount. Verified in the editor with `-1` and `12.345`. Each save returned HTTP 400, displayed the validation message, and left the Generic Silver Round buy at $100.00 after reload. The API integration test covers both cases.

#### 2. Calculate remaining cost and gain/loss

- [x] Buy 3 one-ounce coins for $100 and sell 1. At $40/oz, the remaining coins cost $66.67, are worth $80, and show a $13.33 gain. Delete the sale and the remaining cost returns to $100.
- [x] Buy another coin of the same type for $45. At $40/oz, that buy shows a $5 loss. Selling from the first buy leaves the second buy’s figures alone.
- [x] A held coin with an unknown cost or missing spot price makes the stack’s gain/loss unavailable. Once fully sold, that buy contributes $0.
- [x] Buy 3 one-ounce coins for $100 twice. Sell 2 coins from each buy. At $40/oz, each buy shows a $6.67 gain and the stack shows a $13.33 gain after rounding the total.

#### 3. Show the ledger and stack total

- [x] Open a buy in the ledger. See what you paid, how many coins remain, what those coins cost, what they are worth today, and the gain or loss on them.
- [ ] See the whole-stack gain/loss beside Stack Value. A held buy with unknown cost still shows its spot value, and the dashboard shows that gain/loss is unavailable.
- [ ] With just the two remaining coins from the first example, correct the purchase total from $100 to $90. The ledger and dashboard both show a $20 gain after saving and reloading. Stack Value stays $80 and the history chart keeps the same values at the same quotes.

**Stage gate:** Demonstrate the example and correction in the browser. Run workspace typecheck, lint, API tests, API end-to-end tests, and the web production build.

**Outside Stage 4:** Sale proceeds, realized gain/loss, tax reporting, and historical gain/loss charts.
