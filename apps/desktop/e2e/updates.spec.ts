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
test.describe('Update check (notify-only fallback)', () => {
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
    // A dev build cannot replace itself, so the button points at the download page rather than Update now.
    await expect(banner.locator('.update-banner__action')).toHaveText('View download');

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


// The install-it-yourself flow. A real self-update needs a signed, published
// release, so these run the real app against a scripted updater
// (DAGGERHEART_FAKE_AUTOUPDATER) that emits the same events electron-updater
// does. What they prove is the part that is ours: it asks first, downloads
// only on a yes, "Later" changes nothing, and a failure never blocks anything.
test.describe('Update flow (asks before updating)', () => {
  let tempDir: string;
  let server: http.Server;
  let baseUrl = '';
  let app: ElectronApplication | null = null;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-updateflow-'));
    server = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          tag_name: 'v9.9.9',
          html_url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v9.9.9',
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

  async function launch(extraEnv: Record<string, string>) {
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    env.DAGGERHEART_UPDATE_URL = baseUrl;
    Object.assign(env, extraEnv);
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.'), `--user-data-dir=${path.join(tempDir, 'profile')}`], env });
    win = await app.firstWindow();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
  }

  const installCalled = () =>
    app!.evaluate(() => Boolean((globalThis as { __quitAndInstallCalled?: boolean }).__quitAndInstallCalled));

  test('asks first, downloads only after Update now, then offers to restart and install', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9' });
    const banner = win.locator('.update-banner');
    await expect(banner).toContainText('Version 9.9.9 is available');

    // It waits to be asked: nothing downloads by itself.
    await win.waitForTimeout(1200);
    await expect(banner.locator('.update-banner__progress')).toHaveCount(0);
    await expect(banner.locator('.update-banner__action')).toHaveText('Update now');

    await banner.locator('.update-banner__action').click();
    await expect(banner.locator('.update-banner__progress')).toBeVisible();
    await expect(banner).toContainText('is ready');
    expect(await installCalled()).toBe(false); // ready is not installed

    await banner.getByRole('button', { name: 'Restart & install' }).click();
    await expect.poll(installCalled).toBe(true);
  });

  test('Later leaves everything as it was: no download, no install, and the app stays fully usable', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9' });
    await expect(win.locator('.update-banner')).toContainText('Version 9.9.9 is available');
    await win.click('.update-banner__dismiss');
    await expect(win.locator('.update-banner')).toHaveCount(0);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub');
    await win.waitForTimeout(1500);
    await expect(win.locator('.update-banner')).toHaveCount(0); // not nagged again for the same version
    expect(await installCalled()).toBe(false);

    await win.click('.app-shell__nav-link:has-text("Domains")');
    await expect(win.locator('.domain-banner:not(.domain-banner--hollow)')).toHaveCount(9);
  });

  test('a downloaded update can also wait: Later hides the notice without installing', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9' });
    await win.click('.update-banner__action');
    await expect(win.locator('.update-banner')).toContainText('is ready');
    await win.click('.update-banner__later');
    await expect(win.locator('.update-banner')).toHaveCount(0);
    expect(await installCalled()).toBe(false);
  });

  test('a failed download says so and can be retried', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9', DAGGERHEART_FAKE_AUTOUPDATER_FAIL: 'download' });
    await win.click('.update-banner__action');
    await expect(win.locator('.update-banner')).toContainText("didn't finish");
    await expect(win.locator('.update-banner__action')).toHaveText('Update now');
  });

  test('if the updater cannot read the release (no update manifest), it still announces it and links to the download', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9', DAGGERHEART_FAKE_AUTOUPDATER_FAIL: 'check' });
    await expect(win.locator('.update-banner')).toContainText('Version 9.9.9 is available');
    await expect(win.locator('.update-banner__action')).toHaveText('View download');
  });

  test('Settings can check, update and restart too', async () => {
    await launch({ DAGGERHEART_FAKE_AUTOUPDATER: '9.9.9' });
    await win.click('.update-banner__dismiss');
    await win.click('.app-shell__settings');
    await win.click('button:has-text("Check for updates")');
    const status = win.locator('.settings-page__update-status');
    await expect(status).toContainText('Version 9.9.9 is available');
    await status.getByRole('button', { name: 'Update now' }).click();
    await expect(status).toContainText('ready to install');
    await status.getByRole('button', { name: 'Restart & install' }).click();
    await expect.poll(installCalled).toBe(true);
  });
});
