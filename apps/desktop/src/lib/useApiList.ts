import { useEffect, useState } from 'react';

// Every browse page below needs one to four of these — same loading/error/
// unmount-guard boilerplate each time, so it's a hook instead of copy-paste.
export function useApiList<T>(fetcher: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setItems(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load your data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is expected to be stable (a bare api.list reference) —
    // re-running this on every render would defeat the point of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, error };
}
