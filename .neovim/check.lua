-- Run: nvim --headless -u NONE -l .neovim/check.lua
local project = vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h:h')
local root = vim.fn.tempname()
for _, plugin in ipairs { 'conform.nvim', 'nvim-lspconfig' } do
  vim.opt.runtimepath:append(vim.fn.glob(vim.fn.stdpath('data') .. '/site/pack/*/opt/' .. plugin))
end
for _, dir in ipairs { '.neovim', 'apps/web/src/styles', 'apps/api/src' } do
  vim.fn.mkdir(root .. '/' .. dir, 'p')
end
root = assert(vim.uv.fs_realpath(root))
for _, file in ipairs { '.neovim/init.lua', '.oxfmtrc.json', '.oxlintrc.json', 'apps/api/.oxlintrc.json', 'apps/web/src/styles/app.css' } do
  assert(vim.uv.fs_copyfile(project .. '/' .. file, root .. '/' .. file))
end
for _, dir in ipairs { 'node_modules', 'apps/api/node_modules' } do
  assert(vim.uv.fs_symlink(project .. '/' .. dir, root .. '/' .. dir))
end
vim.cmd 'filetype plugin on'
-- This sandbox cannot allocate the server's filesystem watchers.
vim.lsp.config('*', { capabilities = { workspace = { didChangeWatchedFiles = { dynamicRegistration = false } } } })
require('conform').setup { formatters_by_ft = { typescript = { 'prettier' } } }
dofile(root .. '/.neovim/init.lua')
for _, app in ipairs { 'web', 'api' } do
  local path = root .. '/apps/' .. app .. '/src/smoke.ts'
  vim.fn.writefile({ 'import { readFileSync } from "node:fs";', 'export const value={name:"hello",n:1}' }, path)
  vim.cmd.edit(path)
  assert(vim.wait(15000, function()
    return #vim.lsp.get_clients({ name = 'oxlint', bufnr = 0 }) > 0
  end, 50), 'Oxlint did not attach: ' .. app)
  local client = vim.lsp.get_clients({ name = 'oxlint', bufnr = 0 })[1]
  assert(client.config.root_dir == (app == 'api' and root .. '/apps/api' or root), 'wrong config root')
  -- Allow diagnostics to arrive before exercising the fix-all command.
  assert(vim.wait(15000, function() return #vim.diagnostic.get(0) > 0 end, 50), 'no diagnostics: ' .. app)
  vim.cmd.write()
  local output = table.concat(vim.fn.readfile(path), '\n')
  assert(not output:find('readFileSync', 1, true), 'unused import not fixed: ' .. output)
  assert(output:find("export const value = { name: 'hello', n: 1 };", 1, true), 'wrong formatting: ' .. output)
  vim.cmd.write()
  assert(output == table.concat(vim.fn.readfile(path), '\n'), 'second save changed output')
  vim.api.nvim_buf_set_lines(0, 0, -1, false, { 'import { existsSync } from "node:fs";', 'export const next={name:"changed"}' })
  vim.cmd.write()
  local changed = table.concat(vim.fn.readfile(path), '\n')
  assert(not changed:find('existsSync', 1, true), 'save used stale diagnostics: ' .. changed)
  assert(changed:find("export const next = { name: 'changed' };", 1, true), 'dirty buffer not formatted')
  print('PASS: ' .. app .. ' fixes, formatting, nested config, idempotent save')
end
vim.cmd.edit(vim.fn.tempname() .. '.ts')
vim.bo.filetype = 'typescript'
assert(vim.deep_equal(require('conform').list_formatters_for_buffer(0), { 'prettier' }))
assert(#vim.lsp.get_clients({ name = 'oxlint', bufnr = 0 }) == 0)
print('PASS: unrelated project retains formatter and no Oxlint attachment')
for _, client in ipairs(vim.lsp.get_clients()) do client:stop(true) end
vim.fn.delete(root, 'rf')
vim.cmd 'qa!'
