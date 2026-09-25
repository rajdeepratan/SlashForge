// SlashForge — assemble the GitHub review payload for /slashforge-review-pr.
//
// Installed verbatim next to the guides, for the same reason as forge-splice.js:
// a file can be allowed by its path, an inline `node -e` script cannot.
//
// Usage:  node <path-to-this>/forge-review-payload.js <dir> <EVENT> <out>
//
// <dir> holds body.txt, one file per comment, and anchors.json, which lists each
// comment's path, line, optional side and bodyFile. Prose never goes through the
// shell or into hand-written JSON; JSON.stringify escapes every string.

const fs = require('fs');
const path = require('path');

const [dir, event, out] = process.argv.slice(2);
if (!dir || !event || !out) {
  console.error('usage: node forge-review-payload.js <dir> <EVENT> <out>');
  process.exit(2);
}

const anchors = JSON.parse(fs.readFileSync(path.join(dir, 'anchors.json'), 'utf8'));
fs.writeFileSync(out, JSON.stringify({
  event,
  body: fs.readFileSync(path.join(dir, 'body.txt'), 'utf8'),
  comments: anchors.map((a) => ({
    path: a.path,
    line: a.line,
    side: a.side || 'RIGHT',
    body: fs.readFileSync(path.join(dir, a.bodyFile), 'utf8'),
  })),
}));
