import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { dismissVersion, dismissedVersion, isLaunchCheckEnabled } from '../lib/updatePrefs';
import { useUpdateState } from '../lib/useUpdateState';
import './UpdateBanner.css';

// Checks once per launch whether a newer version exists and, if so, ASKS: a
// slim notice with "Update now" and "Later". Nothing is downloaded until the
// person says yes, "Later" leaves the app exactly as it was (the notice just
// stays away for that version), and a downloaded update waits for them to
// restart — or installs the next time they quit. Where the app can't update
// itself (a dev build, an unsigned macOS app) the button opens the download
// page instead. Every failure path (offline, GitHub rate limit, not running in
// Electron) is silent: an update check should never be the reason something
// looks broken.
export default function UpdateBanner() {
  const update = useUpdateState();
  const [dismissedFor, setDismissedFor] = useState<string | null>(dismissedVersion);
  const [readyLater, setReadyLater] = useState(false);

  useEffect(() => {
    if (isLaunchCheckEnabled()) apiClient.checkForUpdates().catch(() => {});
  }, []);

  if (!update) return null;
  const version = <strong>{update.latestVersion}</strong>;

  if (update.phase === 'downloading') {
    const percent = update.percent ?? 0;
    return (
      <div className="update-banner" role="status">
        <span className="update-banner__text">
          Downloading version {version}&hellip; {percent}%
        </span>
        <progress className="update-banner__progress" max={100} value={percent} aria-label="Update download progress" />
      </div>
    );
  }

  if (update.phase === 'downloaded' && !readyLater) {
    return (
      <div className="update-banner" role="status">
        <span className="update-banner__text">
          Version {version} is ready. Restart to finish updating — or it will install the next time you close the app.
        </span>
        <button type="button" className="update-banner__action" onClick={() => apiClient.installUpdate().catch(() => {})}>
          Restart &amp; install
        </button>
        <button type="button" className="update-banner__later" onClick={() => setReadyLater(true)}>
          Later
        </button>
      </div>
    );
  }

  // Someone who turned off the launch check has asked not to be nudged; a
  // manual check from Settings reports its result there instead.
  if (update.phase === 'available' && update.latestVersion && dismissedFor !== update.latestVersion && isLaunchCheckEnabled()) {
    return (
      <div className="update-banner" role="status">
        <span className="update-banner__text">
          Version {version} is available — you're on {update.currentVersion}.
          {update.error && <span className="update-banner__error"> The download didn't finish — try again.</span>}
        </span>
        <button type="button" className="update-banner__action" onClick={() => apiClient.downloadUpdate().catch(() => {})}>
          {update.canInstall ? 'Update now' : 'View download'}
        </button>
        <button
          type="button"
          className="update-banner__dismiss"
          aria-label="Dismiss update notice"
          onClick={() => {
            dismissVersion(update.latestVersion!);
            setDismissedFor(update.latestVersion!);
          }}
        >
          Later
        </button>
      </div>
    );
  }

  return null;
}
