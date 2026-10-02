import { useState } from 'react';
import { consumableTablesApi, type ConsumableTable } from '../api/consumableTables';
import type { useApiList, useEntityActions } from '../lib/useApiList';
import EquipmentSection from './EquipmentSection';
import SimpleNameDescriptionForm from './SimpleNameDescriptionForm';
import { TableCard } from './EquipmentCards';

// Same reasoning as LootTablesSection — `actions` is also needed one level
// up for the page-level Open-a-table routing decision.
export default function ConsumableTablesSection({
  consumableTables,
  actions,
}: {
  consumableTables: ReturnType<typeof useApiList<ConsumableTable>>;
  actions: ReturnType<typeof useEntityActions<ConsumableTable>>;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <EquipmentSection<ConsumableTable>
      title="Consumable Tables"
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New Consumable Table
        </button>
      }
      createForm={
        creating && (
          <SimpleNameDescriptionForm
            title="Consumable Table"
            submitLabel="Create Consumable Table"
            create={consumableTablesApi.create}
            update={consumableTablesApi.update}
            onSaved={(saved) => {
              consumableTables.upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        )
      }
      loading={consumableTables.loading}
      error={consumableTables.error}
      items={consumableTables.items}
      getKey={(t) => t.id}
      emptyMessage="No Consumable Tables yet — click + New Consumable Table above, then open it to add rollable entries."
      renderCard={(t) => <TableCard table={t} onOpen={actions.edit} onDelete={actions.handleDelete} />}
    />
  );
}
