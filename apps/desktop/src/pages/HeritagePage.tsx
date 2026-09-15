import { useState } from 'react';
import { communitiesApi, type Community } from '../api/communities';
import { ancestriesApi, type Ancestry } from '../api/ancestries';
import { gameSetsApi } from '../api/gameSets';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList, FeatureLines } from '../components/ContentCard';
import NamedFeatureForm from '../components/NamedFeatureForm';
import './BrowsePage.css';

function NamedFeatureCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Community | Ancestry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ContentCard title={item.name} onEdit={onEdit} onDelete={onDelete}>
      {item.description && <p className="content-card__description">{item.description}</p>}
      <FeatureLines features={item.features} />
    </ContentCard>
  );
}

export default function HeritagePage() {
  const communities = useApiList(communitiesApi.list);
  const ancestries = useApiList(ancestriesApi.list);
  const gameSets = useApiList(gameSetsApi.list);
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  const [editingAncestryId, setEditingAncestryId] = useState<string | null>(null);

  async function handleDeleteCommunity(c: Community) {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await communitiesApi.remove(c.id);
      communities.remove(c.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Community.');
    }
  }

  async function handleDeleteAncestry(a: Ancestry) {
    if (!window.confirm(`Delete "${a.name}"? This can't be undone.`)) return;
    try {
      await ancestriesApi.remove(a.id);
      ancestries.remove(a.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Ancestry.');
    }
  }

  return (
    <div className="browse-page">
      <h1 className="browse-page__title">Heritage</h1>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Communities</h2>
        {communities.loading && <p className="browse-page__status">Loading Communities&hellip;</p>}
        {communities.error && <p className="browse-page__status browse-page__status--error">{communities.error}</p>}
        {!communities.loading && !communities.error && (
          <ContentCardList
            items={communities.items}
            emptyMessage="No Communities yet — create one from Home first."
            getKey={(c) => c.id}
            renderItem={(c) =>
              editingCommunityId === c.id ? (
                <NamedFeatureForm
                  title="Community"
                  submitLabel="Create Community"
                  gameSets={gameSets.items}
                  initial={c}
                  create={communitiesApi.create}
                  update={communitiesApi.update}
                  onSaved={(saved) => {
                    communities.upsert(saved);
                    setEditingCommunityId(null);
                  }}
                  onCancel={() => setEditingCommunityId(null)}
                />
              ) : (
                <NamedFeatureCard
                  item={c}
                  onEdit={() => setEditingCommunityId(c.id)}
                  onDelete={() => handleDeleteCommunity(c)}
                />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Ancestries</h2>
        {ancestries.loading && <p className="browse-page__status">Loading Ancestries&hellip;</p>}
        {ancestries.error && <p className="browse-page__status browse-page__status--error">{ancestries.error}</p>}
        {!ancestries.loading && !ancestries.error && (
          <ContentCardList
            items={ancestries.items}
            emptyMessage="No Ancestries yet — create one from Home first."
            getKey={(a) => a.id}
            renderItem={(a) =>
              editingAncestryId === a.id ? (
                <NamedFeatureForm
                  title="Ancestry"
                  submitLabel="Create Ancestry"
                  gameSets={gameSets.items}
                  initial={a}
                  create={ancestriesApi.create}
                  update={ancestriesApi.update}
                  onSaved={(saved) => {
                    ancestries.upsert(saved);
                    setEditingAncestryId(null);
                  }}
                  onCancel={() => setEditingAncestryId(null)}
                />
              ) : (
                <NamedFeatureCard
                  item={a}
                  onEdit={() => setEditingAncestryId(a.id)}
                  onDelete={() => handleDeleteAncestry(a)}
                />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
