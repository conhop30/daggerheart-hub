import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The rule under test: nearly everything follows a Campaign into its later
// sessions, but a change made in session N reaches only N and the sessions
// after it — never the ones before.
test.describe('Carrying a Campaign forward across sessions', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-carry-'));
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

  const openSession = (name: string) =>
    win.locator('.content-card', { hasText: name }).getByRole('button', { name: 'Open' }).click();

  const partyHp = () => win.locator('.party-roster .content-card', { hasText: 'Mira' }).locator('.stat-stepper__value');
  const ogreHp = () => win.locator('.combat-panel .content-card', { hasText: 'Ogre' }).locator('.stat-stepper__value').first();

  async function newSession(name: string) {
    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', name);
    await win.click('button:has-text("Start Session")');
  }

  test('Fear, the Party, notes and the board carry forward; a change in a later session never rewrites an earlier one', async () => {
    // An Adversary to pull in.
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await win.fill('.create-form input[type="text"]', 'Ogre');
    await win.fill('.text-field:has-text("HP") input', '8');
    await win.fill('.text-field:has-text("Stress") input', '3');
    await win.click('button:has-text("Create Adversary")');
    await win.click('.app-shell__brand');

    // A Campaign whose party exists before any session does.
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Mira');
    await win.click('.trackable-editor__chip:has-text("HP")');
    await win.click('button:has-text("Add Party Member")');
    await expect(win.locator('.content-card', { hasText: 'Mira' })).toBeVisible();

    // ---- Session 1 ----
    await newSession('Session 1');
    await openSession('Session 1');
    await expect(win.locator('.session-view__title')).toHaveText('Session 1');
    await expect(win.locator('.party-roster .content-card', { hasText: 'Mira' })).toBeVisible();
    const startHp = (await partyHp().first().innerText()).trim(); // e.g. "6 / 6"
    const [startCurrent, hpMax] = startHp.split('/').map((n) => Number(n.trim()));

    await win.getByRole('button', { name: 'Set Fear to 4' }).click();
    await win.fill('.adventuring-panel__note-field:has-text("Campaign Notes") textarea', 'The king is dead.');
    await win.fill('.adventuring-panel__note-field:has-text("Session Notes") textarea', 'Night one.');
    await win.locator('.party-roster .content-card', { hasText: 'Mira' }).getByRole('button', { name: 'Decrease HP' }).click();
    await expect(partyHp().first()).toHaveText(`${startCurrent - 1} / ${hpMax}`);

    await win.click('.mode-toggle__option:has-text("Combat")');
    await win.click('.combat-panel__pull-button:has-text("+ Pull In Adversary")');
    await win.click('.item-picker__option:has-text("Ogre")');
    await win.locator('.combat-panel .content-card', { hasText: 'Ogre' }).getByRole('button', { name: 'Increase HP Marked' }).click();
    await expect(ogreHp()).toHaveText('1 / 8');
    await win.click('.session-view__back');

    // ---- Session 2 starts where Session 1 left off ----
    await newSession('Session 2');
    await openSession('Session 2');
    await expect(win.locator('.session-view__title')).toHaveText('Session 2');
    await expect(win.locator('.fear-track__value')).toHaveText('4 / 12');
    await expect(win.locator('.adventuring-panel__note-field:has-text("Campaign Notes") textarea')).toHaveValue('The king is dead.');
    await expect(win.locator('.adventuring-panel__note-field:has-text("Session Notes") textarea')).toHaveValue('');
    await expect(partyHp().first()).toHaveText(`${startCurrent - 1} / ${hpMax}`);
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(ogreHp()).toHaveText('1 / 8');
    await expect(win.locator('.combat-panel .content-card', { hasText: 'Ogre' })).toContainText('Carried over');

    // Change things in Session 2.
    await win.locator('.combat-panel .content-card', { hasText: 'Ogre' }).getByRole('button', { name: 'Increase HP Marked' }).click();
    await expect(ogreHp()).toHaveText('2 / 8');
    await win.locator('.party-roster .content-card', { hasText: 'Mira' }).getByRole('button', { name: 'Decrease HP' }).click();
    await expect(partyHp().first()).toHaveText(`${startCurrent - 2} / ${hpMax}`);
    await win.getByRole('button', { name: 'Set Fear to 7' }).click();
    await win.click('.session-view__back');

    // ---- Session 1 is exactly as it was ----
    await openSession('Session 1');
    await expect(win.locator('.fear-track__value')).toHaveText('4 / 12');
    await expect(partyHp().first()).toHaveText(`${startCurrent - 1} / ${hpMax}`);
    // (Session 1 was left in Combat; mode belongs to the session, so it reopens that way.)
    await win.click('.mode-toggle__option:has-text("Adventuring")');
    await expect(win.locator('.adventuring-panel__note-field:has-text("Session Notes") textarea')).toHaveValue('Night one.');
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(ogreHp()).toHaveText('1 / 8');
    await win.click('.session-view__back');

    // ---- Pushing the Ogre out in Session 2 removes it from 2 onward only ----
    await openSession('Session 2');
    await win.locator('.combat-panel .content-card', { hasText: 'Ogre' }).getByRole('button', { name: 'Push Out' }).click();
    await expect(win.locator('.combat-panel .content-card', { hasText: 'Ogre' })).toHaveCount(0);
    await win.click('.session-view__back');

    await newSession('Session 3');
    await openSession('Session 3');
    await expect(win.locator('.fear-track__value')).toHaveText('7 / 12');
    await expect(partyHp().first()).toHaveText(`${startCurrent - 2} / ${hpMax}`);
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(win.locator('.combat-panel .content-card', { hasText: 'Ogre' })).toHaveCount(0);
    await win.click('.session-view__back');

    await openSession('Session 1');
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(ogreHp()).toHaveText('1 / 8'); // still there in the session it was pulled into
  });

  test('removing a party member in a later session leaves the earlier session’s party alone', async () => {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Mira');
    await win.click('button:has-text("Add Party Member")');

    await newSession('Session 1');
    await newSession('Session 2');

    await openSession('Session 2');
    await win.locator('.party-roster .content-card', { hasText: 'Mira' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.party-roster .content-card', { hasText: 'Mira' })).toHaveCount(0);
    await win.click('.session-view__back');

    await openSession('Session 1');
    await expect(win.locator('.party-roster .content-card', { hasText: 'Mira' })).toBeVisible();
    await win.click('.session-view__back');

    // The Campaign page shows the party as of the latest session: Mira is gone there.
    await expect(win.locator('.party-roster .content-card', { hasText: 'Mira' })).toHaveCount(0);
  });
});
