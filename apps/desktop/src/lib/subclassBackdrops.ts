import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

// The themed background shown behind a Party member of a given Subclass
// (see PartyRoster). The pictures aren't part of the app: each install has
// its own subclass-backdrops folder beside its data (see electron/main.js),
// and a file there named like a Subclass is that Subclass's picture, with
// no further step. Name-keyed the same way lib/domainIcons is.

/** "Executioner's Guild" and "executioners-guild.png" both come out as "executioners-guild". */
export function subclassSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Which of this install's files (if any) is the picture for a Subclass of that name. */
export function backdropFileFor(fileNames: string[], subclassName: string): string | undefined {
  const slug = subclassSlug(subclassName);
  return fileNames.find((file) => subclassSlug(file.replace(/\.[^.]+$/, '')) === slug);
}

/** Looks a Subclass's picture up by name; undefined when this install has none for it. */
export function useSubclassBackdrops(): (subclassName: string) => string | undefined {
  const [fileNames, setFileNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiClient
      .listSubclassBackdrops()
      .then((names) => {
        if (!cancelled) setFileNames(names);
      })
      // No pictures is an ordinary state, not an error worth interrupting for.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return (subclassName) => {
    const file = backdropFileFor(fileNames, subclassName);
    return file ? `dhmedia://backdrop/${encodeURIComponent(file)}` : undefined;
  };
}
