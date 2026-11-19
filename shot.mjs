// Takes the screenshots listed in shots.json with headless Chromium:
// serves app/ on a local port, opens each ?shot= scene, waits for the app
// to set window.__shotReady, then saves a JPEG (quality 80) into screenshots/.
// Usage: node shot.mjs [port]
import { chromium } from '/home/hatch/workspace/octra/sesi-permanen/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8901);
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
mkdirSync(join(here, 'screenshots'), { recursive: true });

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: here, stdio: 'inherit',
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1500);

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
    await wait(250);
    const file = join(here, 'screenshots', shot.name);
    await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    console.log('saved', shot.name);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log('done');
