import { EVERYWHERE_REGION_ID } from '../api/music';
import { useMusicContext } from '../context/MusicContext';
import './SessionMusicPanel.css';

interface SessionMusicPanelProps {
  regionId: string | null;
  onRegionChange: (regionId: string | null) => void;
}

// Lives in SessionView's right-hand sidebar. All playback state comes from
// MusicContext (shared app-wide, so it survives navigating away — see
// FloatingMusicPlayer for the other half of that); this component only owns
// the region picker, since changing it has to persist onto the Session
// record, which SessionView (not the music context) is responsible for.
export default function SessionMusicPanel({ regionId, onRegionChange }: SessionMusicPanelProps) {
  const { regions, session, track, playing, volume, toggle, setVolume, audioError } = useMusicContext();
  const modeLabel = session?.mode === 'combat' ? 'combat' : 'adventuring';

  return (
    <div className="session-music-panel" role="group" aria-label="Music">
      <div className="session-music-panel__top">
        <span className="session-music-panel__label">Music</span>
        <label className="session-music-panel__region">
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

      <span className="session-music-panel__now" data-testid="now-playing">
        {track ? track.name : `No ${modeLabel} music set`}
      </span>

      <div className="session-music-panel__row">
        <button
          type="button"
          className="session-music-panel__play"
          onClick={toggle}
          disabled={!track}
          aria-label={playing ? 'Pause music' : 'Play music'}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>

      <label className="session-music-panel__volume">
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

      {!track && (
        <p className="session-music-panel__hint">Add music under Campaigns &rarr; Music, then pick a default for each mode.</p>
      )}
      {audioError && <p className="session-music-panel__hint session-music-panel__hint--error">{audioError}</p>}
    </div>
  );
}
