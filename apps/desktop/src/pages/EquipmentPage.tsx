import { memo, useCallback, useState } from 'react';
import { weaponsApi, type Weapon, type WeaponSlot } from '../api/weapons';
import { armorsApi, type Armor } from '../api/armors';
import { lootApi, type Loot } from '../api/loot';
import { consumablesApi, type Consumable } from '../api/consumables';
import { lootTablesApi, type LootTable, type LootTableEntry } from '../api/lootTables';
import { consumableTablesApi, type ConsumableTable, type ConsumableTableEntry } from '../api/consumableTables';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, ContentCardList, MetaChip } from '../components/ContentCard';
import EquipmentSection from '../components/EquipmentSection';
import WeaponForm from '../components/WeaponForm';
import ArmorForm from '../components/ArmorForm';
import SimpleNameDescriptionForm from '../components/SimpleNameDescriptionForm';
import TableDetail from '../components/TableDetail';
import { RARITIES } from '../lib/lootRarity';
import { loadEquipmentView, saveEquipmentView, type EquipmentView } from '../lib/equipmentView';
import { useTagFilters, type FilterDimension } from '../lib/useTagFilters';
import TagFilterBar from '../components/TagFilterBar';
import EquipmentTable, { type EquipmentTableColumn } from '../components/EquipmentTable';
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

  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null);
  const [editingArmorId, setEditingArmorId] = useState<string | null>(null);
  const [editingLootId, setEditingLootId] = useState<string | null>(null);
  const [editingConsumableId, setEditingConsumableId] = useState<string | null>(null);
  const [creatingWeaponSlot, setCreatingWeaponSlot] = useState<WeaponSlot | null>(null);
  const [creatingArmor, setCreatingArmor] = useState(false);
  const [creatingLoot, setCreatingLoot] = useState(false);
  const [creatingConsumable, setCreatingConsumable] = useState(false);
  const [creatingLootTable, setCreatingLootTable] = useState(false);
  const [creatingConsumableTable, setCreatingConsumableTable] = useState(false);
  const [openLootTableId, setOpenLootTableId] = useState<string | null>(null);
  const [openConsumableTableId, setOpenConsumableTableId] = useState<string | null>(null);

  // Stabilized (useCallback) so list-item cards below can be memoized: an
  // inline `() => handleDeleteWeapon(w)` closure is a fresh function every
  // render regardless, which defeats React.memo on the card component no
  // matter what. These take an id and look the record up, so their own
  // identity only changes when the relevant list actually changes.
  const handleEditWeapon = useCallback((id: string) => setEditingWeaponId(id), []);
  const handleDeleteWeapon = useCallback(
    async (id: string) => {
      const w = weapons.items.find((x) => x.id === id);
      if (!w || !window.confirm(`Delete "${w.name}"? This can't be undone.`)) return;
      try {
        await weaponsApi.remove(w.id);
        weapons.remove(w.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Weapon.');
      }
    },
    [weapons.items]
  );

  const handleEditArmor = useCallback((id: string) => setEditingArmorId(id), []);
  const handleDeleteArmor = useCallback(
    async (id: string) => {
      const a = armors.items.find((x) => x.id === id);
      if (!a || !window.confirm(`Delete "${a.name}"? This can't be undone.`)) return;
      try {
        await armorsApi.remove(a.id);
        armors.remove(a.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Armor.');
      }
    },
    [armors.items]
  );

  const handleEditLoot = useCallback((id: string) => setEditingLootId(id), []);
  const handleDeleteLoot = useCallback(
    async (id: string) => {
      const l = loot.items.find((x) => x.id === id);
      if (!l || !window.confirm(`Delete "${l.name}"? This can't be undone.`)) return;
      try {
        await lootApi.remove(l.id);
        loot.remove(l.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Loot.');
      }
    },
    [loot.items]
  );

  const handleEditConsumable = useCallback((id: string) => setEditingConsumableId(id), []);
  const handleDeleteConsumable = useCallback(
    async (id: string) => {
      const c = consumables.items.find((x) => x.id === id);
      if (!c || !window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
      try {
        await consumablesApi.remove(c.id);
        consumables.remove(c.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Consumable.');
      }
    },
    [consumables.items]
  );

  const handleOpenLootTable = useCallback((id: string) => setOpenLootTableId(id), []);
  const handleDeleteLootTable = useCallback(
    async (id: string) => {
      const t = lootTables.items.find((x) => x.id === id);
      if (!t || !window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
      try {
        await lootTablesApi.remove(t.id);
        lootTables.remove(t.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Loot Table.');
      }
    },
    [lootTables.items]
  );

  const handleOpenConsumableTable = useCallback((id: string) => setOpenConsumableTableId(id), []);
  const handleDeleteConsumableTable = useCallback(
    async (id: string) => {
      const t = consumableTables.items.find((x) => x.id === id);
      if (!t || !window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
      try {
        await consumableTablesApi.remove(t.id);
        consumableTables.remove(t.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Consumable Table.');
      }
    },
    [consumableTables.items]
  );

  const openLootTable = openLootTableId ? lootTables.items.find((t) => t.id === openLootTableId) ?? null : null;
  const openConsumableTable = openConsumableTableId
    ? consumableTables.items.find((t) => t.id === openConsumableTableId) ?? null
    : null;

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
          onBack={() => setOpenLootTableId(null)}
          onSaved={(saved) => lootTables.upsert(saved)}
          onDeleted={(id) => {
            lootTables.remove(id);
            setOpenLootTableId(null);
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
          onBack={() => setOpenConsumableTableId(null)}
          onSaved={(saved) => consumableTables.upsert(saved)}
          onDeleted={(id) => {
            consumableTables.remove(id);
            setOpenConsumableTableId(null);
          }}
        />
      </div>
    );
  }

  const editingWeapon = weapons.items.find((w) => w.id === editingWeaponId) ?? null;
  const editingArmor = armors.items.find((a) => a.id === editingArmorId) ?? null;
  const editingLoot = loot.items.find((l) => l.id === editingLootId) ?? null;
  const editingConsumable = consumables.items.find((c) => c.id === editingConsumableId) ?? null;

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
                setEditingWeaponId(null);
              }}
              onCancel={() => setEditingWeaponId(null)}
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
          editingWeaponId === w.id ? (
            <WeaponForm
              weaponSlot={w.weaponSlot}
              initial={w}
              onSaved={(saved) => {
                weapons.upsert(saved);
                setEditingWeaponId(null);
              }}
              onCancel={() => setEditingWeaponId(null)}
            />
          ) : (
            <WeaponCard w={w} onEdit={handleEditWeapon} onDelete={handleDeleteWeapon} />
          )
        }
        table={{
          view,
          columns: WEAPON_COLUMNS,
          onEdit: (w) => handleEditWeapon(w.id),
          onDelete: (w) => handleDeleteWeapon(w.id),
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
                  setEditingArmorId(null);
                }}
                onCancel={() => setEditingArmorId(null)}
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
            editingArmorId === a.id ? (
              <ArmorForm
                initial={a}
                onSaved={(saved) => {
                  armors.upsert(saved);
                  setEditingArmorId(null);
                }}
                onCancel={() => setEditingArmorId(null)}
              />
            ) : (
              <ArmorCard a={a} onEdit={handleEditArmor} onDelete={handleDeleteArmor} />
            )
          }
          table={{
            view,
            columns: ARMOR_COLUMNS,
            onEdit: (a) => handleEditArmor(a.id),
            onDelete: (a) => handleDeleteArmor(a.id),
            editing: Boolean(editingArmor),
          }}
          filterBar={{
            dimensions: armorFilters.dimensions,
            onToggle: armorFilters.toggle,
            onClear: armorFilters.clear,
            hasActiveFilters: armorFilters.hasActiveFilters,
          }}
        />

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Loot</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingLoot(true)}>
            + New Loot
          </button>
        </div>
        {creatingLoot && (
          <div className="browse-page__inline-form">
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
          </div>
        )}
        {view === 'table' && editingLoot && (
          <div className="browse-page__inline-form">
            <SimpleNameDescriptionForm
              title="Loot"
              submitLabel="Create Loot"
              initial={editingLoot}
              create={lootApi.create}
              update={lootApi.update}
              onSaved={(saved) => {
                loot.upsert(saved);
                setEditingLootId(null);
              }}
              onCancel={() => setEditingLootId(null)}
            />
          </div>
        )}
        {loot.loading && <p className="browse-page__status">Loading Loot&hellip;</p>}
        {loot.error && <p className="browse-page__status browse-page__status--error">{loot.error}</p>}
        {!loot.loading &&
          !loot.error &&
          (view === 'cards' ? (
            <ContentCardList
              items={loot.items}
              emptyMessage="No Loot yet — click + New Loot above to create one."
              getKey={(l) => l.id}
              renderItem={(l) =>
                editingLootId === l.id ? (
                  <SimpleNameDescriptionForm
                    title="Loot"
                    submitLabel="Create Loot"
                    initial={l}
                    create={lootApi.create}
                    update={lootApi.update}
                    onSaved={(saved) => {
                      loot.upsert(saved);
                      setEditingLootId(null);
                    }}
                    onCancel={() => setEditingLootId(null)}
                  />
                ) : (
                  <NameDescriptionCard item={l} onEdit={handleEditLoot} onDelete={handleDeleteLoot} />
                )
              }
            />
          ) : (
            !editingLoot && (
              <EquipmentTable
                columns={LOOT_COLUMNS}
                items={loot.items}
                getKey={(l) => l.id}
                onEdit={(l) => handleEditLoot(l.id)}
                onDelete={(l) => handleDeleteLoot(l.id)}
                emptyMessage="No Loot yet — click + New Loot above to create one."
              />
            )
          ))}
      </div>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Consumables</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingConsumable(true)}>
            + New Consumable
          </button>
        </div>
        {creatingConsumable && (
          <div className="browse-page__inline-form">
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
          </div>
        )}
        {view === 'table' && editingConsumable && (
          <div className="browse-page__inline-form">
            <SimpleNameDescriptionForm
              title="Consumable"
              submitLabel="Create Consumable"
              initial={editingConsumable}
              create={consumablesApi.create}
              update={consumablesApi.update}
              onSaved={(saved) => {
                consumables.upsert(saved);
                setEditingConsumableId(null);
              }}
              onCancel={() => setEditingConsumableId(null)}
            />
          </div>
        )}
        {consumables.loading && <p className="browse-page__status">Loading Consumables&hellip;</p>}
        {consumables.error && <p className="browse-page__status browse-page__status--error">{consumables.error}</p>}
        {!consumables.loading &&
          !consumables.error &&
          (view === 'cards' ? (
            <ContentCardList
              items={consumables.items}
              emptyMessage="No Consumables yet — click + New Consumable above to create one."
              getKey={(c) => c.id}
              renderItem={(c) =>
                editingConsumableId === c.id ? (
                  <SimpleNameDescriptionForm
                    title="Consumable"
                    submitLabel="Create Consumable"
                    initial={c}
                    create={consumablesApi.create}
                    update={consumablesApi.update}
                    onSaved={(saved) => {
                      consumables.upsert(saved);
                      setEditingConsumableId(null);
                    }}
                    onCancel={() => setEditingConsumableId(null)}
                  />
                ) : (
                  <NameDescriptionCard item={c} onEdit={handleEditConsumable} onDelete={handleDeleteConsumable} />
                )
              }
            />
          ) : (
            !editingConsumable && (
              <EquipmentTable
                columns={CONSUMABLE_COLUMNS}
                items={consumables.items}
                getKey={(c) => c.id}
                onEdit={(c) => handleEditConsumable(c.id)}
                onDelete={(c) => handleDeleteConsumable(c.id)}
                emptyMessage="No Consumables yet — click + New Consumable above to create one."
              />
            )
          ))}
      </div>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Loot Tables</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingLootTable(true)}>
            + New Loot Table
          </button>
        </div>
        {creatingLootTable && (
          <div className="browse-page__inline-form">
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
          </div>
        )}
        {lootTables.loading && <p className="browse-page__status">Loading Loot Tables&hellip;</p>}
        {lootTables.error && <p className="browse-page__status browse-page__status--error">{lootTables.error}</p>}
        {!lootTables.loading && !lootTables.error && (
          <ContentCardList
            items={lootTables.items}
            emptyMessage="No Loot Tables yet — click + New Loot Table above, then open it to add rollable entries."
            getKey={(t) => t.id}
            renderItem={(t) => <TableCard table={t} onOpen={handleOpenLootTable} onDelete={handleDeleteLootTable} />}
          />
        )}
      </div>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Consumable Tables</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingConsumableTable(true)}>
            + New Consumable Table
          </button>
        </div>
        {creatingConsumableTable && (
          <div className="browse-page__inline-form">
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
          </div>
        )}
        {consumableTables.loading && <p className="browse-page__status">Loading Consumable Tables&hellip;</p>}
        {consumableTables.error && (
          <p className="browse-page__status browse-page__status--error">{consumableTables.error}</p>
        )}
        {!consumableTables.loading && !consumableTables.error && (
          <ContentCardList
            items={consumableTables.items}
            emptyMessage="No Consumable Tables yet — click + New Consumable Table above, then open it to add rollable entries."
            getKey={(t) => t.id}
            renderItem={(t) => (
              <TableCard table={t} onOpen={handleOpenConsumableTable} onDelete={handleDeleteConsumableTable} />
            )}
          />
        )}
      </div>
    </div>
  );
}
