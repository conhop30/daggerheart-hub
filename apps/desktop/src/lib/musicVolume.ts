const VOLUME_KEY = 'daggerheart-music-volume';

// Shared between MusicContext (Session/floating playback) and MusicLibrary
// (preview), so setting the volume once holds everywhere audio plays.
export function loadVolume(): number {
  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(stored) && stored > 0 && stored <= 1) return stored;
  } catch {
    // localStorage can be unavailable; the default is fine.
  }
  return 0.6;
}

export function saveVolume(volume: number): void {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Not persisting the volume is harmless.
  }
}
