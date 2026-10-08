import { useCallback, useEffect, useRef, useState } from 'react';
import { EVERYWHERE_REGION_ID, musicApi, type MusicRegion, type MusicTrack } from '../api/music';
import { useMusicContext } from '../context/MusicContext';
import { defaultCandidates } from './music';
import { loadVolume, saveVolume } from './musicVolume';
import { confirmDialog } from './confirm';

interface UseMusicLibraryEditorOptions {
  /** Called after every successful mutation — lets an embedding context (MusicContext, when this runs inside a live Session) pick up the change immediately instead of waiting for its own next refetch. */
  onLibraryChanged?: () => void;
  /** null (the default) = application-wide only, for the main Music tab. Set it to a Campaign's id to also include that Campaign's own scoped regions — see SessionMusicPanel's embedded editor. New regions created from here are stamped with this same scope. */
  scopeCampaignId?: string | null;
}

// All of the Music library's editing state and mutations, with no JSX of its
// own — extracted from what used to be MusicLibrary.tsx's entire body, so
// both the full-page library (MusicLibrary.tsx) and the in-session
// collapsible editor (MusicLibraryEditor.tsx) can share one implementation
// instead of forking it.
export function useMusicLibraryEditor({ onLibraryChanged, scopeCampaignId = null }: UseMusicLibraryEditorOptions = {}) {
  const { pause: pauseSessionPlayback, registerPreviewStopper } = useMusicContext();
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

  // Application-wide regions, plus this scope's own Campaign-scoped ones —
  // a region/track belonging to a *different* Campaign never appears here.
  // Tracks are filtered down to those same visible regions too (not just
  // regions), so an Everywhere region's "pick any track in the library"
  // default can't surface a track that actually belongs to someone else's
  // Campaign-scoped folder.
  const visibleRegions = useCallback(
    (all: MusicRegion[]) => all.filter((r) => r.campaignId == null || r.campaignId === scopeCampaignId),
    [scopeCampaignId]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([musicApi.listRegions(), musicApi.listTracks()])
      .then(([r, t]) => {
        if (cancelled) return;
        const shownRegions = visibleRegions(r);
        const shownIds = new Set(shownRegions.map((region) => region.id));
        setRegions(shownRegions);
        setTracks(t.filter((track) => shownIds.has(track.regionId)));
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
  }, [visibleRegions]);

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
      pauseSessionPlayback();
      audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // superseded by a newer preview
        setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
        setPreviewId(null);
      });
    } else {
      audio.pause();
    }
  }, [previewTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Master listening level × this specific track's own saved trim — the
  // same multiply MusicContext applies for real session playback, so what
  // you dial in here previewing is exactly what you'll hear in a Session.
  useEffect(() => {
    if (previewRef.current) previewRef.current.volume = volume * (previewTrack?.volume ?? 1);
    saveVolume(volume);
  }, [volume, previewTrack?.volume]);

  function fail(err: unknown, fallback: string) {
    window.alert(err instanceof Error ? err.message : fallback);
  }

  function togglePreview(trackId: string) {
    setPreviewId((prev) => (prev === trackId ? null : trackId));
  }

  const stopPreview = useCallback(() => setPreviewId(null), []);

  // Register this editor's stopPreview so real session playback starting
  // elsewhere (MusicContext.play/toggle) can silence a preview in progress
  // here — see MusicContext's registerPreviewStopper.
  useEffect(() => {
    registerPreviewStopper(stopPreview);
    return () => registerPreviewStopper(null);
  }, [registerPreviewStopper, stopPreview]);

  function handlePreviewError() {
    if (previewTrack) setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
    setPreviewId(null);
  }

  async function addRegion(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const region = await musicApi.createRegion({ name: trimmed, campaignId: scopeCampaignId });
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
    const note = count > 0 ? ` Its ${count} track${count === 1 ? '' : 's'} will move to Global.` : '';
    if (!(await confirmDialog(`Delete the region "${region.name}"?${note}`))) return;
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

  async function setDefault(region: MusicRegion, trackId: string) {
    try {
      const saved = await musicApi.updateRegion(region.id, { defaultTrackId: trackId || null });
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

  // Files dropped straight from the OS onto the currently-selected region's
  // track list — same destination/result shape as addFiles above, just
  // skipping the picker dialog since the paths are already known.
  async function addDroppedFiles(filePaths: string[]) {
    if (!selected || filePaths.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const result = await musicApi.importDroppedPaths(selected.id, filePaths);
      setTracks((prev) => [...prev, ...result.tracks]);
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not add those files.');
    } finally {
      setImporting(false);
    }
  }

  // Copies a track into another region — a new file + new record, so the
  // original is left completely untouched (unlike moveTrack, below).
  async function copyTrackToRegion(track: MusicTrack, targetRegionId: string) {
    if (targetRegionId === track.regionId) return;
    try {
      const copy = await musicApi.copyTrackToRegion(track.id, targetRegionId);
      setTracks((prev) => [...prev, copy]);
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not copy the track.');
    }
  }

  async function setTrackVolume(track: MusicTrack, volume: number) {
    // Optimistic: applied to local state immediately so a dragged slider
    // tracks the pointer smoothly instead of waiting on the IPC round trip.
    setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, volume } : t)));
    try {
      const saved = await musicApi.updateTrack(track.id, { volume });
      setTracks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      onLibraryChanged?.();
    } catch (err) {
      setTracks((prev) => prev.map((t) => (t.id === track.id ? track : t)));
      fail(err, 'Could not set that volume.');
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
      setRegions(visibleRegions(await musicApi.listRegions()));
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not move the track.');
    }
  }

  async function deleteTrack(track: MusicTrack) {
    if (!(await confirmDialog(`Remove "${track.name}" from the library? The copy the app keeps is deleted; your original file is untouched.`))) return;
    try {
      if (previewId === track.id) setPreviewId(null);
      await musicApi.removeTrack(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setRegions(visibleRegions(await musicApi.listRegions()));
      onLibraryChanged?.();
    } catch (err) {
      fail(err, 'Could not remove the track.');
    }
  }

  const candidates = selected ? defaultCandidates(selected, tracks) : [];
  const inheritLabel = selected?.isDefault ? 'None' : 'Use the Global default';

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
    addDroppedFiles,
    copyTrackToRegion,
    renameTrack,
    setTrackVolume,
    moveTrack,
    deleteTrack,
  };
}

export type MusicLibraryEditorState = ReturnType<typeof useMusicLibraryEditor>;
