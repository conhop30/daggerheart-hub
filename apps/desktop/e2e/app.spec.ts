import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COLLECTIONS = [
  'gameSets',
  'domains',
  'heroClasses',
  'subclasses',
  'adversaries',
  'environments',
  'weapons',
  'armors',
  'loot',
  'consumables',
  'communities',
  'ancestries',
  'transformations',
];

let tempDir: string;
let app: ElectronApplication;
let win: Page;

test.beforeEach(async () => {
  // A fresh DAGGERHEART_STORE_DIR per test — real usage never sets this
  // (see electron/store.js), so this never touches ~/.daggerheart-hub and
  // every test starts from an identical freshly-seeded Core Set.
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-'));
  // Electron's launch() wants { [key: string]: string } — process.env allows
  // `undefined` values, so filter those out rather than fighting the type.
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  env.DAGGERHEART_STORE_DIR = tempDir;
  delete env.ELECTRON_RUN_AS_NODE; // sandboxes that force Electron into plain-Node mode break app/BrowserWindow/ipcMain entirely
  app = await electron.launch({ args: [path.resolve('.')], env });
  win = await app.firstWindow();
  win.on('dialog', (dialog) => dialog.accept()); // auto-accept window.confirm from delete buttons
  await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
});

test.afterEach(async () => {
  await app.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('loads seeded Core content on first run with no errors', async () => {
  const errors: string[] = [];
  win.on('pageerror', (err) => errors.push(err.message));
  const body = await win.textContent('body');
  expect(body).not.toContain("Couldn't load your data");
  expect(body).toContain('9 built'); // Classes tile
  expect(errors).toEqual([]);
});

test('every nav link reaches its page and marks itself active', async () => {
  const labels = ['Classes', 'Adversaries & Environments', 'Domains', 'Heritage', 'Equipment', 'Optional Mechanics'];
  for (const label of labels) {
    await win.click(`.app-shell__nav-link:has-text("${label}")`);
    await expect(win.locator('.app-shell__nav-link.active')).toHaveText(label);
  }
});

test('create -> view -> edit -> delete round trip for a Domain', async () => {
  await win.click('.create-panel__toggle');
  await win.click('.chip:text-is("Domain")');
  await win.fill('.create-form input[type="text"]', 'E2E Domain');
  await win.click('button:has-text("Create Domain")');

  await win.click('.app-shell__nav-link:has-text("Domains")');
  await expect(win.locator('.content-card', { hasText: 'E2E Domain' })).toBeVisible();

  await win.locator('.content-card', { hasText: 'E2E Domain' }).getByRole('button', { name: 'Edit' }).click();
  await win.fill('.create-form input[type="text"]', 'E2E Domain Renamed');
  await win.click('button:has-text("Save Changes")');
  await expect(win.locator('.content-card', { hasText: 'E2E Domain Renamed' })).toBeVisible();

  await win.locator('.content-card', { hasText: 'E2E Domain Renamed' }).getByRole('button', { name: 'Delete' }).click();
  await expect(win.locator('.content-card', { hasText: 'E2E Domain Renamed' })).toHaveCount(0);
});

test('a Secondary weapon cannot be created as Two-Handed', async () => {
  await win.click('.create-panel__toggle');
  await win.click('.chip:has-text("Equipment")');
  await win.click('.banner:has-text("Weapon (Secondary)")');
  const burdenSelect = win.locator('.create-form select').first();
  await expect(burdenSelect).toBeDisabled();
  await expect(burdenSelect).toHaveValue('ONE_HANDED');
});

test('export produces a valid snapshot with every collection present', async () => {
  const exportPath = path.join(tempDir, 'export.json');
  await app.evaluate(
    ({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    },
    exportPath
  );
  await win.click('text=Export Data');
  await expect
    .poll(() => fs.existsSync(exportPath), { timeout: 5000 })
    .toBe(true);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  for (const key of COLLECTIONS) {
    expect(Array.isArray(exported[key]), `${key} should be an array`).toBe(true);
  }
});
