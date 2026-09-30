import { useEffect, useRef, useState } from 'react';
import { EVERYWHERE_REGION_ID, musicApi, type MusicRegion, type MusicTrack } from '../api/music';
import { defaultCandidates } from './music';
import { loadVolume, saveVolume } from './musicVolume';

interface UseMusicLibraryEditorOptions {
  /** Called after every successful mutation — lets an embedding context (MusicContext, when this runs inside a live Session) pick up the change immediately instead of waiting for its own next refetch. */
  onLibraryChanged?: () => void;
}

// All of the Music library's editing state and mutations, with no JSX of its
// own — extracted from what used to be MusicLibrary.tsx's entire body, so
// both the full-page library (MusicLibrary.tsx) and the in-session
// collapsible editor (MusicLibraryEditor.tsx) can share one implementation
// instead of forking it.
export function useMusicLibraryEditor({ onLibraryChanged }: UseMusicLibraryEditorOptions = {}) {
  const [regions, setRegions] = useState<MusicRegion[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedId, setSelectedId] = useState(EVERYWHERE_REGION_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // One shared element for previewing tracks, independent of any real
  // session playback (MusicContext owns a separate <audio> for that).
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [volume, setVolume] = useState(loadVolume);

  useEffect(() => {
    let cancelled = false;
    Promise.all([musicApi.listRegions(), musicApi.listTracks()])
      .then(([r, t]) => {
        if (cancelled) return;
        setRegions(r);
        setTracks(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the music library.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stop any preview when the editor unmounts (e.g. the collapsible section closes).
  useEffect(() => {
    const audio = previewRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const selected = regions.find((r) => r.id === selectedId) ?? regions[0];
  const regionTracks = selected ? tracks.filter((t) => t.regionId === selected.id) : [];
  const previewTrack = tracks.find((t) => t.id === previewId) ?? null;

  useEffect(() => {
    const audio = previewRef.current;
    if (!audio) return;
    if (previewTrack) {
      audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // superseded by a newer preview
        setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
        setPreviewId(null);
      });
    } else {
      audio.pause();
    }
  }, [previewTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (previewRef.current) previewRef.current.volume = volume;
    saveVolume(volume);
  }, [volume]);

  function fail(err: unknown, fallback: string) {
    window.alert(err instanceof Error ? err.message : fallback);
  }

  function togglePreview(trackId: string) {
    setPreviewId((prev) => (prev === trackId ? null : trackId));
  }

  function stopPreview() {
    setPreviewId(null);
  }

  function handlePreviewError() {
    if (previewTrack) setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
    setPreviewId(null);
  }

  async function addRegion(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const region = await musicApi.createRegion({ name: trimmed });
      setRegions((prev) => (prev.some((r) => r.id === region.id) ? prev : [...prev, region]));
      setSelectedId(region.id);
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not create the region.');
    }
  }

  async function renameRegion(region: MusicRegion, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === region.name) return;
    try {
      const saved = await musicApi.updateRegion(region.id, { name: trimmed });
      setRegions((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not rename the region.');
    }
  }

  async function deleteRegion(region: MusicRegion) {
    const count = tracks.filter((t) => t.regionId === region.id).length;
    const note = count > 0 ? ` Its ${count} track${count === 1 ? '' : 's'} will move to Everywhere.` : '';
    if (!window.confirm(`Delete the region "${region.name}"?${note}`)) return;
    try {
      await musicApi.removeRegion(region.id);
      setRegions((prev) => prev.filter((r) => r.id !== region.id));
      setTracks((prev) => prev.map((t) => (t.regionId === region.id ? { ...t, regionId: EVERYWHERE_REGION_ID } : t)));
      setSelectedId(EVERYWHERE_REGION_ID);
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not delete the region.');
    }
  }

  async function setDefault(region: MusicRegion, field: 'adventuringTrackId' | 'combatTrackId', trackId: string) {
    try {
      const saved = await musicApi.updateRegion(region.id, { [field]: trackId || null });
      setRegions((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not set that default.');
    }
  }

  async function addFiles() {
    if (!selected) return;
    setImporting(true);
    setError(null);
    try {
      const result = await musicApi.importFiles(selected.id);
      if (!result.canceled) {
        setTracks((prev) => [...prev, ...result.tracks]);
        onLibraryChanged?.();
      }
    } catch (err) {
      fail(err, 'Could not add those files.');
    } finally {
      setImporting(false);
    }
  }

  async function renameTrack(track: MusicTrack, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === track.name) return;
    try {
      const saved = await musicApi.updateTrack(track.id, { name: trimmed });
      setTracks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not rename the track.');
    }
  }

  async function moveTrack(track: MusicTrack, regionId: string) {
    try {
      const saved = await musicApi.updateTrack(track.id, { regionId });
      setTracks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      // Moving a track out of a user region can clear that region's default for it.
      setRegions(await musicApi.listRegions());
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not move the track.');
    }
  }

  async function deleteTrack(track: MusicTrack) {
    if (!window.confirm(`Remove "${track.name}" from the library? The copy the app keeps is deleted; your original file is untouched.`)) return;
    try {
      if (previewId === track.id) setPreviewId(null);
      await musicApi.removeTrack(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setRegions(await musicApi.listRegions());
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not remove the track.');
    }
  }

  const candidates = selected ? defaultCandidates(selected, tracks) : [];
  const inheritLabel = selected?.isDefault ? 'None' : 'Use the Everywhere default';

  return {
    regions,
    tracks,
    selectedId,
    setSelectedId,
    selected,
    regionTracks,
    candidates,
    inheritLabel,
    loading,
    error,
    importing,
    previewRef,
    previewId,
    previewTrack,
    togglePreview,
    stopPreview,
    handlePreviewError,
    volume,
    setVolume,
    addRegion,
    renameRegion,
    deleteRegion,
    setDefault,
    addFiles,
    renameTrack,
    moveTrack,
    deleteTrack,
  };
}

export type MusicLibraryEditorState = ReturnType<typeof useMusicLibraryEditor>;
