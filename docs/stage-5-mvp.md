# StackFolio 2: Stage 5 MVP

## Historical Cost Basis

**The question:** On any given day, what were my coins worth, and what did I pay for the coins I still held?

**Goal:** Compare Historical Stack Value and held cost basis in USD on the existing chart. Selecting a date highlights each available point and opens one tooltip with the date, both amounts, and the existing quote dates.

### Chart and calculation rules

- Use one point per UTC date after all transactions effective that day. Draw cost basis as a step line. A new total starts on the effective date and holds until the next change.
- Calculate each buy’s remaining cost using its receipt total and the fraction of that buy still held on the selected date. Sum across buys before rounding for display. Sales use their linked buy.
- Any held buy with unknown cost makes the whole basis unavailable for that date. A recorded zero is known. Zero holdings have zero basis. Spot quotes affect only Stack Value.
- Use the existing 30D, 1Y, and All ranges. Include purchases and sales before the visible range when calculating its opening balance.

### Slices

#### 1. Compare spot value and known purchase costs

- [x] Buy one one-ounce coin on Jan 5, 2026 for $35. With spot at $40 on Jan 5 and $42 on Jan 6, select Jan 6. One tooltip shows Stack Value $42 and Cost basis $35, with a point on each line.
- [ ] Buy a second one-ounce coin for $38 on Jan 7. The basis line stays at $35 through Jan 6 and steps to $73 on Jan 7. The Jan 7 tooltip shows $73 for basis.
- [ ] Set today to Mar 1, 2026 UTC and open 30D. Its first visible date, Jan 31, shows $73 of basis even though both buys predate the range. Select Jan 31 in 1Y and All and verify the same Stack Value and cost basis in all three tooltips.

#### 2. Show unknown costs and fill the gap after a correction

- [ ] Run the January–December example below through the receipt correction. While June’s cost is unknown, leave a gap in the basis line and show “Cost basis unavailable” in the shared tooltip. Show Stack Value wherever a quote is available.
- [ ] Save $40 on the June buy and reload. Check the corrected column below. At the same quotes, the dated Stack Value points match their values before the edit.
- [ ] Enter $0 for a held buy and verify it contributes zero to known basis. In a separate fixture, hold one $35 coin throughout 30D with no usable spot quote on or before any visible date. The $35 cost-basis line remains visible across the range. Selecting a date shows both “Cost basis $35.00” and “Stack Value unavailable” in one tooltip.

#### 3. Remove the linked purchase cost on the sale date

- [ ] Record the October sale in the example below and reload. Check the final column on Sep 30 and Oct 1. Then delete that sale and reload. September stays at $78, October and November return to $78, and December returns to $120.
- [ ] Buy three coins for $100 and sell one. Basis steps from $100 to $66.67 on the sale date. Sell the other two and it steps to $0. Earlier dates retain their respective held costs.
- [ ] Repeat the October sale with the June receipt left unknown. Basis is unavailable from Jun 1 through Sep 30, resumes at $38 on Oct 1, and reaches $80 on Dec 1.

### Acceptance example

Buy one coin on Jan 1 for $38, one on Jun 1 with unknown cost, and one on Dec 1 for $42. Correct the June receipt to $40, then record a sale linked to that coin effective Oct 1.

| Date range      | Original purchases | After receipt correction | After recording the sale |
| --------------- | -----------------: | -----------------------: | -----------------------: |
| Jan 1 to May 31 |                $38 |                      $38 |                      $38 |
| Jun 1 to Sep 30 |            Unknown |                      $78 |                      $78 |
| Oct 1 to Nov 30 |            Unknown |                      $78 |                      $38 |
| Dec 1 onward    |            Unknown |                     $120 |                      $80 |

**Stage gate:** Demonstrate the acceptance example in the browser at fixed quotes. Inspect both sides of the June and October boundaries in the shared tooltip after save and reload. Run workspace typecheck, lint, API and web tests, API end-to-end tests, and the web production build.

**Outside Stage 5:** Sale proceeds, realized gain, historical gain/loss charts, and tax reporting.
