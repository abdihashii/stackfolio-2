# Purchase-linked sales

Date: 2026-11-06 (UTC)
Status: Accepted

## Decision

- Keep each sale as its own transaction belonging to an item, linked to exactly one buy transaction for that same item.
- Start a sale from a buy in the item's history. A buy can have multiple partial sales.
- Selling from two buys requires two sale transactions in this slice. One sale spanning multiple buys is deferred.

## Validation rules

| Operation | Checks                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New buy   | Positive quantity; no future date.                                                                                                                                   |
| Buy edit  | Same buy rules; quantity must cover all linked sales; buy date must be on or before every linked sale.                                                               |
| New sale  | Positive quantity; no future date; link to an existing buy for the same item; sale date on or after that buy; quantity must fit the buy's remaining unsold quantity. |
| Sale edit | Same sale rules, excluding the sale's old quantity when calculating availability.                                                                                    |

## Reason

Selecting a purchase matches the preferred selling workflow and preserves its association for future profit/loss calculations. The validation rules prevent selling more than was bought or before it was bought.
