# Inventory ownership

Date: 2026-11-03 (UTC)
Status: Accepted

## Decision

- Keep `ItemType` for shared product facts, `Item` for an inventory entry, and `Transaction` for its buys and sells.
- Derive quantity from transactions. Keep items to support personal notes, images, location, and nicknames later.
- MVP: one implicit inventory, one item per item type.
- Future: one inventory per user, many items per inventory, and many transactions per item. Item types are shared across inventories; enforce unique `(inventory_id, item_type_id)`.

## Deferred

Auth, the `inventories` table, ownership enforcement, and personal metadata. No individual-piece tracking yet.
