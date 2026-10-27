// Mobile Lighthouse check against the production build.
// Usage: npm run build && npm run lighthouse [-- /path /other-path]
// Reports are written to .lighthouse/ (gitignored). Exits non-zero below the score targets.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = 4329;
const TARGETS = { performance: 95, accessibility: 95, 'best-practices': 95, seo: 95 };
const paths = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['/'];

const server = spawn(
  process.execPath,
  ['node_modules/astro/bin/astro.mjs', 'preview', '--port', String(PORT)],
  {
    stdio: 'pipe',
  },
);
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && resolve());
  server.on('exit', (code) => reject(new Error(`preview exited with ${code}`)));
  setTimeout(() => reject(new Error('preview did not start')), 20000);
});

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
mkdirSync('.lighthouse', { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
let failed = false;

try {
  for (const path of paths) {
    const url = `http://localhost:${PORT}${path}`;
    const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'] });
    if (!result) throw new Error(`No result for ${url}`);
    const slug = path === '/' ? 'home' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '');
    writeFileSync(`.lighthouse/${stamp}-${slug}.html`, result.report[0]);
    writeFileSync(`.lighthouse/${stamp}-${slug}.json`, result.report[1]);

    const scores = Object.fromEntries(
      Object.keys(TARGETS).map((k) => [
        k,
        Math.round((result.lhr.categories[k]?.score ?? 0) * 100),
      ]),
    );
    const misses = Object.entries(TARGETS).filter(([k, min]) => scores[k] < min);
    if (misses.length > 0) failed = true;
    console.log(`${misses.length ? 'FAIL' : 'PASS'} ${path} ${JSON.stringify(scores)}`);
  }
} finally {
  chrome.kill();
  server.kill();
}

process.exit(failed ? 1 : 0);
