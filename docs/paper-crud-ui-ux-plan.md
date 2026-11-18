# StackFolio: item and transaction UI/UX design plan

Status: Stages 1–4 complete in Paper after visual verification. Stage 4 documentation is uncommitted and ready for review. Stage 3 documentation was committed as `5bd6de7`; the Dialog follow-up was committed as `365d65e`. Neither was pushed. This session changed only Paper and this plan, with no application implementation, commit, push, or deployment. The unrelated existing change in `apps/api/src/inventory/historical-value.ts` was left untouched.

Research date: 2026-11-17 UTC.

### Stage 4 delivery and visual audit, 2026-11-18 UTC

Completed twelve **Responsive / 01–12** artboards in [Paper Pages](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0). Pages now has 43 artboards; Components retains its six existing artboards. Completion notes were written after screenshot review and corrections. No guide artboards, application files, dependencies, or new design system were added.

| Responsive screen | Size | Reviewable result |
| --- | --- | --- |
| 01 Item history | 390px | Fixture summary, June sale and March purchase, visible aligned row actions, two-row pagination, separate item deletion. |
| 02 Older purchase | 390px | Page 2 of 2, January purchase with 1 of 3 remaining, Sell/Edit/Delete; Previous enabled and Next disabled. |
| 03 Add purchase | 390px | Read-only preset, quantity focus, optional acquisition date with UTC fallback, full-width Cancel/Add purchase. |
| 04 Sell older purchase | 390px | January purchase identity and availability, quantity focus, sale-date bounds, Cancel/Record sale. |
| 05 Edit purchase rejected | 390px | Draft quantity 1 retained, 2 already sold, persistent multiline rejection and neutral focus ring around the invalid field. |
| 06 Delete item | 390px | Entire-history irreversible consequence, initial Cancel focus, explicit Delete item permanently. |
| 07 Tablet history | 768px | 24px page insets, three summary columns, labeled history rows instead of a squeezed desktop table. |
| 08 Long name reflow | 320px | Illustrative expanded item name wraps to three lines; metadata, actions and pagination remain inside 16px insets. Name is a typography stress fixture, not a new editable preset field. |
| 09 Edit sale | 390px | Required effective date, original purchase unchanged, no invented availability bound or purchase navigation, quantity focus. |
| 10 Recovery long copy | 320px | Unknown sale plus failed history refresh; draft retained, Retry sale unavailable, Close for now and Review history again. Full content remains visible on a content-sized artboard. |
| 11 Delete sale | 390px | Restores 2 owned units and original purchase availability; safe Cancel focus; distinct from whole-item deletion. |
| 12 Short viewport | 390 × 444px | Reduced-height task surface with focused quantity and both 48px actions visible. Body viewport and illustrative scrollbar express scrolling above a software keyboard; complete content is preserved in screen 04. |

Responsive geometry: 16px page and task-surface outer insets at 390/320px; 24px page insets at 768px. Mobile dialogs use 20px inner padding, 24px section gaps and the existing 12px radius. Screen 12 uses 16px inner padding/gaps and square corners to recover vertical room. Fields remain 46px, dialog actions 48px, row actions at least 44px, and mobile pagination 44px. Typography and semantic colors are cloned from the established system. Disabled Overview/Settings placeholders are omitted in the compact header; Stack and Back to your stack remain available outside modal states.

All eight new dialog surfaces preserve **Surface → Header / Body / Actions**. A fresh structural check passed all **51** product dialog surfaces, including the original 43. The short-height Body has a descriptive layer-name suffix but retains its position and role. The existing desktop footer arrangements and transaction recovery layouts were not changed. Stacking the new narrow-screen actions is a responsive adaptation, not a change to the desktop rule that only Close for now deletion recovery states stack.

**Visual audit:** reviewed all twelve responsive screens and rechecked corrected variants, plus representative original desktop sale and item-deletion dialogs. Spacing, typography, contrast, alignment, wrapping, action lanes and artboard fit passed. Corrected the sale row's missing empty action lane, an inherited flex basis that collapsed the mobile Edit sale submit button, pagination target sizes, and compact-header width at 320px. Required field boundaries and neutral focus rings retain the established colors and contrast; errors use explicit text, not color alone. Exact JSX/computed styles confirmed insets, field/button heights, focus shadows and the shared hierarchy. No desktop action layout was restyled.

Canvas audit: new page checks begin at y=12400, below the previous row's maximum reviewed bottom at y=12200. New task screens begin at y=14300, below the 320px page's bottom at y=14134. Horizontal gaps are at least 80px. Content-sized artboards preserve long recovery text. Screen 12 deliberately shows a body viewport, not a truncated replacement for screen 04.

#### Screen status index

These classifications apply to every named screen in the file. **Existing** means existing Paper reference, not a claim of implemented visual/interaction parity. **Proposed** means new client behavior using supported contracts. **API dependent** means the routed item context additionally needs prerequisite 1 in section 7.

| Screen family | Status and boundary |
| --- | --- |
| Original Stack: Populated Desktop; First-use empty; Initial loading; Holdings load failure | Existing design references. Retain the previously documented date/value-copy corrections; the current app does not implement every designed control/state. |
| Original Stack: Partial pricing | Existing artwork, unsupported by the current all-or-nothing valuation response. Not an implementation acceptance target. Use Value unavailable instead. |
| Item management 01–11 | API dependent. Includes populated/older purchase, fully sold/empty, and separate item/history/value availability states. |
| Transactions 01–07 | API-dependent contextual pages; their composed dialogs and lifecycle behavior are proposed frontend work. |
| Deletion 01–07 and 09–12 | API-dependent contextual pages; deletion endpoints already exist, confirmations/recovery/focus behavior are proposed. |
| Deletion 08 Item deleted / Stack empty | Proposed outcome on the existing Stack route; no single-item read needed for this destination. |
| Responsive 01, 02, 07, 08 | API dependent, as marked in artboard names. |
| Responsive 03–06, 09–12 | Proposed task compositions, as marked in names. When entered from a reloadable item route, their surrounding context shares the single-item prerequisite. |
| Transaction dialogs / States, all 18 modal specimens plus Saved refresh failed page feedback | Proposed; ready, validation, pending, dirty, unknown, long-copy and review variants share the lifecycle below. |
| Deletion dialogs / States, all 16 specimens | Proposed confirmations and recovery, including blocked, pending, absent target and final-record states. |
| Foundations, Primitives, Compositions and Product components | Existing design library with proposed Table, item-management and Dialog additions documented by Stages 1–3. These are specimens, not additional routed screens or implemented runtime components. |

#### Compact interaction/state index

| State / interaction | Canonical specimen and responsive application | Implementation focus / behavior |
| --- | --- | --- |
| Read, page, navigate | Item management 01–02; Responsive 01–02/07–08 | Real links for Stack/Back/Manage; buttons for pagination. Preserve parent page. Item name H1, history H2, transaction rows grouped and labeled. Desktop uses appropriate table semantics. |
| Ready / dirty | Transaction ready forms; Dirty dismiss shared state; Responsive 03–04/09 | Quantity receives initial focus. No autosave. Clean Cancel/Escape restores its trigger; dirty dismissal uses the existing in-dialog discard state, never another stacked modal. |
| Invalid / server rejection | Purchase validation, Sale availability changed, Linked-sale rejection, Sale date rejection; Responsive 05 | Preserve draft. Associate label/helper/error with the field; invalid fields use `aria-invalid` and described-by error text. Focus first invalid field after submit; announce the rejection once. |
| Saving / deleting | Shared Saving and Deleting specimens | Stable-size pending label, no duplicate mutation, stable focus, bounded dismissal lock. Resolve into confirmed success, explicit rejection or unknown recovery. |
| Confirmed save / refresh failure | Transactions 05–06; Saved refresh failed page feedback | Close only after persistence; refresh authoritative reads. Saved-but-stale remains persistent with read-only refresh, never a second submit. |
| Unknown / review / failed read | Transactions 07; Result unknown, Returned draft, History read failed, Availability refreshed; Responsive 10 | No automatic mutation retry. Preserve target/draft through in-app navigation. Review closes dialog and focuses persistent notice. Failed read keeps retry unavailable; explicit checked retry requires successful authoritative review. |
| Destructive confirmation / blocked | Deletion 01–04/12; Responsive 06/11 | Initial Cancel focus, or Close for blocked purchase. Item deletion is separate from row deletion. No Undo, implicit cascade shortcut or fabricated linked-sales navigation. |
| Deletion unknown / reviewed / absent / refresh failure | Deletion 10–11 and corresponding gallery recovery states | Read by stable target identity across relevant pages. Missing is neutral, not attributed success. Known-deleted targets have no mutation actions. Safe exit retains recovery. |
| Successful deletion / focus restoration | Deletion 05–09 | Refresh and clamp history; removed trigger falls back to history heading. Deleted item returns to Stack and focuses Your stack. Empty retained item differs from absent item. |
| Item / history / value loading or unavailable | Item management 05–11 | Separate regions and read retries. Never render missing data as real zero or empty history. Announce status politely, not the entire history after refetch. |
| Fully sold / empty retained item | Item management 03–04; Deletion 07 | Keep Add purchase. Fully sold retains history and disables Sell; no transactions hides pagination. |
| Short height / keyboard / zoom | Responsive 08/10/12 and complete form 04 | Keep Header/Actions outside a scrollable Body when they fit; scroll focused fields into view. If zoom leaves insufficient body room, allow the whole task surface to scroll so all content/actions remain reachable. No toast over a focused field or action. |

