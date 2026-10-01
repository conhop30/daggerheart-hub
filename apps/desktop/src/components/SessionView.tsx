import { useEffect, useState } from 'react';
import type { PartyMember } from '../api/partyMembers';
import { sessionsApi, type Session, type UpdateSessionRequest } from '../api/sessions';
import { sessionAdversariesApi, type SessionAdversary, type UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import SessionForm from './SessionForm';
import FearTrack from './FearTrack';
import ModeToggle from './ModeToggle';
import SessionMusicPanel from './SessionMusicPanel';
import CombatPanel from './CombatPanel';
import SessionCombatSidebar from './SessionCombatSidebar';
import AdventuringPanel from './AdventuringPanel';
import PartyRoster from './PartyRoster';
import DiceTray from './DiceTray';
import RollLogPanel from './RollLogPanel';
import { useRollLog } from '../context/RollLogContext';
import { useMusicContext } from '../context/MusicContext';
import './SessionView.css';

interface SessionViewProps {
  session: Session;
  campaignId: string;
  onBack: () => void;
  onSessionSaved: (session: Session) => void;
  onSessionDeleted: (id: string) => void;
}

// A thin shell, not the owner of any panel's data — it wires FearTrack,
// ModeToggle, the Party, and whichever of CombatPanel/AdventuringPanel is
// active together, but each of those manages (or is handed) its own state.
// Ripping out and rebuilding any one panel never means touching this file
// beyond the single line that renders it.
//
// Nearly everything on this screen follows the Campaign into later sessions
// (Fear, the Party, pulled-in combatants, Campaign/NPC/PC notes, the loot
// log); only the name, mode, and "Session Notes" belong to this session
// alone. See electron/carry.js for the rules.
export default function SessionView({ session, campaignId, onBack, onSessionSaved, onSessionDeleted }: SessionViewProps) {
  const [editing, setEditing] = useState(false);
  // The roster owns loading/editing the party; it shares the current list so
  // the notes panel below lists the same members.
  const [members, setMembers] = useState<PartyMember[]>([]);

  // Owned here (not by CombatPanel) because SessionCombatSidebar shows this
  // very same live list at the same time, on the same screen — both need to
  // agree the instant one of them changes something, so there's one source
  // of truth instead of two independent fetches drifting apart.
  const [sessionAdversaries, setSessionAdversaries] = useState<SessionAdversary[]>([]);
  const [adversariesLoading, setAdversariesLoading] = useState(true);
  const [adversariesError, setAdversariesError] = useState<string | null>(null);

  // Table chatter, not campaign data (never persisted to disk, see
  // lib/rollLog) but kept alive for the life of the app run even while this
  // view unmounts — see RollLogContext. Shared between Roll Damage/Roll
  // Attack and the DiceTray since both fire into the same log.
  const { entries: rollLog, addRoll, clear: clearRollLog } = useRollLog(session.id);

  const { setSession: setMusicSession, setViewingSessionId, clearIfSession } = useMusicContext();

  useEffect(() => {
    let cancelled = false;
    setAdversariesLoading(true);
    setAdversariesError(null);
    sessionAdversariesApi
      .listBySession(session.id)
      .then((list) => {
        if (!cancelled) setSessionAdversaries(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setAdversariesError(err instanceof Error ? err.message : 'Could not load this session’s Adversaries.');
      })
      .finally(() => {
        if (!cancelled) setAdversariesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  async function pullInAdversary(adversaryId: string) {
    try {
      const pulled = await sessionAdversariesApi.create({ sessionId: session.id, adversaryId });
      setSessionAdversaries((prev) => [...prev, pulled]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not pull that Adversary in.');
    }
  }

  async function handleAdversaryChange(adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) {
    setSessionAdversaries((prev) => prev.map((a) => (a.id === adversary.id ? { ...a, ...patch } : a)));
    try {
      await sessionAdversariesApi.update(adversary.id, patch, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleAdversaryRemove(adversary: SessionAdversary) {
    setSessionAdversaries((prev) => prev.filter((a) => a.id !== adversary.id));
    try {
      await sessionAdversariesApi.remove(adversary.id, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not push that Adversary out.');
    }
  }

  // Keeps the shared music context pointed at this Session's mode/region
  // (so it resolves the right track and the sidebar/floating players agree
  // with what's actually playing) — the context is what survives navigating
  // away, this effect is just what keeps it in sync while here.
  useEffect(() => {
    setMusicSession({ campaignId, sessionId: session.id, sessionName: session.name, mode: session.mode, regionId: session.regionId ?? null });
  }, [campaignId, session.id, session.name, session.mode, session.regionId, setMusicSession]);

  useEffect(() => {
    setViewingSessionId(session.id);
    return () => setViewingSessionId(null);
  }, [session.id, setViewingSessionId]);

  async function persist(patch: UpdateSessionRequest) {
    try {
      const saved = await sessionsApi.update(session.id, patch);
      onSessionSaved(saved);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${session.name}"? This can't be undone.`)) return;
    try {
      await sessionsApi.remove(session.id);
      clearIfSession(session.id);
      onSessionDeleted(session.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Session.');
    }
  }

  return (
    <div className="session-view">
      <button type="button" className="session-view__back" onClick={onBack}>
        &larr; Back to Campaign
      </button>

      {editing ? (
        <div className="session-view__edit-panel">
          <SessionForm
            campaignId={campaignId}
            initial={session}
            onSaved={(saved) => {
              onSessionSaved(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="session-view__header">
          <h1 className="session-view__title">{session.name}</h1>
          <div className="session-view__header-actions">
            <button type="button" className="session-view__header-action" onClick={() => setEditing(true)}>
              Rename
            </button>
            <button
              type="button"
              className="session-view__header-action session-view__header-action--danger"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="session-view__layout">
        <div className="session-view__main">
          <FearTrack fear={session.fear} onChange={(fear) => persist({ fear })} />
          <ModeToggle mode={session.mode} onChange={(mode) => persist({ mode })} />

          <PartyRoster
            campaignId={campaignId}
            sessionId={session.id}
            onChange={setMembers}
            layout={session.mode === 'combat' ? 'grid' : 'list'}
          />

          {session.mode === 'combat' ? (
            <CombatPanel
              sessionId={session.id}
              sessionAdversaries={sessionAdversaries}
              adversariesLoading={adversariesLoading}
              adversariesError={adversariesError}
              onPullInAdversary={pullInAdversary}
              onAdversaryChange={handleAdversaryChange}
              onAdversaryRemove={handleAdversaryRemove}
              onRoll={addRoll}
            />
          ) : (
            <AdventuringPanel session={session} members={members} onSessionSaved={onSessionSaved} />
          )}
        </div>

        <aside className="session-view__sidebar">
          <SessionMusicPanel regionId={session.regionId ?? null} onRegionChange={(regionId) => persist({ regionId })} />
          <SessionCombatSidebar sessionAdversaries={sessionAdversaries} onChange={handleAdversaryChange} />
        </aside>
      </div>

      <DiceTray onRoll={addRoll} />
      <RollLogPanel entries={rollLog} onClear={clearRollLog} />
    </div>
  );
}
