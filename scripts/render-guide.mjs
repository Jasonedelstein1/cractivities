// Renders public/guide.html to public/guide.pdf (Letter, B&W) with headless Chromium.
// Needs Playwright somewhere on the machine: `npm i -g playwright && npx playwright install chromium`,
// or set PLAYWRIGHT_MODULE / CHROMIUM_PATH to point at an existing install.
// Run: npm run guide
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function findPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try {
    return createRequire(import.meta.url).resolve('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return resolve(globalRoot, 'playwright/index.mjs');
  }
}

const { chromium } = await import(pathToFileURL(findPlaywright()).href);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(ROOT, 'public/guide.html')).href, { waitUntil: 'load' });

await page.pdf({
  path: resolve(ROOT, 'public/guide.pdf'),
  format: 'Letter',
  printBackground: true,
  margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7pt;color:#000;' +
    'padding:0 0.5in;display:flex;justify-content:space-between;letter-spacing:0.08em;">' +
    '<span>CARIBE SUR &middot; OCT 5&ndash;10 2026</span>' +
    '<span class="pageNumber"></span>' +
    '</div>',
});

await browser.close();
console.log('wrote public/guide.pdf');