All modal variants require a title-linked dialog, inert background, contained Tab/Shift+Tab, and task-specific focus restoration. Give repeated row buttons transaction-specific accessible names, such as “Edit purchase, 10 Jan 2026.” On submit, scroll the invalid field and its linked message into view. Preserve the neutral focus ring even when the border is red. Do not rely on autofocus to open a software keyboard; verify actual device behavior. Respect reduced motion with immediate state changes and no required animation. Shared toast timing remains eight seconds with pause on hover/focus; actionable or uncertain feedback remains persistent.

#### Acceptance coverage, independent fixture resets

Every section 8 scenario has an assigned design reference and outcome. Shared state specimens apply at each viewport rather than duplicating every permutation.

| Scenario | Design reference and review outcome |
| --- | --- |
| Add same preset again | Transactions 01 / Responsive 03 plus shared confirmed-success lifecycle: same item, another purchase, quantity increases. |
| Omit acquisition date | Responsive 03 visibly states UTC-today fallback; no unknown/null date invention. |
| Sell 1 from January | Responsive 02 → 04; original 1 remaining becomes fully sold, March remains available. Reset fixture for the next scenario. |
| Sell more than remaining | Sale availability changed and Availability refreshed specimens; reuse narrow layout from 04/05, preserve draft and require correction. |
| Edit January 3 → 4 | Transactions 03 → 05: quantity 4, identity/recorded time preserved. Responsive 05 uses the same fields when corrected. |
| Edit January to 1 with 2 sold | Responsive 05 and Linked-sale rejection: retained input, no saved change. |
| Invalid purchase/sale date order | Linked-sale rejection / Sale date rejection; Responsive 05/09 establish narrow field/error wrapping. Server remains authoritative. |
| Delete purchase with linked sale | Deletion 04 / blocked specimen: Close only, no destructive confirmation. |
| Delete June sale | Responsive 11 / Deletion 02 → 05: ownership 5, January availability 3. |
| Delete final transaction | Deletion 12 → 07: retained empty item and Add purchase. |
| Fully sell all purchases | Item management 03: zero owned with history, no active Sell. |
| Delete item | Responsive 06 / Deletion 03 → 08: explicit irreversible cascade, Stack destination. |
| Lost purchase/sale response | Shared Result unknown and Transactions 07; Responsive 10 shows failed-read branch with no resend. |
| Save succeeds, refresh fails | Transactions 06 / Saved refresh failed specimen: saved acknowledged, only read retry. |
| Missing pricing / history / item | Item management 05–11, distinct from real zero/empty states. |
| Delete last row on last page | Deletion 09: last-valid-page clamp and history-heading focus; Responsive 01–02 preserve the same two-row paging contract. |

**Verification limits:** Paper static layout and design coverage are complete. Paper normalizes requested scroll overflow to a clip; screen 12's scrollbar is illustrative. Its complete form remains on screen 04, so no field, helper or action was removed to make the short view fit. Actual scrolling, software keyboards, 200% browser zoom, screen-reader announcements, Tab/Escape behavior, reduced motion, persistence and network/database outcomes were not executed. Implement and manually verify these in the browser, including 320px CSS reflow and 200% zoom at both desktop and narrow widths. The single-item API prerequisite remains outstanding. No application test suite was run for this Paper/document-only stage.

Proposed documentation commit: `docs(design): finalize responsive CRUD states and acceptance`. Stop here for review; no commit, push or application implementation is authorized by this completion note.

### Dialog primitive follow-up, 2026-11-18 UTC

Added **Components → Primitives → 05 · Overlays → Dialog** as the shared design source for transaction and deletion dialogs. Both state galleries reference it. The primitive defines Overlay, Surface, Header, Body and Actions, with a neutral shell specimen and standard, destructive, stacked Close for now, and single-action footer specimens cloned from the existing controls.

The shared geometry remains 480px maximum width, 28px padding, 24px section gaps, 12px radius, 32% charcoal overlay and 48px action targets. Header descriptions are optional; task content and feedback compose inside the body. Only Close for now recovery states use stacked full-width actions. Forms, confirmations and recovery retain their existing content and state rules.

The primitive records modal labeling, inert background, focus containment and restoration, task-specific initial focus, dirty dismissal, bounded pending behavior and body scrolling at short heights. Backdrop clicks do not dismiss; explicit Cancel and Escape follow the documented clean/dirty/pending rules. Product compositions own validation, consequences and mutation recovery. Paper specimens remain editable design compositions, not linked runtime components.

Structure applied to all **43 existing dialogs**: 18 transaction specimens, 16 deletion specimens and 9 contextual dialogs on Pages. Every surface now has exactly **Dialog / Header → Dialog / Body → Dialog / Actions**. Existing context, fields and inline feedback were moved into Body frames with the same 24px gaps; original content nodes and action groups were preserved. Contextual scrims are named **Dialog / Overlay · Background inert**. The saved/refresh-failed page-feedback specimen remains outside this modal structure because it represents feedback after the dialog closes.

Structure verification checked all 43 surfaces for the three ordered sections and exact preservation of body child IDs/order. No issues found. All 34 gallery dialogs retained their measured heights. Screenshots rechecked ready forms, long-copy variants, uncertain/failed-read recovery, deletion confirmations, large quantities and representative full-page dialogs: no changes to spacing, typography, contrast, alignment, wrapping or fit. Existing inline, stacked and single-action layouts remain intact. This applies the shared design anatomy; the eventual application will implement the reusable dialog component.

Verification: screenshot review of the shell, all four action layouts and the complete primitive; typography/style comparison with existing dialogs; canvas fit and spacing check. Spacing, hierarchy, contrast, alignment, wrapping and fit passed. No existing product screen was redesigned, no new artboard or application code was added during this follow-up. Stage 4 was untouched at that point and is now recorded above. Committed as `365d65e`, `docs(design): define shared dialog primitive`; not pushed.

### Stage 3 delivery and visual audit, 2026-11-18 UTC

Completed in [Paper Pages](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0) and [Components](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-1-0). Completion was recorded only after screenshot review and corrections. Existing Stage 1 and Stage 2 artwork is preserved; no guide artboards were recreated.

**Pages:** twelve new desktop screens, named **Deletion / 01–12**, below Stage 2. Pages now has 31 artboards.

| Screens | Visible behavior |
| --- | --- |
| 01 Delete purchase; 02 Delete sale; 03 Delete item permanently | Separate consequences and explicit irreversible actions. Cancel receives initial focus. Item deletion remains separate from history-row actions. |
| 04 Purchase blocked | January purchase has linked sales. Close only, no destructive confirmation, cascade shortcut, or linked-sales navigation. |
| 05 Sale deleted | June sale removed; March and January purchases remain. Quantity 5, weight 5 ozt, value $150; January has 3 of 3 remaining. |
| 06 Purchase deleted | March purchase removed; June sale and January purchase remain. Quantity 1, weight 1 ozt, value $30. |
| 07 Final transaction removed | Item retained at zero quantity with no transactions, Add purchase available, and history-heading focus. |
| 08 Item deleted / Stack empty | Independent fixture with this as the only item. Return to Stack, zero items, removed history, focus on Your stack. New purchase remains available. |
| 09 Last history page clamped | Independent fixture: January purchase 3, February purchase 1, March purchase 2, no sales. Delete January, the sole row on page 2. Page 1 of 1 now shows March and February; quantity 3, weight 3 ozt, value $90. Focus moves to the history heading. |
| 10 Review uncertain deletion | Persistent notice retains the June sale target while paginated history is usable. Refresh history and Return to deletion review are available. Cached quantities are explicitly unconfirmed. |
| 11 Deleted but refresh failed | Confirmed June deletion, persistent stale-data warning, read-only refresh recovery. The cached sale row says Deleted and has no Edit/Delete action. |
| 12 Last transaction confirmation | Independent fixture with only the March purchase of 2 units. Warns before confirming that deletion leaves an empty retained item; leads to screen 07. |

