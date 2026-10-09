import { useState } from 'react';
import type { Feature } from '../api/heroClasses';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { ContentCardList } from './ContentCard';
import EntryCard from './EntryCard';
import NamedFeatureForm from './NamedFeatureForm';

interface EntryRecord {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
  gameSetId: string;
}

interface EntrySectionProps<T extends EntryRecord> {
  /** Plural heading, e.g. "Communities". */
  title: string;
  /** Singular, for buttons and messages, e.g. "Community". */
  itemLabel: string;
  api: {
    list: () => Promise<T[]>;
    create: (body: { name: string; description?: string; features?: Feature[]; gameSetId: string }) => Promise<T>;
    update: (id: string, body: { name?: string; description?: string; features?: Feature[]; gameSetId?: string }) => Promise<T>;
    remove: (id: string) => Promise<unknown>;
  };
  /** A Set's id to show only that Set's entries, or 'all'. Owned by the page, since one filter covers every section on it. */
  setFilter: string;
}

// One heading's worth of Communities, Ancestries or Transformations: the
// "+ New" button, the inline create form, and a grid of EntryCards in
// alphabetical order. Heritage and Optional Mechanics are both built from
// nothing but these, which is what keeps the two pages laid out alike.
export default function EntrySection<T extends EntryRecord>({ title, itemLabel, api, setFilter }: EntrySectionProps<T>) {
  const list = useApiList(api.list);
  const actions = useEntityActions(list, api.remove, itemLabel);
  const [creating, setCreating] = useState(false);

  const shown = list.items
    .filter((item) => setFilter === 'all' || item.gameSetId === setFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="browse-page__section">
      <div className="browse-page__section-header">
        <h2 className="browse-page__section-title">{title}</h2>
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New {itemLabel}
        </button>
      </div>
      {creating && (
        <div className="browse-page__inline-form">
          <NamedFeatureForm
            title={itemLabel}
            submitLabel={`Create ${itemLabel}`}
            create={api.create}
            update={api.update}
            onSaved={(saved) => {
              list.upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
      {list.loading && <p className="browse-page__status">Loading {title}&hellip;</p>}
      {list.error && <p className="browse-page__status browse-page__status--error">{list.error}</p>}
      {!list.loading && !list.error && (
        <ContentCardList
          items={shown}
          emptyMessage={
            list.items.length === 0
              ? `No ${title} yet — click + New ${itemLabel} above to create one.`
              : `No ${title} in this Set.`
          }
          getKey={(item) => item.id}
          layout="grid"
          renderItem={(item) =>
            actions.editingId === item.id ? (
              <NamedFeatureForm
                title={itemLabel}
                submitLabel={`Create ${itemLabel}`}
                initial={item}
                create={api.create}
                update={api.update}
                onSaved={(saved) => {
                  list.upsert(saved);
                  actions.cancelEdit();
                }}
                onCancel={actions.cancelEdit}
              />
            ) : (
              <EntryCard item={item} onEdit={() => actions.edit(item.id)} onDelete={() => actions.handleDelete(item.id)} />
            )
          }
        />
      )}
    </div>
  );
}
