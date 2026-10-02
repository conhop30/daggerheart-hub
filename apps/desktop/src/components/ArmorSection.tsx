import { memo, useState } from 'react';
import { armorsApi, type Armor } from '../api/armors';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { useTagFilters, type FilterDimension } from '../lib/useTagFilters';
import { ContentCard, MetaChip } from './ContentCard';
import EquipmentSection from './EquipmentSection';
import ArmorForm from './ArmorForm';
import { dash } from './EquipmentCards';
import type { EquipmentTableColumn } from './EquipmentTable';
import type { EquipmentView } from '../lib/equipmentView';

const ARMOR_FILTERS: FilterDimension<Armor>[] = [{ key: 'tier', label: 'Tier', getValue: (a) => a.tier }];

const ARMOR_COLUMNS: EquipmentTableColumn<Armor>[] = [
  { key: 'name', label: 'Name', render: (a) => a.name, width: '1.4fr', emphasize: true },
  { key: 'tier', label: 'Tier', render: (a) => dash(a.tier), align: 'center', width: '0.6fr' },
  { key: 'baseScore', label: 'Base Score', render: (a) => dash(a.baseScore), align: 'center' },
  {
    key: 'thresholds',
    label: 'Thresholds',
    align: 'center',
    render: (a) => `${dash(a.thresholds.major)} / ${dash(a.thresholds.severe)}`,
  },
  { key: 'feature', label: 'Feature', render: (a) => dash(a.feature), width: '2fr' },
];

const ArmorCard = memo(function ArmorCard({
  a,
  onEdit,
  onDelete,
}: {
  a: Armor;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContentCard
      title={a.name}
      onEdit={() => onEdit(a.id)}
      onDelete={() => onDelete(a.id)}
      meta={
        <>
          <MetaChip label="Tier" value={a.tier} />
          <MetaChip label="Base Score" value={a.baseScore} />
          <MetaChip
            label="Thresholds"
            value={a.thresholds.major != null || a.thresholds.severe != null ? `${a.thresholds.major ?? '—'} / ${a.thresholds.severe ?? '—'}` : null}
          />
        </>
      }
    >
      {a.feature && <p className="content-card__description">{a.feature}</p>}
    </ContentCard>
  );
});

// Fully self-contained — same reasoning as WeaponsSection.
export default function ArmorSection({ view }: { view: EquipmentView }) {
  const armors = useApiList(armorsApi.list);
  const actions = useEntityActions(armors, armorsApi.remove, 'Armor');
  const filters = useTagFilters(armors.items, ARMOR_FILTERS);
  const [creatingArmor, setCreatingArmor] = useState(false);
  const editingArmor = actions.editingItem;

  return (
    <EquipmentSection<Armor>
      title="Armor"
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={() => setCreatingArmor(true)}>
          + New Armor
        </button>
      }
      createForm={
        creatingArmor && (
          <ArmorForm
            onSaved={(saved) => {
              armors.upsert(saved);
              setCreatingArmor(false);
            }}
            onCancel={() => setCreatingArmor(false)}
          />
        )
      }
      editForm={
        editingArmor && (
          <ArmorForm
            initial={editingArmor}
            onSaved={(saved) => {
              armors.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        )
      }
      loading={armors.loading}
      error={armors.error}
      items={filters.filtered}
      getKey={(a) => a.id}
      emptyMessage={filters.hasActiveFilters ? 'No Armor matches those filters.' : 'No Armor yet — click + New Armor above to create one.'}
      renderCard={(a) =>
        actions.editingId === a.id ? (
          <ArmorForm
            initial={a}
            onSaved={(saved) => {
              armors.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <ArmorCard a={a} onEdit={actions.edit} onDelete={actions.handleDelete} />
        )
      }
      table={{
        view,
        columns: ARMOR_COLUMNS,
        onEdit: (a) => actions.edit(a.id),
        onDelete: (a) => actions.handleDelete(a.id),
        editing: Boolean(editingArmor),
      }}
      filterBar={{
        dimensions: filters.dimensions,
        onToggle: filters.toggle,
        onClear: filters.clear,
        hasActiveFilters: filters.hasActiveFilters,
      }}
    />
  );
}
