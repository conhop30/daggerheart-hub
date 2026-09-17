import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Campaigns & Party', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-campaigns-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('create -> view -> edit -> delete round trip for a Campaign', async () => {
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'E2E Campaign');
    await win.click('button:has-text("Create Campaign")');

    const banner = win.locator('.campaign-banner:not(.campaign-banner--hollow)', { hasText: 'E2E Campaign' });
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'E2E Campaign Renamed');
    await win.click('button:has-text("Save Changes")');
    const renamed = win.locator('.campaign-banner:not(.campaign-banner--hollow)', { hasText: 'E2E Campaign Renamed' });
    await expect(renamed).toBeVisible();

    await renamed.getByRole('button', { name: 'Delete' }).click();
    await expect(renamed).toHaveCount(0);
  });

  test('open a Campaign, add a Party member with a trackable, adjust it, then edit and delete the member', async () => {
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await expect(win.locator('.campaign-detail__title')).toHaveText('The Wildwood');

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.click('.trackable-editor__chip:has-text("HP")');
    await win.click('button:has-text("Add Party Member")');

    const card = win.locator('.content-card', { hasText: 'Fenn' });
    await expect(card).toBeVisible();
    await expect(card.locator('.stat-stepper__value')).toHaveText('6 / 6');

    await card.getByRole('button', { name: 'Decrease HP' }).click();
    await expect(card.locator('.stat-stepper__value')).toHaveText('5 / 6');
    // Reload to confirm the optimistic update actually persisted, not just local state.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await expect(win.locator('.content-card', { hasText: 'Fenn' }).locator('.stat-stepper__value')).toHaveText('5 / 6');

    const reloadedCard = win.locator('.content-card', { hasText: 'Fenn' });
    await reloadedCard.getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'Fenn Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toBeVisible();

    await win.locator('.content-card', { hasText: 'Fenn Renamed' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toHaveCount(0);
  });

  test('deleting a Campaign cascades to remove its Party members', async () => {
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'Doomed Campaign');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'Doomed Campaign' }).locator('.campaign-banner__hit').click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Toth');
    await win.click('button:has-text("Add Party Member")');
    await expect(win.locator('.content-card', { hasText: 'Toth' })).toBeVisible();

    await win.click('.campaign-detail__hero-action--danger');
    await expect(win.locator('.campaign-banner', { hasText: 'Doomed Campaign' })).toHaveCount(0);
  });
});
