local root = vim.fs.dirname(debug.getinfo(1, 'S').source:sub(2))
local path = root .. '/.neovim/init.lua'
local content = vim.secure.read(path)
if content then assert(loadstring(content, '@' .. path))() end
