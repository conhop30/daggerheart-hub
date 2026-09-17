import { useEffect, useState } from 'react';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import { sessionsApi, type LootLogEntry, type Session, type UpdateSessionRequest } from '../api/sessions';
import LootRoller from './LootRoller';
import './AdventuringPanel.css';

interface AdventuringPanelProps {
  session: Session;
  campaignId: string;
  onSessionSaved: (session: Session) => void;
}

// Notes and the loot log both live directly on the Session record (there's
// no separate collection for them), so unlike CombatPanel this panel is
// prop-driven off the same `session` SessionView holds rather than
// self-fetching — there's nothing else it could fetch. It still owns its
// own Party lookup for the per-PC notes list, and LootRoller underneath it
// stays fully self-contained regardless.
export default function AdventuringPanel({ session, campaignId, onSessionSaved }: AdventuringPanelProps) {
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    partyMembersApi.listByCampaign(campaignId).then((list) => {
      if (!cancelled) setPartyMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

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

  function setPcNote(partyMemberId: string, text: string) {
    const withoutThisNote = session.pcNotes.filter((n) => n.partyMemberId !== partyMemberId);
    save({ pcNotes: [...withoutThisNote, { partyMemberId, text }] });
  }

  function handleRoll(entry: LootLogEntry) {
    save({ lootLog: [...session.lootLog, entry] });
  }

  return (
    <div className="adventuring-panel">
      <div className="adventuring-panel__notes">
        <label className="adventuring-panel__note-field">
          General Notes
          <textarea
            value={session.generalNotes ?? ''}
            onChange={(e) => save({ generalNotes: e.target.value })}
            rows={4}
          />
        </label>
        <label className="adventuring-panel__note-field">
          NPC Notes
          <textarea value={session.npcNotes ?? ''} onChange={(e) => save({ npcNotes: e.target.value })} rows={4} />
        </label>
      </div>

      {partyMembers.length > 0 && (
        <div className="adventuring-panel__pc-notes">
          <h3 className="adventuring-panel__section-title">Party Notes</h3>
          {partyMembers.map((member) => (
            <label key={member.id} className="adventuring-panel__note-field">
              {member.name}
              <textarea value={pcNoteFor(member.id)} onChange={(e) => setPcNote(member.id, e.target.value)} rows={2} />
            </label>
          ))}
        </div>
      )}

      <LootRoller lootLog={session.lootLog} onRoll={handleRoll} />
    </div>
  );
}
