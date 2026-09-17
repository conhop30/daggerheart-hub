import { useEffect, useState } from 'react';
import { cardsApi, type Card } from '../api/cards';
import { domainsApi, type Domain } from '../api/domains';
import DomainForm from './DomainForm';
import CardForm from './CardForm';
import { domainGradient } from './DomainBanner';
import DomainCardTile from './DomainCardTile';
import { upsertById } from '../lib/upsert';
import './DomainDetail.css';

interface DomainDetailProps {
  domain: Domain;
  onBack: () => void;
  onDomainSaved: (updated: Domain) => void;
  onDomainDeleted: (id: string) => void;
  /** Lets the grid's card-count badges stay accurate without a global refetch. */
  onCardsChanged: (domainId: string, cardsForDomain: Card[]) => void;
}

export default function DomainDetail({ domain, onBack, onDomainSaved, onDomainDeleted, onCardsChanged }: DomainDetailProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cardsApi
      .listByDomain(domain.id)
      .then((list) => {
        if (cancelled) return;
        setCards(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load Cards.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain.id]);

  function applyCards(next: Card[]) {
    setCards(next);
    onCardsChanged(domain.id, next);
  }

  function handleCardSaved(card: Card) {
    applyCards(upsertById(cards, card));
    setCreatingCard(false);
    setEditingCardId(null);
  }

  async function handleDeleteCard(card: Card) {
    if (!window.confirm(`Delete "${card.name}"? This can't be undone.`)) return;
    try {
      await cardsApi.remove(card.id);
      applyCards(cards.filter((c) => c.id !== card.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Card.');
    }
  }

  async function handleDeleteDomain() {
    if (!window.confirm(`Delete "${domain.name}"? This can't be undone.`)) return;
    try {
      await domainsApi.remove(domain.id);
      onDomainDeleted(domain.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Domain.');
    }
  }

  const sortedCards = [...cards].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));

  return (
    <div className="domain-detail">
      <button type="button" className="domain-detail__back" onClick={onBack}>
        &larr; All Domains
      </button>

      {editingDomain ? (
        <div className="domain-detail__edit-panel">
          <DomainForm
            initial={domain}
            onSaved={(saved) => {
              onDomainSaved(saved);
              setEditingDomain(false);
            }}
            onCancel={() => setEditingDomain(false)}
          />
        </div>
      ) : (
        <div className="domain-detail__hero" style={{ background: domainGradient(domain.colorHex) }}>
          <div className="domain-detail__hero-actions">
            <button type="button" className="domain-detail__hero-action" onClick={() => setEditingDomain(true)}>
              Edit Domain
            </button>
            <button
              type="button"
              className="domain-detail__hero-action domain-detail__hero-action--danger"
              onClick={handleDeleteDomain}
            >
              Delete Domain
            </button>
          </div>
          <h1 className="domain-detail__title">{domain.name}</h1>
          {domain.description && <p className="domain-detail__description">{domain.description}</p>}
        </div>
      )}

      {creatingCard && (
        <div className="domain-detail__card-form">
          <CardForm
            domainId={domain.id}
            defaultGameSetId={domain.gameSetId}
            onSaved={handleCardSaved}
            onCancel={() => setCreatingCard(false)}
          />
        </div>
      )}

      {loading && <p className="domain-detail__status">Loading Cards&hellip;</p>}
      {error && <p className="domain-detail__status domain-detail__status--error">{error}</p>}

      {!loading && !error && (
        <div className="domain-card-grid">
          {sortedCards.map((card) =>
            editingCardId === card.id ? (
              <div key={card.id} className="domain-card-grid__form">
                <CardForm
                  domainId={domain.id}
                  defaultGameSetId={domain.gameSetId}
                  initial={card}
                  onSaved={handleCardSaved}
                  onCancel={() => setEditingCardId(null)}
                />
              </div>
            ) : (
              <DomainCardTile
                key={card.id}
                card={card}
                domainName={domain.name}
                domainColor={domain.colorHex}
                onEdit={() => setEditingCardId(card.id)}
                onDelete={() => handleDeleteCard(card)}
              />
            )
          )}
          <button type="button" className="domain-card-grid__create" onClick={() => setCreatingCard(true)}>
            <span className="domain-card-grid__create-plus">+</span>
            <span className="domain-card-grid__create-label">New Card</span>
          </button>
        </div>
      )}
    </div>
  );
}
