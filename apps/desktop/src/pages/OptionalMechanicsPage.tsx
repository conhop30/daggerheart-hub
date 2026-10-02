import { useState } from 'react';
import { transformationsApi } from '../api/transformations';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { ContentCardList } from '../components/ContentCard';
import EntryCard from '../components/EntryCard';
import NamedFeatureForm from '../components/NamedFeatureForm';
import './BrowsePage.css';

export default function OptionalMechanicsPage() {
  const list = useApiList(transformationsApi.list);
  const { items: transformations, loading, error, upsert } = list;
  const [creating, setCreating] = useState(false);

  const actions = useEntityActions(list, transformationsApi.remove, 'Transformation');

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
            actions.editingId === t.id ? (
              <NamedFeatureForm
                title="Transformation"
                submitLabel="Create Transformation"
                initial={t}
                create={transformationsApi.create}
                update={transformationsApi.update}
                onSaved={(saved) => {
                  upsert(saved);
                  actions.cancelEdit();
                }}
                onCancel={actions.cancelEdit}
              />
            ) : (
              <EntryCard item={t} onEdit={() => actions.edit(t.id)} onDelete={() => actions.handleDelete(t.id)} />
            )
          }
        />
      )}
    </div>
  );
}
