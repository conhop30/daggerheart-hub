import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Feature sections (Evolution + homebrew sections)', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-features-'));
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

  test('an Adversary can carry an Evolution and a custom section, and the sheet prints both', async () => {
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    await win.click('button:has-text("+ New Adversary")');
    await win.fill('.create-form .text-field:has-text("Name") input', 'Shapeshifter');

    // Evolution is a built-in section: it's offered without any setup.
    const evolutions = win.locator('.feature-sections__section', { hasText: 'Evolutions' });
    await evolutions.locator('.feature-editor__add').click();
    await evolutions.locator('input[placeholder="Name"]').fill('Molting');
    await evolutions.locator('input[placeholder="Description"]').fill('When defeated, it sheds its skin.');

    // A homebrew section is added by name, with no code change.
    await win.fill('.feature-sections__add input', 'Lair Actions');
    await win.click('button:has-text("+ Add section")');
    const lair = win.locator('.feature-sections__section', { hasText: 'Lair Actions' });
    await lair.locator('.feature-editor__add').click();
    await lair.locator('input[placeholder="Name"]').fill('Tremor');
    await lair.locator('input[placeholder="Description"]').fill('The floor shakes.');

    await win.click('button:has-text("Create Adversary")');
    await win.locator('.stat-gallery__tile', { hasText: 'Shapeshifter' }).click();

    const sheet = win.locator('.stat-sheet');
    await expect(sheet.locator('.stat-sheet__feature', { hasText: 'Molting' })).toContainText('- Evolution');
    await expect(sheet.locator('.stat-sheet__feature', { hasText: 'Tremor' })).toContainText('- Lair Actions');

    // Both survive a reload — the store persisted the extra keys as-is.
    await win.reload();
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    await win.locator('.stat-gallery__tile', { hasText: 'Shapeshifter' }).click();
    await expect(win.locator('.stat-sheet')).toContainText('Tremor');
  });

  test('a custom section can be removed again', async () => {
    await win.click('.app-shell__nav-link:has-text("Adversaries")');
    await win.click('button:has-text("+ New Adversary")');
    await win.fill('.feature-sections__add input', 'Bloodied');
    await win.click('button:has-text("+ Add section")');
    await expect(win.locator('.feature-sections__section', { hasText: 'Bloodied' })).toHaveCount(1);
    await win.click('button:has-text("Remove")');
    await expect(win.locator('.feature-sections__section', { hasText: 'Bloodied' })).toHaveCount(0);
  });
});
