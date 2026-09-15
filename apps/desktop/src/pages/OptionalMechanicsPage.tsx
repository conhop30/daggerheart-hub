import { transformationsApi } from '../api/transformations';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList, FeatureLines } from '../components/ContentCard';
import './BrowsePage.css';

export default function OptionalMechanicsPage() {
  const { items: transformations, loading, error } = useApiList(transformationsApi.list);

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
          renderItem={(t) => (
            <ContentCard title={t.name}>
              {t.description && <p className="content-card__description">{t.description}</p>}
              <FeatureLines features={t.features} />
            </ContentCard>
          )}
        />
      )}
    </div>
  );
}
