import { sessionsApi, type NewLootLogEntry, type Session, type UpdateSessionRequest } from '../api/sessions';
import type { PartyMember } from '../api/partyMembers';
import LootRoller from './LootRoller';
import './AdventuringPanel.css';

interface AdventuringPanelProps {
  session: Session;
  /** The party as this session sees it (SessionView's PartyRoster loads it). */
  members: PartyMember[];
  onSessionSaved: (session: Session) => void;
}

// Notes and the loot log both live on the Session record (there's no
// separate collection for them), so unlike CombatPanel this panel is
// prop-driven off the same `session` SessionView holds rather than
// self-fetching. LootRoller underneath it stays fully self-contained.
//
// Two kinds of notes, on purpose: everything in "Carries into later
// sessions" follows the Campaign (a later session shows it until it's
// changed there), while "Session Notes" belong to this one session only.
export default function AdventuringPanel({ session, members, onSessionSaved }: AdventuringPanelProps) {
  async function save(patch: UpdateSessionRequest) {
    try {
      const saved = await sessionsApi.update(session.id, patch);
      onSessionSaved(saved);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  function pcNoteFor(partyMemberId: string): string {
    return session.pcNotes.find((n) => n.partyMemberId === partyMemberId)?.text ?? '';
  }

  // Send only the member whose note changed; the store merges it, so the other
  // members' notes keep carrying from earlier sessions.
  function setPcNote(partyMemberId: string, text: string) {
    save({ pcNotes: [{ partyMemberId, text }] });
  }

  async function handleRoll(entry: NewLootLogEntry) {
    try {
      onSessionSaved(await sessionsApi.addLoot(session.id, entry));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that roll.');
    }
  }

  async function handleRemoveLoot(entryId: string) {
    try {
      onSessionSaved(await sessionsApi.removeLoot(session.id, entryId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove that entry.');
    }
  }

  return (
    <div className="adventuring-panel">
      <section className="adventuring-panel__group" aria-label="Notes that carry into later sessions">
        <h3 className="adventuring-panel__section-title">Carries into later sessions</h3>
        <div className="adventuring-panel__notes">
          <label className="adventuring-panel__note-field">
            Campaign Notes
            <textarea
              value={session.campaignNotes ?? ''}
              onChange={(e) => save({ campaignNotes: e.target.value })}
              rows={4}
            />
          </label>
          <label className="adventuring-panel__note-field">
            NPC Notes
            <textarea value={session.npcNotes ?? ''} onChange={(e) => save({ npcNotes: e.target.value })} rows={4} />
          </label>
        </div>

        {members.length > 0 && (
          <div className="adventuring-panel__pc-notes">
            <h4 className="adventuring-panel__subtitle">Party Notes</h4>
            {members.map((member) => (
              <label key={member.id} className="adventuring-panel__note-field">
                {member.name}
                <textarea value={pcNoteFor(member.id)} onChange={(e) => setPcNote(member.id, e.target.value)} rows={2} />
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="adventuring-panel__group" aria-label="Session Notes">
        <h3 className="adventuring-panel__section-title">This session only</h3>
        <label className="adventuring-panel__note-field">
          Session Notes
          <textarea
            value={session.generalNotes ?? ''}
            onChange={(e) => save({ generalNotes: e.target.value })}
            rows={4}
          />
        </label>
      </section>

      <LootRoller lootLog={session.lootLog} sessionId={session.id} onRoll={handleRoll} onRemove={handleRemoveLoot} />
    </div>
  );
}
