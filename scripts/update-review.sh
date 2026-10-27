#!/usr/bin/env bash
# Publish a Creative Studio mockup to the phone-friendly review viewer.
# Usage: scripts/update-review.sh <version> [path/to/mockup.html]
#   scripts/update-review.sh v2
# Copies the mockup to public/review/<version>/index.html, adds a noindex tag, and registers the
# version in public/review/versions.json (newest first). Then commit and push the branch; the PR
# preview deploy publishes it at /review/?v=<version>.
set -euo pipefail

VERSION="${1:-}"
SOURCE="${2:-/workspace/techshift-website-mockup/index.html}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! "$VERSION" =~ ^v[0-9]+[a-z0-9-]*$ ]]; then
  echo "Usage: scripts/update-review.sh <version like v2> [mockup.html]" >&2
  exit 1
fi
if [[ ! -f "$SOURCE" ]]; then
  echo "Mockup not found: $SOURCE" >&2
  exit 1
fi

DEST="$ROOT/public/review/$VERSION"
mkdir -p "$DEST"

node - "$SOURCE" "$DEST/index.html" "$ROOT/public/review/versions.json" "$VERSION" <<'NODE'
const fs = require('node:fs');
const [source, dest, manifest, version] = process.argv.slice(2);

let html = fs.readFileSync(source, 'utf8');
if (html.includes(String.fromCharCode(0x2014))) {
  console.error('Mockup contains em dashes; ask Creative Studio for a clean file.');
  process.exit(1);
}
if (!/<meta\s+name="robots"/i.test(html)) {
  const tag = '<meta name="robots" content="noindex, nofollow">';
  html = /<meta\s+charset[^>]*>/i.test(html)
    ? html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n${tag}`)
    : html.replace(/<head([^>]*)>/i, `<head$1>\n${tag}`);
}
fs.writeFileSync(dest, html);

const list = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
const entry = { id: version, label: version, added: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date()) };
const next = [entry, ...list.filter((v) => v.id !== version)];
next.sort((a, b) => Number(b.id.replace(/\D/g, '')) - Number(a.id.replace(/\D/g, '')));
fs.writeFileSync(manifest, JSON.stringify(next, null, 2) + '\n');
console.log(`Published ${version} (${(html.length / 1024).toFixed(0)} KB). Versions: ${next.map((v) => v.id).join(', ')}`);
NODE

echo "Next: git add public/review && git commit -m \"Add design review $VERSION\" && git push"
