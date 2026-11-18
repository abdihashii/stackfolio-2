# Item management UI

Use a dedicated item page for ownership and paginated transaction history, with a shared Dialog for purchases, sales, corrections and deletion. This keeps history readable across screen sizes without expanding forms inside inventory cards or squeezing it into a drawer. Sales start from a purchase in history, as decided in [ADR 004](004-purchase-linked-sales.md); item-level deletion remains separate from transaction actions.

## Consequences

- Preserve Dialog anatomy: **Surface → Header / Body / Actions**. Reuse it on mobile with stacked actions and scrollable content. Keep labeled fields, visible focus, keyboard containment and focus restoration; destructive confirmations initially focus Cancel.
- Preserve drafts on rejection or uncertain results. Never automatically retry an uncertain mutation: retain its target and require successful authoritative review before an explicit retry. A confirmed save/delete followed by failed refresh stays acknowledged, with read-only recovery and no mutation actions on known-deleted records.
- Explain deletion consequences: deleting a sale restores ownership; a purchase with linked sales is blocked; deleting the final transaction retains an empty item; deleting the item removes all its history. No Undo. Refresh and clamp pagination after deletion; focus a surviving heading when the trigger is gone.
- Before implementing a reloadable item route, make `GET /inventory/:id` return `item_type`, derived `quantity` and a reliable not-found response. Do not reconstruct it from paginated inventory. Preserve existing pagination and avoid linked-sale navigation or exact edit-sale bounds that the response does not expose.

The approved [Paper screens](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0) and [components](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-1-0) are the visual reference. They are static designs, not implemented components. Browser keyboard/accessibility behavior, mobile scrolling, 200% zoom, persistence and network recovery still require implementation verification.
