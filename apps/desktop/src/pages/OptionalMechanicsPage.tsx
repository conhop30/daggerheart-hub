import { useState } from 'react';
import { transformationsApi, type Transformation } from '../api/transformations';
import { gameSetsApi } from '../api/gameSets';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList, FeatureLines } from '../components/ContentCard';
import NamedFeatureForm from '../components/NamedFeatureForm';
import './BrowsePage.css';

export default function OptionalMechanicsPage() {
  const { items: transformations, loading, error, upsert, remove } = useApiList(transformationsApi.list);
  const gameSets = useApiList(gameSetsApi.list);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      <h1 className="browse-page__title">Optional Mechanics</h1>
      {loading && <p className="browse-page__status">Loading Transformations&hellip;</p>}
      {error && <p className="browse-page__status browse-page__status--error">{error}</p>}
      {!loading && !error && (
        <ContentCardList
          items={transformations}
          emptyMessage="No Transformations yet — create one from Home first."
          getKey={(t) => t.id}
          renderItem={(t) =>
            editingId === t.id ? (
              <NamedFeatureForm
                title="Transformation"
                submitLabel="Create Transformation"
                gameSets={gameSets.items}
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
              <ContentCard title={t.name} onEdit={() => setEditingId(t.id)} onDelete={() => handleDelete(t)}>
                {t.description && <p className="content-card__description">{t.description}</p>}
                <FeatureLines features={t.features} />
              </ContentCard>
            )
          }
        />
      )}
    </div>
  );
}
