import { useState } from 'react';
import { lootApi } from '../api/loot';
import { consumablesApi } from '../api/consumables';
import { lootTablesApi, type LootTable, type LootTableEntry } from '../api/lootTables';
import { consumableTablesApi, type ConsumableTable, type ConsumableTableEntry } from '../api/consumableTables';
import { useApiList, useEntityActions } from '../lib/useApiList';
import WeaponsSection from '../components/WeaponsSection';
import ArmorSection from '../components/ArmorSection';
import LootSection from '../components/LootSection';
import ConsumablesSection from '../components/ConsumablesSection';
import LootTablesSection from '../components/LootTablesSection';
import ConsumableTablesSection from '../components/ConsumableTablesSection';
import TableDetail from '../components/TableDetail';
import { loadEquipmentView, saveEquipmentView, type EquipmentView } from '../lib/equipmentView';
import '../components/SegmentedToggle.css';
import './BrowsePage.css';

// Each entity type's own gallery/form/table wiring lives in its own
// Section component now (see src/components/*Section.tsx) — this page only
// keeps the state that's genuinely shared across sections: the Loot/
// Consumable lists a Table's rollable-entry picker needs, the LootTable/
// ConsumableTable actions a drill-in open needs to check, and the page-wide
// Cards/Condensed view toggle.
export default function EquipmentPage() {
  const loot = useApiList(lootApi.list);
  const consumables = useApiList(consumablesApi.list);
  const lootTables = useApiList(lootTablesApi.list);
  const consumableTables = useApiList(consumableTablesApi.list);

  const [view, setView] = useState<EquipmentView>(loadEquipmentView);
  function changeView(next: EquipmentView) {
    setView(next);
    saveEquipmentView(next);
  }

  // "editingId"/"edit" double as "which table is open"/"open it" — these
  // two sections don't inline-edit, they drill into TableDetail below.
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

      <WeaponsSection view={view} />
      <ArmorSection view={view} />
      <LootSection loot={loot} view={view} />
      <ConsumablesSection consumables={consumables} view={view} />
      <LootTablesSection lootTables={lootTables} actions={lootTableActions} />
      <ConsumableTablesSection consumableTables={consumableTables} actions={consumableTableActions} />
    </div>
  );
}
