// "Is there a newer release than the one I'm running?" — a read-only check
// against the project's GitHub Releases. Deliberately notify-only: it never
// downloads or installs anything. It's the fallback behind updater.js for
// installs that can't replace themselves (dev builds, unsigned macOS) and for
// releases that don't carry an update manifest. Kept free of any Electron
// imports so it can be unit-tested with a fake fetch.
//
// It reads GitHub's "latest release" redirect
// (github.com/OWNER/REPO/releases/latest -> .../releases/tag/vX.Y.Z), not the
// REST API: the API allows only 60 anonymous requests an hour per IP address,
// which a shared network (a school, an office) can use up before the app ever
// gets a look in. The redirect has no such limit. A JSON body shaped like the
// API's `{ tag_name, html_url }` is still understood, which is what the tests
// and DAGGERHEART_UPDATE_URL fake servers send.

const DEFAULT_URL = 'https://github.com/conhop30/daggerheart-hub/releases/latest';
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
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    let tag;
    let htmlUrl;
    const location = res.headers?.get?.('location');
    if (res.status >= 300 && res.status < 400 && location) {
      // The redirect form: the tag is the last path segment of .../releases/tag/<tag>.
      const target = new URL(location, url).toString();
      const match = /\/releases\/tag\/([^/?#]+)/.exec(target);
      if (!match) return { currentVersion, updateAvailable: false, error: 'No release found' };
      tag = decodeURIComponent(match[1]);
      htmlUrl = target;
    } else {
      if (!res.ok) return { currentVersion, updateAvailable: false, error: `HTTP ${res.status}` };
      const release = await res.json();
      tag = release.tag_name;
      htmlUrl = release.html_url;
    }

    const latestVersion = String(tag ?? '').replace(/^v/i, '');
    if (!latestVersion) return { currentVersion, updateAvailable: false, error: 'No tag_name in response' };
    const pageUrl = isSafeReleaseUrl(htmlUrl) ? htmlUrl : RELEASES_PAGE_PREFIX;
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
