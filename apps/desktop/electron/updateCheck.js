// "Is there a newer release than the one I'm running?" — a read-only check
// against the project's GitHub Releases. Deliberately notify-only: it never
// downloads or installs anything, so it works with an unsigned installer
// and there's nothing to go wrong on the user's machine. Kept free of any
// Electron imports so it can be unit-tested with a fake fetch.

const DEFAULT_URL = 'https://api.github.com/repos/conhop30/daggerheart-hub/releases/latest';
// The only place the app will ever send someone who clicks "Download".
const RELEASES_PAGE_PREFIX = 'https://github.com/conhop30/daggerheart-hub/releases';

/** "v1.2.3" / "1.2.3-beta" -> [1, 2, 3]. Missing or non-numeric parts count as 0. */
function parseVersion(v) {
  const core = String(v).trim().replace(/^v/i, '').split(/[-+]/)[0];
  const parts = core.split('.').map((n) => Number.parseInt(n, 10));
  return [0, 1, 2].map((i) => (Number.isFinite(parts[i]) ? parts[i] : 0));
}

/** True when `latest` is a strictly higher version than `current`. Prerelease suffixes are ignored. */
function isNewerVersion(current, latest) {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true;
    if (b[i] < a[i]) return false;
  }
  return false;
}

/** Only allow the release page (or a file under it) to be opened from the update banner. */
function isSafeReleaseUrl(url) {
  return typeof url === 'string' && (url === RELEASES_PAGE_PREFIX || url.startsWith(`${RELEASES_PAGE_PREFIX}/`));
}

/**
 * Resolves to { currentVersion, updateAvailable, latestVersion?, url?, error? }.
 * Never throws: being offline, rate-limited, or getting an odd response just
 * means "no update information", not a broken app.
 */
async function checkForUpdate({ currentVersion, fetchImpl = fetch, url = DEFAULT_URL, timeoutMs = 6000 }) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'daggerheart-hub-update-check' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { currentVersion, updateAvailable: false, error: `HTTP ${res.status}` };
    const release = await res.json();
    const latestVersion = String(release.tag_name ?? '').replace(/^v/i, '');
    if (!latestVersion) return { currentVersion, updateAvailable: false, error: 'No tag_name in response' };
    const pageUrl = isSafeReleaseUrl(release.html_url) ? release.html_url : RELEASES_PAGE_PREFIX;
    return {
      currentVersion,
      latestVersion,
      updateAvailable: isNewerVersion(currentVersion, latestVersion),
      url: pageUrl,
    };
  } catch (err) {
    return { currentVersion, updateAvailable: false, error: err instanceof Error ? err.message : String(err) };
  }
}

module.exports = { parseVersion, isNewerVersion, isSafeReleaseUrl, checkForUpdate, DEFAULT_URL, RELEASES_PAGE_PREFIX };
