import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const { isNewerVersion, isSafeReleaseUrl, checkForUpdate, parseVersion } = createRequire(import.meta.url)(
  './updateCheck.js'
);

function fakeFetch(body, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => body });
}

describe('version comparison', () => {
  it('parses tags with a leading v and prerelease suffixes', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('2.0.0-beta.1')).toEqual([2, 0, 0]);
    expect(parseVersion('1.4')).toEqual([1, 4, 0]);
  });

  it('compares numerically, not as strings (1.10.0 is newer than 1.9.0)', () => {
    expect(isNewerVersion('1.9.0', '1.10.0')).toBe(true);
    expect(isNewerVersion('1.10.0', '1.9.0')).toBe(false);
  });

  it('is only true for a strictly newer version', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.1.9')).toBe(false);
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
  });
});

describe('isSafeReleaseUrl', () => {
  it('only accepts this project\'s releases page', () => {
    expect(isSafeReleaseUrl('https://github.com/conhop30/daggerheart-hub/releases/tag/v1.1.0')).toBe(true);
    expect(isSafeReleaseUrl('https://github.com/conhop30/daggerheart-hub/releases')).toBe(true);
    expect(isSafeReleaseUrl('https://evil.example/conhop30/daggerheart-hub/releases')).toBe(false);
    expect(isSafeReleaseUrl('https://github.com/conhop30/daggerheart-hub/releases.evil.com')).toBe(false);
    expect(isSafeReleaseUrl(undefined)).toBe(false);
  });
});

describe('checkForUpdate', () => {
  it('reports an update when the latest release is newer', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: fakeFetch({
        tag_name: 'v1.1.0',
        html_url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v1.1.0',
      }),
    });
    expect(result).toEqual({
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      updateAvailable: true,
      url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v1.1.0',
    });
  });

  it('reports up to date when versions match', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.1.0',
      fetchImpl: fakeFetch({ tag_name: 'v1.1.0', html_url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v1.1.0' }),
    });
    expect(result.updateAvailable).toBe(false);
  });

  it('never trusts an arbitrary URL from the response', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: fakeFetch({ tag_name: 'v9.0.0', html_url: 'https://evil.example/download.exe' }),
    });
    expect(result.updateAvailable).toBe(true);
    expect(result.url).toBe('https://github.com/conhop30/daggerheart-hub/releases');
  });

  it('turns HTTP errors, bad payloads, and network failures into a quiet "no update"', async () => {
    const notFound = await checkForUpdate({ currentVersion: '1.0.0', fetchImpl: fakeFetch({}, { ok: false, status: 404 }) });
    expect(notFound).toMatchObject({ updateAvailable: false, error: 'HTTP 404' });

    const noTag = await checkForUpdate({ currentVersion: '1.0.0', fetchImpl: fakeFetch({}) });
    expect(noTag.updateAvailable).toBe(false);
    expect(noTag.error).toBeDefined();

    const offline = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: async () => {
        throw new Error('getaddrinfo ENOTFOUND api.github.com');
      },
    });
    expect(offline).toMatchObject({ updateAvailable: false });
    expect(offline.error).toContain('ENOTFOUND');
  });
});

describe('checkForUpdate via the latest-release redirect (no API rate limit)', () => {
  const redirectTo = (location, status = 302) => async () => ({
    ok: false,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'location' ? location : null) },
    json: async () => ({}),
  });

  it('reads the tag from the redirect target and reports a newer release', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: redirectTo('https://github.com/conhop30/daggerheart-hub/releases/tag/v1.2.0'),
    });
    expect(result).toEqual({
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      updateAvailable: true,
      url: 'https://github.com/conhop30/daggerheart-hub/releases/tag/v1.2.0',
    });
  });

  it('reports up to date when the redirect points at the running version', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.2.0',
      fetchImpl: redirectTo('/conhop30/daggerheart-hub/releases/tag/v1.2.0'),
    });
    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBe('1.2.0');
  });

  it('asks for the redirect itself instead of following it', async () => {
    let options;
    await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: async (_url, opts) => {
        options = opts;
        return redirectTo('https://github.com/conhop30/daggerheart-hub/releases/tag/v1.0.0')();
      },
    });
    expect(options.redirect).toBe('manual');
  });

  it('a project with no releases (redirects to the releases list) is "no update", not a crash', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: redirectTo('https://github.com/conhop30/daggerheart-hub/releases'),
    });
    expect(result).toMatchObject({ updateAvailable: false, error: 'No release found' });
  });

  it('never opens a redirect target outside this project', async () => {
    const result = await checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: redirectTo('https://evil.example/x/releases/tag/v9.0.0'),
    });
    expect(result.updateAvailable).toBe(true);
    expect(result.url).toBe('https://github.com/conhop30/daggerheart-hub/releases');
  });
});