**Components:** **Deletion dialogs / States** contains sixteen specimens: purchase, sale and item confirmations; linked-sale block; deleting; confirmed transient rejection; unknown transaction and item deletion; reviewed/still-present sale; failed history read; missing sale; confirmed deletion with failed refresh; final purchase; reviewed/still-present item; missing item; and a large-quantity wrapping check. The gallery sits beside Transaction dialogs with a 160px canvas gap. Components now has six artboards.

Reused the existing dialog geometry, item-page compositions, neutral/error feedback and approved success toast. Destructive fills use `#8A3030`; controls retain the neutral focus ring. At the user's request, **only states containing Close for now** use stacked, full-width actions (unknown transaction, unknown item, failed history read). All other deletion dialogs retain side-by-side actions. The 2,147,483,647-unit specimen tests wrapping, not a change to the standard fixture.

Deletion interaction details for implementation:

- Use the existing `DELETE /inventory/:itemId/transactions/:transactionId` and `DELETE /inventory/:itemId` contracts. Preserve the target's stable IDs and displayed identity through recovery; never substitute a new item of the same preset. No application endpoint or data-model change was made.
- Enter irreversible confirmations on Cancel; enter the blocked state on Close. Use a labeled dialog, inert background and contained keyboard navigation. Clean Escape/Cancel restores the trigger. During a bounded pending request, keep focus stable, prevent duplicate submission and prevent dismissal until success, rejection or unknown recovery resolves the pending state.
- Cached remaining quantity may identify an already-blocked purchase, but the server remains authoritative. A new linked-sale rejection replaces the confirmation with the blocked state. Do not infer precise sale links from dates, quantities or history order.
- Unknown responses never automatically resend deletion. Review history/stack closes the modal and focuses a persistent recovery notice; keep the target in the current app session through app navigation. Reload persistence is not guaranteed. Close for now also leaves recovery available. Return to deletion review does not submit.
- Enable an explicit **I've checked, delete sale/item** only after successful reads establish that the same target still exists and the user reviews the consequence again. A target absent from one paginated result is not proof of removal: inspect all relevant pages by stable ID, or use a reliable authoritative item read once the documented API prerequisite is met. A failed read keeps retry unavailable and provides a safe exit to the persistent refresh action. Missing records get neutral recovery, not an attributed success or a validation error.
- The immediate retry specimen applies only to an explicitly transient, confirmed rejection that guarantees this request made no change. A lost response or ambiguous server failure uses unknown recovery instead. Shared purchase deletion recovery uses the same identity/read gates, plus the linked-sale block.
- After confirmed transaction deletion, refresh item, history, inventory and valuation; clamp an emptied history page to the last valid page and focus its heading. If no transactions remain, hide pagination and retain the item. After item deletion, return to the retained Stack page, clamp it if necessary, and focus Your stack when its triggering row is gone. Zero items uses the empty Stack state.
- Confirmed deletion followed by failed reads stays acknowledged as deleted, with persistent stale-data feedback and a read-only retry. Never enable mutation actions on the known-deleted target. The same rule applies to item deletion on Stack. Successful non-action toasts use the existing eight-second/pause behavior and do not take focus; no Undo is offered.

**Audit findings corrected before completion:** reserved space below the item-delete entry so toasts cannot cover it; rendered the post-delete focus cue on a frame around the heading; stacked only Close for now action groups to prevent wrapping; retained a visible focus cue while deletion is pending; disabled the final-transaction page's Previous action; and removed mutation actions from the confirmed-deleted cached sale. The cloned empty Stack purchase form uses the established stronger field boundaries and UTC blank-date helper.

**Verification:** screenshots of all twelve contextual screens, all sixteen states and the full gallery; targeted rechecks after corrections; hierarchy/style inspection; canvas coordinates; and source checks of transaction deletion, item removal, entity cascade, frontend refresh behavior and existing deletion test cases. Spacing, heading/body hierarchy, action alignment, wrapping, contrast and artboard fit passed. Contrast calculations: destructive text/white 8.25:1, error text/tint 7.67:1, supporting text/neutral feedback 7.00:1, and field boundary/white 3.56:1. The gallery and page rows do not overlap. Ownership, paging, focus destinations, retained-empty versus removed-item outcomes, and no-Undo/no-cascade/no-linked-sales-shortcut constraints match the plan.

Limits: static desktop design verification only. Keyboard behavior, recovery persistence, network classification, authoritative refresh and cascade behavior were specified or checked against source, not exercised at runtime. The single-item read prerequisite remains future implementation work. No application test suite was run because only Paper and this document changed. Stage 4 responsive work was not started.

Committed after explicit sign-off as `5bd6de7`, `docs(design): specify deletion safeguards and recovery`; not pushed.

### Paper guide consolidation, 2026-11-18 UTC

The Stage 1 and Stage 2 guide artboards were removed at the user's request after their notes were reconciled here. Historical delivery/audit references to those guides below describe the earlier review, not current Paper contents. Pages now contains screens only; reusable dialog states remain in Components.

Carry-forward details from the removed guides:

- Stack → Manage opens item management. Back restores the inventory page; history Next/Previous changes only history pagination. After adding a transaction, retain and refresh the current history page even if its rows shift.
- Independent fixture outcomes: add 1 with a blank date yields 4 owned and a separate server-UTC-dated purchase; sell January's remaining 1 yields 2 owned, January fully sold and March's 2 still available. Editing January from 3 to 4 yields 4 owned, 4 ozt and $120 at the illustrative quote, with identity and recorded timestamp unchanged.
- Request mapping: purchase uses `POST /inventory` with fixed `item_type_id`, `quantity`, optional `acquisition_date` (omit blank); sale uses `POST /inventory/:itemId/sales` with row `buy_id`, `quantity`, `sale_date`; edit uses `PATCH /inventory/:itemId/transactions/:transactionId` with `quantity`, `effective_date`. Quantities are positive integers no greater than 2,147,483,647.
- Dialog initial focus goes to quantity; dirty-dismiss initial focus goes to Keep editing. Explicit Cancel discards; dirty Escape/navigation asks before discarding. Returning from history focuses the recovery heading; if a trigger row moved, restore focus to the history heading. At short viewport heights retain 24px outer space and scroll the dialog body.
- If refreshed sale availability is zero, explain fully sold and offer Cancel. Failed reads preserve inputs and keep submission unavailable. Removed records disable saving and offer Refresh history. Never resend a confirmed submission.

All other guide rules, screen inventories, visual values, accessibility requirements and implementation boundaries are retained in the delivery notes and sections 3–8 below.

### Stage 2 delivery and verification

Audit follow-up: both recovery findings corrected in Paper and visually rechecked. Unknown-result **Review history** closes the modal while retaining the draft in the current app session, focuses a persistent page banner, and makes paginated history usable. **Return to draft** restores inputs; after successful reads, an explicit **I've checked, retry sale** action resubmits once. **Already recorded, close draft** resolves without resubmitting. A failed-read specimen disables retry and offers **Close for now** or **Review history again**. App navigation retains the draft/banner; reload persistence is not guaranteed. These shared rules also apply to purchases. Components now includes three additional recovery specimens; Pages adds **Transactions / 07 Review uncertain sale**.

Availability recovery now separates cached guidance from authoritative reads: rejection shows **Last checked: 2 remaining** and generic insufficient-availability copy; refresh shows **Refreshed: 1 remaining**, preserving quantity 2 for correction. Submission stays unavailable until refresh succeeds and the quantity is valid. Zero availability and failed-read behavior are annotated. The rejection response itself is never treated as a fresh count. Screenshots checked the revised rejection, refreshed availability, returned draft, failed-read exit and contextual review page for wrapping, alignment, contrast and fit. Both audit findings are closed at the static design level; runtime guarantees remain untested.

Completed 2026-11-17 UTC in [Paper Pages](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0). Existing Stage 1 screens remain intact.

