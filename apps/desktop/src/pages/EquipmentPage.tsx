import { memo, useState } from 'react';
import { weaponsApi, type Weapon, type WeaponSlot } from '../api/weapons';
import { armorsApi, type Armor } from '../api/armors';
import { lootApi, type Loot } from '../api/loot';
import { consumablesApi, type Consumable } from '../api/consumables';
import { lootTablesApi, type LootTable, type LootTableEntry } from '../api/lootTables';
import { consumableTablesApi, type ConsumableTable, type ConsumableTableEntry } from '../api/consumableTables';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, MetaChip } from '../components/ContentCard';
import EquipmentSection from '../components/EquipmentSection';
import WeaponForm from '../components/WeaponForm';
import ArmorForm from '../components/ArmorForm';
import SimpleNameDescriptionForm from '../components/SimpleNameDescriptionForm';
import TableDetail from '../components/TableDetail';
import { RARITIES } from '../lib/lootRarity';
import { loadEquipmentView, saveEquipmentView, type EquipmentView } from '../lib/equipmentView';
import { useTagFilters, type FilterDimension } from '../lib/useTagFilters';
import type { EquipmentTableColumn } from '../components/EquipmentTable';
import '../components/ModeToggle.css';
import './BrowsePage.css';

// Matches MetaChip's own null/undefined/'' -> "no value" convention, so an
// unset field reads the same way in both views.
function dash(value: string | number | null | undefined): string | number {
  return value === null || value === undefined || value === '' ? '—' : value;
}

const WEAPON_FILTERS: FilterDimension<Weapon>[] = [
  { key: 'tier', label: 'Tier', getValue: (w) => w.tier },
  { key: 'slot', label: 'Slot', getValue: (w) => w.weaponSlot, formatValue: titleCaseEnum },
  { key: 'burden', label: 'Burden', getValue: (w) => w.burden, formatValue: titleCaseEnum },
  { key: 'trait', label: 'Trait', getValue: (w) => w.trait, formatValue: titleCaseEnum },
  { key: 'damageType', label: 'Damage Type', getValue: (w) => w.damageType, formatValue: titleCaseEnum },
];

const ARMOR_FILTERS: FilterDimension<Armor>[] = [{ key: 'tier', label: 'Tier', getValue: (a) => a.tier }];

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

const LOOT_COLUMNS: EquipmentTableColumn<Loot>[] = [
  { key: 'name', label: 'Name', render: (l) => l.name, width: '1fr', emphasize: true },
  { key: 'description', label: 'Description', render: (l) => dash(l.description), width: '2.5fr' },
];

