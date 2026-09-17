import { test, expect, chromium, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COLLECTIONS = [
  'gameSets',
  'domains',
  'heroClasses',
  'subclasses',
  'cards',
  'adversaries',
  'environments',
  'weapons',
  'armors',
  'loot',
  'consumables',
  'communities',
  'ancestries',
  'transformations',
  'campaigns',
  'partyMembers',
  'lootTables',
  'consumableTables',
  'sessions',
  'sessionAdversaries',
  'sessionEnvironments',
];

test.describe('Electron app', () => {
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
    const labels = [
      'Classes',
      'Adversaries & Environments',
      'Domains',
      'Heritage',
      'Equipment',
      'Optional Mechanics',
      'Campaigns',
    ];
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
    const banner = win.locator('.domain-banner:not(.domain-banner--hollow)', { hasText: 'E2E Domain' });
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'E2E Domain Renamed');
    await win.click('button:has-text("Save Changes")');
    const renamed = win.locator('.domain-banner:not(.domain-banner--hollow)', { hasText: 'E2E Domain Renamed' });
    await expect(renamed).toBeVisible();

    await renamed.getByRole('button', { name: 'Delete' }).click();
    await expect(renamed).toHaveCount(0);
  });

  test('open a Domain, create a Card in it, then edit and delete it', async () => {
    await win.click('.app-shell__nav-link:has-text("Domains")');
    await win.locator('.domain-banner', { hasText: 'Arcana' }).locator('.domain-banner__hit').click();
    await expect(win.locator('.domain-detail__title')).toHaveText('Arcana');

    await win.click('.domain-card-grid__create');
    await win.fill('.create-form input[type="text"]', 'Rune Ward');
    await win.click('button:has-text("Create Card")');
    await expect(win.locator('.domain-card-tile', { hasText: 'Rune Ward' })).toBeVisible();

    await win.locator('.domain-card-tile', { hasText: 'Rune Ward' }).getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'Rune Ward Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.domain-card-tile', { hasText: 'Rune Ward Renamed' })).toBeVisible();

    await win.locator('.domain-card-tile', { hasText: 'Rune Ward Renamed' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.domain-card-tile', { hasText: 'Rune Ward Renamed' })).toHaveCount(0);
  });

  test('selecting a Class filters the Domain grid to its two Domains', async () => {
    await win.click('.app-shell__nav-link:has-text("Domains")');
    const realBanners = win.locator('.domain-banner:not(.domain-banner--hollow)');
    await expect(realBanners).toHaveCount(9);

    await win.click('.domains-page__filter:has-text("Wizard")');
    await expect(realBanners).toHaveCount(2);
    await expect(win.locator('.domain-banner__title')).toHaveText(['Codex', 'Splendor']);

    await win.click('.domains-page__filter:text-is("All Classes")');
    await expect(realBanners).toHaveCount(9);
  });

  test('a Secondary weapon cannot be created as Two-Handed', async () => {
    await win.click('.create-panel__toggle');
    await win.click('.chip:has-text("Equipment")');
    await win.click('.banner:has-text("Weapon (Secondary)")');
    const burdenSelect = win.locator('.create-form select').first();
    await expect(burdenSelect).toBeDisabled();
    await expect(burdenSelect).toHaveValue('ONE_HANDED');
  });

  test('a custom Game Set created from one form is immediately available in another', async () => {
    await win.click('.app-shell__nav-link:has-text("Domains")');
    await win.click('.domain-banner--hollow');
    await win.selectOption('.create-form select', '__new__');
    await win.fill('.game-set-select__new-row input', 'Hope and Fear');
    await win.click('.game-set-select__new-row button:has-text("Add")');
    await expect(win.locator('.create-form select option', { hasText: 'Hope and Fear' })).toHaveCount(1);

    // The new Set should now be selectable from a completely different form,
    // proving GameSetsProvider's context (not just this form's local state)
    // picked it up.
    await win.click('.create-form button:has-text("Cancel")');
    await win.click('.app-shell__brand');
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await expect(win.locator('.create-form select', { hasText: 'Hope and Fear' })).toHaveCount(1);
  });

  test('drag-reordering a feature list actually changes the order', async () => {
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Class")');
    const addFeature = win.locator('.feature-editor__add');
    await addFeature.click();
    await addFeature.click();
    const nameInputs = win.locator('.feature-editor__row input[placeholder="Name"]');
    await nameInputs.nth(0).fill('First');
    await nameInputs.nth(1).fill('Second');

    const handles = win.locator('.feature-editor .drag-handle');
    const firstBox = await handles.nth(0).boundingBox();
    const secondBox = await handles.nth(1).boundingBox();
    if (!firstBox || !secondBox) throw new Error('drag handle not visible');
    await win.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await win.mouse.down();
    await win.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });
    await win.dispatchEvent('.feature-editor .drag-handle >> nth=1', 'dragenter');
    await win.mouse.up();

    await expect(nameInputs.nth(0)).toHaveValue('Second');
    await expect(nameInputs.nth(1)).toHaveValue('First');
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
    await expect.poll(() => fs.existsSync(exportPath), { timeout: 5000 }).toBe(true);
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    for (const key of COLLECTIONS) {
      expect(Array.isArray(exported[key]), `${key} should be an array`).toBe(true);
    }
  });

  test('Settings: switching theme updates the document and persists across reload', async () => {
    await win.click('.app-shell__settings');
    await expect(win.locator('.settings-page__title')).toBeVisible();

    await win.click('.settings-page__option:has-text("Light")');
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'light');

    await win.click('.settings-page__option:has-text("Dark")');
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Settings: applying a window size preset actually resizes the window', async () => {
    await win.click('.app-shell__settings');
    await win.click('.settings-page__option:has-text("Compact")');
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getSize())).toEqual([
      1024, 720,
    ]);
    await expect(win.locator('.settings-page__section-hint', { hasText: '1024' })).toBeVisible();
  });
});

test.describe('Plain browser tab (no Electron)', () => {
  // Regression test for a real bug: window.daggerheart is undefined outside
  // Electron, and every apiClient method used to throw *synchronously* when
  // that happened. A synchronous throw inside a useEffect (GameSetsContext,
  // useApiList) never reaches its own .catch(), propagates as an uncaught
  // error, and — with no error boundary anywhere in the app — React
  // unmounts the entire tree. The visible symptom was exactly "a colored
  // background with no content": the CSS loaded, React never mounted
  // anything. Fixed by making every apiClient method genuinely `async`, so
  // the throw becomes a rejected Promise instead. This test would have
  // caught it, since every other test here runs inside Electron only.
  test('renders the shell and a clear message instead of a blank page', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('http://localhost:5183');
    await page.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? '');
    expect(rootHtml.length).toBeGreaterThan(50);
    await expect(page.locator('.app-shell__nav-link')).toHaveCount(7);
    await expect(page.locator('body')).toContainText('needs to run inside the Electron shell');
    expect(pageErrors).toEqual([]);

    await browser.close();
  });
});
