import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Sessions (Fear, combat, loot rolling)', () => {
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
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
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

  async function createAdversaryWithAttackAndFeature(
    name: string,
    hp: string,
    stress: string,
    attackDescription: string,
    featureName: string,
    featureDescription: string
  ) {
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await win.fill('.create-form input[type="text"]', name);
    await win.fill('.text-field:has-text("HP") input', hp);
    await win.fill('.text-field:has-text("Stress") input', stress);
    await win.fill('label:has-text("Attack Description") textarea', attackDescription);
    await win.click('.feature-editor__add:has-text("passives")');
    await win.locator('.feature-editor__row input[placeholder="Name"]').first().fill(featureName);
    await win.locator('.feature-editor__row').first().locator('textarea').first().fill(featureDescription);
    await win.click('button:has-text("Create Adversary")');
    await win.click('.app-shell__brand');
  }

  async function createCampaignAndOpenSession(campaignName: string, sessionName: string) {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', campaignName);
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: campaignName }).click();

    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', sessionName);
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: sessionName }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.session-view__title')).toHaveText(sessionName);
  }

  test('Fear track and pulling an Adversary into Combat persist across reload', async () => {
    await createAdversary('Ogre', '8', '3');
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    await win.getByRole('button', { name: 'Set Fear to 5' }).click();
    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    await expect(win.locator('.combat-panel')).toBeVisible();

    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ogre")');
    // The Adversary's name now lives in an editable <input>, not plain text
    // (see SessionAdversaryTile), so it's no longer found by hasText — an
    // <input>'s value isn't part of its textContent. Only one tile is ever
    // pulled in during this test, so the Combat panel's only card is it.
    const tile = win.locator('.combat-panel .content-card');
    await expect(tile).toBeVisible();
    await expect(tile.locator('.stat-stepper__value').first()).toHaveText('8 / 8');

    await tile.getByRole('button', { name: 'Decrease HP' }).click();
    await expect(tile.locator('.stat-stepper__value').first()).toHaveText('7 / 8');

    // Reload and re-navigate all the way back in — nothing here is kept in
    // localStorage, so this only passes if the IPC round trips actually
    // persisted to disk.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    await expect(win.locator('.fear-track__value')).toHaveText('5 / 12');
    const reloadedTile = win.locator('.combat-panel .content-card');
    await expect(reloadedTile.locator('.stat-stepper__value').first()).toHaveText('7 / 8');

    await reloadedTile.getByRole('button', { name: 'Remove' }).click();
    await expect(reloadedTile).toHaveCount(0);
  });

  test('the Party is always grid-formatted and sits above the Combat panel', async () => {
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');
    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Mira');
    await win.click('button:has-text("Add Party Member")');
    await expect(win.locator('.party-roster .content-card', { hasText: 'Mira' })).toBeVisible();

    const mainChildren = win.locator('.session-view__main > *');
    await expect(mainChildren.nth(1)).toHaveClass(/party-roster/);
    await expect(mainChildren.nth(2)).toHaveClass(/combat-panel/);
    await expect(win.locator('.party-roster .content-card-list')).toHaveClass(/content-card-list--grid/);
  });

  test('a session can be renamed and deleted', async () => {
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

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

  test('a pulled-in Adversary shows its Features (looked up live) and can roll its damage', async () => {
    await createAdversaryWithAttackAndFeature(
      'Ashen Warden',
      '8',
      '3',
      'Cinder Blade: 1d10+2 phy damage',
      'Smoldering Grip',
      'Once per rest, mark a Stress to make an attack ignore Armor.'
    );
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ashen Warden")');

    // Found by container, not name text — the name now lives in an
    // editable <input>, not visible textContent (see SessionAdversaryTile).
    const tile = win.locator('.combat-panel .content-card');
    // Features start expanded and grouped by section (Passives/Actions/…).
    await expect(tile.locator('.session-tile__features-toggle')).toBeVisible();
    await expect(tile.locator('.content-card__feature-group-label:has-text("Passives")')).toBeVisible();
    await expect(tile).toContainText('Smoldering Grip');
    await expect(tile).toContainText('Once per rest, mark a Stress to make an attack ignore Armor.');

    // Collapsing hides the group, expanding brings it back.
    await tile.locator('.session-tile__features-toggle').click();
    await expect(tile.locator('.content-card__feature-group-label:has-text("Passives")')).toHaveCount(0);
    await tile.locator('.session-tile__features-toggle').click();
    await expect(tile.locator('.content-card__feature-group-label:has-text("Passives")')).toBeVisible();

    // Math.floor(0.5 * 10) + 1 === 6, so 1d10+2 always resolves to 6 + 2 = 8.
    // The roll display reads "notation = total", e.g. "1d10+2 phy = 8".
    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });
    await tile.locator('.session-tile__roll-damage').click();
    await expect(tile.locator('.session-tile__roll-result')).toHaveText('1d10+2 phy = 8');
  });

  test('a pulled-in Adversary with an Attack Modifier can roll its attack, separately from Roll Damage', async () => {
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await win.fill('.create-form input[type="text"]', 'Marsh Stalker');
    await win.fill('.text-field:has-text("HP") input', '6');
    await win.fill('.text-field:has-text("Stress") input', '2');
    await win.fill('.text-field:has-text("Attack Modifier") input', '3');
    await win.fill('label:has-text("Attack Description") textarea', 'Bite: 1d8+1 phy damage');
    await win.click('button:has-text("Create Adversary")');
    await win.click('.app-shell__brand');

    await createCampaignAndOpenSession('The Wildwood', 'Session 1');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Marsh Stalker")');
    const tile = win.locator('.combat-panel .content-card');

    // The Attack Modifier itself is visible on the tile, not just usable
    // via the Roll Attack button.
    await expect(tile.getByText('Atk: +3')).toBeVisible();

    // Math.floor(0.5 * 20) + 1 === 11, so a +3 Attack Modifier always
    // resolves to 11 + 3 = 14.
    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });
    await tile.locator('.session-tile__roll-attack').click();
    await expect(tile.locator('.session-tile__roll-result')).toHaveText('d20+3 (rolled 11) = 14');

    // Roll Damage is a separate roll with its own result line.
    await tile.locator('.session-tile__roll-damage').click();
    await expect(tile.locator('.session-tile__roll-result')).toHaveCount(2);

    const rollLog = win.locator('.roll-log__entry');
    await expect(rollLog).toHaveCount(2);
    await expect(rollLog.first().locator('.roll-log__label')).toHaveText('Marsh Stalker attack');
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Marsh Stalker damage');
  });

  test('clicking an Adversary in the sidebar spotlights its tile — closing every other tile\'s Features, opening its own, and fading the highlight on its own without locking anything', async () => {
    await createAdversaryWithAttackAndFeature(
      'Ashen Warden',
      '8',
      '3',
      'Cinder Blade: 1d10+2 phy damage',
      'Smoldering Grip',
      'Once per rest, mark a Stress to make an attack ignore Armor.'
    );
    await createAdversaryWithAttackAndFeature(
      'Marsh Stalker',
      '6',
      '2',
      'Bite: 1d8+1 phy damage',
      'Camouflage',
      'While in marsh terrain, this creature is Hidden.'
    );
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ashen Warden")');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Marsh Stalker")');

    // Found by pull-in order, not name text — the name now lives in an
    // editable <input>, not visible textContent (see SessionAdversaryTile).
    const tiles = win.locator('.combat-panel .content-card');
    const wardenTile = tiles.nth(0);
    const stalkerTile = tiles.nth(1);

    // Both tiles start with Features open — the original per-tile default.
    await expect(wardenTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(stalkerTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'true');

    // Clicking the Marsh Stalker's sidebar row spotlights its tile: closes
    // the Warden's Features, keeps the Stalker's open, and highlights it.
    await win.locator('.session-combat-sidebar__name', { hasText: 'Marsh Stalker' }).click();
    await expect(stalkerTile).toHaveClass(/session-tile--spotlight/);
    await expect(stalkerTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(wardenTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'false');

    // The highlight fades on its own after a few seconds, but Features stay
    // exactly where the spotlight left them — it's a one-time nudge, not a
    // lock on either tile.
    await expect(stalkerTile).not.toHaveClass(/session-tile--spotlight/, { timeout: 5000 });
    await expect(stalkerTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'true');

    // And the Warden's Features can still be reopened freely afterward —
    // the spotlight never disabled its own toggle.
    await wardenTile.locator('.session-tile__features-toggle').click();
    await expect(wardenTile.locator('.session-tile__features-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  test('the condensed sidebar\'s "x" button removes an Adversary without needing its full tile', async () => {
    await createAdversary('Ashen Warden', '8', '3');
    await createAdversary('Marsh Stalker', '6', '2');
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ashen Warden")');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Marsh Stalker")');

    await expect(win.locator('.combat-panel .content-card')).toHaveCount(2);
    await expect(win.locator('.session-combat-sidebar__combatant')).toHaveCount(2);

    await win.locator('.session-combat-sidebar__combatant', { hasText: 'Marsh Stalker' })
      .locator('.session-combat-sidebar__remove')
      .click();

    // Removed from both the sidebar and the full tile grid below it, and
    // the Warden — untouched — is still there in each.
    await expect(win.locator('.session-combat-sidebar__combatant')).toHaveCount(1);
    await expect(win.locator('.session-combat-sidebar__combatant')).toContainText('Ashen Warden');
    await expect(win.locator('.combat-panel .content-card')).toHaveCount(1);
    await expect(win.locator('.combat-panel .content-card').getByLabel('Name')).toHaveValue('Ashen Warden');
  });

  test('duplicate pulls get numbered, Conditions stack into an effective Difficulty, and rolls append to the Roll Log', async () => {
    await win.click('.create-panel__toggle');
    await win.click('.chip:text-is("Adversary")');
    await win.fill('.create-form input[type="text"]', 'Ogre');
    await win.fill('.text-field:has-text("Difficulty") input', '14');
    await win.fill('label:has-text("Major Threshold") input', '7');
    await win.fill('label:has-text("Severe Threshold") input', '14');
    await win.fill('.text-field:has-text("HP") input', '8');
    await win.fill('.text-field:has-text("Stress") input', '3');
    await win.fill('label:has-text("Attack Description") textarea', 'Slam: 1d10+2 phy damage');
    await win.click('button:has-text("Create Adversary")');
    await win.click('.app-shell__brand');

    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    // Pulling the same Adversary in twice numbers the un-renamed copies.
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ogre")');
    await win.click('.combat-panel__pull-button:has-text("+ Add Adversary")');
    await win.click('.item-picker__option:has-text("Ogre")');
    const tiles = win.locator('.combat-panel .content-card');
    await expect(tiles).toHaveCount(2);
    await expect(tiles.nth(0).locator('.session-tile__name-suffix')).toHaveText('#1');
    await expect(tiles.nth(1).locator('.session-tile__name-suffix')).toHaveText('#2');

    // Renaming the first copy drops its number and tags it with the
    // original stat block's name instead — and since only one "Ogre" is
    // left un-renamed, it no longer needs a number either.
    await tiles.nth(0).locator('.session-tile__name-input').fill('Bruiser');
    await expect(tiles.nth(0).locator('.session-tile__name-suffix')).toHaveCount(0);
    await expect(tiles.nth(0).locator('.session-tile__name-original')).toHaveText('Ogre');
    await expect(tiles.nth(1).locator('.session-tile__name-suffix')).toHaveCount(0);

    const tile = tiles.nth(1);

    // Difficulty/Thresholds start untouched, with the book's own value
    // shown as a greyed placeholder — not directly editable.
    const difficultyInput = tile.getByLabel('Difficulty', { exact: true });
    await expect(difficultyInput).toHaveValue('');
    await expect(difficultyInput).toHaveAttribute('placeholder', '14');

    // Stacking two Corrosive Conditions applies -1 Difficulty per stack,
    // folded straight into the Difficulty placeholder.
    await tile.getByRole('button', { name: '+ Add condition' }).click();
    await tile.locator('.conditions-editor__row input[type="text"]').fill('Corrosive');
    await tile.getByRole('button', { name: 'Increase Corrosive stacks' }).click();
    await expect(tile.locator('.conditions-editor__effect')).toHaveText('-2 Difficulty');
    await expect(difficultyInput).toHaveAttribute('placeholder', '12');

    // Typing a value sets the Difficulty directly (it's the new absolute
    // total, not a delta added on top of the book's 14) — and the book's
    // own number stays visible underneath as a record, not folded away.
    await difficultyInput.fill('11');
    await expect(difficultyInput).toHaveValue('11');
    await expect(tile.locator('.content-card__chip-note')).toHaveText('Book: 14');

    // Thresholds get the same treatment: typing sets the absolute Major/
    // Severe values, with the book's own 7/14 kept visible as a reference.
    const majorThresholdInput = tile.getByLabel('Major Threshold');
    const severeThresholdInput = tile.getByLabel('Severe Threshold');
    await expect(majorThresholdInput).toHaveAttribute('placeholder', '7');
    await expect(severeThresholdInput).toHaveAttribute('placeholder', '14');
    await majorThresholdInput.fill('9');
    await expect(majorThresholdInput).toHaveValue('9');
    await expect(severeThresholdInput).toHaveValue('');
    await expect(tile.getByText('Book: 7 / 14')).toBeVisible();

    // Rolling this Adversary's damage appends a labeled entry to the Roll
    // Log, using its current display name (this tile is the un-renamed
    // second copy, still plain "Ogre").
    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });
    await tile.locator('.session-tile__roll-damage').click();
    const rollLog = win.locator('.roll-log__entry');
    await expect(rollLog).toHaveCount(1);
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Ogre damage');
    await expect(rollLog.last().locator('.roll-log__total')).toHaveText('8');

    // A general DiceTray roll appends its own entry below it, newest last.
    await win.click('.dice-tray__die:has-text("d6")');
    await win.click('.dice-tray__roll');
    await expect(rollLog).toHaveCount(2);
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Dice roller [1d6]');
  });

  test('the Roll Log persists for the life of the session, surviving leaving and reopening the Session view', async () => {
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });
    await win.click('.dice-tray__die:has-text("d6")');
    await win.click('.dice-tray__roll');
    const rollLog = win.locator('.roll-log__entry');
    await expect(rollLog).toHaveCount(1);
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Dice roller [1d6]');

    // Leaving the Session view (unmounting SessionView) used to wipe the log
    // — it was a plain useState local to that component. It now lives in
    // RollLogContext, mounted at the app root, so it should still be here.
    await win.click('.session-view__back');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.session-view__title')).toHaveText('Session 1');
    await expect(rollLog).toHaveCount(1);
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Dice roller [1d6]');

    // A new roll appends after the surviving one, newest at the bottom.
    await win.click('.dice-tray__die:has-text("d20")');
    await win.click('.dice-tray__roll');
    await expect(rollLog).toHaveCount(2);
    await expect(rollLog.last().locator('.roll-log__label')).toHaveText('Dice roller [1d20]');
    await expect(rollLog.first().locator('.roll-log__label')).toHaveText('Dice roller [1d6]');
  });

  test('the dice tray queues dice by left click, un-queues by right click, and rolls everything queued into one total', async () => {
    await createCampaignAndOpenSession('The Wildwood', 'Session 1');

    // Always mounted (just disabled) now, not unmounted — so queuing the
    // first die never shifts the other die buttons around.
    await expect(win.locator('.dice-tray__roll')).toBeDisabled();

    await win.click('.dice-tray__die:has-text("d6")');
    await win.click('.dice-tray__die:has-text("d6")');
    await win.click('.dice-tray__die:has-text("d20")');
    await expect(win.locator('.dice-tray__die:has-text("d6") .dice-tray__badge')).toHaveText('2');
    await expect(win.locator('.dice-tray__die:has-text("d20") .dice-tray__badge')).toHaveText('1');

    await win.locator('.dice-tray__die:has-text("d6")').click({ button: 'right' });
    await expect(win.locator('.dice-tray__die:has-text("d6") .dice-tray__badge')).toHaveText('1');

    // Math.floor(0.5 * 6) + 1 === 4, Math.floor(0.5 * 20) + 1 === 11 → total 15.
    await win.evaluate(() => {
      window.Math.random = () => 0.5;
    });
    await win.click('.dice-tray__roll');

    await expect(win.locator('.dice-tray__result-notation')).toHaveText('1d6 + 1d20');
    await expect(win.locator('.dice-tray__result-total')).toHaveText('15');

    // The queue resets after a roll — no die still shows a badge, and the
    // Roll button goes back to disabled until something is queued again.
    await expect(win.locator('.dice-tray__die.queued')).toHaveCount(0);
    await expect(win.locator('.dice-tray__roll')).toBeDisabled();

    // Dismissing clears the result's content, but its row stays mounted
    // (reserving its space) since a roll has now happened at least once.
    await win.click('.dice-tray__dismiss');
    await expect(win.locator('.dice-tray__result-notation')).toHaveCount(0);
  });

  test('deleting a Campaign cascades to remove its Sessions', async () => {
    await createCampaignAndOpenSession('Doomed Campaign', 'Session 1');
    await win.click('.session-view__back');
    await expect(win.locator('.content-card', { hasText: 'Session 1' })).toBeVisible();

    // Edit/Delete moved off the gallery row and onto CampaignDetail's own
    // hero once the Campaign is open — there's no Delete directly on the
    // row anymore (see CampaignBanner.tsx/CampaignDetail.tsx).
    await win.getByRole('button', { name: 'Delete Campaign' }).click();
    await expect(win.locator('.campaign-row', { hasText: 'Doomed Campaign' })).toHaveCount(0);
  });
});
