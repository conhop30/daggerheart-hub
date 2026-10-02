import { memo, useState } from 'react';
import { weaponsApi, type Weapon, type WeaponSlot } from '../api/weapons';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { useTagFilters, type FilterDimension } from '../lib/useTagFilters';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, MetaChip } from './ContentCard';
import EquipmentSection from './EquipmentSection';
import WeaponForm from './WeaponForm';
import { dash } from './EquipmentCards';
import type { EquipmentTableColumn } from './EquipmentTable';
import type { EquipmentView } from '../lib/equipmentView';

const WEAPON_FILTERS: FilterDimension<Weapon>[] = [
  { key: 'tier', label: 'Tier', getValue: (w) => w.tier },
  { key: 'slot', label: 'Slot', getValue: (w) => w.weaponSlot, formatValue: titleCaseEnum },
  { key: 'burden', label: 'Burden', getValue: (w) => w.burden, formatValue: titleCaseEnum },
  { key: 'trait', label: 'Trait', getValue: (w) => w.trait, formatValue: titleCaseEnum },
  { key: 'damageType', label: 'Damage Type', getValue: (w) => w.damageType, formatValue: titleCaseEnum },
];

const WEAPON_COLUMNS: EquipmentTableColumn<Weapon>[] = [
  { key: 'name', label: 'Name', render: (w) => w.name, width: '1.4fr', emphasize: true },
  { key: 'slot', label: 'Slot', render: (w) => titleCaseEnum(w.weaponSlot) },
  { key: 'tier', label: 'Tier', render: (w) => dash(w.tier), align: 'center', width: '0.6fr' },
  { key: 'burden', label: 'Burden', render: (w) => titleCaseEnum(w.burden) },
  { key: 'damage', label: 'Damage', render: (w) => dash(w.damage), align: 'center' },
  { key: 'trait', label: 'Trait', render: (w) => dash(w.trait && titleCaseEnum(w.trait)) },
  { key: 'type', label: 'Type', render: (w) => dash(w.damageType && titleCaseEnum(w.damageType)) },
  { key: 'feature', label: 'Feature', render: (w) => dash(w.feature), width: '2fr' },
];

const WeaponCard = memo(function WeaponCard({
  w,
  onEdit,
  onDelete,
}: {
  w: Weapon;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContentCard
      title={w.name}
      onEdit={() => onEdit(w.id)}
      onDelete={() => onDelete(w.id)}
      meta={
        <>
          <MetaChip label="Slot" value={titleCaseEnum(w.weaponSlot)} />
          <MetaChip label="Tier" value={w.tier} />
          <MetaChip label="Burden" value={titleCaseEnum(w.burden)} />
          <MetaChip label="Damage" value={w.damage} />
          <MetaChip label="Trait" value={w.trait && titleCaseEnum(w.trait)} />
          <MetaChip label="Type" value={w.damageType && titleCaseEnum(w.damageType)} />
        </>
      }
    >
      {w.feature && <p className="content-card__description">{w.feature}</p>}
    </ContentCard>
  );
});

// Fully self-contained — nothing else on the Equipment page reads Weapon
// data or state, so it owns its own fetch/edit/delete/filter/creating state
// rather than taking any of it as props (unlike Loot/LootTable, which are
// cross-referenced from the page level).
export default function WeaponsSection({ view }: { view: EquipmentView }) {
  const weapons = useApiList(weaponsApi.list);
  const actions = useEntityActions(weapons, weaponsApi.remove, 'Weapon');
  const filters = useTagFilters(weapons.items, WEAPON_FILTERS);
  const [creatingSlot, setCreatingSlot] = useState<WeaponSlot | null>(null);
  const editingWeapon = actions.editingItem;

  return (
    <EquipmentSection<Weapon>
      title="Weapons"
      addButtons={
        <>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingSlot('PRIMARY')}>
            + New Primary
          </button>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingSlot('SECONDARY')}>
            + New Secondary
          </button>
        </>
      }
      createForm={
        creatingSlot && (
          <WeaponForm
            weaponSlot={creatingSlot}
            onSaved={(saved) => {
              weapons.upsert(saved);
              setCreatingSlot(null);
            }}
            onCancel={() => setCreatingSlot(null)}
          />
        )
      }
      editForm={
        editingWeapon && (
          <WeaponForm
            weaponSlot={editingWeapon.weaponSlot}
            initial={editingWeapon}
            onSaved={(saved) => {
              weapons.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        )
      }
      loading={weapons.loading}
      error={weapons.error}
      items={filters.filtered}
      getKey={(w) => w.id}
      emptyMessage={
        filters.hasActiveFilters
          ? 'No Weapons match those filters.'
          : 'No Weapons yet — click + New Primary or + New Secondary above to create one.'
      }
      renderCard={(w) =>
        actions.editingId === w.id ? (
          <WeaponForm
            weaponSlot={w.weaponSlot}
            initial={w}
            onSaved={(saved) => {
              weapons.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <WeaponCard w={w} onEdit={actions.edit} onDelete={actions.handleDelete} />
        )
      }
      table={{
        view,
        columns: WEAPON_COLUMNS,
        onEdit: (w) => actions.edit(w.id),
        onDelete: (w) => actions.handleDelete(w.id),
        editing: Boolean(editingWeapon),
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