const CONSUMABLE_COLUMNS: EquipmentTableColumn<Consumable>[] = [
  { key: 'name', label: 'Name', render: (c) => c.name, width: '1fr', emphasize: true },
  { key: 'description', label: 'Description', render: (c) => dash(c.description), width: '2.5fr' },
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

const NameDescriptionCard = memo(function NameDescriptionCard({
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

function totalEntries(entries: { COMMON: unknown[]; UNCOMMON: unknown[]; RARE: unknown[]; LEGENDARY: unknown[] }): number {
  return RARITIES.reduce((sum, rarity) => sum + entries[rarity].length, 0);
}

const TableCard = memo(function TableCard({
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

export default function EquipmentPage() {
  const weapons = useApiList(weaponsApi.list);
  const armors = useApiList(armorsApi.list);
  const loot = useApiList(lootApi.list);
  const consumables = useApiList(consumablesApi.list);
  const lootTables = useApiList(lootTablesApi.list);
  const consumableTables = useApiList(consumableTablesApi.list);

  const [view, setView] = useState<EquipmentView>(loadEquipmentView);
  function changeView(next: EquipmentView) {
    setView(next);
    saveEquipmentView(next);
  }

  const weaponFilters = useTagFilters(weapons.items, WEAPON_FILTERS);
  const armorFilters = useTagFilters(armors.items, ARMOR_FILTERS);

  const [creatingWeaponSlot, setCreatingWeaponSlot] = useState<WeaponSlot | null>(null);
  const [creatingArmor, setCreatingArmor] = useState(false);
  const [creatingLoot, setCreatingLoot] = useState(false);
  const [creatingConsumable, setCreatingConsumable] = useState(false);
  const [creatingLootTable, setCreatingLootTable] = useState(false);
  const [creatingConsumableTable, setCreatingConsumableTable] = useState(false);

  const weaponActions = useEntityActions(weapons, weaponsApi.remove, 'Weapon');
  const armorActions = useEntityActions(armors, armorsApi.remove, 'Armor');
  const lootActions = useEntityActions(loot, lootApi.remove, 'Loot');
  const consumableActions = useEntityActions(consumables, consumablesApi.remove, 'Consumable');
  // "editingId"/"edit" here double as "which table is open"/"open it" — the
  // table sections below don't inline-edit, they drill into TableDetail.
  const lootTableActions = useEntityActions(lootTables, lootTablesApi.remove, 'Loot Table');
  const consumableTableActions = useEntityActions(consumableTables, consumableTablesApi.remove, 'Consumable Table');

  const openLootTable = lootTableActions.editingItem;
  const openConsumableTable = consumableTableActions.editingItem;

  if (openLootTable) {
    return (
      <div className="browse-page">
        <TableDetail<LootTableEntry>
          table={openLootTable}
          items={loot.items}
          itemLabel="Loot"
          makeEntry={(position, itemId) => ({ position, lootId: itemId })}
          getItemId={(entry) => entry.lootId}
          update={(id, body) => lootTablesApi.update(id, body)}
          remove={(id) => lootTablesApi.remove(id)}
          onBack={lootTableActions.cancelEdit}
          onSaved={(saved) => lootTables.upsert(saved)}
          onDeleted={(id) => {
            lootTables.remove(id);
            lootTableActions.cancelEdit();
          }}
        />
      </div>
    );
  }

  if (openConsumableTable) {
    return (
      <div className="browse-page">
        <TableDetail<ConsumableTableEntry>
          table={openConsumableTable}
          items={consumables.items}
          itemLabel="Consumable"
          makeEntry={(position, itemId) => ({ position, consumableId: itemId })}
          getItemId={(entry) => entry.consumableId}
          update={(id, body) => consumableTablesApi.update(id, body)}
          remove={(id) => consumableTablesApi.remove(id)}
          onBack={consumableTableActions.cancelEdit}
          onSaved={(saved) => consumableTables.upsert(saved)}
          onDeleted={(id) => {
            consumableTables.remove(id);
            consumableTableActions.cancelEdit();
          }}
        />
      </div>
    );
  }

  const editingWeapon = weaponActions.editingItem;
  const editingArmor = armorActions.editingItem;
  const editingLoot = lootActions.editingItem;
  const editingConsumable = consumableActions.editingItem;

  return (
    <div className="browse-page">
      <div className="browse-page__header">
        <h1 className="browse-page__title">Equipment</h1>
        <div className="mode-toggle" role="group" aria-label="View">
          <button
            type="button"
            className={`mode-toggle__option${view === 'cards' ? ' mode-toggle__option--active' : ''}`}
            onClick={() => changeView('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={`mode-toggle__option${view === 'table' ? ' mode-toggle__option--active' : ''}`}
            onClick={() => changeView('table')}
          >
            Condensed
          </button>
        </div>
      </div>

      <EquipmentSection<Weapon>
        title="Weapons"
        addButtons={
          <>
            <button type="button" className="browse-page__add-button" onClick={() => setCreatingWeaponSlot('PRIMARY')}>
              + New Primary
            </button>
            <button type="button" className="browse-page__add-button" onClick={() => setCreatingWeaponSlot('SECONDARY')}>
              + New Secondary
            </button>
          </>
        }
        createForm={
          creatingWeaponSlot && (
            <WeaponForm
              weaponSlot={creatingWeaponSlot}
              onSaved={(saved) => {
                weapons.upsert(saved);
                setCreatingWeaponSlot(null);
              }}
              onCancel={() => setCreatingWeaponSlot(null)}
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
                weaponActions.cancelEdit();
              }}
              onCancel={weaponActions.cancelEdit}
            />
          )
        }
        loading={weapons.loading}
        error={weapons.error}
        items={weaponFilters.filtered}
        getKey={(w) => w.id}
        emptyMessage={
          weaponFilters.hasActiveFilters
            ? 'No Weapons match those filters.'
            : 'No Weapons yet — click + New Primary or + New Secondary above to create one.'
        }
        renderCard={(w) =>
          weaponActions.editingId === w.id ? (
            <WeaponForm
              weaponSlot={w.weaponSlot}
              initial={w}
              onSaved={(saved) => {
                weapons.upsert(saved);
                weaponActions.cancelEdit();
              }}
              onCancel={weaponActions.cancelEdit}
            />
          ) : (
            <WeaponCard w={w} onEdit={weaponActions.edit} onDelete={weaponActions.handleDelete} />
          )
        }
        table={{
          view,
          columns: WEAPON_COLUMNS,
          onEdit: (w) => weaponActions.edit(w.id),
          onDelete: (w) => weaponActions.handleDelete(w.id),
          editing: Boolean(editingWeapon),
        }}
        filterBar={{
          dimensions: weaponFilters.dimensions,
          onToggle: weaponFilters.toggle,
          onClear: weaponFilters.clear,
          hasActiveFilters: weaponFilters.hasActiveFilters,
        }}
      />

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
                  armorActions.cancelEdit();
                }}
                onCancel={armorActions.cancelEdit}
              />
            )
          }
          loading={armors.loading}
          error={armors.error}
          items={armorFilters.filtered}
          getKey={(a) => a.id}
          emptyMessage={
            armorFilters.hasActiveFilters ? 'No Armor matches those filters.' : 'No Armor yet — click + New Armor above to create one.'
          }
          renderCard={(a) =>
            armorActions.editingId === a.id ? (
              <ArmorForm
                initial={a}
                onSaved={(saved) => {
                  armors.upsert(saved);
                  armorActions.cancelEdit();
                }}
                onCancel={armorActions.cancelEdit}
              />
            ) : (
              <ArmorCard a={a} onEdit={armorActions.edit} onDelete={armorActions.handleDelete} />
            )
          }
          table={{
            view,
            columns: ARMOR_COLUMNS,
            onEdit: (a) => armorActions.edit(a.id),
            onDelete: (a) => armorActions.handleDelete(a.id),
            editing: Boolean(editingArmor),
          }}
          filterBar={{
            dimensions: armorFilters.dimensions,
            onToggle: armorFilters.toggle,
            onClear: armorFilters.clear,
            hasActiveFilters: armorFilters.hasActiveFilters,
          }}
        />

      <EquipmentSection<Loot>
        title="Loot"
        addButtons={
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingLoot(true)}>
            + New Loot
          </button>
        }
        createForm={
          creatingLoot && (
            <SimpleNameDescriptionForm
              title="Loot"
              submitLabel="Create Loot"
              create={lootApi.create}
              update={lootApi.update}
              onSaved={(saved) => {
                loot.upsert(saved);
                setCreatingLoot(false);
              }}
              onCancel={() => setCreatingLoot(false)}
            />
          )
        }
        editForm={
          editingLoot && (
            <SimpleNameDescriptionForm
              title="Loot"
              submitLabel="Create Loot"
              initial={editingLoot}
              create={lootApi.create}
              update={lootApi.update}
              onSaved={(saved) => {
                loot.upsert(saved);
                lootActions.cancelEdit();
              }}
              onCancel={lootActions.cancelEdit}
            />
          )
        }
        loading={loot.loading}
        error={loot.error}
        items={loot.items}
        getKey={(l) => l.id}
        emptyMessage="No Loot yet — click + New Loot above to create one."
        renderCard={(l) =>
          lootActions.editingId === l.id ? (
            <SimpleNameDescriptionForm
              title="Loot"
              submitLabel="Create Loot"
              initial={l}
              create={lootApi.create}
              update={lootApi.update}
              onSaved={(saved) => {
                loot.upsert(saved);
                lootActions.cancelEdit();
              }}
              onCancel={lootActions.cancelEdit}
            />
          ) : (
            <NameDescriptionCard item={l} onEdit={lootActions.edit} onDelete={lootActions.handleDelete} />
          )
        }
        table={{
          view,
          columns: LOOT_COLUMNS,
          onEdit: (l) => lootActions.edit(l.id),
          onDelete: (l) => lootActions.handleDelete(l.id),
          editing: Boolean(editingLoot),
        }}
      />

      <EquipmentSection<Consumable>
        title="Consumables"
        addButtons={
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingConsumable(true)}>
            + New Consumable
          </button>
        }
        createForm={
          creatingConsumable && (
            <SimpleNameDescriptionForm
              title="Consumable"
              submitLabel="Create Consumable"
              create={consumablesApi.create}
              update={consumablesApi.update}
              onSaved={(saved) => {
                consumables.upsert(saved);
                setCreatingConsumable(false);
              }}
              onCancel={() => setCreatingConsumable(false)}
            />
          )
        }
        editForm={
          editingConsumable && (
            <SimpleNameDescriptionForm
              title="Consumable"
              submitLabel="Create Consumable"
              initial={editingConsumable}
              create={consumablesApi.create}
              update={consumablesApi.update}
              onSaved={(saved) => {
                consumables.upsert(saved);
                consumableActions.cancelEdit();
              }}
              onCancel={consumableActions.cancelEdit}
            />
          )
        }
        loading={consumables.loading}
        error={consumables.error}
        items={consumables.items}
        getKey={(c) => c.id}
        emptyMessage="No Consumables yet — click + New Consumable above to create one."
        renderCard={(c) =>
          consumableActions.editingId === c.id ? (
            <SimpleNameDescriptionForm
              title="Consumable"
              submitLabel="Create Consumable"
              initial={c}
              create={consumablesApi.create}
              update={consumablesApi.update}
              onSaved={(saved) => {
                consumables.upsert(saved);
                consumableActions.cancelEdit();
              }}
              onCancel={consumableActions.cancelEdit}
            />
          ) : (
            <NameDescriptionCard item={c} onEdit={consumableActions.edit} onDelete={consumableActions.handleDelete} />
          )
        }
        table={{
          view,
          columns: CONSUMABLE_COLUMNS,
          onEdit: (c) => consumableActions.edit(c.id),
          onDelete: (c) => consumableActions.handleDelete(c.id),
          editing: Boolean(editingConsumable),
        }}
      />

      <EquipmentSection<LootTable>
        title="Loot Tables"
        addButtons={
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingLootTable(true)}>
            + New Loot Table
          </button>
        }
        createForm={
          creatingLootTable && (
            <SimpleNameDescriptionForm
              title="Loot Table"
              submitLabel="Create Loot Table"
              create={lootTablesApi.create}
              update={lootTablesApi.update}
              onSaved={(saved) => {
                lootTables.upsert(saved);
                setCreatingLootTable(false);
              }}
              onCancel={() => setCreatingLootTable(false)}
            />
          )
        }
        loading={lootTables.loading}
        error={lootTables.error}
        items={lootTables.items}
        getKey={(t) => t.id}
        emptyMessage="No Loot Tables yet — click + New Loot Table above, then open it to add rollable entries."
        renderCard={(t) => <TableCard table={t} onOpen={lootTableActions.edit} onDelete={lootTableActions.handleDelete} />}
      />

      <EquipmentSection<ConsumableTable>
        title="Consumable Tables"
        addButtons={
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingConsumableTable(true)}>
            + New Consumable Table
          </button>
        }
        createForm={
          creatingConsumableTable && (
            <SimpleNameDescriptionForm
              title="Consumable Table"
              submitLabel="Create Consumable Table"
              create={consumableTablesApi.create}
              update={consumableTablesApi.update}
              onSaved={(saved) => {
                consumableTables.upsert(saved);
                setCreatingConsumableTable(false);
              }}
              onCancel={() => setCreatingConsumableTable(false)}
            />
          )
        }
        loading={consumableTables.loading}
        error={consumableTables.error}
        items={consumableTables.items}
        getKey={(t) => t.id}
        emptyMessage="No Consumable Tables yet — click + New Consumable Table above, then open it to add rollable entries."
        renderCard={(t) => (
          <TableCard table={t} onOpen={consumableTableActions.edit} onDelete={consumableTableActions.handleDelete} />
        )}
      />
    </div>
  );
}
