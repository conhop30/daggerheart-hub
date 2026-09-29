import type { ReactNode } from 'react';
import './EquipmentTable.css';

export interface EquipmentTableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Widens/narrows the column relative to the others — passed straight through as a CSS grid track. */
  width?: string;
}

interface EquipmentTableProps<T> {
  columns: EquipmentTableColumn<T>[];
  items: T[];
  getKey: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  emptyMessage: string;
}

// A dense reference table styled after the corebook's own equipment tables
// — a real "table of contents" scan, not a grid of cards. Used as the
// condensed alternative view for Weapons/Armor/Loot/Consumables.
export default function EquipmentTable<T>({
  columns,
  items,
  getKey,
  onEdit,
  onDelete,
  emptyMessage,
}: EquipmentTableProps<T>) {
  if (items.length === 0) {
    return <p className="browse-page__status">{emptyMessage}</p>;
  }

  const gridTemplate = [...columns.map((c) => c.width ?? '1fr'), 'auto'].join(' ');

  return (
    <div className="equipment-table" role="table" style={{ gridTemplateColumns: gridTemplate }}>
      <div className="equipment-table__row equipment-table__row--head" role="row">
        {columns.map((col) => (
          <span
            key={col.key}
            role="columnheader"
            className={`equipment-table__cell equipment-table__cell--head equipment-table__cell--${col.align ?? 'left'}`}
          >
            {col.label}
          </span>
        ))}
        <span className="equipment-table__cell equipment-table__cell--head" aria-hidden="true" />
      </div>
      {items.map((item) => (
        <div className="equipment-table__row" role="row" key={getKey(item)}>
          {columns.map((col) => (
            <span
              key={col.key}
              role="cell"
              className={`equipment-table__cell equipment-table__cell--${col.align ?? 'left'}`}
            >
              {col.render(item)}
            </span>
          ))}
          <span className="equipment-table__cell equipment-table__actions" role="cell">
            <button type="button" onClick={() => onEdit(item)} aria-label="Edit">
              Edit
            </button>
            <button type="button" onClick={() => onDelete(item)} aria-label="Delete">
              &times;
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
