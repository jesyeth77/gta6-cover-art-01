// Takes the screenshots listed in shots.json with headless Chromium:
// serves app/ on a local port, opens each ?shot= scene, waits for the app
// to set window.__shotReady, then saves a JPEG (quality 80) into screenshots/.
// Usage: node shot.mjs [port]
// (The Playwright install lives outside this repo, so its paths are absolute
// below; the browser it launches is the Chromium that install ships.)
import { chromium } from '/home/hatch/workspace/octra/sesi-permanen/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8901);
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
mkdirSync(join(here, 'screenshots'), { recursive: true });

// Wait until the dev server answers instead of guessing a fixed delay:
// a cold machine can take longer than 1.5 s to start listening.
const waitForServer = (deadline) => new Promise((resolvePromise, rejectPromise) => {
  const probe = () => {
    get(`http://127.0.0.1:${port}/`, (res) => {
      res.resume();
      resolvePromise();
    }).on('error', () => {
      if (Date.now() > deadline) rejectPromise(new Error('serve.ts did not start in time'));
      else setTimeout(probe, 200);
    });
  };
  probe();
});

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: here, stdio: 'inherit',
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await waitForServer(Date.now() + 20000);

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
    console.log('saved', shot.name, `${statSync(file).size} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log('done');
