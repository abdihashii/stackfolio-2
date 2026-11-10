# Neovim save consistency

## 1. Project-local Oxlint fixes and Oxfmt formatting

Goal: match `.zed/settings.json`: safe Oxlint fixes, then Oxfmt, before saving.

Files: global Neovim `init.lua` (enable `exrc`), project `.nvim.lua` (trusted loader), `.neovim/init.lua` (project-scoped Conform and Oxlint configuration).

Verification: headless Neovim saves a TypeScript fixture with an unused import and incorrect formatting; assert the import is removed, formatting matches Oxfmt, and files outside the project keep their existing formatter. Check API nested Oxlint config, run repository typecheck, lint, formatting check and API tests, report pre-existing failures separately.

Proposed commit: `chore: align Neovim save actions with Zed`

No commit or push without explicit sign-off.
