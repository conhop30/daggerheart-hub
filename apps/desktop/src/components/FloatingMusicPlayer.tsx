import { useMusicContext } from '../context/MusicContext';
import './FloatingMusicPlayer.css';

interface FloatingMusicPlayerProps {
  onOpenSession: (campaignId: string, sessionId: string) => void;
}

// Bottom-right, app-wide: shows once music has actually been played for a
// Session and the user has navigated away from that Session's own view (see
// MusicContext's `everPlayed`/`viewingSessionId`). Lets them keep listening
// — and get back — without reopening the Session through Campaigns > that
// Campaign > that Session by hand.
export default function FloatingMusicPlayer({ onOpenSession }: FloatingMusicPlayerProps) {
  const { session, track, playing, volume, toggle, setVolume, viewingSessionId, everPlayed } = useMusicContext();

  if (!session || !track || !everPlayed || viewingSessionId === session.sessionId) return null;

  return (
    <div className="floating-music-player" role="group" aria-label="Music (playing in the background)">
      <button
        type="button"
        className="floating-music-player__play"
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="floating-music-player__info">
        <span className="floating-music-player__track">{track.name}</span>
        <span className="floating-music-player__session">{session.sessionName}</span>
      </div>
      <input
        type="range"
        className="floating-music-player__volume"
        min={0.05}
        max={1}
        step={0.01}
        value={volume}
        aria-label="Music volume"
        onChange={(e) => setVolume(Number(e.target.value))}
      />
      <button
        type="button"
        className="floating-music-player__back"
        onClick={() => onOpenSession(session.campaignId, session.sessionId)}
      >
        Back to Session
      </button>
    </div>
  );
}
