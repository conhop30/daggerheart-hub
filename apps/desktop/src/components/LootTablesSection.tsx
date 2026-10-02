import { useState } from 'react';
import { lootTablesApi, type LootTable } from '../api/lootTables';
import type { useApiList, useEntityActions } from '../lib/useApiList';
import EquipmentSection from './EquipmentSection';
import SimpleNameDescriptionForm from './SimpleNameDescriptionForm';
import { TableCard } from './EquipmentCards';

// Takes both `lootTables` and `actions` (unlike Weapons/Armor's full self-
// containment) because EquipmentPage needs `actions.editingItem` itself —
// opening a Loot Table swaps the whole page over to TableDetail, a
// page-level routing decision this section can't own on its own.
export default function LootTablesSection({
  lootTables,
  actions,
}: {
  lootTables: ReturnType<typeof useApiList<LootTable>>;
  actions: ReturnType<typeof useEntityActions<LootTable>>;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <EquipmentSection<LootTable>
      title="Loot Tables"
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New Loot Table
        </button>
      }
      createForm={
        creating && (
          <SimpleNameDescriptionForm
            title="Loot Table"
            submitLabel="Create Loot Table"
            create={lootTablesApi.create}
            update={lootTablesApi.update}
            onSaved={(saved) => {
              lootTables.upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        )
      }
      loading={lootTables.loading}
      error={lootTables.error}
      items={lootTables.items}
      getKey={(t) => t.id}
      emptyMessage="No Loot Tables yet — click + New Loot Table above, then open it to add rollable entries."
      renderCard={(t) => <TableCard table={t} onOpen={actions.edit} onDelete={actions.handleDelete} />}
    />
  );
}
