import type { ReactNode } from 'react';
import { ContentCardList } from './ContentCard';
import EquipmentTable, { type EquipmentTableColumn } from './EquipmentTable';
import TagFilterBar from './TagFilterBar';
import type { FilterDimensionState } from '../lib/useTagFilters';

interface EquipmentSectionTableProps<T> {
  view: 'cards' | 'table';
  columns: EquipmentTableColumn<T>[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  /** True while an inline edit form for one of these rows is open above the list — suppresses the table the same way the page used to guard it with `!editingX &&`. */
  editing: boolean;
}

interface EquipmentSectionFilterProps {
  dimensions: FilterDimensionState[];
  onToggle: (key: string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

interface EquipmentSectionProps<T extends { id: string }> {
  title: string;
  /** The "+ New X" button(s) — a section supplies its own since Weapon needs two (Primary/Secondary). */
  addButtons: ReactNode;
  /** Rendered above the list when creating a new item; omit/null when not creating. */
  createForm?: ReactNode;
  /** Rendered above the list in table view when editing an item inline; omit/null otherwise. Cards-view editing happens inline via renderCard instead. */
  editForm?: ReactNode;
  loading: boolean;
  error: string | null;
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  emptyMessage: string;
  /** Present only for the sections with a Cards/Table toggle (Weapon/Armor/Loot/Consumable) — omit for the two Table types, which are cards-only. */
  table?: EquipmentSectionTableProps<T>;
  /** Present only for the sections with a filter bar (Weapon/Armor). */
  filterBar?: EquipmentSectionFilterProps;
}

// The skeleton every Equipment section shares — header + add button(s),
// an optional inline create/edit form, loading/error states, an optional
// filter bar, and a Cards-vs-Table switch — factored out so each
// section in EquipmentPage becomes a thin call site instead of ~120 lines
// of copy-pasted structure. What genuinely differs per section (the form,
// the card, the table columns, whether filters/a table view even apply)
// stays as section-specific config passed in, rather than being forced into
// generic props it doesn't fit.
export default function EquipmentSection<T extends { id: string }>({
  title,
  addButtons,
  createForm,
  editForm,
  loading,
  error,
  items,
  getKey,
  renderCard,
  emptyMessage,
  table,
  filterBar,
}: EquipmentSectionProps<T>) {
  const showCards = !table || table.view === 'cards';

  return (
    <div className="browse-page__section">
      <div className="browse-page__section-header">
        <h2 className="browse-page__section-title">{title}</h2>
        <div className="browse-page__section-actions">{addButtons}</div>
      </div>
      {createForm && <div className="browse-page__inline-form">{createForm}</div>}
      {table && table.view === 'table' && editForm && <div className="browse-page__inline-form">{editForm}</div>}
      {loading && <p className="browse-page__status">Loading {title}&hellip;</p>}
      {error && <p className="browse-page__status browse-page__status--error">{error}</p>}
      {!loading && !error && filterBar && items.length > 0 && (
        <TagFilterBar
          dimensions={filterBar.dimensions}
          onToggle={filterBar.onToggle}
          onClear={filterBar.onClear}
          hasActiveFilters={filterBar.hasActiveFilters}
        />
      )}
      {!loading &&
        !error &&
        (showCards ? (
          <ContentCardList items={items} emptyMessage={emptyMessage} getKey={getKey} renderItem={renderCard} />
        ) : (
          table &&
          !table.editing && (
            <EquipmentTable
              columns={table.columns}
              items={items}
              getKey={getKey}
              onEdit={table.onEdit}
              onDelete={table.onDelete}
              emptyMessage={emptyMessage}
            />
          )
        ))}
    </div>
  );
}
