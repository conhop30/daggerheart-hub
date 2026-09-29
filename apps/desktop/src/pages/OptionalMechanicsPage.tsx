import { useState } from 'react';
import { transformationsApi, type Transformation } from '../api/transformations';
import { useApiList } from '../lib/useApiList';
import { ContentCardList } from '../components/ContentCard';
import EntryCard from '../components/EntryCard';
import NamedFeatureForm from '../components/NamedFeatureForm';
import './BrowsePage.css';

export default function OptionalMechanicsPage() {
  const { items: transformations, loading, error, upsert, remove } = useApiList(transformationsApi.list);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleDelete(t: Transformation) {
    if (!window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    try {
      await transformationsApi.remove(t.id);
      remove(t.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Transformation.');
    }
  }

  return (
    <div className="browse-page">
      <div className="browse-page__header">
        <h1 className="browse-page__title">Optional Mechanics</h1>
        <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
          + New Transformation
        </button>
      </div>
      {creating && (
        <div className="browse-page__inline-form">
          <NamedFeatureForm
            title="Transformation"
            submitLabel="Create Transformation"
            create={transformationsApi.create}
            update={transformationsApi.update}
            onSaved={(saved) => {
              upsert(saved);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
      {loading && <p className="browse-page__status">Loading Transformations&hellip;</p>}
      {error && <p className="browse-page__status browse-page__status--error">{error}</p>}
      {!loading && !error && (
        <ContentCardList
          items={transformations}
          emptyMessage="No Transformations yet — click + New Transformation above to create one."
          getKey={(t) => t.id}
          renderItem={(t) =>
            editingId === t.id ? (
              <NamedFeatureForm
                title="Transformation"
                submitLabel="Create Transformation"
                initial={t}
                create={transformationsApi.create}
                update={transformationsApi.update}
                onSaved={(saved) => {
                  upsert(saved);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <EntryCard item={t} onEdit={() => setEditingId(t.id)} onDelete={() => handleDelete(t)} />
            )
          }
        />
      )}
    </div>
  );
}
