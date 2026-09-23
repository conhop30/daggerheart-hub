import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const APP_VERSION: string = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')).version;

// The app's update check reads the GitHub "latest release" API. These tests
// point it (via DAGGERHEART_UPDATE_URL) at a local fake so the real Electron
// app is exercised end to end without touching the network.
test.describe('Update check', () => {
  let tempDir: string;
  let server: http.Server;
  let latestTag = 'v9.9.9';
  let baseUrl = '';
  let app: ElectronApplication | null = null;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-updates-'));
    latestTag = 'v9.9.9';
    server = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          tag_name: latestTag,
          html_url: `https://github.com/conhop30/daggerheart-hub/releases/tag/${latestTag}`,
        })
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/latest`;
  });

  test.afterEach(async () => {
    await app?.close();
    app = null;
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function launch(updateUrl: string) {
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    env.DAGGERHEART_UPDATE_URL = updateUrl;
    delete env.ELECTRON_RUN_AS_NODE;
    // A per-test profile dir keeps localStorage (the dismissed-version / opt-out prefs) from leaking between tests.
    app = await electron.launch({ args: [path.resolve('.'), `--user-data-dir=${path.join(tempDir, 'profile')}`], env });
    win = await app.firstWindow();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
  }

  test('shows a banner when a newer release exists, and dismissing it sticks for that version', async () => {
    await launch(baseUrl);
    const banner = win.locator('.update-banner');
    await expect(banner).toContainText('Version 9.9.9 is available');

    await win.click('.update-banner__dismiss');
    await expect(banner).toHaveCount(0);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub');
    await win.waitForTimeout(1500); // long enough for the launch check to have finished
    await expect(win.locator('.update-banner')).toHaveCount(0);
  });

  test('says nothing when the app is already up to date', async () => {
    latestTag = `v${APP_VERSION}`;
    await launch(baseUrl);
    await win.waitForTimeout(1500);
    await expect(win.locator('.update-banner')).toHaveCount(0);
  });

  test('is silent when GitHub is unreachable', async () => {
    const dead = baseUrl;
    await new Promise((resolve) => server.close(resolve));
    await launch(dead);
    await win.waitForTimeout(1500);
    await expect(win.locator('.update-banner')).toHaveCount(0);
    // The rest of the app is unaffected.
    await win.click('.app-shell__nav-link:has-text("Domains")');
    await expect(win.locator('.domain-banner:not(.domain-banner--hollow)')).toHaveCount(9);
    // Re-open so afterEach's server.close doesn't throw on an already-closed server.
    server = http.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  test('Settings shows the version and a manual check reports the result', async () => {
    latestTag = 'v9.9.9';
    await launch(baseUrl);
    await win.click('.app-shell__settings');
    await expect(win.locator('.settings-page')).toContainText(`You're running version ${APP_VERSION}`);
    await win.click('button:has-text("Check for updates")');
    await expect(win.locator('.settings-page__update-status')).toContainText('Version 9.9.9 is available');
  });

  test('turning off the launch check in Settings stops the banner', async () => {
    await launch(baseUrl);
    await expect(win.locator('.update-banner')).toBeVisible();
    await win.click('.app-shell__settings');
    await win.uncheck('text=Check for updates when the app starts');
    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub');
    await win.waitForTimeout(1500);
    await expect(win.locator('.update-banner')).toHaveCount(0);
  });
});