- **Transactions / 01–04:** Add purchase, Sell older purchase, Edit purchase and Edit sale, each over the existing item page. Sell and Edit purchase retain the January purchase on history page 2; Edit sale starts from the June sale on page 1.
- **Transaction dialogs / States**, on [Components](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-1-0): four ready forms, purchase validation, sale availability rejection, linked-sale purchase rejection, sale-date rejection, saving, result unknown, dirty dismissal and saved/refresh-failed feedback. Shared lifecycle annotations apply to all four mutations; four additional long-copy specimens verify wrapping. Pages retains the contextual screens and walkthrough guide.
- **Transactions / 05–06:** confirmed purchase edit with refreshed summary/history and approved success toast; confirmed save with persistent stale-data warning and read-only refresh recovery.
- **Stage 2 guide:** independent acceptance walkthroughs, exact request field/endpoint mappings, UTC rules, server-only linked-sale constraints, focus/error associations, dirty/pending dismissal, unknown-result review and explicit retry, removed-record recovery, refresh boundaries and stage exclusions.
- Reused existing quantity/date fields, neutral feedback, toast and item-page compositions. New dialog geometry: 480px width, 28px padding, 24px section gaps, 46px fields, 48px actions, 12px radius and charcoal scrim at 32%. Darkened new field boundaries to `#85888C`; error fields retain the neutral focus ring.
- Corrected the shared Date input's optional-value and feedback annotations: omitted purchase date uses the server's recorded UTC date; transaction edits require the stored effective date. No preset picker, reassignment, price, proceeds or P/L fields were added.

Verification: inspected screenshots of all four contextual dialogs, twelve state specimens, four long-copy variants, two outcome pages, the guide and corrected date annotations. Spacing, hierarchy, contrast, action alignment, wrapping and fit passed after fixing a toast/action overlap, banner-to-summary spacing and the sale-date error focus cue. Containers grow with their content. Request fields and routes were checked against the transaction DTOs and inventory controller. The successful edit fixture shows 4 owned, 4 ozt and $120 at the illustrative $30 quote, with 2 of 4 remaining in the January purchase and unchanged recorded time. The guide traces repeat purchase and partial-sale outcomes independently.

Limits: static desktop design verification only. Focus, dirty dismissal, request bounds, retry gates and server responses are specified behavior, not wired interactions. Browser accessibility, real network behavior, mobile/reflow and API tests remain later implementation work. No application suite was run because no application code changed. Stage 3 deletion confirmations and Stage 4 responsive layouts were not started.

Proposed commit, awaiting explicit sign-off: `docs(design): specify purchase sale and edit flows`. No commit or push performed in this stage.

### Stage 1 audit

Result: passed after corrections. Audit covered the Stage 1 acceptance criteria, all eleven item-management screens, navigation guide, product compositions, and shared Table variations through fresh screenshots, JSX, computed styles, contrast calculations, and a check against the current inventory read contract.

| Finding                                                                                     | Correction and recheck                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delete text failed normal-text contrast in hover (4.41:1) and pressed (3.96:1) states.      | Reused the existing darker error text `#8A3030`: now 6.37:1 and 5.72:1. Pending status text is also readable at 7.64:1.                                                        |
| Stack rows retained a fixed 100px height, unlike the shared Table growth rule.              | Canonical Stack composition and populated page now use minimum 100px height with automatic growth. Existing content remains aligned.                                           |
| Price retrieval had an error state but no explicit pending state after item/history loaded. | Added **11 Value loading**: value skeleton and loading status, with quantity/history preserved and no invented value or quote timestamp. Updated the navigation guide's index. |

Verified: 3 owned, 3 ozt, $90 at the illustrative $30/ozt quote; two history pages with the older purchase showing 1 of 3 remaining; retained history and no active Sell on fully sold purchases; retained empty items; distinct loading, missing-item, history-error, and price-error states. Shared columns, action targets, focus examples, pagination, wrapping, and artboard fit passed visual inspection. No unresolved Stage 1 design blockers.

Limits: this is a static desktop design audit, not a runtime accessibility or API test. Forms, confirmation dialogs, and mobile layouts remain in Stages 2–4. The single-item API response prerequisite remains documented for later application implementation. Existing main-page date/value-copy mismatches remain annotated as the plan requires. No commit or next-stage work is implied by completion.

### Stage 1 delivery

- Table variation gallery now shows eight cell patterns, six action states, loading/empty/initial-error/refresh-error bodies, six pagination states, and pagination-button interaction states under Primitives → Data display → Table. These reuse the existing Pagination and Inline feedback compositions.

- Follow-up: added **Table** under Primitives as the shared design source for Stack list and Transaction history. Both primary list compositions and populated pages now use explicit Table / Header / Body / Row / Footer anatomy. Column widths, cell content, and actions remain product-specific; pagination, availability rules, and semantic HTML expectations are documented on the primitive. Paper examples are design compositions, not linked code components.

- [Pages in Paper](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0): eleven numbered Item management artboards below the original Stack, plus a Stage 1 guide with navigation, state index, fixture, and implementation annotations.
- Screens: populated, older purchase (history page 2), fully sold, no transactions, history loading, history unavailable, value unavailable, item loading, item not found, item unavailable, and value loading.
- [Components in Paper](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-1-0): appended Item management compositions under Product components. Reused the header, primary button, pagination, neutral badge, and inline error feedback. Added identity/summary and purchase/sale/fully sold row specimens.
- Original Stack artwork preserved. Its acquisition-date, fine-metal valuation, and Manage-navigation corrections are annotated on the guide. All sample values are illustrative; fully sold uses an independent buy-3/sell-3 fixture.
- Screenshot review: hierarchy and spacing match Stack; fixed transaction lanes align; actions and feedback are readable; content fits without clipping. Checked both history pages and all availability variants. No missing data is presented as zero ownership or an empty history.
- Stage boundary: action entry points are drawn; forms, confirmation dialogs, and mobile layouts remain for Stages 2–4. These are static Paper screens, not wired navigation or implemented API behavior.
- Verification: screenshot review and Paper structure/style inspection; local Markdown formatting check. No application test suite run because this stage changes only Paper and this document.
- Proposed commit, pending explicit sign-off: `docs(design): specify item management and transaction history`.

## 1. Recommended direction

Extend the existing Stack design with one focused **item management page** and compact dialogs for purchases, sales, transaction edits, and deletion. Keep the current main-page purchase form. Open management from its existing **Manage** link; preserve the Stack header, palette, typography, spacing, and quiet list treatment.

The user asked research to decide the interaction architecture. A dedicated page gives the item's transaction history a stable home, accommodates pagination and fully sold items, and avoids expanding several forms inside inventory rows. Dialogs keep short tasks in context. A drawer would squeeze history and create a second narrow layout without removing the need for a complete item view. A larger management form on every inventory row would make the main Stack page harder to scan.

This page is a **proposed navigation change**, not an existing route. The app currently has only `/`. Direct navigation and reload require the single-item API to return the same usable item shape as the inventory list; that is a small implementation prerequisite to record, not work to perform during this design task.

Use **purchase** and **sale** in user-facing copy, with `buy` and `sell` retained in API annotations. “CRUD” does not mean a generic editable item record here: a first purchase creates an item, later purchases join it, quantities come from transactions, and preset definitions are read-only.

## 2. Current capability and scope

The Stage 2 product model takes precedence over older Stage 1 examples and illustrative Paper content. [CONTEXT.md](../CONTEXT.md), [Stage 2](stage-2-mvp.md), and [purchase-linked sales](adr/004-purchase-linked-sales.md) define the terminology and business rules.

