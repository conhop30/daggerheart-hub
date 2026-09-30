import type { Domain } from '../api/domains';
import { gradientForColor } from '../lib/color';
import './DomainBanner.css';

// Kept as a re-export so every existing `import { domainGradient } from
// './DomainBanner'` (DomainDetail, DomainCardTile) keeps working unchanged
// — the actual implementation now lives in lib/color.ts so CampaignBanner
// can share it too.
export const domainGradient = gradientForColor;

interface DomainBannerProps {
  domain: Domain;
  cardCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// One Domain's clickable row — book-spread layout: a color banner on the
// left, name and description on the right, like a codex entry rather than
// a boxed gallery tile. Hovering enlarges the banner and it's the whole
// row's click target; Edit/Delete sit off to the side, only visible on
// hover, and stop the click from also opening the Domain.
export function DomainBanner({ domain, cardCount, onOpen, onEdit, onDelete }: DomainBannerProps) {
  return (
    <div className="domain-banner">
      <button type="button" className="domain-banner__hit" onClick={onOpen} aria-label={`Open ${domain.name}`} />
      <div className="domain-banner__art" style={{ background: domainGradient(domain.colorHex) }} />
      <div className="domain-banner__body">
        <h3 className="domain-banner__title">{domain.name}</h3>
        {domain.description && <p className="domain-banner__description">{domain.description}</p>}
      </div>
      <div className="domain-banner__meta">
        <span className="domain-banner__count">
          {cardCount} card{cardCount === 1 ? '' : 's'}
        </span>
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
      </div>
    </div>
  );
}

// The hollow "+ Create Domain" row — same footprint as a real row, no
// banner, so it reads as an empty slot in the list rather than another
// Domain.
export function DomainBannerCreate({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="domain-banner domain-banner--hollow" onClick={onClick}>
      <span className="domain-banner__hollow-plus">+</span>
      <span className="domain-banner__hollow-label">Create Domain</span>
    </button>
  );
}
