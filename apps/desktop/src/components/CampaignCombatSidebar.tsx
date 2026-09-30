import { useEffect, useState } from 'react';
import { sessionAdversariesApi, type SessionAdversary, type UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import { sessionsApi, type Session } from '../api/sessions';
import { useMusicContext } from '../context/MusicContext';
import SessionMusicPanel from './SessionMusicPanel';
import StatStepper from './StatStepper';
import './CampaignCombatSidebar.css';

interface CampaignCombatSidebarProps {
  campaignId: string;
  /** The Campaign's most recently created Session, or null if none exists yet. */
  session: Session | null;
}

// A preview of "what's live" for a Campaign before actually opening a
// Session — the same music controls SessionView's sidebar has (see
// SessionMusicPanel) plus a condensed, still-interactive list of whatever
// Adversaries are pulled in, both read from the most recent Session instead
// of one being actively viewed. Lets a GM cue music or check HP between
// sessions without drilling into "Open".
export default function CampaignCombatSidebar({ campaignId, session }: CampaignCombatSidebarProps) {
  const [sessionAdversaries, setSessionAdversaries] = useState<SessionAdversary[]>([]);
  const { session: musicSession, setSession: setMusicSession, setViewingSessionId } = useMusicContext();

  useEffect(() => {
    if (!session) {
      setSessionAdversaries([]);
      return;
    }
    let cancelled = false;
    sessionAdversariesApi.listBySession(session.id).then((list) => {
      if (!cancelled) setSessionAdversaries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Only takes over the shared music player when nothing else already owns
  // it (or it's already this Campaign) — visiting this page should never
  // interrupt music playing from a different Campaign's open Session.
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

  async function handleAdversaryChange(adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) {
    setSessionAdversaries((prev) => prev.map((a) => (a.id === adversary.id ? { ...a, ...patch } : a)));
    try {
      await sessionAdversariesApi.update(adversary.id, patch, { sessionId: adversary.sessionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  if (!session) {
    return (
      <div className="campaign-combat-sidebar">
        <p className="campaign-combat-sidebar__hint">Start a Session to see music controls and pulled-in Adversaries here.</p>
      </div>
    );
  }

  const showMusic = !musicSession || musicSession.campaignId === campaignId;

  return (
    <div className="campaign-combat-sidebar">
      {showMusic && <SessionMusicPanel regionId={session.regionId ?? null} onRegionChange={handleRegionChange} />}

      {sessionAdversaries.length > 0 && (
        <div className="campaign-combat-sidebar__combatants">
          <p className="campaign-combat-sidebar__label">Adversaries — {session.name}</p>
          {sessionAdversaries.map((adversary) => (
            <div className="campaign-combat-sidebar__combatant" key={adversary.id}>
              <span className="campaign-combat-sidebar__combatant-name">{adversary.label}</span>
              {adversary.hpMax != null && (
                <StatStepper
                  label="HP"
                  current={adversary.hpMarked}
                  max={adversary.hpMax}
                  onChange={(hpMarked) => handleAdversaryChange(adversary, { hpMarked })}
                />
              )}
              {adversary.stressMax != null && (
                <StatStepper
                  label="Stress"
                  current={adversary.stressMarked}
                  max={adversary.stressMax}
                  onChange={(stressMarked) => handleAdversaryChange(adversary, { stressMarked })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
