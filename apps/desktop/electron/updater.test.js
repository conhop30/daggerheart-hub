import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const require = createRequire(import.meta.url);
const { createUpdateManager } = require('./updater.js');

function fakeAutoUpdater(overrides = {}) {
  const u = new EventEmitter();
  u.autoDownload = true;
  u.autoInstallOnAppQuit = false;
  u.checkForUpdates = vi.fn(async () => {
    u.emit('checking-for-update');
    u.emit('update-available', { version: '2.0.0' });
  });
  u.downloadUpdate = vi.fn(async () => {
    u.emit('download-progress', { percent: 41.6 });
    u.emit('update-downloaded', { version: '2.0.0' });
  });
  u.quitAndInstall = vi.fn();
  return Object.assign(u, overrides);
}

function setup({ autoUpdater = fakeAutoUpdater(), fallback = { updateAvailable: false } } = {}) {
  const states = [];
  const fallbackCheck = vi.fn(async () => fallback);
  const openReleasePage = vi.fn(async () => {});
  const manager = createUpdateManager({
    currentVersion: '1.0.0',
    autoUpdater,
    fallbackCheck,
    openReleasePage,
    onState: (s) => states.push(s),
  });
  return { manager, states, autoUpdater, fallbackCheck, openReleasePage };
}

describe('when the app can update itself', () => {
  it('asks first: turns automatic downloading off and never downloads on its own', async () => {
    const { manager, autoUpdater } = setup();
    expect(autoUpdater.autoDownload).toBe(false);
    await manager.check();
    expect(manager.getState()).toMatchObject({ phase: 'available', latestVersion: '2.0.0', canInstall: true });
    expect(autoUpdater.downloadUpdate).not.toHaveBeenCalled();
  });

  it('downloads only when told to, reports progress, and ends up ready to install', async () => {
    const { manager, states } = setup();
    await manager.check();
    await manager.download();
    expect(states.map((s) => s.phase)).toContain('downloading');
    expect(states.find((s) => s.phase === 'downloading' && s.percent === 42)).toBeTruthy();
    expect(manager.getState()).toMatchObject({ phase: 'downloaded', percent: 100 });
  });

  it('installs only an update that has been downloaded', async () => {
    const { manager, autoUpdater } = setup();
    manager.install();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    await manager.check();
    manager.install();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    await manager.download();
    manager.install();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('not doing anything about an available update is fine: nothing further happens', async () => {
    const { manager, autoUpdater } = setup();
    await manager.check();
    expect(manager.getState().phase).toBe('available');
    expect(autoUpdater.downloadUpdate).not.toHaveBeenCalled();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('reports "up to date" when the updater finds nothing newer', async () => {
    const autoUpdater = fakeAutoUpdater({
      checkForUpdates: vi.fn(async function () {
        autoUpdater.emit('update-not-available', { version: '1.0.0' });
      }),
    });
    const { manager } = setup({ autoUpdater });
    await manager.check();
    expect(manager.getState().phase).toBe('upToDate');
  });

  it('a failed download drops back to "available" so it can be retried', async () => {
    const autoUpdater = fakeAutoUpdater({ downloadUpdate: vi.fn(async () => { throw new Error('offline'); }) });
    const { manager } = setup({ autoUpdater });
    await manager.check();
    await manager.download();
    expect(manager.getState()).toMatchObject({ phase: 'available', error: 'offline' });
    autoUpdater.downloadUpdate.mockImplementation(async () => autoUpdater.emit('update-downloaded', { version: '2.0.0' }));
    await manager.download();
    expect(manager.getState().phase).toBe('downloaded');
  });

  it('does not start a second check while one is running or an update is already downloaded', async () => {
    const { manager, autoUpdater } = setup();
    await manager.check();
    await manager.download();
    await manager.check();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('falls back to the plain release check when the updater itself fails (e.g. no update manifest on the release)', async () => {
    const autoUpdater = fakeAutoUpdater({ checkForUpdates: vi.fn(async () => { throw new Error('no latest.yml'); }) });
    const { manager, fallbackCheck } = setup({
      autoUpdater,
      fallback: { updateAvailable: true, latestVersion: '2.0.0', url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v2.0.0' },
    });
    await manager.check();
    expect(fallbackCheck).toHaveBeenCalled();
    // It can't install this one itself, so the button should just open the page.
    expect(manager.getState()).toMatchObject({ phase: 'available', latestVersion: '2.0.0', canInstall: false });
  });
});

describe('when the app cannot update itself (dev build, unsigned macOS, ...)', () => {
  const url = 'https://github.com/conhop30/daggerheart-hub/releases/tag/v2.0.0';

  it('still announces a newer release, and "download" opens the release page', async () => {
    const { manager, openReleasePage } = setup({
      autoUpdater: null,
      fallback: { updateAvailable: true, latestVersion: '2.0.0', url },
    });
    await manager.check();
    expect(manager.getState()).toMatchObject({ phase: 'available', latestVersion: '2.0.0', canInstall: false, url });
    await manager.download();
    expect(openReleasePage).toHaveBeenCalledWith(url);
    expect(manager.getState().phase).toBe('available'); // still just informational
  });

  it('reports up to date, and reports a failed check as an error state (not a throw)', async () => {
    const upToDate = setup({ autoUpdater: null, fallback: { updateAvailable: false, latestVersion: '1.0.0' } });
    await upToDate.manager.check();
    expect(upToDate.manager.getState().phase).toBe('upToDate');

    const offline = setup({ autoUpdater: null, fallback: { updateAvailable: false, error: 'HTTP 403' } });
    await offline.manager.check();
    expect(offline.manager.getState()).toMatchObject({ phase: 'error', error: 'HTTP 403' });
  });

  it('never tries to install', async () => {
    const { manager } = setup({ autoUpdater: null, fallback: { updateAvailable: true, latestVersion: '2.0.0', url } });
    await manager.check();
    expect(() => manager.install()).not.toThrow();
    expect(manager.getState().phase).toBe('available');
  });
});
