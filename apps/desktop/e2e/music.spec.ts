import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A tiny valid mono 8-bit WAV of silence, so the tests need no audio fixtures.
function writeWav(filePath: string, seconds = 1) {
  const rate = 8000;
  const samples = rate * seconds;
  const buf = Buffer.alloc(44 + samples, 0x80);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples, 40);
  fs.writeFileSync(filePath, buf);
}

test.describe('Music library and session playback', () => {
  let tempDir: string;
  let audioDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-music-'));
    audioDir = path.join(tempDir, 'source-audio');
    fs.mkdirSync(audioDir);
    for (const name of ['Calm Road', 'War Drums', 'Sea Surf']) writeWav(path.join(audioDir, `${name}.wav`));

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

  // The native file picker can't be driven, so stub it from the main process.
  async function pickFiles(...names: string[]) {
    const files = names.map((n) => path.join(audioDir, `${n}.wav`));
    await app.evaluate(({ dialog }, filePaths) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths });
    }, files);
    await win.click('button:has-text("+ Add Music")');
  }

  async function openMusicTab() {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaigns-page__tab:has-text("Music")');
  }

  test('add files, file them into regions, set defaults, and it all persists', async () => {
    await openMusicTab();
    await expect(win.locator('.music-library__region--active')).toContainText('Everywhere');
    await expect(win.locator('.music-library__status')).toContainText('No music in this region yet');

    await pickFiles('Calm Road', 'War Drums', 'Sea Surf');
    await expect(win.locator('.music-library__track')).toHaveCount(3);
    // Copied into the app's own folder, under generated names (not the originals).
    const stored = fs.readdirSync(path.join(tempDir, 'music'));
    expect(stored).toHaveLength(3);
    expect(stored.every((f) => f.endsWith('.wav') && !f.includes('Calm'))).toBe(true);

    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });
    await win.selectOption('select[aria-label="Combat default"]', { label: 'War Drums' });
    await expect(win.locator('.music-library__track', { hasText: 'Calm Road' })).toContainText('Adventuring');

    // A region, with one track moved into it and its own combat default.
    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.music-library__inline-form button:has-text("Add")');
    await expect(win.locator('.music-library__title')).toHaveText('The Sunken Coast');

    await win.click('.music-library__region:has-text("Everywhere")');
    await win.selectOption('select[aria-label="Move Sea Surf to region"]', { label: 'The Sunken Coast' });
    await win.click('.music-library__region:has-text("The Sunken Coast")');
    await expect(win.locator('.music-library__track')).toHaveCount(1);
    await win.selectOption('select[aria-label="Combat default"]', { label: 'Sea Surf' });

    // A region can only pick from its own tracks.
    const options = await win.locator('select[aria-label="Combat default"] option').allTextContents();
    expect(options).toEqual(['Use the Everywhere default', 'Sea Surf']);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await openMusicTab();
    await win.click('.music-library__region:has-text("The Sunken Coast")');
    await expect(win.locator('select[aria-label="Combat default"]')).toHaveValue(/.+/);
    await win.click('.music-library__region:has-text("Everywhere")');
    await expect(win.locator('.music-library__track')).toHaveCount(2);
  });

  test('renaming a track, removing one deletes its copied file, deleting a region keeps its tracks', async () => {
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums');
    await expect(win.locator('.music-library__track')).toHaveCount(2);

    const row = win.locator('.music-library__track', { hasText: 'Calm Road' });
    await row.getByRole('button', { name: 'Rename' }).click();
    await win.fill('input[aria-label="Track name"]', 'Golden Road');
    await win.press('input[aria-label="Track name"]', 'Enter');
    await expect(win.locator('.music-library__track', { hasText: 'Golden Road' })).toBeVisible();

    await win.locator('.music-library__track', { hasText: 'War Drums' }).getByRole('button', { name: 'Remove' }).click();
    await expect(win.locator('.music-library__track')).toHaveCount(1);
    await expect.poll(() => fs.readdirSync(path.join(tempDir, 'music')).length).toBe(1);

    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'Doomed');
    await win.click('.music-library__inline-form button:has-text("Add")');
    await win.click('.music-library__region:has-text("Everywhere")');
    await win.selectOption('select[aria-label="Move Golden Road to region"]', { label: 'Doomed' });
    await win.click('.music-library__region:has-text("Doomed")');
    await win.click('button:has-text("Delete Region")');
    await expect(win.locator('.music-library__title')).toHaveText('Everywhere');
    await expect(win.locator('.music-library__track', { hasText: 'Golden Road' })).toBeVisible();
  });

  test('the stored audio is served with byte ranges so a looping <audio> can seek', async () => {
    await openMusicTab();
    await pickFiles('Calm Road');
    await expect(win.locator('.music-library__track')).toHaveCount(1);
    const fileName = fs.readdirSync(path.join(tempDir, 'music'))[0];

    const result = await win.evaluate(async (name) => {
      const audio = new Audio(`dhmedia://track/${name}`);
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve());
        audio.addEventListener('error', () => reject(new Error('audio failed to load')));
      });
      return { duration: audio.duration, seekable: audio.seekable.length > 0 && audio.seekable.end(0) > 0 };
    }, fileName);
    expect(result.duration).toBeGreaterThan(0.9);
    expect(result.seekable).toBe(true);

    // Anything that is not a plain generated file name is refused.
    const bad = await win.evaluate(async () => {
      const audio = new Audio('dhmedia://track/..%2Fdata.json');
      return new Promise<string>((resolve) => {
        audio.addEventListener('error', () => resolve('error'));
        audio.addEventListener('loadedmetadata', () => resolve('loaded'));
      });
    });
    expect(bad).toBe('error');
  });

  test('a session loops the default track for its mode, and switches when the mode changes', async () => {
    test.setTimeout(60000); // sets up a library and a session before it gets to the assertions
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums', 'Sea Surf');
    await expect(win.locator('.music-library__track')).toHaveCount(3);
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });
    await win.selectOption('select[aria-label="Combat default"]', { label: 'War Drums' });

    // A region with only a combat override.
    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.music-library__inline-form button:has-text("Add")');
    await win.click('.music-library__region:has-text("Everywhere")');
    await win.selectOption('select[aria-label="Move Sea Surf to region"]', { label: 'The Sunken Coast' });
    await win.click('.music-library__region:has-text("The Sunken Coast")');
    await win.selectOption('select[aria-label="Combat default"]', { label: 'Sea Surf' });

    // Into a session (we are still on the Music tab, so switch back to Campaigns).
    await win.click('.campaigns-page__tab:has-text("Campaigns")');
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    const now = win.locator('[data-testid="now-playing"]');
    const audio = win.locator('.music-player audio');
    await expect(now).toHaveText('Calm Road');

    // Merely opening a session never starts audio.
    expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
    expect(await audio.evaluate((a: HTMLAudioElement) => a.loop)).toBe(true);

    await win.click('button[aria-label="Play music"]');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);
    const calmSrc = await audio.evaluate((a: HTMLAudioElement) => a.src);
    expect(calmSrc).toMatch(/^dhmedia:\/\/track\//);

    // Combat swaps to the combat default and keeps playing.
    await win.click('.mode-toggle__option:has-text("Combat")');
    await expect(now).toHaveText('War Drums');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.src)).not.toBe(calmSrc);
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);

    // The region's own combat default wins; its missing adventuring default falls back to Everywhere.
    await win.selectOption('select[aria-label="Music region"]', { label: 'The Sunken Coast' });
    await expect(now).toHaveText('Sea Surf');
    await win.click('.mode-toggle__option:has-text("Adventuring")');
    await expect(now).toHaveText('Calm Road');

    // Pausing sticks, and the region choice is saved on the session.
    await win.click('button[aria-label="Pause music"]');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
    await win.reload();
    await win.waitForSelector('text=Daggerheart Homebrew Hub', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-banner', { hasText: 'The Wildwood' }).locator('.campaign-banner__hit').click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('select[aria-label="Music region"] option:checked')).toHaveText('The Sunken Coast');
  });

  test('a session with no music set says so, and Play is disabled', async () => {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-banner--hollow');
    await win.fill('.create-form input[type="text"]', 'Quiet Campaign');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-banner', { hasText: 'Quiet Campaign' }).locator('.campaign-banner__hit').click();
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('No adventuring music set');
    await expect(win.locator('button[aria-label="Play music"]')).toBeDisabled();
    await expect(win.locator('.music-player__hint')).toContainText('Campaigns');
  });
});
