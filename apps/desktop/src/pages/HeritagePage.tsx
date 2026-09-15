import { communitiesApi, type Community } from '../api/communities';
import { ancestriesApi, type Ancestry } from '../api/ancestries';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList, FeatureLines } from '../components/ContentCard';
import './BrowsePage.css';

function NamedFeatureCard({ item }: { item: Community | Ancestry }) {
  return (
    <ContentCard title={item.name}>
      {item.description && <p className="content-card__description">{item.description}</p>}
      <FeatureLines features={item.features} />
    </ContentCard>
  );
}

export default function HeritagePage() {
  const communities = useApiList(communitiesApi.list);
  const ancestries = useApiList(ancestriesApi.list);

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
            renderItem={(c) => <NamedFeatureCard item={c} />}
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
            renderItem={(a) => <NamedFeatureCard item={a} />}
          />
        )}
      </div>
    </div>
  );
}
