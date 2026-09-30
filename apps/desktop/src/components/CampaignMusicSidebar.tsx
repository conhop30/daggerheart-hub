import { useEffect } from 'react';
import { sessionsApi, type Session } from '../api/sessions';
import { useMusicContext } from '../context/MusicContext';
import SessionMusicPanel from './SessionMusicPanel';
import './CampaignMusicSidebar.css';

interface CampaignMusicSidebarProps {
  campaignId: string;
  session: Session | null;
}

// A quick "what's this Campaign's music doing" preview for the Campaign page,
// before any Session is open — reuses the shared SessionMusicPanel, bound to
// the most recently created Session (same "last one is the most recent"
// convention SessionList's "Clone Most Recent" already relies on). Guarded so
// visiting this page never interrupts another Campaign's already-playing
// Session. The condensed, interactive Adversary preview that used to live
// here moved into SessionView/SessionCombatSidebar instead — it only ever
// made sense next to the Session it belongs to.
export default function CampaignMusicSidebar({ campaignId, session }: CampaignMusicSidebarProps) {
  const { session: musicSession, setSession: setMusicSession, setViewingSessionId } = useMusicContext();

  useEffect(() => {
    if (!session) return;
    if (musicSession && musicSession.campaignId !== campaignId) return;
    setMusicSession({
      campaignId,
      sessionId: session.id,
      sessionName: session.name,
      mode: session.mode,
      regionId: session.regionId ?? null,
    });
    setViewingSessionId(session.id);
    return () => setViewingSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, campaignId]);

  async function handleRegionChange(regionId: string | null) {
    if (!session) return;
    try {
      await sessionsApi.update(session.id, { regionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  if (!session) {
    return (
      <div className="campaign-music-sidebar">
        <p className="campaign-music-sidebar__hint">Start a Session to see music controls here.</p>
      </div>
    );
  }

  const showMusic = !musicSession || musicSession.campaignId === campaignId;
  if (!showMusic) {
    return (
      <div className="campaign-music-sidebar">
        <p className="campaign-music-sidebar__hint">Another Campaign's Session is currently playing.</p>
      </div>
    );
  }

  return (
    <div className="campaign-music-sidebar">
      <SessionMusicPanel regionId={session.regionId ?? null} onRegionChange={handleRegionChange} />
    </div>
  );
}
