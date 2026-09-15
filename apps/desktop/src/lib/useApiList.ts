import { useEffect, useState } from 'react';
import { upsertById } from './upsert';

// Every browse page below needs one to four of these — same loading/error/
// unmount-guard boilerplate each time, so it's a hook instead of copy-paste.
// Also hands back upsert/remove so a successful edit or delete can update
// the on-screen list immediately instead of a full refetch.
export function useApiList<T extends { id: string }>(fetcher: () => Promise<T[]>) {
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

  function upsert(item: T) {
    setItems((prev) => upsertById(prev, item));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return { items, loading, error, upsert, remove };
}
