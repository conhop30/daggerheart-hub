import { useCallback, useEffect, useMemo, useState } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import { cardsApi, type Card } from '../api/cards';
import { DomainBanner, DomainBannerCreate } from '../components/DomainBanner';
import DomainDetail from '../components/DomainDetail';
import DomainForm from '../components/DomainForm';
import { upsertById } from '../lib/upsert';
import { useEntityActions } from '../lib/useApiList';
import './DomainsPage.css';

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [heroClasses, setHeroClasses] = useState<HeroClass[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classFilterId, setClassFilterId] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [creatingDomain, setCreatingDomain] = useState(false);

  function removeDomain(id: string) {
    setDomains((prev) => prev.filter((d) => d.id !== id));
  }
  const domainActions = useEntityActions({ items: domains, remove: removeDomain }, domainsApi.remove, 'Domain');

  useEffect(() => {
    let cancelled = false;
    Promise.all([domainsApi.list(), heroClassesApi.list(), cardsApi.list()])
      .then(([domainList, classList, cardList]) => {
        if (cancelled) return;
        setDomains(domainList);
        setHeroClasses(classList);
        setCards(cardList);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load Domains.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cardCountByDomain = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      counts.set(card.domainId, (counts.get(card.domainId) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const selectedClass = heroClasses.find((c) => c.id === classFilterId) ?? null;
  const visibleDomains = selectedClass
    ? domains.filter((d) => d.id === selectedClass.primaryDomainId || d.id === selectedClass.secondaryDomainId)
    : domains;

  const selectedDomain = domains.find((d) => d.id === selectedDomainId) ?? null;

  function handleDomainSaved(saved: Domain) {
    setDomains((prev) => upsertById(prev, saved));
    setCreatingDomain(false);
    domainActions.cancelEdit();
  }

  // Stabilized so DomainBanner (memoized) can actually skip re-rendering
  // siblings when only one banner's state changes — an inline
  // `() => handleOpenDomain(domain)` closure would defeat that regardless
  // of the memo, since it's a fresh function every render either way.
  const handleOpenDomain = useCallback((id: string) => setSelectedDomainId(id), []);

  function handleCardsChangedForDomain(domainId: string, cardsForDomain: Card[]) {
    setCards((prev) => [...prev.filter((c) => c.domainId !== domainId), ...cardsForDomain]);
  }

  if (selectedDomain) {
    return (
      <div className="domains-page">
        <DomainDetail
          domain={selectedDomain}
          onBack={() => setSelectedDomainId(null)}
          onDomainSaved={(updated) => setDomains((prev) => upsertById(prev, updated))}
          onDomainDeleted={(id) => {
            setDomains((prev) => prev.filter((d) => d.id !== id));
            setSelectedDomainId(null);
          }}
          onCardsChanged={handleCardsChangedForDomain}
        />
      </div>
    );
  }

  const editingDomain = domainActions.editingItem;

  return (
    <div className="domains-page">
      <div className="domains-page__header">
        <h1 className="domains-page__title">Domains</h1>
      </div>

      {loading && <p className="domains-page__status">Loading Domains&hellip;</p>}
      {error && <p className="domains-page__status domains-page__status--error">{error}</p>}

      {!loading && !error && (
        <>
          {heroClasses.length > 0 && (
            <div className="domains-page__filters">
              <button
                type="button"
                className={`domains-page__filter${classFilterId === null ? ' active' : ''}`}
                onClick={() => setClassFilterId(null)}
              >
                All Classes
              </button>
              {heroClasses.map((hc) => (
                <button
                  key={hc.id}
                  type="button"
                  className={`domains-page__filter${classFilterId === hc.id ? ' active' : ''}`}
                  onClick={() => setClassFilterId((prev) => (prev === hc.id ? null : hc.id))}
                >
                  {hc.name}
                </button>
              ))}
            </div>
          )}

          {(creatingDomain || editingDomain) && (
            <div className="domains-page__edit-panel">
              <DomainForm
                initial={editingDomain}
                onSaved={handleDomainSaved}
                onCancel={() => {
                  setCreatingDomain(false);
                  domainActions.cancelEdit();
                }}
              />
            </div>
          )}

          <div className="domain-grid">
            {visibleDomains.map((domain) => (
              <DomainBanner
                key={domain.id}
                domain={domain}
                cardCount={cardCountByDomain.get(domain.id) ?? 0}
                onOpen={handleOpenDomain}
                onEdit={domainActions.edit}
                onDelete={domainActions.handleDelete}
              />
            ))}
            <DomainBannerCreate onClick={() => setCreatingDomain(true)} />
          </div>
        </>
      )}
    </div>
  );
}
