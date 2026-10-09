import { test, expect, chromium, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COLLECTIONS = [
  'gameSets',
  'musicRegions',
  'musicTracks',
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
    // The app's own "are you sure?" (ConfirmHost) is agreed to wherever it appears.
    await win.addLocatorHandler(win.locator('.confirm-dialog'), async () => {
      await win.locator('.confirm-dialog__confirm').click();
    });
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads seeded Core content on first run with no errors', async () => {
    const errors: string[] = [];
    win.on('pageerror', (err) => errors.push(err.message));
    // Home is lazy-loaded (see App.tsx) — its chunk resolves just after the
    // app shell itself, so wait for its actual content rather than reading
    // the body immediately and catching the Suspense fallback instead.
    await expect(win.locator('body')).toContainText('9 built', { timeout: 5000 }); // Classes tile
    const body = await win.textContent('body');
    expect(body).not.toContain("Couldn't load your data");
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

  test('Heritage is alphabetical, full-width, and filters by Set', async () => {
    await win.click('.app-shell__nav-link:has-text("Heritage")');
    const communities = win.locator('.browse-page__section').nth(0);
    const ancestries = win.locator('.browse-page__section').nth(1);
    const addEntry = async (label: string, name: string, newSet?: string) => {
      await win.click(`button:has-text("+ New ${label}")`);
      await win.fill('.create-form .text-field:has-text("Name") input', name);
      await win.fill('.create-form label:has-text("Description") textarea', 'A short tagline. And the longer story behind it.');
      await win.click('.create-form .feature-editor__add');
      await win.fill('.create-form .feature-editor__row input[placeholder="Name"]', 'Well Read');
      await win.fill('.create-form .feature-editor__row textarea', 'You have advantage on rolls that involve the history of a place.');
      if (newSet) {
        await win.selectOption('.create-form select', '__new__');
        await win.fill('.game-set-select__new-row input', newSet);
        await win.click('.game-set-select__new-row button:has-text("Add")');
      }
      await win.click(`button:has-text("Create ${label}")`);
      await expect(win.locator('.create-form')).toHaveCount(0);
    };
    await addEntry('Community', 'Wanderborne');
    await addEntry('Community', 'Highborne');
    await addEntry('Ancestry', 'Elf');
    await addEntry('Ancestry', 'Dwarf');

    // One Set so far: nothing to filter by.
    await expect(win.locator('.set-filter')).toHaveCount(0);

    // The toggle is a plain word now, not an arrow that reads as "play".
    const toggle = communities.locator('.entry-card__toggle').first();
    await expect(toggle).toHaveText('Expand');
    await toggle.click();
    await expect(toggle).toHaveText('Collapse');

    // A feature runs the width of its card instead of sharing it with a label column.
    const card = await communities.locator('.entry-card__body').first().boundingBox();
    const feature = await communities.locator('.entry-card__feature').first().boundingBox();
    if (!card || !feature) throw new Error('entry card not visible');
    expect(feature.width).toBeGreaterThan(card.width * 0.95);

    // Created last, in a Set of its own, and still listed first.
    await addEntry('Community', 'Aardvark Folk', 'Homebrew');
    await expect(communities.locator('.entry-card__title')).toHaveText(['Aardvark Folk', 'Highborne', 'Wanderborne']);
    await expect(ancestries.locator('.entry-card__title')).toHaveText(['Dwarf', 'Elf']);

    // One filter covers both sections.
    await win.selectOption('.set-filter', { label: 'Homebrew' });
    await expect(communities.locator('.entry-card__title')).toHaveText(['Aardvark Folk']);
    await expect(ancestries).toContainText('No Ancestries in this Set.');
    await win.selectOption('.set-filter', 'all');
    await expect(communities.locator('.entry-card')).toHaveCount(3);

    // Optional Mechanics is built from the same pieces.
    await win.click('.app-shell__nav-link:has-text("Optional Mechanics")');
    await expect(win.locator('.browse-page__section-title:visible')).toHaveText(['Transformations']);
    await expect(win.locator('.content-card-list__empty:visible')).toContainText('No Transformations yet');
    await expect(win.locator('.set-filter:visible')).toHaveCount(1);
  });

  test('Equipment offers Cards or Table', async () => {
    await win.click('.app-shell__nav-link:has-text("Equipment")');
    await expect(win.locator('.mode-toggle__option')).toHaveText(['Cards', 'Table']);
    await win.click('.mode-toggle__option:has-text("Table")');
    await expect(win.locator('.mode-toggle__option--active')).toHaveText('Table');
    // Remembered between launches, so put it back for whoever runs next.
    await win.click('.mode-toggle__option:has-text("Cards")');
  });

  test('Adversaries has a Table view whose rows open in place', async () => {
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    for (const name of ['Bear', 'Wolf']) {
      await win.click('button:has-text("+ New Adversary")');
      await win.fill('.create-form .text-field:has-text("Name") input', name);
      await win.fill('.create-form .text-field:has-text("HP") input', '6');
      await win.locator('.create-form select').first().selectOption('BRUISER');
      await win.click('button:has-text("Create Adversary")');
      await expect(win.locator('.create-form')).toHaveCount(0);
    }
    // Table is what opens first, with no mode picked.
    const gallery = win.locator('.stat-gallery').first();
    await expect(gallery.locator('.stat-gallery__mode-option--active')).toHaveText('Table');
    await expect(gallery.locator('.stat-gallery__table-row--item').first()).toContainText('Bruiser');

    await expect(gallery.locator('.stat-gallery__table-cell--head')).toHaveText([
      'Name',
      'Tier',
      'Difficulty',
      'HP',
      'Stress',
      'Type',
      'Experiences',
    ]);
    // The spotlight column is gone: the table has the page's width.
    await expect(gallery.locator('.stat-gallery__spotlight')).toHaveCount(0);

    const rows = gallery.locator('.stat-gallery__table-name');
    const firstName = await rows.nth(0).textContent();
    const secondName = await rows.nth(1).textContent();
    if (!firstName || !secondName) throw new Error('no Adversaries listed');

    await rows.nth(0).click();
    const detail = gallery.locator('.stat-gallery__table-detail');
    await expect(detail).toHaveCount(1);
    await expect(detail.locator('.stat-sheet__name')).toHaveText(firstName);
    await expect(rows.nth(0)).toHaveAttribute('aria-expanded', 'true');

    // Opening another shuts the first, which is remembered above the table.
    await rows.nth(1).click();
    await expect(detail).toHaveCount(1);
    await expect(detail.locator('.stat-sheet__name')).toHaveText(secondName);
    const chips = gallery.locator('.stat-gallery__history-chip');
    await expect(chips).toHaveCount(1);
    await expect(chips).toContainText(firstName);

    // Clicking the open row shuts it.
    await rows.nth(1).click();
    await expect(detail).toHaveCount(0);
    await expect(chips).toHaveCount(2);

    // A chip reopens its row even when a search is hiding it.
    await gallery.locator('.stat-gallery__search').fill('zzzz-no-such-adversary');
    await expect(gallery.locator('.stat-gallery__table')).toHaveCount(0);
    await chips.filter({ hasText: firstName }).first().click();
    await expect(detail.locator('.stat-sheet__name')).toHaveText(firstName);
    await expect(gallery.locator('.stat-gallery__search')).toHaveValue('');

    // Another view is remembered across a reload; put Table back for whoever runs next.
    await gallery.locator('.stat-gallery__mode-option', { hasText: 'Standard' }).click();
    await expect(gallery.locator('.stat-gallery__spotlight')).toBeVisible();
    await win.reload();
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    await expect(win.locator('.stat-gallery').first().locator('.stat-gallery__spotlight')).toBeVisible();
    await win.locator('.stat-gallery').first().locator('.stat-gallery__mode-option', { hasText: 'Table' }).click();
    await expect(win.locator('.stat-gallery').first().locator('.stat-gallery__table')).toBeVisible();
  });

  test('Environments open as a table of Name, Tier and Type', async () => {
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    await win.click('button:has-text("+ New Environment")');
    await win.fill('.create-form .text-field:has-text("Name") input', 'Raging River');
    await win.locator('.create-form select').first().selectOption('TRAVERSAL');
    await win.click('button:has-text("Create Environment")');
    await expect(win.locator('.create-form')).toHaveCount(0);

    const gallery = win.locator('.stat-gallery').first();
    await expect(gallery.locator('.stat-gallery__mode-option--active')).toHaveText('Table');
    await expect(gallery.locator('.stat-gallery__table-cell--head')).toHaveText(['Name', 'Tier', 'Type']);
    await expect(gallery.locator('.stat-gallery__table-row--item')).toContainText('Traversal');
    await gallery.locator('.stat-gallery__table-name').click();
    await expect(gallery.locator('.stat-gallery__table-detail .stat-sheet__name')).toHaveText('Raging River');
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
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Settings: switching Color Theme updates the document and persists across reload, independent of Light/Dark', async () => {
    await win.click('.app-shell__settings');
    await expect(win.locator('.settings-page__title')).toBeVisible();

    // Palette preference lives in localStorage, which (unlike
    // DAGGERHEART_STORE_DIR) survives across test runs on the same machine —
    // so don't assume Ember is the starting state, just that choosing Frost
    // sets the attribute explicitly.
    await win.click('.settings-page__option:has-text("Frost")');
    await expect(win.locator('html')).toHaveAttribute('data-palette', 'frost');

    // Switching Light/Dark doesn't touch the palette choice.
    await win.click('.settings-page__option:has-text("Light")');
    await expect(win.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(win.locator('html')).toHaveAttribute('data-palette', 'frost');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await expect(win.locator('html')).toHaveAttribute('data-palette', 'frost');

    // Back to Ember removes the attribute again rather than leaving it set.
    await win.click('.app-shell__settings');
    await win.click('.settings-page__option:has-text("Ember")');
    await expect(win.locator('html')).not.toHaveAttribute('data-palette');
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
    await page.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? '');
    expect(rootHtml.length).toBeGreaterThan(50);
    await expect(page.locator('.app-shell__nav-link')).toHaveCount(7);
    await expect(page.locator('body')).toContainText('needs to run inside the Electron shell');
    expect(pageErrors).toEqual([]);

    await browser.close();
  });
});
