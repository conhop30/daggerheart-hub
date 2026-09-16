import type { Domain } from '../api/domains';
import './DomainBanner.css';

// Shared by the grid banner and DomainDetail's hero: a Domain's flat
// colorHex isn't reliable contrast backdrop for white text on its own (e.g.
// Bone's #C9B896 is a light tan) — darkening it toward black fixes that
// everywhere the color is used, not just here.
export function domainGradient(colorHex: string | null | undefined): string {
  const base = colorHex ?? 'var(--fear-dim)';
  return `linear-gradient(160deg, ${base}, rgba(0, 0, 0, 0.55))`;
}

interface DomainBannerProps {
  domain: Domain;
  cardCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// One Domain's clickable gallery tile — a gradient swatch of its own color,
// like ClassSpread's hero panel but sized for a grid instead of a full
// two-column spread.
export function DomainBanner({ domain, cardCount, onOpen, onEdit, onDelete }: DomainBannerProps) {
  return (
    <div className="domain-banner" style={{ background: domainGradient(domain.colorHex) }}>
      <button type="button" className="domain-banner__hit" onClick={onOpen} aria-label={`Open ${domain.name}`} />
      <div className="domain-banner__actions">
        <button
          type="button"
          className="domain-banner__action"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="domain-banner__action domain-banner__action--danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
      <div className="domain-banner__body">
        <h3 className="domain-banner__title">{domain.name}</h3>
        {domain.description && <p className="domain-banner__description">{domain.description}</p>}
        <span className="domain-banner__count">
          {cardCount} card{cardCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

// The hollow "+ Create Domain" tile — same footprint as a real banner, no
// fill, so it reads as an empty slot in the grid rather than another
// Domain.
export function DomainBannerCreate({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="domain-banner domain-banner--hollow" onClick={onClick}>
      <span className="domain-banner__hollow-plus">+</span>
      <span className="domain-banner__hollow-label">Create Domain</span>
    </button>
  );
}
