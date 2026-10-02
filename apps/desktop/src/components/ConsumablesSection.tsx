import { useState } from 'react';
import { consumablesApi, type Consumable } from '../api/consumables';
import { useApiList, useEntityActions } from '../lib/useApiList';
import EquipmentSection from './EquipmentSection';
import SimpleNameDescriptionForm from './SimpleNameDescriptionForm';
import { NameDescriptionCard, dash } from './EquipmentCards';
import type { EquipmentTableColumn } from './EquipmentTable';
import type { EquipmentView } from '../lib/equipmentView';

const CONSUMABLE_COLUMNS: EquipmentTableColumn<Consumable>[] = [
  { key: 'name', label: 'Name', render: (c) => c.name, width: '1fr', emphasize: true },
  { key: 'description', label: 'Description', render: (c) => dash(c.description), width: '2.5fr' },
];

// Takes `consumables` for the same reason LootSection takes `loot` — the
// Consumable Table drill-in one level up needs consumables.items as its
// rollable-entry picker list.
export default function ConsumablesSection({
  consumables,
  view,
}: {
  consumables: ReturnType<typeof useApiList<Consumable>>;
  view: EquipmentView;
}) {
  const actions = useEntityActions(consumables, consumablesApi.remove, 'Consumable');
  const [creating, setCreating] = useState(false);
  const editingConsumable = actions.editingItem;

  return (
    <EquipmentSection<Consumable>
      title="Consumables"
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New Consumable
        </button>
      }
      createForm={
        creating && (
          <SimpleNameDescriptionForm
            title="Consumable"
            submitLabel="Create Consumable"
            create={consumablesApi.create}
            update={consumablesApi.update}
            onSaved={(saved) => {
              consumables.upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
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
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        )
      }
      loading={consumables.loading}
      error={consumables.error}
      items={consumables.items}
      getKey={(c) => c.id}
      emptyMessage="No Consumables yet — click + New Consumable above to create one."
      renderCard={(c) =>
        actions.editingId === c.id ? (
          <SimpleNameDescriptionForm
            title="Consumable"
            submitLabel="Create Consumable"
            initial={c}
            create={consumablesApi.create}
            update={consumablesApi.update}
            onSaved={(saved) => {
              consumables.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <NameDescriptionCard item={c} onEdit={actions.edit} onDelete={actions.handleDelete} />
        )
      }
      table={{
        view,
        columns: CONSUMABLE_COLUMNS,
        onEdit: (c) => actions.edit(c.id),
        onDelete: (c) => actions.handleDelete(c.id),
        editing: Boolean(editingConsumable),
      }}
    />
  );
}
