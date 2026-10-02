import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Campaign row and carrying a session forward', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-banner-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function createCampaign(name: string, level?: string) {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', name);
    if (level) await win.fill('.text-field:has-text("Party Level") input', level);
    await win.click('button:has-text("Create Campaign")');
  }

  async function openCampaign(name: string) {
    await win.locator('.campaign-row', { hasText: name }).click();
  }

  test('the banner shows the party level and the player names', async () => {
    await createCampaign('The Wildwood', '5');
    await openCampaign('The Wildwood');
    await expect(win.locator('.campaign-detail__level')).toHaveText('Party Level 5');

    for (const name of ['Fenn', 'Mira']) {
      await win.click('.party-roster__add');
      await win.fill('.create-form input[type="text"]', name);
      await win.click('button:has-text("Add Party Member")');
      await expect(win.locator('.content-card', { hasText: name })).toBeVisible();
    }

    await win.click('.campaign-detail__back');
    const banner = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'The Wildwood' });
    await expect(banner.locator('.campaign-row__level')).toHaveText('Level 5');
    await expect(banner.locator('.campaign-row__party')).toHaveText('Fenn, Mira');
  });

  test('a campaign with no party says so, and a new one defaults to level 1', async () => {
    await createCampaign('Fresh Start');
    const banner = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'Fresh Start' });
    await expect(banner.locator('.campaign-row__level')).toHaveText('Level 1');
    await expect(banner.locator('.campaign-row__party')).toHaveText('No party yet');
  });

  test('session rows no longer show a Mode chip', async () => {
    await createCampaign('The Wildwood');
    await openCampaign('The Wildwood');
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    const row = win.locator('.content-card', { hasText: 'Session 1' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Fear');
    await expect(row).not.toContainText('Mode');
  });

  test('New Session suggests the next number and carries the campaign forward; Clone Most Recent also copies the mode', async () => {
    await createCampaign('The Wildwood');
    await openCampaign('The Wildwood');

    // Nothing to clone yet.
    await expect(win.locator('.session-list__clone')).toBeDisabled();

    await win.click('.session-list__add');
    await expect(win.locator('.create-form input[type="text"]')).toHaveValue('Session 1');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    await win.getByRole('button', { name: 'Set Fear to 5' }).click();
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    await win.click('.session-view__back');

    await expect(win.locator('.session-list__clone')).toBeEnabled();
    await win.click('.session-list__clone');

    // Cloning drops you straight into the copy: Fear carries forward, and the
    // clone also starts with the source's mode.
    await expect(win.locator('.session-view__title')).toHaveText('Session 2');
    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    await expect(win.locator('.mode-toggle__option--active')).toHaveText('Combat');

    // Changing the copy leaves the original alone.
    await win.getByRole('button', { name: 'Set Fear to 9' }).click();
    await win.click('.session-view__back');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    await win.click('.session-view__back');

    // A plain New Session suggests the next number and carries Fear forward
    // from the latest session (9, set in Session 2).
    await win.click('.session-list__add');
    await expect(win.locator('.create-form input[type="text"]')).toHaveValue('Session 3');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 3' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.fear-track__value')).toHaveText('9 / 12');

    // Back at the list, the most recently created Session (3) is on top —
    // the list itself still stores creation order (Session 2 is still the
    // one Clone Most Recent targets), only the display is reversed.
    await win.click('.session-view__back');
    const rows = win.locator('.session-list .content-card');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Session 3');
    await expect(rows.nth(1)).toContainText('Session 2');
    await expect(rows.nth(2)).toContainText('Session 1');
  });

  test('two Campaigns can each have a "Session 1"', async () => {
    for (const name of ['Alpha', 'Beta']) {
      await createCampaign(name);
      await openCampaign(name);
      await win.click('.session-list__add');
      await win.click('button:has-text("Start Session")');
      await expect(win.locator('.content-card', { hasText: 'Session 1' })).toHaveCount(1);
      await win.click('.campaign-detail__back');
    }
    // Each campaign got its own, rather than the second silently reusing the first's.
    await openCampaign('Alpha');
    await expect(win.locator('.content-card', { hasText: 'Session 1' })).toHaveCount(1);
  });
});
