import { useState } from 'react';
import type { Rarity, RarityEntries } from '../lib/lootRarity';
import { RARITIES, RARITY_MAX } from '../lib/lootRarity';
import { titleCaseEnum } from '../lib/format';
import SimpleNameDescriptionForm from './SimpleNameDescriptionForm';
import ItemPicker from './ItemPicker';
import './TableDetail.css';

interface PickableItem {
  id: string;
  name: string;
  gameSetId: string;
}

interface TableRecord<E> {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
  entries: RarityEntries<E>;
}

interface TableDetailProps<E extends { position: number }> {
  table: TableRecord<E>;
  /** Every Loot or Consumable record an entry could point at. */
  items: PickableItem[];
  /** "Loot" or "Consumable" — used in headings/messages. */
  itemLabel: string;
  /** Builds a fresh entry row for a given position + chosen item id (abstracts over `lootId` vs `consumableId`). */
  makeEntry: (position: number, itemId: string) => E;
  /** Reads the referenced item id back out of an entry. */
  getItemId: (entry: E) => string;
  update: (id: string, body: { name?: string; description?: string; entries?: RarityEntries<E> }) => Promise<TableRecord<E>>;
  remove: (id: string) => Promise<void>;
  onBack: () => void;
  onSaved: (table: TableRecord<E>) => void;
  onDeleted: (id: string) => void;
}

// Shared by LootTableDetail and ConsumableTableDetail — same four-rarity
// ordered-entry editor either way, differing only in which item collection
// entries reference (Loot vs Consumable) and the field name that holds the
// reference. Generic over the entry shape rather than written out twice.
export default function TableDetail<E extends { position: number }>({
  table,
  items,
  itemLabel,
  makeEntry,
  getItemId,
  update,
  remove,
  onBack,
  onSaved,
  onDeleted,
}: TableDetailProps<E>) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistEntries(nextEntries: RarityEntries<E>) {
    setError(null);
    try {
      const saved = await update(table.id, { entries: nextEntries });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that entry.');
    }
  }

  function updateRarity(rarity: Rarity, rows: E[]) {
    persistEntries({ ...table.entries, [rarity]: rows });
  }

  function addEntry(rarity: Rarity) {
    const firstItem = items[0];
    if (!firstItem) return;
    const rows = table.entries[rarity];
    const used = new Set(rows.map((r) => r.position));
    let position = 1;
    while (used.has(position) && position < RARITY_MAX[rarity]) position++;
    updateRarity(rarity, [...rows, makeEntry(position, firstItem.id)]);
  }

  function removeEntry(rarity: Rarity, index: number) {
    updateRarity(
      rarity,
      table.entries[rarity].filter((_, i) => i !== index)
    );
  }

  function updateEntryPosition(rarity: Rarity, index: number, position: number) {
    updateRarity(
      rarity,
      table.entries[rarity].map((r, i) => (i === index ? { ...r, position } : r))
    );
  }

  function updateEntryItem(rarity: Rarity, index: number, itemId: string) {
    updateRarity(
      rarity,
      table.entries[rarity].map((r, i) => (i === index ? makeEntry(r.position, itemId) : r))
    );
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${table.name}"? This can't be undone.`)) return;
    try {
      await remove(table.id);
      onDeleted(table.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Could not delete the ${itemLabel} Table.`);
    }
  }

  return (
    <div className="table-detail">
      <button type="button" className="table-detail__back" onClick={onBack}>
        &larr; All {itemLabel} Tables
      </button>

      {editing ? (
        <div className="table-detail__edit-panel">
          <SimpleNameDescriptionForm
            title={`${itemLabel} Table`}
            submitLabel="Save"
            initial={table}
            update={(id, body) => update(id, body)}
            onSaved={(saved) => {
              onSaved(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="table-detail__hero">
          <div className="table-detail__hero-actions">
            <button type="button" className="table-detail__hero-action" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="table-detail__hero-action table-detail__hero-action--danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
          <h1 className="table-detail__title">{table.name}</h1>
          {table.description && <p className="table-detail__description">{table.description}</p>}
        </div>
      )}

      {error && <p className="table-detail__status table-detail__status--error">{error}</p>}
      {items.length === 0 && (
        <p className="table-detail__status">
          No {itemLabel} records exist yet — create some on the Equipment page first, then come back to build this
          table.
        </p>
      )}

      {RARITIES.map((rarity) => (
        <div key={rarity} className="table-detail__rarity">
          <div className="table-detail__rarity-header">
            <h2 className="table-detail__rarity-title">{titleCaseEnum(rarity)}</h2>
            <span className="table-detail__rarity-hint">positions 1&ndash;{RARITY_MAX[rarity]}</span>
            <button
              type="button"
              className="table-detail__add-entry"
              onClick={() => addEntry(rarity)}
              disabled={items.length === 0}
            >
              + Add Entry
            </button>
          </div>

          {table.entries[rarity].length === 0 ? (
            <p className="table-detail__empty">No entries yet.</p>
          ) : (
            <div className="table-detail__entry-list">
              {table.entries[rarity]
                .map((entry, index) => ({ entry, index }))
                .sort((a, b) => a.entry.position - b.entry.position)
                .map(({ entry, index }) => (
                  <div key={index} className="table-detail__entry-row">
                    <input
                      type="number"
                      className="table-detail__position-input"
                      min={1}
                      max={RARITY_MAX[rarity]}
                      value={entry.position}
                      onChange={(e) => updateEntryPosition(rarity, index, Number(e.target.value))}
                      aria-label="Position"
                    />
                    <ItemPicker items={items} value={getItemId(entry)} onChange={(id) => updateEntryItem(rarity, index, id)} />
                    <button
                      type="button"
                      className="table-detail__remove-entry"
                      onClick={() => removeEntry(rarity, index)}
                      aria-label="Remove entry"
                    >
                      &times;
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
