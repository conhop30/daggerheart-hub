import { useState } from 'react';
import { useGameSets } from '../context/GameSetsContext';
import QuantityStepper from './QuantityStepper';
import './ItemPicker.css';

interface PickableItem {
  id: string;
  name: string;
  gameSetId: string;
}

interface ItemPickerProps {
  items: PickableItem[];
  value: string | null;
  onChange: (id: string) => void;
  /** Adds a "- n +" stepper next to the search box when present — the Adversary picker uses this to pull in several copies at once; the Environment picker (which shares this component) omits it and renders unchanged. */
  quantity?: { value: number; onChange: (value: number) => void; max?: number };
}

// A searchable list, not a native <select> — a Loot/Consumable Table can
// reference items across every Game Set at once (Core plus however much
// homebrew is loaded), and a flat dropdown doesn't scale past a handful of
// options. Reused by the Loot/Consumable Table entry editor now; the
// Session Builder's Adversary/Environment pull-in (Phase 3) will reuse it
// too.
export default function ItemPicker({ items, value, onChange, quantity }: ItemPickerProps) {
  const { gameSets } = useGameSets();
  const [query, setQuery] = useState('');

  function gameSetName(gameSetId: string): string {
    return gameSets.find((g) => g.id === gameSetId)?.name ?? 'Unknown Set';
  }

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? items.filter((item) => item.name.toLowerCase().includes(trimmed)) : items;
  const selected = items.find((item) => item.id === value) ?? null;

  return (
    <div className="item-picker">
      <div className="item-picker__header">
        <input
          type="text"
          className="item-picker__search"
          placeholder={selected ? selected.name : 'Search…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {quantity && <QuantityStepper value={quantity.value} onChange={quantity.onChange} max={quantity.max} />}
      </div>
      <div className="item-picker__list">
        {filtered.length === 0 && <p className="item-picker__empty">No matches.</p>}
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`item-picker__option${item.id === value ? ' item-picker__option--selected' : ''}`}
            onClick={() => {
              onChange(item.id);
              setQuery('');
            }}
          >
            <span className="item-picker__option-name">{item.name}</span>
            <span className="item-picker__option-set">{gameSetName(item.gameSetId)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
