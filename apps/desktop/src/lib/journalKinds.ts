import type { JournalEntryKind } from '../api/journal';

export interface KindDef {
  key: JournalEntryKind;
  label: string;
}

// SESSION is deliberately absent — never manually pickable via the "+" menu
// (see JournalBubble), since a hand-created SESSION-kind entry wouldn't be
// linked to any real Session. It's created automatically from a live
// Session's Notes panel instead (SessionNotesPanel).
export const KIND_DEFS: KindDef[] = [
  { key: 'ADVERSARIES', label: 'Adversaries' },
  { key: 'LOOT', label: 'Loot' },
  { key: 'CONSUMABLES', label: 'Consumables' },
  { key: 'ARMOR', label: 'Armor' },
  { key: 'WEAPONS', label: 'Weapons' },
  { key: 'WORLDBUILDING', label: 'Worldbuilding' },
  { key: 'OTHER', label: 'Other' },
];

export function kindLabelOf(kind: JournalEntryKind): string {
  if (kind === 'SESSION') return 'Session';
  return KIND_DEFS.find((d) => d.key === kind)?.label ?? kind;
}