| Capability                 | Implemented behavior                                                                                                                                                                               | Design treatment                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Create item / purchase     | Choose one of nine presets; positive integer quantity; optional acquisition date. A first purchase creates the item; later purchases of that preset create separate transactions in the same item. | Preserve the main form; add a preset-locked **Add purchase** dialog on item management.                                          |
| Read inventory             | Twelve items per page, ordered by item creation descending. Count includes zero-quantity items.                                                                                                    | Preserve main list and pagination. Label count “items,” not “units owned.”                                                       |
| Read item                  | Name, metal, fine-metal weight per unit, purity, derived quantity, total fine-metal weight, current spot value.                                                                                    | Item identity and a compact summary above history. No editable quantity or single item acquisition date.                         |
| Read history               | Two transactions per page; newest effective date first, then recorded timestamp and ID. Purchases include remaining quantity.                                                                      | Clear transaction rows and existing pagination pattern. Show effective dates and distinguish Purchase from Sale with words.      |
| Record sale                | Starts from one purchase; quantity cannot exceed that purchase's unsold quantity.                                                                                                                  | **Sell from this purchase** on eligible purchase rows. No global Sell button requiring an unimplemented purchase picker.         |
| Edit purchase              | Quantity and effective date only. Quantity must cover linked sales; date must not move after any linked sale.                                                                                      | **Edit purchase** dialog with read-only item identity and the two editable fields.                                               |
| Edit sale                  | Quantity and effective date only. Must remain valid against its original purchase and other sales.                                                                                                 | **Edit sale** dialog. Do not offer reassignment to another purchase or item.                                                     |
| Delete transaction         | Sale can be deleted; purchase can be deleted only without linked sales. Last transaction removal leaves an empty item.                                                                             | Separate confirmations for purchase and sale. Explicit blocked-purchase state.                                                   |
| Delete item                | Permanently removes the item and all purchases and sales, including linked history.                                                                                                                | Separate, less prominent item-level action with full cascade warning. Never describe it as a sale.                               |
| Fully sold item            | Item and history remain, quantity zero.                                                                                                                                                            | “None currently owned” summary; purchase rows can say “Fully sold.” Add purchase and history remain available.                   |
| Empty history              | Item remains after deleting its final transaction.                                                                                                                                                 | “No transactions” with Add purchase. Distinguish from a fully sold item with retained history.                                   |
| Current valuation          | Fine-metal weight × quantity × matching USD spot quote. Total is calculated across all items server-side.                                                                                          | Show quote timestamp in UTC and resale caveat. Never sum the current inventory page into whole-stack value.                      |
| Missing quotes             | Current quote service requires both gold and silver; failed quote retrieval prevents valuation.                                                                                                    | Item/history remain usable; show value unavailable. Paper's partial-value illustration is not supported by the current response. |
| Correction of wrong preset | No item-type edit or transaction reassignment.                                                                                                                                                     | No Edit item / Change preset control. Leave as an explicitly unresolved product workflow.                                        |

Not in this design scope: historical charts/ranges, P/L, acquisition costs, fees, sale proceeds, cash, tax accounting, custom items, mint years, brands/dealers, notes, images, auth, search, filters, allocation, configurable sorting, and bulk actions. Stage 3 remains a separate scope discussion. Overview and Settings are illustrative disabled navigation, not newly designed destinations.

## 3. Existing Paper scheme to preserve

