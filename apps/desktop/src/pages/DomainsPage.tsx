import { domainsApi, type Domain } from '../api/domains';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList } from '../components/ContentCard';
import './BrowsePage.css';

export default function DomainsPage() {
  const { items: domains, loading, error } = useApiList(domainsApi.list);

  return (
    <div className="browse-page">
      <h1 className="browse-page__title">Domains</h1>
      {loading && <p className="browse-page__status">Loading Domains&hellip;</p>}
      {error && <p className="browse-page__status browse-page__status--error">{error}</p>}
      {!loading && !error && (
        <ContentCardList
          items={domains}
          emptyMessage="No Domains yet — create one from Home first."
          getKey={(d: Domain) => d.id}
          renderItem={(d) => (
            <ContentCard title={d.name} accent={d.colorHex}>
              {d.description && <p className="content-card__description">{d.description}</p>}
            </ContentCard>
          )}
        />
      )}
    </div>
  );
}
