import { useState } from 'react';
import { communitiesApi } from '../api/communities';
import { ancestriesApi } from '../api/ancestries';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { ContentCardList } from '../components/ContentCard';
import EntryCard from '../components/EntryCard';
import NamedFeatureForm from '../components/NamedFeatureForm';
import './BrowsePage.css';

export default function HeritagePage() {
  const communities = useApiList(communitiesApi.list);
  const ancestries = useApiList(ancestriesApi.list);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [creatingAncestry, setCreatingAncestry] = useState(false);

  const communityActions = useEntityActions(communities, communitiesApi.remove, 'Community');
  const ancestryActions = useEntityActions(ancestries, ancestriesApi.remove, 'Ancestry');

  return (
    <div className="browse-page">
      <h1 className="browse-page__title">Heritage</h1>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Communities</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingCommunity(true)}>
            + New Community
          </button>
        </div>
        {creatingCommunity && (
          <div className="browse-page__inline-form">
            <NamedFeatureForm
              title="Community"
              submitLabel="Create Community"
              create={communitiesApi.create}
              update={communitiesApi.update}
              onSaved={(saved) => {
                communities.upsert(saved);
                setCreatingCommunity(false);
              }}
              onCancel={() => setCreatingCommunity(false)}
            />
          </div>
        )}
        {communities.loading && <p className="browse-page__status">Loading Communities&hellip;</p>}
        {communities.error && <p className="browse-page__status browse-page__status--error">{communities.error}</p>}
        {!communities.loading && !communities.error && (
          <ContentCardList
            items={communities.items}
            emptyMessage="No Communities yet — click + New Community above to create one."
            getKey={(c) => c.id}
            layout="grid"
            renderItem={(c) =>
              communityActions.editingId === c.id ? (
                <NamedFeatureForm
                  title="Community"
                  submitLabel="Create Community"
                  initial={c}
                  create={communitiesApi.create}
                  update={communitiesApi.update}
                  onSaved={(saved) => {
                    communities.upsert(saved);
                    communityActions.cancelEdit();
                  }}
                  onCancel={communityActions.cancelEdit}
                />
              ) : (
                <EntryCard
                  item={c}
                  onEdit={() => communityActions.edit(c.id)}
                  onDelete={() => communityActions.handleDelete(c.id)}
                />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Ancestries</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingAncestry(true)}>
            + New Ancestry
          </button>
        </div>
        {creatingAncestry && (
          <div className="browse-page__inline-form">
            <NamedFeatureForm
              title="Ancestry"
              submitLabel="Create Ancestry"
              create={ancestriesApi.create}
              update={ancestriesApi.update}
              onSaved={(saved) => {
                ancestries.upsert(saved);
                setCreatingAncestry(false);
              }}
              onCancel={() => setCreatingAncestry(false)}
            />
          </div>
        )}
        {ancestries.loading && <p className="browse-page__status">Loading Ancestries&hellip;</p>}
        {ancestries.error && <p className="browse-page__status browse-page__status--error">{ancestries.error}</p>}
        {!ancestries.loading && !ancestries.error && (
          <ContentCardList
            items={ancestries.items}
            emptyMessage="No Ancestries yet — click + New Ancestry above to create one."
            getKey={(a) => a.id}
            layout="grid"
            renderItem={(a) =>
              ancestryActions.editingId === a.id ? (
                <NamedFeatureForm
                  title="Ancestry"
                  submitLabel="Create Ancestry"
                  initial={a}
                  create={ancestriesApi.create}
                  update={ancestriesApi.update}
                  onSaved={(saved) => {
                    ancestries.upsert(saved);
                    ancestryActions.cancelEdit();
                  }}
                  onCancel={ancestryActions.cancelEdit}
                />
              ) : (
                <EntryCard
                  item={a}
                  onEdit={() => ancestryActions.edit(a.id)}
                  onDelete={() => ancestryActions.handleDelete(a.id)}
                />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
