import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Sessions (Fear, combat/adventuring, loot rolling)', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-sessions-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function createAdversary(name: string, hp: string, stress: string) {
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await win.fill('.create-form input[type="text"]', name);
    await win.fill('.text-field:has-text("HP") input', hp);
    await win.fill('.text-field:has-text("Stress") input', stress);
    await win.click('button:has-text("Create Adversary")');
    await win.click('.app-shell__brand');
  }

  async function createCampaignAndOpenSession(campaignName: string, sessionName: string) {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', campaignName);
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: campaignName }).locator('.campaign-banner__hit').click();

    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', sessionName);
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: sessionName }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.session-view__title')).toHaveText(sessionName);
  }

  test('Fear track, mode toggle, and pulling an Adversary into Combat all persist across reload', async () => {
    await createAdversary('Ogre', '8', '3');
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    await win.getByRole('button', { name: 'Set Fear to 5' }).click();
    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');

    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(win.locator('.combat-panel')).toBeVisible();

    await win.click('.combat-panel__pull-button:has-text("+ Pull In Adversary")');
    await win.click('.item-picker__option:has-text("Ogre")');
    const tile = win.locator('.content-card', { hasText: 'Ogre' });
    await expect(tile).toBeVisible();
    await expect(tile.locator('.stat-stepper__value').first()).toHaveText('0 / 8');

    await tile.getByRole('button', { name: 'Increase HP Marked' }).click();
    await expect(tile.locator('.stat-stepper__value').first()).toHaveText('1 / 8');

    // Reload and re-navigate all the way back in — nothing here is kept in
    // localStorage, so this only passes if the IPC round trips actually
    // persisted to disk.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    await expect(win.locator('.mode-toggle__option--active')).toHaveText('Combat');
    const reloadedTile = win.locator('.content-card', { hasText: 'Ogre' });
    await expect(reloadedTile.locator('.stat-stepper__value').first()).toHaveText('1 / 8');

    await reloadedTile.getByRole('button', { name: 'Push Out' }).click();
    await expect(reloadedTile).toHaveCount(0);
  });

  test('Adventuring notes save and persist, and a session can be renamed and deleted', async () => {
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    await win.fill('.adventuring-panel__note-field:has-text("Session Notes") textarea', 'The party enters the cave.');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.adventuring-panel__note-field:has-text("Session Notes") textarea')).toHaveValue(
      'The party enters the cave.'
    );

    await win.click('.session-view__header-action:not(.session-view__header-action--danger)');
    await win.fill('.create-form input[type="text"]', 'Session 1 Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.session-view__title')).toHaveText('Session 1 Renamed');

    await win.click('.session-view__header-action.session-view__header-action--danger');
    await expect(win.locator('.session-list')).toBeVisible();
    await expect(win.locator('.content-card', { hasText: 'Session 1 Renamed' })).toHaveCount(0);
  });

  test('rolling loot appends a labeled result to the session log', async () => {
    // Build a one-entry Loot Table whose Common position (7) matches what a
    // stubbed Math.random() always resolves to, so the roll is deterministic.
    await win.click('.app-shell__nav-link:has-text("Equipment")');
    await win.getByRole('button', { name: '+ New Loot', exact: true }).click();
    await win.fill('.create-form input[type="text"]', 'Trinket');
    await win.click('button:has-text("Create Loot")');

    await win.click('.browse-page__add-button:has-text("+ New Loot Table")');
    await win.fill('.create-form input[type="text"]', 'Adventure Loot');
    await win.click('button:has-text("Create Loot Table")');
    await win.locator('.content-card', { hasText: 'Adventure Loot' }).getByRole('button', { name: 'Open' }).click();
    const commonSection = win
      .locator('.table-detail__rarity')
      .filter({ has: win.locator('.table-detail__rarity-title', { hasText: /^Common$/ }) });
    await commonSection.getByRole('button', { name: '+ Add Entry' }).click();
    await commonSection.locator('.table-detail__position-input').fill('7');
    await expect(commonSection.locator('.table-detail__position-input')).toHaveValue('7');

    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    // Math.floor(0.5 * 12) + 1 === 7, so a single d12 always lands on the
    // position the Trinket entry was placed at above.
    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });

    await win.locator('.loot-roller__table-option', { hasText: 'Adventure Loot' }).locator('input').check();
    await win.click('.loot-roller__roll');

    const logEntry = win.locator('.loot-roller__log-entry').first();
    await expect(logEntry).toContainText('Adventure Loot');
    await expect(logEntry).toContainText('Trinket');
  });

  test('deleting a Campaign cascades to remove its Sessions', async () => {
    await createCampaignAndOpenSession('Doomed Campaign', 'Session 1');
    await win.click('.session-view__back');
    await win.click('.campaign-detail__back');

    await win.locator('.campaign-banner', { hasText: 'Doomed Campaign' }).locator('.campaign-banner__hit').click();
    await expect(win.locator('.content-card', { hasText: 'Session 1' })).toBeVisible();

    await win.click('.campaign-detail__back');
    await win.locator('.campaign-banner', { hasText: 'Doomed Campaign' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.campaign-banner', { hasText: 'Doomed Campaign' })).toHaveCount(0);
  });
});
