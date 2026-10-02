import { sessionsApi, type NewLootLogEntry, type Session } from '../api/sessions';
import LootRoller from './LootRoller';

interface AdventuringPanelProps {
  session: Session;
  onSessionSaved: (session: Session) => void;
}

// The loot log lives on the Session record (there's no separate collection
// for it), so unlike CombatPanel this panel is prop-driven off the same
// `session` SessionView holds rather than self-fetching. LootRoller
// underneath it stays fully self-contained.
//
// GM note-taking used to live here (Campaign/NPC/Party/Session Notes) — now
// covered by the Journal bubble (see TODO.md), which is app-wide and scoped
// per-Campaign rather than per-Session.
export default function AdventuringPanel({ session, onSessionSaved }: AdventuringPanelProps) {
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

  return <LootRoller lootLog={session.lootLog} sessionId={session.id} onRoll={handleRoll} onRemove={handleRemoveLoot} />;
}
