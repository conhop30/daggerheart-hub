import { useState } from 'react';
import { lootApi, type Loot } from '../api/loot';
import { useApiList, useEntityActions } from '../lib/useApiList';
import EquipmentSection from './EquipmentSection';
import SimpleNameDescriptionForm from './SimpleNameDescriptionForm';
import { NameDescriptionCard, dash } from './EquipmentCards';
import type { EquipmentTableColumn } from './EquipmentTable';
import type { EquipmentView } from '../lib/equipmentView';

const LOOT_COLUMNS: EquipmentTableColumn<Loot>[] = [
  { key: 'name', label: 'Name', render: (l) => l.name, width: '1fr', emphasize: true },
  { key: 'description', label: 'Description', render: (l) => dash(l.description), width: '2.5fr' },
];

// Takes `loot` (not self-contained like Weapons/Armor) because the Loot
// Table drill-in rendered one level up (EquipmentPage) needs loot.items as
// its rollable-entry picker list — that cross-section dependency is the
// one real reason this section's data has to live above it.
export default function LootSection({ loot, view }: { loot: ReturnType<typeof useApiList<Loot>>; view: EquipmentView }) {
  const actions = useEntityActions(loot, lootApi.remove, 'Loot');
  const [creating, setCreating] = useState(false);
  const editingLoot = actions.editingItem;

  return (
    <EquipmentSection<Loot>
      title="Loot"
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New Loot
        </button>
      }
      createForm={
        creating && (
          <SimpleNameDescriptionForm
            title="Loot"
            submitLabel="Create Loot"
            create={lootApi.create}
            update={lootApi.update}
            onSaved={(saved) => {
              loot.upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
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
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        )
      }
      loading={loot.loading}
      error={loot.error}
      items={loot.items}
      getKey={(l) => l.id}
      emptyMessage="No Loot yet — click + New Loot above to create one."
      renderCard={(l) =>
        actions.editingId === l.id ? (
          <SimpleNameDescriptionForm
            title="Loot"
            submitLabel="Create Loot"
            initial={l}
            create={lootApi.create}
            update={lootApi.update}
            onSaved={(saved) => {
              loot.upsert(saved);
              actions.cancelEdit();
            }}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <NameDescriptionCard item={l} onEdit={actions.edit} onDelete={actions.handleDelete} />
        )
      }
      table={{
        view,
        columns: LOOT_COLUMNS,
        onEdit: (l) => actions.edit(l.id),
        onDelete: (l) => actions.handleDelete(l.id),
        editing: Boolean(editingLoot),
      }}
    />
  );
}
