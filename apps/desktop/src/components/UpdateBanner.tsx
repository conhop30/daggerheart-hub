import { useEffect, useState } from 'react';
import { apiClient, type UpdateInfo } from '../api/client';
import { dismissVersion, dismissedVersion, isLaunchCheckEnabled } from '../lib/updatePrefs';
import './UpdateBanner.css';

// Checks once per launch whether a newer release exists on GitHub and, if
// so, shows a slim notice with a link to the download page. Notify-only: the
// app never downloads or replaces itself. Every failure path (offline, not
// running in Electron, GitHub rate limit) is silent — an update check should
// never be the reason something looks broken.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (!isLaunchCheckEnabled()) return;
    let cancelled = false;
    apiClient
      .checkForUpdate()
      .then((info) => {
        if (cancelled || !info.updateAvailable || !info.latestVersion) return;
        if (dismissedVersion() === info.latestVersion) return;
        setUpdate(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">
        Version <strong>{update.latestVersion}</strong> is available — you're on {update.currentVersion}.
      </span>
      <button
        type="button"
        className="update-banner__action"
        onClick={() => update.url && apiClient.openReleasePage(update.url).catch(() => {})}
      >
        View download
      </button>
      <button
        type="button"
        className="update-banner__dismiss"
        aria-label="Dismiss update notice"
        onClick={() => {
          dismissVersion(update.latestVersion!);
          setUpdate(null);
        }}
      >
        &times;
      </button>
    </div>
  );
}
