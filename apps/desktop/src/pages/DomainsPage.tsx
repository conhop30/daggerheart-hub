import { useState } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import { gameSetsApi } from '../api/gameSets';
import { useApiList } from '../lib/useApiList';
import { ContentCard, ContentCardList } from '../components/ContentCard';
import DomainForm from '../components/DomainForm';
import './BrowsePage.css';

export default function DomainsPage() {
  const { items: domains, loading, error, upsert, remove } = useApiList(domainsApi.list);
  const gameSets = useApiList(gameSetsApi.list);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleDelete(domain: Domain) {
    if (!window.confirm(`Delete "${domain.name}"? This can't be undone.`)) return;
    try {
      await domainsApi.remove(domain.id);
      remove(domain.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Domain.');
    }
  }

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
          renderItem={(d) =>
            editingId === d.id ? (
              <DomainForm
                gameSets={gameSets.items}
                initial={d}
                onSaved={(saved) => {
                  upsert(saved);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ContentCard
                title={d.name}
                accent={d.colorHex}
                onEdit={() => setEditingId(d.id)}
                onDelete={() => handleDelete(d)}
              >
                {d.description && <p className="content-card__description">{d.description}</p>}
              </ContentCard>
            )
          }
        />
      )}
    </div>
  );
}
