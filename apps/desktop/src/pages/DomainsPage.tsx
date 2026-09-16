import { useEffect, useMemo, useState } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import { cardsApi, type Card } from '../api/cards';
import { DomainBanner, DomainBannerCreate } from '../components/DomainBanner';
import DomainDetail from '../components/DomainDetail';
import DomainForm from '../components/DomainForm';
import { upsertById } from '../lib/upsert';
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
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);

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
    setEditingDomainId(null);
  }

  async function handleDeleteDomain(domain: Domain) {
    if (!window.confirm(`Delete "${domain.name}"? This can't be undone.`)) return;
    try {
      await domainsApi.remove(domain.id);
      setDomains((prev) => prev.filter((d) => d.id !== domain.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Domain.');
    }
  }

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

  const editingDomain = editingDomainId ? domains.find((d) => d.id === editingDomainId) ?? null : null;

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
                  setEditingDomainId(null);
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
                onOpen={() => setSelectedDomainId(domain.id)}
                onEdit={() => setEditingDomainId(domain.id)}
                onDelete={() => handleDeleteDomain(domain)}
              />
            ))}
            <DomainBannerCreate onClick={() => setCreatingDomain(true)} />
          </div>
        </>
      )}
    </div>
  );
}
