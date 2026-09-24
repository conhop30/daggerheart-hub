import { useState } from 'react';
import type { PartyMember } from '../api/partyMembers';
import { sessionsApi, type Session, type UpdateSessionRequest } from '../api/sessions';
import SessionForm from './SessionForm';
import FearTrack from './FearTrack';
import ModeToggle from './ModeToggle';
import MusicPlayer from './MusicPlayer';
import CombatPanel from './CombatPanel';
import AdventuringPanel from './AdventuringPanel';
import PartyRoster from './PartyRoster';
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

      <FearTrack fear={session.fear} onChange={(fear) => persist({ fear })} />
      <ModeToggle mode={session.mode} onChange={(mode) => persist({ mode })} />
      <MusicPlayer
        mode={session.mode}
        regionId={session.regionId ?? null}
        onRegionChange={(regionId) => persist({ regionId })}
      />

      <PartyRoster campaignId={campaignId} sessionId={session.id} onChange={setMembers} />

      {session.mode === 'combat' ? (
        <CombatPanel sessionId={session.id} />
      ) : (
        <AdventuringPanel session={session} members={members} onSessionSaved={onSessionSaved} />
      )}
    </div>
  );
}
