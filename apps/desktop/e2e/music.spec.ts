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
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
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
    await expect(win.locator('.region-list__region--active')).toContainText('Global');
    await expect(win.locator('.track-list__empty')).toContainText('No music in this region yet');

    await pickFiles('Calm Road', 'War Drums', 'Sea Surf');
    await expect(win.locator('.track-list__track')).toHaveCount(3);
    // Copied into the app's own folder, under generated names (not the originals).
    const stored = fs.readdirSync(path.join(tempDir, 'music'));
    expect(stored).toHaveLength(3);
    expect(stored.every((f) => f.endsWith('.wav') && !f.includes('Calm'))).toBe(true);

    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });
    await win.selectOption('select[aria-label="Combat default"]', { label: 'War Drums' });
    await expect(win.locator('.track-list__track', { hasText: 'Calm Road' })).toContainText('ADV');

    // A region, with one track moved into it and its own combat default.
    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.region-list__inline-form button:has-text("Add")');
    await expect(win.locator('.region-header__title')).toHaveText('The Sunken Coast');

    await win.click('.region-list__region:has-text("Global")');
    await win.locator('.track-list__track', { hasText: 'Sea Surf' }).getByRole('button', { name: /More actions/ }).click();
    await win.selectOption('select[aria-label="Move Sea Surf to region"]', { label: 'The Sunken Coast' });
    await win.click('.region-list__region:has-text("The Sunken Coast")');
    await expect(win.locator('.track-list__track')).toHaveCount(1);
    await win.selectOption('select[aria-label="Combat default"]', { label: 'Sea Surf' });

    // A region can only pick from its own tracks.
    const options = await win.locator('select[aria-label="Combat default"] option').allTextContents();
    expect(options).toEqual(['Use the Global default', 'Sea Surf']);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await openMusicTab();
    await win.click('.region-list__region:has-text("The Sunken Coast")');
    await expect(win.locator('select[aria-label="Combat default"]')).toHaveValue(/.+/);
    await win.click('.region-list__region:has-text("Global")');
    await expect(win.locator('.track-list__track')).toHaveCount(2);
  });

  test('renaming a track, removing one deletes its copied file, deleting a region keeps its tracks', async () => {
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums');
    await expect(win.locator('.track-list__track')).toHaveCount(2);

    const row = win.locator('.track-list__track', { hasText: 'Calm Road' });
    await row.getByRole('button', { name: /More actions/ }).click();
    await row.getByRole('button', { name: 'Rename' }).click();
    await win.fill('input[aria-label="Track name"]', 'Golden Road');
    await win.press('input[aria-label="Track name"]', 'Enter');
    await expect(win.locator('.track-list__track', { hasText: 'Golden Road' })).toBeVisible();

    const warDrumsRow = win.locator('.track-list__track', { hasText: 'War Drums' });
    await warDrumsRow.getByRole('button', { name: /More actions/ }).click();
    await warDrumsRow.getByRole('button', { name: 'Remove' }).click();
    await expect(win.locator('.track-list__track')).toHaveCount(1);
    await expect.poll(() => fs.readdirSync(path.join(tempDir, 'music')).length).toBe(1);

    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'Doomed');
    await win.click('.region-list__inline-form button:has-text("Add")');
    await win.click('.region-list__region:has-text("Global")');
    await win.locator('.track-list__track', { hasText: 'Golden Road' }).getByRole('button', { name: /More actions/ }).click();
    await win.selectOption('select[aria-label="Move Golden Road to region"]', { label: 'Doomed' });
    await win.click('.region-list__region:has-text("Doomed")');
    await win.click('button:has-text("Delete Region")');
    await expect(win.locator('.region-header__title')).toHaveText('Global');
    await expect(win.locator('.track-list__track', { hasText: 'Golden Road' })).toBeVisible();
  });

  test('the stored audio is served with byte ranges so a looping <audio> can seek', async () => {
    await openMusicTab();
    await pickFiles('Calm Road');
    await expect(win.locator('.track-list__track')).toHaveCount(1);
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
    await expect(win.locator('.track-list__track')).toHaveCount(3);
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });
    await win.selectOption('select[aria-label="Combat default"]', { label: 'War Drums' });

    // A region with only a combat override.
    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.region-list__inline-form button:has-text("Add")');
    await win.click('.region-list__region:has-text("Global")');
    await win.locator('.track-list__track', { hasText: 'Sea Surf' }).getByRole('button', { name: /More actions/ }).click();
    await win.selectOption('select[aria-label="Move Sea Surf to region"]', { label: 'The Sunken Coast' });
    await win.click('.region-list__region:has-text("The Sunken Coast")');
    await win.selectOption('select[aria-label="Combat default"]', { label: 'Sea Surf' });

    // Into a session (we are still on the Music tab, so switch back to Campaigns).
    await win.click('.campaigns-page__tab:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    const now = win.locator('[data-testid="now-playing"]');
    const audio = win.locator('audio');
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

    // The region's own combat default wins; its missing adventuring default falls back to Global.
    await win.selectOption('select[aria-label="Music region"]', { label: 'The Sunken Coast' });
    await expect(now).toHaveText('Sea Surf');
    await win.click('.mode-toggle__option:has-text("Adventuring")');
    await expect(now).toHaveText('Calm Road');

    // Pausing sticks, and the region choice is saved on the session.
    await win.click('button[aria-label="Pause music"]');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('select[aria-label="Music region"] option:checked')).toHaveText('The Sunken Coast');
  });

  test('dragging an audio file from the OS onto a region\'s track list imports it, no dialog needed', async () => {
    await openMusicTab();
    const filePath = path.join(audioDir, 'Calm Road.wav');

    // Real OS drag-and-drop can't be driven from Playwright — this fires the
    // same 'drop' event a real one would, with a DataTransfer whose `files`
    // entries carry `.path` the way Electron's does for a genuine OS drag
    // (see TrackList.tsx's isFileDrag/handleDrop).
    await win.evaluate((p) => {
      const el = document.querySelector('.track-list');
      if (!el) throw new Error('track-list not found');
      const dt = new DataTransfer();
      Object.defineProperty(dt, 'files', { value: [{ path: p, name: 'Calm Road.wav' }] });
      Object.defineProperty(dt, 'types', { value: ['Files'] });
      const event = new DragEvent('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: dt });
      el.dispatchEvent(event);
    }, filePath);

    await expect(win.locator('.track-list__track')).toHaveCount(1);
    await expect(win.locator('.track-list__track', { hasText: 'Calm Road' })).toBeVisible();
    // Copied into the app's own folder under a generated name, same as the dialog-based path.
    const stored = fs.readdirSync(path.join(tempDir, 'music'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toContain('Calm');
  });

  test('dragging a track from one region onto another copies it there, leaving the original in place', async () => {
    await openMusicTab();
    await pickFiles('Calm Road');
    await expect(win.locator('.track-list__track')).toHaveCount(1);

    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.region-list__inline-form button:has-text("Add")');
    await win.click('.region-list__region:has-text("Global")');
    await expect(win.locator('.track-list__track')).toHaveCount(1);

    const dataTransfer = await win.evaluateHandle(() => new DataTransfer());
    await win.locator('.track-list__handle').dispatchEvent('dragstart', { dataTransfer });
    await win.locator('.region-list__region:has-text("The Sunken Coast")').dispatchEvent('drop', { dataTransfer });

    // The original is untouched, still in Global.
    await expect(win.locator('.track-list__track')).toHaveCount(1);
    await expect(win.locator('.track-list__track', { hasText: 'Calm Road' })).toBeVisible();

    // A copy now exists under The Sunken Coast too.
    await win.click('.region-list__region:has-text("The Sunken Coast")');
    await expect(win.locator('.track-list__track', { hasText: 'Calm Road' })).toBeVisible();

    // Two independent files on disk — a copy, not a shared reference.
    const stored = fs.readdirSync(path.join(tempDir, 'music'));
    expect(stored).toHaveLength(2);
  });

  test('each track has its own persisted volume, independent of another track\'s', async () => {
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums');
    await expect(win.locator('.track-list__track')).toHaveCount(2);

    const calmVolume = win.locator('.track-list__item', { hasText: 'Calm Road' }).getByLabel('Calm Road volume');
    const warVolume = win.locator('.track-list__item', { hasText: 'War Drums' }).getByLabel('War Drums volume');
    await expect(calmVolume).toHaveValue('1');
    await expect(warVolume).toHaveValue('1');

    await calmVolume.fill('0.4');
    await expect(win.locator('.track-list__item', { hasText: 'Calm Road' }).locator('.track-list__track-volume-value')).toHaveText(
      '40%'
    );
    // Unrelated track is untouched.
    await expect(warVolume).toHaveValue('1');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await openMusicTab();
    await expect(win.locator('.track-list__item', { hasText: 'Calm Road' }).getByLabel('Calm Road volume')).toHaveValue('0.4');
  });

  test('a session with no music set says so, and Play is disabled', async () => {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Quiet Campaign');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'Quiet Campaign' }).click();
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('No adventuring music set');
    await expect(win.locator('button[aria-label="Play music"]')).toBeDisabled();
    await expect(win.locator('.session-music-panel__hint')).toContainText('Manage Music');
  });

  async function openQuietSession() {
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.click('.session-list__add');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
  }

  test('"Manage Music" starts collapsed, with no editing controls in the DOM until expanded', async () => {
    await openQuietSession();
    await expect(win.locator('.session-music-panel')).toBeVisible();
    await expect(win.locator('.music-library-editor')).toHaveCount(0);
    await expect(win.locator('button:has-text("+ Add Music")')).toHaveCount(0);

    await win.click('.session-music-panel button:has-text("Manage Music")');
    await expect(win.locator('.music-library-editor')).toBeVisible();
    await expect(win.locator('button:has-text("+ Add Music")')).toBeVisible();
  });

  test('editing music from inside a Session takes effect immediately, with no reload', async () => {
    await openQuietSession();
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('No adventuring music set');
    await expect(win.locator('button[aria-label="Play music"]')).toBeDisabled();

    await win.click('.session-music-panel button:has-text("Manage Music")');
    await pickFiles('Calm Road');
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });

    // Still expanded, still without leaving the Session or reloading.
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('Calm Road');
    await expect(win.locator('button[aria-label="Play music"]')).toBeEnabled();

    await win.click('.session-music-panel button:has-text("Manage Music")'); // collapse
    await expect(win.locator('.music-library-editor')).toHaveCount(0);
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('Calm Road');

    await win.click('button[aria-label="Play music"]');
    const audio = win.locator('audio[loop]');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);
  });

  test('previewing a track in the in-session editor pauses real Session playback — the two are never audible at once', async () => {
    await openQuietSession();
    await win.click('.session-music-panel button:has-text("Manage Music")');
    await pickFiles('Calm Road', 'War Drums');
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });

    await win.click('button[aria-label="Play music"]');
    const realAudio = win.locator('audio[loop]');
    await expect.poll(() => realAudio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);

    // Previewing a different track pauses real Session playback instead of
    // layering a second audible source on top of it — the selected default
    // (and "now playing" label) don't change, only playback does.
    await win.locator('.track-list__item', { hasText: 'War Drums' }).getByRole('button', { name: /Preview/ }).click();
    await expect(realAudio).toHaveJSProperty('paused', true);
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('Calm Road');
    await expect(win.locator('button[aria-label="Play music"]')).toBeVisible();

    // And pressing Play again (resuming real playback) silences the preview
    // the other way around.
    await win.click('button[aria-label="Play music"]');
    await expect.poll(() => realAudio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);
    await expect(
      win.locator('.track-list__item', { hasText: 'War Drums' }).getByRole('button', { name: /Stop/ })
    ).toHaveCount(0);
  });

  test('editing away the currently-playing default pauses playback, and a later new default does not silently auto-resume', async () => {
    await openQuietSession();
    await win.click('.session-music-panel button:has-text("Manage Music")');
    await pickFiles('Calm Road', 'War Drums');
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });

    await win.click('button[aria-label="Play music"]');
    const audio = win.locator('audio[loop]');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(false);

    // Clear the default that's actively playing.
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'None' });
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('No adventuring music set');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
    await expect(win.locator('button[aria-label="Play music"]')).toBeDisabled();

    // Setting a new default afterwards must NOT auto-resume on its own.
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'War Drums' });
    await expect(win.locator('[data-testid="now-playing"]')).toHaveText('War Drums');
    await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
    await expect(win.locator('button[aria-label="Play music"]')).toHaveText('▶ Play');
  });

  test('the Music tab\'s overview grid shows track counts and each mode\'s default, and "Open" jumps the selection below', async () => {
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums');
    await win.selectOption('select[aria-label="Adventuring default"]', { label: 'Calm Road' });

    await win.click('button:has-text("+ New Region")');
    await win.fill('input[aria-label="New region name"]', 'The Sunken Coast');
    await win.click('.region-list__inline-form button:has-text("Add")');

    const globalCard = win.locator('.content-card', { hasText: 'Global' });
    await expect(globalCard).toContainText('Tracks: 2');
    await expect(globalCard).toContainText('Adventuring:');
    await expect(globalCard).toContainText('Calm Road');
    await expect(globalCard).toContainText('Combat:');
    await expect(globalCard).toContainText('Not set');

    const coastCard = win.locator('.content-card', { hasText: 'The Sunken Coast' });
    await expect(coastCard).toContainText('Tracks: 0');
    await expect(coastCard).toContainText('Not set');

    // Currently on "The Sunken Coast" (just created); opening Global's card jumps back to it.
    await expect(win.locator('.region-header__title')).toHaveText('The Sunken Coast');
    await globalCard.getByRole('button', { name: 'Open' }).click();
    await expect(win.locator('.region-header__title')).toHaveText('Global');
    await expect(win.locator('.region-list__region--active')).toContainText('Global');
  });

  test('the Music tab search filters the selected region\'s track list', async () => {
    await openMusicTab();
    await pickFiles('Calm Road', 'War Drums', 'Sea Surf');
    await expect(win.locator('.track-list__track')).toHaveCount(3);

    await win.fill('input[aria-label="Search tracks"]', 'road');
    await expect(win.locator('.track-list__track')).toHaveCount(1);
    await expect(win.locator('.track-list__track')).toContainText('Calm Road');
    await expect(win.locator('.music-library__search-count')).toHaveText('1 of 3 tracks shown');

    await win.fill('input[aria-label="Search tracks"]', 'xyz-no-match');
    await expect(win.locator('.track-list__track')).toHaveCount(0);
    await expect(win.locator('.music-library__status')).toContainText('No tracks in this region match');

    await win.fill('input[aria-label="Search tracks"]', '');
    await expect(win.locator('.track-list__track')).toHaveCount(3);
  });
});
