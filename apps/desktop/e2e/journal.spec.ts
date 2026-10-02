import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Journal bubble', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-journal-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function createCampaign(name: string) {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', name);
    await win.click('button:has-text("Create Campaign")');
    await expect(win.locator('.campaign-row', { hasText: name })).toBeVisible();
  }

  test('shows the campaign list by default, and selecting one does not navigate away', async () => {
    await createCampaign('The Sundered Coast');
    // Selecting a different page proves the bubble is reachable everywhere
    // and that picking a Campaign from it stays put on the current page.
    await win.click('.app-shell__nav-link:has-text("Equipment")');

    await win.click('.journal-bubble');
    await expect(win.locator('.journal-panel__title')).toHaveText('Journal');
    await expect(win.locator('.journal-campaign-row__name', { hasText: 'The Sundered Coast' })).toBeVisible();

    await win.click('.journal-campaign-row__name:has-text("The Sundered Coast")');
    await expect(win.locator('.journal-panel__title')).toHaveText('The Sundered Coast');
    // Still on Equipment — selecting a campaign for journaling must not navigate.
    await expect(win.locator('.app-shell__nav-link.active')).toHaveText('Equipment');

    await win.click('.journal-panel__back');
    await expect(win.locator('.journal-panel__title')).toHaveText('Journal');
  });

  test('"Open" navigates to the campaign\'s own detail page', async () => {
    await createCampaign('Embers of House Virel');
    await win.click('.app-shell__nav-link:has-text("Classes")');

    await win.click('.journal-bubble');
    await win
      .locator('.journal-campaign-row', { hasText: 'Embers of House Virel' })
      .locator('.journal-campaign-row__open')
      .click();

    await expect(win.locator('.app-shell__nav-link.active')).toHaveText('Campaigns');
    await expect(win.locator('h1', { hasText: 'Embers of House Virel' })).toBeVisible();
  });

  test('create one entry per kind, edit it, and it persists across reload', async () => {
    await createCampaign('The Wildwood');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("The Wildwood")');

    const kinds = ['Adversaries', 'Loot', 'Consumables', 'Armor', 'Weapons', 'Worldbuilding', 'Other'];
    for (const kind of kinds) {
      await win.click('.journal-panel__plus');
      await win.click(`.journal-panel__menu-item:has-text("+ ${kind}")`);
      await win.fill('.journal-entry-editor__label', `${kind} note`);
      await win.fill('.journal-entry-editor__notes', `Some ${kind.toLowerCase()} detail.`);
      await win.click('.journal-entry-editor__done');
      await expect(win.locator('.journal-panel__group-label', { hasText: kind })).toBeVisible();
      await expect(win.locator('.journal-entry-row__label', { hasText: `${kind} note` })).toBeVisible();
    }

    // Edit the Weapons entry.
    await win.locator('.journal-entry-row', { hasText: 'Weapons note' }).locator('.journal-entry-row__edit').click();
    await win.fill('.journal-entry-editor__label', 'Weapons note (renamed)');
    await win.click('.journal-entry-editor__done');
    await expect(win.locator('.journal-entry-row__label', { hasText: 'Weapons note (renamed)' })).toBeVisible();

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.journal-bubble');
    // The selection itself doesn't survive a reload — back at the global list.
    await expect(win.locator('.journal-panel__title')).toHaveText('Journal');
    await win.click('.journal-campaign-row__name:has-text("The Wildwood")');
    await expect(win.locator('.journal-entry-row__label', { hasText: 'Weapons note (renamed)' })).toBeVisible();
    for (const kind of kinds) {
      await expect(win.locator('.journal-panel__group-label', { hasText: kind })).toBeVisible();
    }
  });

  test('deleting an entry removes it, and a section disappears once it holds nothing', async () => {
    await createCampaign('Deletion Test');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Deletion Test")');

    await win.click('.journal-panel__plus');
    await win.click('.journal-panel__menu-item:has-text("+ Loot")');
    await win.fill('.journal-entry-editor__label', 'A trinket');
    await win.click('.journal-entry-editor__done');
    await expect(win.locator('.journal-panel__group-label', { hasText: 'Loot' })).toBeVisible();

    await win.click('.journal-entry-row__remove');
    await expect(win.locator('.journal-entry-row__label', { hasText: 'A trinket' })).toHaveCount(0);
    await expect(win.locator('.journal-panel__group-label', { hasText: 'Loot' })).toHaveCount(0);
    await expect(win.locator('.journal-panel__status', { hasText: 'No notes yet' })).toBeVisible();
  });
});