Evidence: inspected the [Stack page and states](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-2-0) and [component library](https://app.paper.design/file/01M70ZZP8J0JMJ457JD4K0QC1T/p-1-0) through screenshots, JSX, hierarchy, and computed styles. The file has no registered design tokens. Its Foundations swatches are visual references; do not claim token bindings exist.

### Exact existing visual values

| Role                              | Existing value                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Canvas                            | `#F6F5F0`                                                                                    |
| Surface                           | `#FFFFFF`                                                                                    |
| Foreground / primary fill         | `#242629`                                                                                    |
| Muted text                        | `#686B70`; some supporting/action text uses `#505458`                                        |
| Divider / decorative field border | `#DDDEDF`, 1px                                                                               |
| Primary hover / pressed           | `#414347` / `#111214`                                                                        |
| Disabled fill / text              | `#E2E2E2` / `#949494`                                                                        |
| Error text                        | `#B43D3D`                                                                                    |
| Success feedback                  | `#F1F7F3` fill, `#C9DED0` border                                                             |
| Error feedback                    | `#FCF5F5` fill, `#E5C7C7` border                                                             |
| Neutral feedback                  | `#F5F5F5` fill, `#DDDEDF` border                                                             |
| Keyboard focus                    | 2px white separation plus 2px `#242629` outer ring; focused field border `#242629`           |
| Main desktop                      | 1440px width, 64px side padding, 88px header; 40px inventory/form gap                        |
| Main columns                      | 904px inventory and 368px purchase form                                                      |
| Inventory lanes                   | 432px item/specification, 96px quantity, 120px weight, 156px value, 100px action; 100px rows |
| Purchase surface                  | White, 12px radius, 1px border, 28px padding, 24px vertical gaps                             |
| Fields                            | 46px height, 6px radius, 12px horizontal padding; label gap 9px                              |
| Primary button                    | 48px height, 6px radius, 16px decorative icon, 8px icon/text gap                             |
| Inline feedback                   | 12px padding, 6px radius, 8px title/body gap                                                 |
| Toast                             | 432px desktop width; mobile viewport minus 32px; desktop inset 24px, mobile inset 16px       |

| Typography role            | Existing style                                           |
| -------------------------- | -------------------------------------------------------- |
| Brand                      | Inter, 28/36px, 600, tracking -0.04em                    |
| Main value                 | System sans-serif, 56/68px, 500, tracking -0.045em       |
| “Your stack” heading       | System sans-serif, 26/32px, 500, tracking -0.035em       |
| Form / section heading     | System sans-serif, 22/28px, 500, tracking -0.03em        |
| Body                       | System sans-serif, 14/21px, 400                          |
| Control label              | Inter, 14/20px, 500; existing field values commonly 13px |
| Field label                | System sans-serif, 13/16px, 500                          |
| Supporting text            | System sans-serif, 13/20px, 400                          |
| List name / monetary value | System sans-serif, 16/20px, 500                          |
| List column heading        | System sans-serif, 12/16px, tracking 0.06em              |

Reuse the document's mixed system-content / Inter-control typography. Do not convert the whole design to a new font or new brand. A new item-page H1 can reuse the existing 26/32px heading style. A dialog can reuse 22/28px. Heading semantics must follow page structure, not visual font size.

### Reuse and minimal additions

Already present: primary button interaction states, searchable preset dropdown, integer quantity field, date field and calendar states, navigation, badges, pagination, inline feedback, approved Toast V1, and eight Add to your stack states (ready, saving, success, rejected, result unknown, catalog loading, empty, and failed).

Add only the missing compositions: item header/summary, purchase and sale history rows, dialog shell, secondary Cancel action, destructive action/confirmation, and an explicit unavailable action with explanation. Reuse feedback and pagination inside these compositions. No component framework, new icons package, global token migration, or second design system is needed for a Paper plan.

Proposed dialog geometry, clearly new: 480px maximum width, 28px padding, 12px radius, 24px section gaps, and the existing 46px fields / 48px buttons. Allow height to grow and the content region to scroll. Use one restrained dark scrim; its exact opacity is a design-stage decision, not an extracted existing value.

### Content mismatches to resolve in the new design

1. Main Paper rows show one acquisition date, but an item aggregates several purchases and its parent `acquisition_date` can become stale. Omit that date from the item summary. Dates belong to purchase rows.
2. Existing value copy says “weight, purity, quantity,” reflecting Stage 1. Use **“Based on fine-metal weight, quantity, and spot price. Actual resale value may differ.”** Purity remains a product fact and is not multiplied into preset fine-metal weight again.
3. The Paper date primitive says an omitted date saves as null and must not become today. Current purchase transactions instead use the server's UTC recorded date. Preserve optional entry, but state **“Leave blank to use today's date in UTC.”** An edit shows the stored required effective date. Do not invent an “unknown date” flag that the API does not store.
4. Paper's “Known stack value / Partial estimate” state is a future-compatible concept, not currently obtainable from the all-or-nothing quote response. Design the supported unavailable state now.
5. The current UI deletes transactions immediately. Add a contextual confirmation because deletion changes ownership records and cannot be undone. This is a proposed interaction improvement, not an existing behavior.
6. Keep the Manage label, but use a same-app navigation cue rather than an external-link arrow. Its destination is this item's management page.

## 4. Screen and interaction inventory

### A. Item management page

Header: existing StackFolio shell with Stack active; a **Back to your stack** link; item name as H1; read-only metal, fine-metal weight per unit, and purity. Preserve the parent inventory page when returning.

Summary: Quantity owned, Total fine-metal weight, Current spot value, quote timestamp in UTC. Give current spot value more prominence than metadata, without adding dashboard metrics. Keep unavailable pricing separate from unavailable item data.

Primary action: **Add purchase**, preselected to this item's immutable preset. Transaction history follows immediately, rather than hiding behind another “Edit transactions” menu. Item-level **Delete item** sits below history with a short explanation, away from routine row actions.

History columns on desktop: effective date, type, quantity, remaining from purchase, and actions. Use fixed action lanes. Purchase and Sale labels plus `+3` / `−2` quantities can help scanning; the words carry meaning without depending on color or signs. Purchase rows show “1 of 3 remaining”; sale rows use an empty remaining slot rather than a fabricated number. Keep recorded timestamp available as secondary row metadata, clearly distinguished from the effective date.

Purchase actions: **Sell**, **Edit**, **Delete**. Sale actions: **Edit**, **Delete**. Prefer visible text actions over an additional overflow menu at this scale. Fully sold purchases display a status label and no active Sell action. Do not add a linked-purchase label to sale rows until the API exposes that relationship.

Required page variants: populated; fully sold with history; zero quantity with no transactions; item loading; item not found; item load failure with retry; history loading/failure; value unavailable; paginated history. Initial item failure must not be shown as a legitimate empty item.

### B. Add purchase

Main Stack keeps the existing catalog form. Within item management, show the selected item as read-only, followed by Quantity (default 1) and Acquisition date (optional, initially blank). **Add purchase** and **Cancel** are the actions. The main form's “Add item” label may become **Add purchase** for consistency while retaining its “Add to your stack” heading.

An empty date uses the UTC date when the server records the purchase. Do not silently present an omitted value as a historical fact the user supplied. After confirmed success, close the dialog, refresh item/history/whole-stack value, and show a short success message. The main form resets only after confirmed success, following its existing Paper spec.

For a purchase added from the main form, include a **View item** success link using the returned item ID once the detail route exists. Existing items keep their creation-based inventory position, so a repeated purchase may affect an item on a later page. Do not imply it moved to the top or guarantee that page 1 reveals it. Purchases made inside item management stay in that item; Back to your stack retains the earlier inventory page.

Catalog loading, failure, empty, search with no matches, validation, saving, rejection, and uncertain outcome are already specified in Paper. Reuse them rather than redrawing every permutation. Item-specific Add purchase does not need a catalog chooser.

### C. Sell from one purchase

Open from a purchase row, including rows reached on later history pages. The dialog names the item, purchase effective date, original purchased quantity, and current remaining quantity. Fields: Quantity to sell (default 1) and Sale date (default today UTC). Labels and copy make clear that this is one purchase, not the whole item's quantity.

Quantity range is 1 to that purchase's remaining amount. Sale date is on or after its purchase date and no later than today UTC. Show **Record sale** / **Cancel**. One short helper explains that selling from another purchase is a separate sale. Do not introduce price, proceeds, fees, or cash fields.

If another action changes availability before saving, keep entered values and show the server rejection beside the form. Refresh history and availability without discarding the draft. Revalidate against the server on every submit; the displayed remaining quantity is guidance, not a guarantee.

### D. Edit purchase / Edit sale

Two titles, one compact form composition: read-only item and transaction type; required effective date; positive integer quantity; **Save changes** / **Cancel**. Prepopulate the stored values. Do not change transaction type, preset, purchase link, or recorded timestamp.

For a purchase, the loaded row supplies purchased and remaining quantities, so “2 already sold from this purchase” can be derived. The earliest linked-sale date is not available in the current history response; do not show a supposedly exact maximum date. For a sale, its purchase date and maximum editable quantity are also unavailable in that response; use generic explanatory help and server validation rather than inventing precise limits.

Representative messages:

- Purchase quantity: “This purchase already has linked sales. Quantity cannot be lower than the amount sold.” If the displayed count is current and available, add it as context.
- Purchase date: “Purchase date cannot be after a linked sale.”
- Sale quantity: “This quantity exceeds what is available from the purchase.”
- Sale date: “Sale date cannot be before its purchase.”
- Future date: “Choose today or an earlier date in UTC.”

A confirmation of saved changes is not an immutable audit history. The API updates the existing record. Do not show before/after audit events as persisted data.

### E. Delete purchase, sale, or item

Use three explicit confirmations, not one vague “Are you sure?” dialog:

| Action                        | Consequence stated before confirm                                                                                                                                        | Primary action          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Delete purchase without sales | “Delete this purchase of 3 American Silver Eagles dated 10 Jan 2026? This removes the purchase from your history and reduces the quantity owned. This cannot be undone.” | Delete purchase         |
| Delete sale                   | “Delete this sale of 2 American Silver Eagles dated 1 Jun 2026? Those units will count as owned again. This cannot be undone.”                                           | Delete sale             |
| Delete item                   | “Delete American Silver Eagle and all its purchases and sales? This permanently removes the item and its transaction history. This cannot be undone.”                    | Delete item permanently |

For a purchase with linked sales, replace the confirmable destructive state with **“This purchase has linked sales. Delete its sales first.”** and a Close action. Preserve server enforcement because cached availability can change. Do not offer a one-click cascade from this blocked state.

The API does not expose which sale belongs to which purchase in history, so this plan cannot promise a “View linked sales” shortcut. Never suggest deleting all sales indiscriminately. If targeted recovery becomes required, exposing the purchase link is a separate contract addition.

Default focus goes to Cancel for irreversible confirmations. Use explicit destructive text plus the established error color, not color alone. On successful transaction deletion, update history and item quantity and clamp an emptied final page. On successful item deletion, return to the Stack page, clamp its page if necessary, and announce the result. No Undo action is available.

### F. Shared mutation lifecycle

| State                          | Required behavior                                                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ready / dirty                  | Keep data local until submit. Do not autosave. Explicit Cancel exits; backdrop clicks must not silently discard changed input.                                                                                                                              |
| Invalid                        | Preserve inputs; field-linked errors after blur/submit; focus first invalid field on submit. Form-wide server errors stay inline.                                                                                                                           |
| Submitting                     | Show stable-size progress label, prevent duplicate mutations, and temporarily prevent editing/dismissal that would lose the result. Keep focus stable. A bounded request must resolve into success, rejection, or unknown-result recovery.                  |
| Confirmed success              | Close/reset only after confirmed persistence. Announce once; refresh inventory, this item, history, and valuation as applicable.                                                                                                                            |
| Save succeeded, refresh failed | “Saved, but current quantities could not be refreshed.” Offer a read refresh. Never relabel this as a failed save or encourage creating it again.                                                                                                           |
| Confirmed rejection            | Preserve draft; show actionable error. Restore controls. Retry only after correction or when the failure is explicitly transient.                                                                                                                           |
| Outcome unknown                | “We couldn't confirm whether this saved. Check your history before trying again.” Preserve draft; offer a read refresh/review. Never automatically retry a purchase or sale. Follow existing Paper explicit “I've checked” retry pattern only after review. |
| Record removed elsewhere       | Explain that the transaction/item is no longer available; refresh and return to the nearest surviving context. A 404 is not a validation error.                                                                                                             |

Success/neutral toasts may follow the approved 8-second duration only when the result remains visible elsewhere; pause on hover/focus. A toast with an action stays until dismissed. Validation, failed mutations, uncertain outcomes, and failed refreshes require persistent inline feedback. Toasts do not steal focus and do not offer unsupported Undo.

For unsaved dialogs, Escape or navigation should retain a changed draft long enough to request explicit discard; use an in-dialog “Discard changes?” state rather than stacking dialogs. Clean dialogs close normally. Pending operations must not trap the user indefinitely if the network result is unknown.

## 5. Responsive and accessibility requirements

- Design complete desktop and mobile examples, not merely scaled screenshots: 1440px desktop, 768px tablet check, and 390px mobile. Existing Paper only defines the main page at desktop size. New mobile variants are proposed work.
- Preserve the 64px desktop page inset; use 24px on tablet and 16px on mobile. At narrow widths stack the summary and wrap actions. History becomes labeled rows/cards with date/type/quantity always visible, rather than a horizontally clipped desktop table.
- On mobile, dialogs become viewport-width task surfaces with 16px insets or a full-screen presentation when height requires it. Keep the same fields and labels. Allow scrolling with the software keyboard; do not cover the focused field or action area with toasts.
- Use existing 46px fields and 48px primary buttons. Provide at least 44px practical touch areas for row actions and dismiss controls. Fixed icon/action slots must remain aligned across repeated rows.
- Annotate real links for navigation, buttons for actions, accessible names, heading hierarchy, visible labels, and field error associations. Use semantic tables on desktop when appropriate in implementation; Paper flex layouts are a visual representation, not a requirement to recreate table semantics with divs.
- Dialog behavior: labeled dialog, focus enters a sensible control or heading, contained keyboard navigation, inert background, Escape behavior appropriate to dirty/pending state, and focus restored to the trigger. When a deleted row is gone, move focus to the history heading or nearest remaining row action.
- Preserve the existing neutral focus ring, including invalid fields. Muted text has documented contrast of 5.35:1 on white and 4.90:1 on canvas. The `#DDDEDF` border is only 1.35:1 on white; do not treat that decorative border as the sole cue identifying a field or focus state. Verify required control boundaries/state cues at 3:1 during design QA.
- Error/success/status use text and optionally an icon, never color alone. Announce completion/loading politely and blocking errors once. Do not announce the whole history after every refetch.
- Dates remain UTC date-only; display a human-readable date without browser timezone shifting. Recorded timestamps and quote times explicitly say UTC. Calendar controls must support keyboard entry; custom calendar interaction already has a Paper spec, but is not implemented in the app.
- Check long preset names, large quantities, multi-line server errors, 200% zoom, 320px reflow, and reduced motion. These are acceptance requirements, not claims that the current app passes them.

## 6. Numbered, independently reviewable design stages

Each stage extends an approved prior stage and ends with screenshots, a short critique, and updated design annotations in this file. Stop for the user's stage sign-off before any commit or moving to the next stage. The messages below are proposed future documentation/design-export commits, not authorization to commit. Paper edits themselves are not Git commits.

### Stage 1. Item management structure and supported data

**Goal:** Prove that one item's identity, owned quantity, pricing, and paginated transactions fit the existing visual scheme without inventing data.

**Paper work:** On Pages, add an Item management artboard group with Populated desktop, Fully sold, No transactions, and Item/value/history availability variants. Add purchase/sale row compositions to Product components. Reuse Header, Pagination, Badge, and Inline feedback. Add a small navigation map from Stack → Manage → item. Keep the existing main page as the visual reference; annotate its date/value-copy corrections.

**Critical references/files:** This plan; `apps/web/src/components/item-card.tsx`; `apps/web/src/routes/index.tsx`; `apps/api/src/inventory/inventory.service.ts`; Stage 2 and ADR 004. Future application files are read-only for this stage.

**Verification:** Compare the new page with the Stack screenshot and exact styles. Check field provenance against the capability matrix. Show two history pages, not all transactions squeezed into a single unsupported page. Distinguish missing item, empty history, and fully sold history.

**Demo acceptance:** Starting from the main Stack frame, a reviewer can identify Manage's destination, read “3 owned,” find the two history pages, and find the older purchase with “1 of 3 remaining.” In the fully sold variant, history remains and Add purchase still makes sense.

**Proposed future commit:** `docs(design): specify item management and transaction history`

### Stage 2. Purchases, sales, and corrections

**Goal:** Design each supported write with the fields, constraints, and recovery states it actually needs.

**Paper work:** Add a Dialog composition using existing controls. Add Add purchase, Sell from purchase, Edit purchase, and Edit sale flows. Include representative Invalid, Saving, Server rejected, Result unknown, and Saved but refresh failed variants, sharing lifecycle annotations instead of duplicating every permutation. Annotate the optional purchase date's UTC fallback and read-only preset.

**Critical references/files:** This plan; Form, Number input, Date input, Button, Inline feedback, Toast, and Add to your stack Paper sections; `apps/web/src/components/form.tsx`; `apps/web/src/components/item-card.tsx`; `apps/web/src/types/form.schema.ts`; transaction DTOs and service methods.

**Verification:** Trace every input to an accepted request field. Check sale starts from a visible purchase on either history page. Check edit forms do not promise unknown linked dates/availability. Screenshot each composition at normal and long-copy sizes; annotate focus and dirty-dismiss behavior.

**Demo acceptance:** A reviewer can walk through adding a repeat purchase, recording a partial sale from the older purchase, editing a purchase quantity, and encountering a linked-sale rejection. Every rejected/unknown result preserves the entered values and provides a specific next step. No price or P/L fields appear.

**Proposed future commit:** `docs(design): specify purchase sale and edit flows`

### Stage 3. Destructive actions and final-record edge cases

**Goal:** Make the ownership and history consequences of each deletion unmistakable.

**Paper work:** Add Delete purchase, Delete sale, Delete item permanently, Purchase deletion blocked, Deleting, Rejected/unknown deletion, and post-delete outcomes. Reuse the dialog shell and error/neutral feedback. Position item deletion separately from row deletion.

**Critical references/files:** This plan; `apps/web/src/components/item-card.tsx`; `apps/web/src/hooks/use-delete-item.ts`; `apps/api/src/inventory/inventory.service.ts`; transaction entity cascade; deletion e2e cases.

**Verification:** Check purchase/sale/item wording against actual cascade rules. Verify no Undo, automatic cascade shortcut, or unsupported linked-sales navigation appears. Demonstrate focus after a removed row, history-page clamping, and the distinction between an empty retained item and a deleted item.

**Demo acceptance:** A reviewer can explain before confirming that deleting a sale restores ownership, deleting a purchase removes its quantity, and deleting an item removes every transaction. A purchase with sales has no enabled destructive confirmation. The last-transaction result is a retained empty item.

**Proposed future commit:** `docs(design): specify deletion safeguards and recovery`

### Stage 4. Responsive design and complete handoff

**Goal:** Validate the whole CRUD journey across viewport sizes and close coverage gaps.

**Paper work:** Add 390px item/history and sale/edit/delete examples, a 768px layout check, a compact state/interaction index, and explicit focus/error examples. Reuse shared states instead of generating a full desktop/mobile Cartesian product. Mark every screen as existing, proposed, or dependent on the API changes below.

**Critical references/files:** This plan and all new Paper artboards; existing Foundations and approved Toast V1. Any clean JSX/style export is supporting design evidence only, not application implementation.

**Verification:** Inspect screenshots after each group for spacing, typography, contrast, alignment, clipping, and repetition. Read exact JSX/styles for consistency; never infer implementation values from screenshots. Check long names, error wrapping, keyboard annotations, zoom/reflow, mobile keyboard space, and all acceptance scenarios below. Use fit-content artboard height when content clips; do not crop away states.

**Demo acceptance:** A reviewer can follow the same Add → Sell → Edit → Delete journey on desktop and mobile without missing actions, hidden consequences, or unsupported data. The coverage matrix has no unassigned state. Each stage has its own reviewable result.

**Proposed future commit:** `docs(design): finalize responsive CRUD states and acceptance`

Before future Paper mutations, post a brief preserving this established visual system, verify font availability, duplicate suitable existing groups, and write incrementally. After each meaningful section, take a screenshot and record a one-line quality verdict. Finish the Paper working session after approved edits.

## 7. Implementation prerequisites, separate from design authorization

1. **Usable single-item read:** A direct item page needs `item_type`, derived `quantity`, and a reliable missing-item response from `GET /inventory/:id`, matching the list's meaning. Today the service returns a raw item, and an absent item becomes an empty HTTP 200 response through the installed adapter. A route must not depend solely on a list cache or scan all list pages to reconstruct the item. Verify this API boundary before building a routed client. If API work is excluded later, use the same management content within the existing page as a temporary navigation choice and do not promise reloadable detail links.
2. **New frontend behavior:** A dedicated route, accessible dialogs, transaction confirmation, consistent persistent feedback, and unknown-result handling are proposed UI work. The current app uses in-card forms, browser alerts, native select/date inputs, and immediate transaction deletion. Paper's richer controls and state diagrams are not already implemented components.
3. **No speculative sale-link UI:** History does not expose a sale's `buy_id` or its purchase summary. Precise linked-sale navigation, exact edit-sale bounds, and date-bound hints need an explicit response extension if later required. They are deliberately omitted from the base design. The server continues enforcing all constraints.
4. **Refresh authoritative data:** Purchase creation returns an item, potentially without its joined type/quantity; PATCH returns an update result. Neither is a full new UI state. A confirmed write must be followed by the appropriate reads. Unknown POST outcomes have no idempotency guarantee; do not add automatic mutation retries.
5. **Preserve paging:** Inventory is currently 12/page; transactions are fixed at 2/page. Increasing history size, adding filtering, or introducing an all-purchases selector is separate implementation work. The design uses existing pagination.

No new dependency, service, infrastructure, or business capability is required for Paper design. A later application implementation plan should retire the single-item response risk first, then implement one complete read/write slice at a time with the user's per-stage approval.

## 8. Fixture and acceptance walkthrough

Use consistent, explicitly illustrative data rather than copying inconsistent numbers from older main-page examples:

- Item: American Silver Eagle, 1 ozt fine silver, .999 purity.
- Purchase A: 3 units, effective 2026-01-10. Purchase B: 2 units, effective 2026-03-12.
- Sale: 2 units from Purchase A, effective 2026-06-01.
- Current quantity: 3. Purchase A remaining: 1; Purchase B remaining: 2.
- Illustrative silver quote: $30/ozt, snapshot `2026-11-16T14:00:00.000Z`. Current item value: $90, fine-metal weight: 3 ozt. No purity multiplication.
- History page 1: June sale and March purchase. Page 2: January purchase. This forces the design to exercise pagination.

Acceptance scenarios for Paper review, then later browser verification. Each row starts independently from the fixture above unless it explicitly names another setup. Reset before the next row; these are not consecutive mutations of one shared record.

| Scenario                                                       | Expected visible outcome                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Add another purchase of the same preset                        | One item remains; quantity increases and a separate purchase appears.                                |
| Omit acquisition date                                          | Helper states UTC fallback; saved transaction has an effective date, not an invented unknown marker. |
| Sell 1 from January purchase                                   | That purchase becomes fully sold; other purchase remains available.                                  |
| Attempt sale greater than remaining                            | Inline rejection; input preserved; no success/quantity change.                                       |
| Edit January purchase from 3 to 4                              | Current quantity becomes 4; transaction identity/recorded time stay unchanged.                       |
| Edit January purchase to 1 with 2 sold                         | Rejected; original records remain.                                                                   |
| Move purchase after its linked sale / sale before its purchase | Rejected with the relevant date explanation.                                                         |
| Delete purchase with linked sale                               | Blocked; no silent deletion of sales.                                                                |
| Delete June sale                                               | Ownership increases by 2; January purchase availability is restored.                                 |
| Delete final transaction of an item                            | Empty item remains, zero quantity, Add purchase available.                                           |
| Fully sell all purchases                                       | Zero quantity with retained history, distinct from empty history.                                    |
| Delete item                                                    | Explicit irreversible history warning, then return to Stack and refresh.                             |
| Lost response after creating a purchase/sale                   | Result-unknown recovery; no automatic retry or falsely confirmed failure.                            |
| Save succeeds but refresh fails                                | Saved result acknowledged; read retry offered, no duplicate submission.                              |
| Missing pricing / missing history / missing item               | Separate availability states; never show missing records/prices as real zero values.                 |
| Delete final row on the last page                              | Return to last valid page; focus moves to a surviving element.                                       |

For an eventual code implementation, the repository gate is `rtk bun run typecheck`, `rtk bun run lint`, and `rtk bun run --cwd apps/api test`, plus the API e2e suite when its database environment is available. There is no web test script today. Add focused verification for the new response/dialog behaviors when implementing; manually smoke the real browser, keyboard, mobile layout, reload persistence, and mutation refresh boundaries. Do not claim Paper screenshots verify runtime accessibility or database behavior.

This planning task made no application changes, so those execution suites were not run. Final design review should verify the Paper state inventory and local documentation only; code implementation will need its own full repository gate and explicit commit/push approvals.

## 9. Research evidence and limits

### Paper evidence

Reviewed Stack → Populated Desktop and its first-use empty, loading, partial-pricing, and holdings-failure hierarchy. Viewed screenshots of the populated Stack, ready purchase form, uncertain purchase result, and approved Toast library. Read exact JSX and computed styles for Foundations, page layout, fields, primary button states, inline feedback, date behavior, and purchase lifecycle annotations. Inspected component hierarchy to confirm that item-detail and dialog compositions are missing.

This establishes visual style and intended behavior, not a running application. The plan intentionally identifies differences between Paper, current source, and the Stage 2 contract.

### Web source evidence

| Source                                                                | Finding used in the plan                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routes/index.tsx:13`                                    | Only main route; separate inventory/catalog/valuation queries; twelve-item paging; empty/loading/error conditions and post-delete clamping. |
| `apps/web/src/components/form.tsx:31`                                 | Existing catalog purchase fields, labels, and validation feedback.                                                                          |
| `apps/web/src/components/item-card.tsx:39`                            | Transaction mutations and authoritative query refresh; successful-write/failed-refresh distinction.                                         |
| `apps/web/src/components/item-card.tsx:77`                            | History query and fixed two-row page calculations.                                                                                          |
| `apps/web/src/components/item-card.tsx:109`                           | Current item display, quote timestamp, quantity, and value.                                                                                 |
| `apps/web/src/components/item-card.tsx:152`                           | History loading/retry, edit and sale forms, row actions and errors.                                                                         |
| `apps/web/src/components/item-card.tsx:319`                           | Transaction deletion currently executes without confirmation.                                                                               |
| `apps/web/src/components/item-card.tsx:398`                           | Existing permanent item-deletion warning.                                                                                                   |
| `apps/web/src/types/form.schema.ts:16`                                | Quantity integer range, preset ID, optional UTC date validation.                                                                            |
| `apps/web/src/lib/utils.ts:3`                                         | Fine-metal valuation and currency formatting.                                                                                               |
| `apps/web/src/hooks/use-create-item.ts:21` and `use-delete-item.ts:8` | Current browser alerts and refresh behavior.                                                                                                |
| `apps/web/src/router.tsx:6`                                           | Thirty-second stale time, no configured polling.                                                                                            |
| `apps/web/package.json:5`                                             | No frontend test script or installed dialog/component library.                                                                              |

### API source evidence

| Source                                                                                                  | Finding used in the plan                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/inventory/inventory.controller.ts:21`                                                     | Inventory, single-item, transaction, sale, edit, and deletion endpoints.                                      |
| `apps/api/src/inventory/inventory.service.ts:40`                                                        | Reuse one item per preset; each purchase creates a transaction; omitted acquisition date becomes UTC today.   |
| `apps/api/src/inventory/inventory.service.ts:79`                                                        | Derived item quantities, list relations/order, counts and retained zero-quantity items.                       |
| `apps/api/src/inventory/inventory.service.ts:115`                                                       | Single-item endpoint lacks joined type and derived quantity.                                                  |
| `apps/api/src/inventory/inventory.service.ts:119`                                                       | History fixed at two rows, stable descending order, remaining purchase quantity, omitted sale relationship.   |
| `apps/api/src/inventory/inventory.service.ts:155`                                                       | Transaction edits preserve identity; linked-purchase locking and quantity/date rules.                         |
| `apps/api/src/inventory/inventory.service.ts:240`                                                       | Whole-item deletion.                                                                                          |
| `apps/api/src/inventory/inventory.service.ts:244`                                                       | Whole-stack valuation across transactions, fine-metal conversion, quote response.                             |
| `apps/api/src/inventory/inventory.service.ts:274`                                                       | One-purchase sale validation and current availability checks.                                                 |
| `apps/api/src/inventory/inventory.service.ts:316`                                                       | Transaction deletion, lock protection, and linked-sale rejection.                                             |
| `apps/api/src/inventory/entities/item.entity.ts:5` and `transaction.entity.ts:5`                        | Parent item date, transaction dates/links, cascade history deletion; no cost/proceeds fields.                 |
| `apps/api/src/inventory/dto/record-buy.dto.ts:3`, `record-sale.dto.ts:3`, `update-transaction.dto.ts:3` | Allowed fields, quantity bounds, strict dates, no transaction reassignment.                                   |
| `apps/api/src/inventory/item-type-presets.ts:3`                                                         | Nine gold/silver presets.                                                                                     |
| `apps/api/src/spot-prices/spot-prices.service.ts:13`                                                    | Valid USD/toz quotes for both metals required; no partial valuation contract.                                 |
| `apps/api/test/app.e2e-spec.ts:41`                                                                      | Existing test coverage for edits, dates, sales, linked deletion, paging, and concurrent conflicting requests. |
| `apps/api/test/app.e2e-spec.ts:852`                                                                     | Whole-item cascade test currently covers purchases, not a mixed purchase-and-sale fixture.                    |

Read-only research was independently performed for the web layer and API/model by two GPT-6.1-Terra agents at max reasoning, then reconciled with Paper and product docs by GPT-6-Astra at xhigh reasoning, as requested. No app/server was started, no database was changed, no tests were executed, and no live deployment was inspected. The source contract, rather than an observed production response, underpins this plan. Source line references are a snapshot and can move as implementation changes.
