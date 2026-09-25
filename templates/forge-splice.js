// SlashForge — splice a body fragment into the shipped report shell.
//
// Installed verbatim next to forge-report-shell.html. Every command that writes an
// HTML document calls this file rather than an inline `node -e` script, so a
// permission rule can allow exactly this path instead of any node code at all.
//
// Usage:  node <path-to-this>/forge-splice.js <fragment> <out> <title>

const fs = require('fs');
const path = require('path');

const [frag, out, title] = process.argv.slice(2);
if (!frag || !out || title === undefined) {
  console.error('usage: node forge-splice.js <fragment> <out> <title>');
  process.exit(2);
}

const shellPath = path.join(__dirname, 'forge-report-shell.html');
if (!fs.existsSync(shellPath)) {
  console.error(`report shell not found: ${shellPath}`);
  process.exit(1);
}

// The title is plain text, so it is escaped, `&` first or the later replacements'
// ampersands would be escaped twice. The body is HTML and goes in verbatim.
// Function-form replace, so `$&` or `$'` in either one is not read as a pattern.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const body = fs.readFileSync(frag, 'utf8');
fs.writeFileSync(out, fs.readFileSync(shellPath, 'utf8')
  .replace('<!--TITLE-->', () => esc(title))
  .replace('<!--CONTENT-->', () => body));
