import { defineConfig } from '@playwright/test';

// Drives the real packaged-shape app (Electron + the local IPC data layer),
// not a browser preview — see e2e/app.spec.ts. Needs the Vite dev server up
// since Electron's main process loads http://localhost:5183 whenever
// app.isPackaged is false; webServer here starts and stops it automatically
// around the test run instead of requiring a manually-run `npm run dev`.
// Port must match vite.config.ts's server.port exactly.
const port = process.env.DAGGERHEART_DEV_PORT || '5183';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  // Every test spawns a real, visible Electron window — the default worker
  // count (one per CPU core) means that many real windows pop up and steal
  // focus at once during a full run, which hijacks whoever's using the
  // machine. One worker means one window at a time instead of a pile-up.
  // (A `show: false` window turned out not to be a safe alternative: it
  // made the whole suite ~4x slower and flaky — timeouts and "element not
  // stable" failures across roughly a third of the tests — even with
  // Electron's documented background-throttling switches disabled.)
  workers: 1,
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
