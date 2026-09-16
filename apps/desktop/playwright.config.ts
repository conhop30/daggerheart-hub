import { defineConfig } from '@playwright/test';

// Drives the real packaged-shape app (Electron + the local IPC data layer),
// not a browser preview — see e2e/app.spec.ts. Needs the Vite dev server up
// since Electron's main process loads http://localhost:5183 whenever
// app.isPackaged is false; webServer here starts and stops it automatically
// around the test run instead of requiring a manually-run `npm run dev`.
// Port must match vite.config.ts's server.port exactly.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
