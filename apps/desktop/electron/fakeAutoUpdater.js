// A stand-in for electron-updater's autoUpdater, used ONLY by the end-to-end
// tests (main.js loads it when DAGGERHEART_FAKE_AUTOUPDATER is set). A real
// self-update can't be exercised without a signed, published release, so this
// walks the same event sequence the real one emits and records the final
// "quit and install" instead of actually quitting.
//
//   DAGGERHEART_FAKE_AUTOUPDATER=<version>   the version it pretends is out
//   DAGGERHEART_FAKE_AUTOUPDATER_FAIL=check | download   make that step fail
const { EventEmitter } = require('node:events');

function createFakeAutoUpdater(version, failAt) {
  const updater = new EventEmitter();
  updater.autoDownload = true; // the manager must turn this off
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.downloadCalls = 0;

  const later = (fn, ms = 40) => new Promise((resolve) => setTimeout(() => resolve(fn()), ms));

  updater.checkForUpdates = async () => {
    updater.emit('checking-for-update');
    if (failAt === 'check') {
      await later(() => {});
      throw new Error('Cannot find latest.yml in the latest release artifacts');
    }
    await later(() => updater.emit('update-available', { version }));
    return { updateInfo: { version } };
  };

  updater.downloadUpdate = async () => {
    updater.downloadCalls += 1;
    if (updater.autoDownload) throw new Error('autoDownload should be off: the user has to opt in');
    if (failAt === 'download') {
      await later(() => {});
      throw new Error('net::ERR_INTERNET_DISCONNECTED');
    }
    await later(() => updater.emit('download-progress', { percent: 35 }), 250);
    await later(() => updater.emit('download-progress', { percent: 80 }), 250);
    await later(() => updater.emit('update-downloaded', { version }), 250);
  };

  updater.quitAndInstall = () => {
    // Tests read this with app.evaluate(); the real one would quit and run the installer.
    globalThis.__quitAndInstallCalled = true;
  };

  return updater;
}

module.exports = { createFakeAutoUpdater };
