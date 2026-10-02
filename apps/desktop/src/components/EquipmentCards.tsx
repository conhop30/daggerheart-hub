import { memo } from 'react';
import { ContentCard, MetaChip } from './ContentCard';
import type { Loot } from '../api/loot';
import type { Consumable } from '../api/consumables';
import type { LootTable } from '../api/lootTables';
import type { ConsumableTable } from '../api/consumableTables';
import { RARITIES } from '../lib/lootRarity';

// Matches MetaChip's own null/undefined/'' -> "no value" convention, so an
// unset field reads the same way in both views. Shared by every entity
// type's table columns below.
export function dash(value: string | number | null | undefined): string | number {
  return value === null || value === undefined || value === '' ? '—' : value;
}

export function totalEntries(entries: { COMMON: unknown[]; UNCOMMON: unknown[]; RARE: unknown[]; LEGENDARY: unknown[] }): number {
  return RARITIES.reduce((sum, rarity) => sum + entries[rarity].length, 0);
}

// Loot and Consumable are both "name + optional description, nothing else" —
// one card does for both rather than two near-identical copies.
export const NameDescriptionCard = memo(function NameDescriptionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Loot | Consumable;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContentCard title={item.name} onEdit={() => onEdit(item.id)} onDelete={() => onDelete(item.id)}>
      {item.description && <p className="content-card__description">{item.description}</p>}
    </ContentCard>
  );
});

// Loot Tables and Consumable Tables share this same tile shape too — only
// their rollable-entry item type differs, which TableDetail handles.
export const TableCard = memo(function TableCard({
  table,
  onOpen,
  onDelete,
}: {
  table: LootTable | ConsumableTable;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContentCard
      title={table.name}
      onEdit={() => onOpen(table.id)}
      editLabel="Open"
      onDelete={() => onDelete(table.id)}
      meta={<MetaChip label="Entries" value={totalEntries(table.entries)} />}
    >
      {table.description && <p className="content-card__description">{table.description}</p>}
    </ContentCard>
  );
});
