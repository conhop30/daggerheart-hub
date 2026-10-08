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

  // Filling the detail pane's fields relies on their onBlur commit — moving
  // focus to the next field (or clicking Close) is what actually saves, same
  // as a real user tabbing/clicking away.
  async function addEntry(kind: string, label: string, notes: string) {
    await win.click('.journal-panel__plus');
    await win.click(`.journal-panel__menu-item:has-text("+ ${kind}")`);
    await win.fill('.journal-detail__label', label);
    await win.fill('.journal-detail__notes', notes);
    await win.click('.journal-detail__close');
  }

  test('create one entry per kind, edit it, and it persists across reload', async () => {
    await createCampaign('The Wildwood');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("The Wildwood")');

    const kinds = ['Adversaries', 'Loot', 'Consumables', 'Armor', 'Weapons', 'Worldbuilding', 'Other'];
    for (const kind of kinds) {
      await addEntry(kind, `${kind} note`, `Some ${kind.toLowerCase()} detail.`);
      await expect(win.locator('.journal-panel__group-label', { hasText: kind })).toBeVisible();
      await expect(win.locator('.journal-entry-row__label', { hasText: `${kind} note` })).toBeVisible();
    }

    // Edit the Weapons entry via its detail pane.
    await win.locator('.journal-entry-row', { hasText: 'Weapons note' }).locator('.journal-entry-row__edit').click();
    await win.fill('.journal-detail__label', 'Weapons note (renamed)');
    await win.click('.journal-detail__close');
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

    await addEntry('Loot', 'A trinket', '');
    await expect(win.locator('.journal-panel__group-label', { hasText: 'Loot' })).toBeVisible();

    await win.click('.journal-entry-row__remove');
    await expect(win.locator('.journal-entry-row__label', { hasText: 'A trinket' })).toHaveCount(0);
    await expect(win.locator('.journal-panel__group-label', { hasText: 'Loot' })).toHaveCount(0);
    await expect(win.locator('.journal-panel__status', { hasText: 'No notes yet' })).toBeVisible();
  });

  test('closing the Journal (outside click) and reopening it restores the open detail pane', async () => {
    await createCampaign('Persistence Test');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Persistence Test")');
    await addEntry('Other', 'A quick note', 'Some detail.');

    await win.locator('.journal-entry-row', { hasText: 'A quick note' }).locator('.journal-entry-row__edit').click();
    await expect(win.locator('.journal-detail')).toBeVisible();

    // Click somewhere outside the Journal entirely — the whole thing closes.
    await win.click('.campaigns-page__title');
    await expect(win.locator('.journal-panel')).toHaveCount(0);
    await expect(win.locator('.journal-detail')).toHaveCount(0);

    // Reopening via the bubble brings back the same campaign AND the same
    // entry's detail pane, exactly as it was.
    await win.click('.journal-bubble');
    await expect(win.locator('.journal-panel__title')).toHaveText('Persistence Test');
    await expect(win.locator('.journal-detail__label')).toHaveValue('A quick note');
  });

  test('drag-reordering entries within a category persists the new order', async () => {
    await createCampaign('Reorder Test');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Reorder Test")');
    await addEntry('Other', 'First', '');
    await addEntry('Other', 'Second', '');

    const labels = win.locator('.journal-entry-row__label');
    await expect(labels.nth(0)).toHaveText('First');
    await expect(labels.nth(1)).toHaveText('Second');

    const handles = win.locator('.journal-panel__group .drag-handle');
    const firstBox = await handles.nth(0).boundingBox();
    const secondBox = await handles.nth(1).boundingBox();
    if (!firstBox || !secondBox) throw new Error('drag handle not visible');
    await win.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await win.mouse.down();
    await win.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });
    await win.dispatchEvent('.journal-panel__group .drag-handle >> nth=1', 'dragenter');
    await win.mouse.up();

    await expect(labels.nth(0)).toHaveText('Second');
    await expect(labels.nth(1)).toHaveText('First');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Reorder Test")');
    await expect(labels.nth(0)).toHaveText('Second');
    await expect(labels.nth(1)).toHaveText('First');
  });

  test('the bubble has no entry-count badge even once a campaign has notes', async () => {
    await createCampaign('No Badge');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("No Badge")');
    await addEntry('Other', 'A note', '');
    await expect(win.locator('.journal-bubble__badge')).toHaveCount(0);
  });

  test('the bubble stays pinned to the bottom-left corner: dragging it only ever opens it', async () => {
    const height = await win.evaluate(() => window.innerHeight);
    const startBox = await win.locator('.journal-bubble-wrap').boundingBox();
    if (!startBox) throw new Error('bubble not visible');
    expect(startBox.x).toBeLessThan(100);
    expect(startBox.y).toBeGreaterThan(height - 150);

    await win.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await win.mouse.down();
    await win.mouse.move(startBox.x + 400, startBox.y - 300, { steps: 15 });
    await win.mouse.up();

    const afterBox = await win.locator('.journal-bubble').boundingBox();
    expect(afterBox?.x).toBe(startBox.x);
    expect(afterBox?.y).toBe(startBox.y);
  });

  test('dragging an entry out of the list detaches it into its own floating note, and Reattach puts it back', async () => {
    await createCampaign('Detach Test');
    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Detach Test")');
    await addEntry('Other', 'Loose note', 'Pulled out of the list.');

    const handle = win.locator('.journal-panel__group .drag-handle').first();
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('drag handle not visible');

    await win.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await win.mouse.down();
    // Well outside the panel's own body, not onto another row — a detach,
    // not a reorder.
    await win.mouse.move(handleBox.x + 400, handleBox.y - 300, { steps: 10 });
    await win.mouse.up();

    await expect(win.locator('.journal-entry-row__label', { hasText: 'Loose note' })).toHaveCount(0);
    const note = win.locator('.journal-floating-note');
    await expect(note).toBeVisible();
    await expect(note.locator('.journal-detail__label')).toHaveValue('Loose note');

    // Still the same underlying record — editing it here saves like any
    // other entry.
    await note.locator('.journal-detail__notes').fill('Edited from the floating note.');
    await note.locator('.journal-detail__label').click(); // move focus off notes, committing the blur
    await win.waitForTimeout(50);

    await note.locator('.journal-floating-note__reattach').click();
    await expect(win.locator('.journal-floating-note')).toHaveCount(0);
    await expect(win.locator('.journal-entry-row__label', { hasText: 'Loose note' })).toBeVisible();
    await win.locator('.journal-entry-row', { hasText: 'Loose note' }).locator('.journal-entry-row__edit').click();
    await expect(win.locator('.journal-detail__notes')).toHaveValue('Edited from the floating note.');
  });

  test('the Campaign/Session toggle lists Sessions, and opening one creates its notes entry on click, not on keystroke', async () => {
    await createCampaign('Toggle Test');
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'Toggle Test' }).click();
    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', 'Session 1');
    await win.click('button:has-text("Start Session")');

    await win.click('.journal-bubble');
    await win.click('.journal-campaign-row__name:has-text("Toggle Test")');
    await win.click('.journal-panel__scope-btn:has-text("Session")');
    await expect(win.locator('.journal-session-row', { hasText: 'Session 1' })).toBeVisible();

    await win.click('.journal-panel__scope-btn:has-text("Campaign")');
    await expect(win.locator('.journal-panel__status', { hasText: 'No notes yet' })).toBeVisible();

    await win.click('.journal-panel__scope-btn:has-text("Session")');
    await win.click('.journal-session-row:has-text("Session 1")');
    await expect(win.locator('.journal-detail')).toBeVisible();
    // The label mirrors the Session's own name and isn't a free-text field.
    await expect(win.locator('.journal-detail__label--readonly')).toHaveText('Session 1');
  });
});
