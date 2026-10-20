// Fails if any tracked source file contains an em dash (U+2014). House style: no em dashes anywhere.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EM_DASH = String.fromCharCode(0x2014);
const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(astro|ts|tsx|js|mjs|css|md|mdx|json|jsonc|txt|html|yml|yaml)$/.test(f))
  .filter((f) => f !== 'package-lock.json');

const hits = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    if (line.includes(EM_DASH)) hits.push(`${file}:${i + 1}`);
  });
}

if (hits.length > 0) {
  console.error(`Em dashes found (replace with a comma, colon, or period):\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`No em dashes in ${files.length} files.`);
