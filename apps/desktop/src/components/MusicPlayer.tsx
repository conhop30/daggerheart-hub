import { useEffect, useRef, useState } from 'react';
import { EVERYWHERE_REGION_ID, musicApi, trackUrl, type MusicRegion, type MusicTrack } from '../api/music';
import type { SessionMode } from '../api/sessions';
import { resolveDefaultTrack } from '../lib/music';
import './MusicPlayer.css';

interface MusicPlayerProps {
  mode: SessionMode;
  /** The session's chosen region; null = Everywhere. */
  regionId: string | null;
  onRegionChange: (regionId: string | null) => void;
}

const VOLUME_KEY = 'daggerheart-music-volume';

function loadVolume(): number {
  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(stored) && stored > 0 && stored <= 1) return stored;
  } catch {
    // localStorage can be unavailable; the default is fine.
  }
  return 0.6;
}

// The Session's music bar. Self-contained like CombatPanel: it fetches the
// library itself and needs only the session's mode and region. Playing is an
// explicit user action (Play) — switching mode while it is playing swaps to
// the new mode's default loop, but merely opening a Session never starts audio.
export default function MusicPlayer({ mode, regionId, onRegionChange }: MusicPlayerProps) {
  const [regions, setRegions] = useState<MusicRegion[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(loadVolume);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([musicApi.listRegions(), musicApi.listTracks()])
      .then(([r, t]) => {
        if (cancelled) return;
        setRegions(r);
        setTracks(t);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the music library.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const track = resolveDefaultTrack(mode, regionId, regions, tracks);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && track) {
      setError(null);
      audio.play().catch((err: unknown) => {
        // Swapping the source mid-play (a mode or region change) rejects the
        // superseded play() with an AbortError; a newer play() is already on
        // its way, so that isn't a failure and must not stop the music.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(`Couldn't play "${track.name}" — the audio file may be missing.`);
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [playing, track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Not persisting the volume is harmless.
    }
  }, [volume]);

  // A detached <audio> can keep playing after its component unmounts, so stop
  // it explicitly when leaving the Session.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  const nothingSet = !track;
  const modeLabel = mode === 'combat' ? 'combat' : 'adventuring';

  return (
    <div className="music-player" role="group" aria-label="Music">
      <div className="music-player__top">
        <span className="music-player__label">Music</span>
        <label className="music-player__region">
          Region
          <select
            aria-label="Music region"
            value={regionId ?? EVERYWHERE_REGION_ID}
            onChange={(e) => onRegionChange(e.target.value === EVERYWHERE_REGION_ID ? null : e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="music-player__row">
        <button
          type="button"
          className="music-player__play"
          onClick={() => setPlaying((p) => !p)}
          disabled={nothingSet}
          aria-label={playing ? 'Pause music' : 'Play music'}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <span className="music-player__now" data-testid="now-playing">
          {track ? track.name : `No ${modeLabel} music set`}
        </span>
        <label className="music-player__volume">
          Volume
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Music volume"
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </div>
      {nothingSet && tracks.length === 0 && (
        <p className="music-player__hint">Add music under Campaigns &rarr; Music, then pick a default for each mode.</p>
      )}
      {error && <p className="music-player__hint music-player__hint--error">{error}</p>}
      <audio
        ref={audioRef}
        src={track ? trackUrl(track) : undefined}
        loop
        onError={() => {
          if (track) setError(`Couldn't play "${track.name}" — the audio file may be missing.`);
          setPlaying(false);
        }}
      />
    </div>
  );
}
