import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { musicApi, trackUrl, type MusicRegion, type MusicTrack } from '../api/music';
import type { SessionMode } from '../api/sessions';
import { resolveDefaultTrack } from '../lib/music';
import { loadVolume, saveVolume } from '../lib/musicVolume';

export interface MusicSessionInfo {
  campaignId: string;
  sessionId: string;
  sessionName: string;
  mode: SessionMode;
  regionId: string | null;
}

interface MusicContextValue {
  regions: MusicRegion[];
  tracks: MusicTrack[];
  session: MusicSessionInfo | null;
  /** The session currently mounted in SessionView, or null when nothing is open — see AppShell/SessionView. */
  viewingSessionId: string | null;
  track: MusicTrack | null;
  playing: boolean;
  volume: number;
  /** True once Play has been pressed for the current `session` — gates the floating player, see FloatingMusicPlayer. */
  everPlayed: boolean;
  setSession: (info: MusicSessionInfo) => void;
  setViewingSessionId: (sessionId: string | null) => void;
  clearIfSession: (sessionId: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  audioError: string | null;
  /** Re-fetches regions/tracks immediately — wired into the in-session "Manage Music" editor so an edit made mid-session (a new default, a renamed/volume-adjusted track) takes effect without leaving and re-entering the Session. */
  refreshLibrary: () => void;
  /** Lets whichever music-library editor is mounted (the standalone Music tab, or the in-session "Manage Music" panel) register its own preview-stop function, so starting real playback here can silence an in-progress preview there — see useMusicLibraryEditor. Pass null to unregister on unmount. */
  registerPreviewStopper: (stop: (() => void) | null) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

// Owns the one <audio> element for the whole app, mounted once here (in the
// provider's own render tree, at the app root — see App.tsx) instead of
// inside SessionView. That's the whole fix for "music stops when you
// navigate away": there's nothing left to unmount when a session's view
// closes, since the audio element was never a child of it.
export function MusicProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<MusicRegion[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [session, setSessionState] = useState<MusicSessionInfo | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [everPlayed, setEverPlayed] = useState(false);
  const [volume, setVolumeState] = useState(loadVolume);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Whichever music-library editor is currently mounted registers its own
  // stopPreview here — at most one is ever mounted at a time (the Music tab
  // and a live Session are different views), so a single slot is enough.
  const previewStopperRef = useRef<(() => void) | null>(null);
  const registerPreviewStopper = useCallback((stop: (() => void) | null) => {
    previewStopperRef.current = stop;
  }, []);

  const refreshLibrary = useCallback(() => {
    return Promise.all([musicApi.listRegions(), musicApi.listTracks()])
      .then(([r, t]) => {
        setRegions(r);
        setTracks(t);
      })
      .catch(() => {
        // No library yet, or running outside Electron — the panel just shows nothing to play.
      });
  }, []);

  useEffect(() => {
    refreshLibrary();
    // Intentionally once on mount only — see setSession below for the
    // refetch that keeps this from going stale after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const track = session ? resolveDefaultTrack(session.mode, session.regionId, regions, tracks) : null;

  const setSession = useCallback((info: MusicSessionInfo) => {
    // Regions/tracks are fetched once at startup, so this is what picks up
    // any music-library edits (new tracks, changed region defaults) made
    // before entering — or between visits to — a Session. Cheap enough to
    // run on every mode/region change too, not just the first mount.
    refreshLibrary();
    setSessionState((prev) => {
      if (prev && prev.sessionId !== info.sessionId) setEverPlayed(false);
      return info;
    });
  }, [refreshLibrary]);

  const clearIfSession = useCallback((sessionId: string) => {
    setSessionState((prev) => (prev?.sessionId === sessionId ? null : prev));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && track) {
      setAudioError(null);
      audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // superseded by a newer play()
        setAudioError(`Couldn't play "${track.name}" — the audio file may be missing.`);
        setPlaying(false);
      });
    } else {
      audio.pause();
      // `track` disappearing (its region's default was edited/removed while
      // playing — only possible now that editing lives inside SessionMusicPanel
      // too) must actually turn `playing` off, not just pause the element —
      // otherwise a *new* track resolving later silently auto-resumes with no
      // Play press, since this effect is keyed on track?.id and would see
      // playing already true.
      if (playing) setPlaying(false);
    }
  }, [playing, track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Master listening level × this specific track's own saved trim — the
  // same multiply the Music tab/in-session editor's preview applies, so
  // what a GM dials in there previewing is exactly what plays for real.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume * (track?.volume ?? 1);
    saveVolume(volume);
  }, [volume, track?.volume]);

  // Derived from `playing` itself (not set inline by play()/toggle()) so it
  // doesn't matter which action turned playback on — SessionMusicPanel and
  // FloatingMusicPlayer both drive this through `toggle`, not `play`.
  useEffect(() => {
    if (playing) setEverPlayed(true);
  }, [playing]);

  // Real session playback and a library editor's preview are two separate
  // <audio> elements (see useMusicLibraryEditor) — nothing stops both from
  // being audible at once unless one silences the other on the way on.
  const play = useCallback(() => {
    previewStopperRef.current?.();
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      if (next) previewStopperRef.current?.();
      return next;
    });
  }, []);

  const value = useMemo<MusicContextValue>(
    () => ({
      regions,
      tracks,
      session,
      viewingSessionId,
      track,
      playing,
      volume,
      everPlayed,
      setSession,
      setViewingSessionId,
      clearIfSession,
      play,
      pause,
      toggle,
      setVolume: setVolumeState,
      audioError,
      refreshLibrary,
      registerPreviewStopper,
    }),
    [
      regions,
      tracks,
      session,
      viewingSessionId,
      track,
      playing,
      volume,
      everPlayed,
      setSession,
      clearIfSession,
      play,
      pause,
      toggle,
      audioError,
      refreshLibrary,
      registerPreviewStopper,
    ]
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={track ? trackUrl(track) : undefined}
        loop
        onError={() => {
          if (track) setAudioError(`Couldn't play "${track.name}" — the audio file may be missing.`);
          setPlaying(false);
        }}
      />
    </MusicContext.Provider>
  );
}

export function useMusicContext(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusicContext must be used inside <MusicProvider>.');
  return ctx;
}
