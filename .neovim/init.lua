local root = vim.fs.dirname(vim.fs.dirname(debug.getinfo(1, 'S').source:sub(2)))
local conform = require 'conform'
local function in_project(bufnr)
  return vim.api.nvim_buf_get_name(bufnr):sub(1, #root + 1) == root .. '/'
end

-- Keep manual formatting and save formatting on the same formatter.
for _, ft in ipairs {
  'javascript', 'javascriptreact', 'typescript', 'typescriptreact',
  'json', 'jsonc', 'css', 'scss', 'less', 'html', 'vue', 'markdown', 'yaml', 'toml', 'graphql',
} do
  local previous = conform.formatters_by_ft[ft]
  conform.formatters_by_ft[ft] = function(bufnr)
    if in_project(bufnr) then return { 'oxfmt' } end
    return type(previous) == 'function' and previous(bufnr) or previous or {}
  end
end

local oxlint_root = vim.lsp.config.oxlint.root_dir
vim.lsp.config('oxlint', {
  root_dir = function(bufnr, on_dir)
    if in_project(bufnr) then oxlint_root(bufnr, on_dir) end
  end,
})
vim.lsp.enable 'oxlint'

vim.api.nvim_create_autocmd('BufWritePre', {
  group = vim.api.nvim_create_augroup('StackfolioFormat', { clear = true }),
  callback = function(event)
    if not in_project(event.buf) or vim.bo[event.buf].buftype ~= '' then return end
    if not vim.tbl_contains(conform.list_formatters_for_buffer(event.buf), 'oxfmt') then return end

    local client = vim.lsp.get_clients({ name = 'oxlint', bufnr = event.buf })[1]
    if client then
      -- Refresh diagnostics so fix-all uses the current unsaved text.
      local diagnostics, diagnostic_err = client:request_sync('textDocument/diagnostic', {
        textDocument = { uri = vim.uri_from_bufnr(event.buf) },
      }, 3000, event.buf)
      if not diagnostics or diagnostics.err then
        vim.notify('Oxlint diagnostics failed: ' .. (diagnostics and diagnostics.err.message or diagnostic_err or 'request failed'), vim.log.levels.ERROR)
        return
      end
      -- Wait for fixes before formatting, matching Zed's formatter order.
      local result, err = client:request_sync('workspace/executeCommand', {
        command = 'oxc.fixAll',
        arguments = { { uri = vim.uri_from_bufnr(event.buf) } },
      }, 3000, event.buf)
      if not result or result.err then
        vim.notify('Oxlint fixes failed: ' .. (result and result.err.message or err or 'request failed'), vim.log.levels.ERROR)
      end
    elseif vim.tbl_contains(vim.lsp.config.oxlint.filetypes, vim.bo[event.buf].filetype) then
      vim.notify('Oxlint is not attached yet; saving with Oxfmt only.', vim.log.levels.WARN)
    end

    conform.format({ bufnr = event.buf, formatters = { 'oxfmt' }, lsp_format = 'never', timeout_ms = 3000 }, function(err)
      if err then vim.notify('Oxfmt failed: ' .. err, vim.log.levels.ERROR) end
    end)
  end,
})
