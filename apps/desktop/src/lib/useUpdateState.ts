import { useEffect, useState } from 'react';
import { apiClient, type UpdateState } from '../api/client';

/**
 * The app's update state. The main process owns it (checking, downloading,
 * ready to install) and pushes every change, so any component using this
 * hook — the banner, Settings — always agrees. Null until the first read,
 * and forever outside Electron.
 */
export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getUpdateState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {});
    const unsubscribe = apiClient.onUpdateState((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
