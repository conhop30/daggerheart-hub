// Two small per-machine UI preferences for the update check, kept in
// localStorage like the theme preference — they're about how this install
// behaves, not game content, so they don't belong in the exported data file.
const CHECK_KEY = 'daggerheart-check-updates';
const DISMISSED_KEY = 'daggerheart-dismissed-update';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the preference just won't persist.
  }
}

/** On by default; someone who'd rather the app never phone home can turn it off in Settings. */
export function isLaunchCheckEnabled(): boolean {
  return read(CHECK_KEY) !== 'off';
}

export function setLaunchCheckEnabled(enabled: boolean) {
  write(CHECK_KEY, enabled ? 'on' : 'off');
}

/** Dismissing hides the banner for that version only; a newer release shows it again. */
export function dismissedVersion(): string | null {
  return read(DISMISSED_KEY);
}

export function dismissVersion(version: string) {
  write(DISMISSED_KEY, version);
}
