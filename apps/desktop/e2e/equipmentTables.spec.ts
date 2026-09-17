import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Loot & Consumable Tables', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-tables-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Equipment")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // hasText matches substrings, and "Common" is a substring of "Uncommon"
  // — filter on the exact rarity heading instead of the whole section.
  function raritySection(rarity: string) {
    return win
      .locator('.table-detail__rarity')
      .filter({ has: win.locator('.table-detail__rarity-title', { hasText: new RegExp(`^${rarity}$`) }) });
  }

  test('create a Loot Table, add a rollable entry, and see it persist across reload', async () => {
    // A Loot Table needs at least one real Loot record to reference. Exact
    // role-name match, not CSS :has-text substring matching — "Loot Tables"
    // contains "Loot" and "+ New Loot Table" contains "+ New Loot", so a
    // substring selector here would ambiguously match both sections.
    await win.getByRole('button', { name: '+ New Loot', exact: true }).click();
    await win.fill('.create-form input[type="text"]', 'Trinket');
    await win.click('button:has-text("Create Loot")');
    await expect(win.locator('.content-card', { hasText: 'Trinket' })).toBeVisible();

    await win.click('.browse-page__add-button:has-text("+ New Loot Table")');
    await win.fill('.create-form input[type="text"]', "Adventurer's Cache");
    await win.click('button:has-text("Create Loot Table")');
    const tableCard = win.locator('.content-card', { hasText: "Adventurer's Cache" });
    await expect(tableCard).toBeVisible();
    await expect(tableCard.getByText('Entries: 0')).toBeVisible();

    await tableCard.getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.table-detail__title')).toHaveText("Adventurer's Cache");

    const commonSection = raritySection('Common');
    await commonSection.getByRole('button', { name: '+ Add Entry' }).click();

    const entryRow = commonSection.locator('.table-detail__entry-row');
    await expect(entryRow).toHaveCount(1);
    await expect(entryRow.locator('.table-detail__position-input')).toHaveValue('1');
    await expect(entryRow.locator('.item-picker__option--selected')).toHaveText(/Trinket/);

    // Reload to confirm the entry actually persisted, not just local state.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Equipment")');
    await win
      .locator('.content-card', { hasText: "Adventurer's Cache" })
      .getByRole('button', { name: 'Open' })
      .click();
    await expect(raritySection('Common').locator('.table-detail__entry-row')).toHaveCount(1);

    // Rename via the detail hero's Edit, then back out and delete from the list.
    await win.click('.table-detail__hero-action:not(.table-detail__hero-action--danger)');
    await win.fill('.create-form input[type="text"]', 'Adventurer\'s Cache Renamed');
    await win.click('button:has-text("Save")');
    await expect(win.locator('.table-detail__title')).toHaveText("Adventurer's Cache Renamed");

    await win.click('.table-detail__back');
    const renamedCard = win.locator('.content-card', { hasText: "Adventurer's Cache Renamed" });
    await expect(renamedCard).toBeVisible();
    await renamedCard.getByRole('button', { name: 'Delete' }).click();
    await expect(renamedCard).toHaveCount(0);
  });

  test('a Loot Table entry position must stay within its rarity range', async () => {
    await win.getByRole('button', { name: '+ New Loot', exact: true }).click();
    await win.fill('.create-form input[type="text"]', 'Trinket');
    await win.click('button:has-text("Create Loot")');

    await win.click('.browse-page__add-button:has-text("+ New Loot Table")');
    await win.fill('.create-form input[type="text"]', 'Core Loot');
    await win.click('button:has-text("Create Loot Table")');
    await win.locator('.content-card', { hasText: 'Core Loot' }).getByRole('button', { name: 'Open' }).click();

    const commonSection = raritySection('Common');
    await commonSection.getByRole('button', { name: '+ Add Entry' }).click();
    await commonSection.locator('.table-detail__position-input').fill('25');
    await commonSection.locator('.table-detail__position-input').blur();
    await expect(win.locator('.table-detail__status--error')).toContainText('between 1 and 24');
  });

  test('create a Consumable Table and add a rollable entry', async () => {
    await win.click('.browse-page__section:has-text("Consumables") .browse-page__add-button:has-text("+ New Consumable")');
    await win.fill('.create-form input[type="text"]', 'Minor Health Potion');
    await win.click('button:has-text("Create Consumable")');

    await win.click('.browse-page__add-button:has-text("+ New Consumable Table")');
    await win.fill('.create-form input[type="text"]', 'Alchemy Shelf');
    await win.click('button:has-text("Create Consumable Table")');
    await win.locator('.content-card', { hasText: 'Alchemy Shelf' }).getByRole('button', { name: 'Open' }).click();

    const rareSection = raritySection('Rare');
    await rareSection.getByRole('button', { name: '+ Add Entry' }).click();
    await expect(rareSection.locator('.item-picker__option--selected')).toHaveText(/Minor Health Potion/);
  });
});
