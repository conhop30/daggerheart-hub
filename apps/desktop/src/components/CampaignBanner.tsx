import type { Campaign } from '../api/campaigns';
import { gradientForColor } from '../lib/color';
import './CampaignBanner.css';

interface CampaignBannerProps {
  campaign: Campaign;
  partyNames: string[];
  sessionCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// The Campaigns gallery tile — same gradient-swatch treatment as
// DomainBanner (see lib/color.ts), sized for a grid of Campaigns instead of
// Domains.
// Most names that fit on the tile before the rest collapse to "+N more".
const MAX_NAMES = 4;

export function CampaignBanner({ campaign, partyNames, sessionCount, onOpen, onEdit, onDelete }: CampaignBannerProps) {
  const shown = partyNames.slice(0, MAX_NAMES);
  const extra = partyNames.length - shown.length;
  return (
    <div className="campaign-banner" style={{ background: gradientForColor(campaign.colorHex) }}>
      <button
        type="button"
        className="campaign-banner__hit"
        onClick={onOpen}
        aria-label={`Open ${campaign.name}`}
      />
      <div className="campaign-banner__actions">
        <button
          type="button"
          className="campaign-banner__action"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="campaign-banner__action campaign-banner__action--danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
      <div className="campaign-banner__body">
        <span className="campaign-banner__level">Level {campaign.level}</span>
        <h3 className="campaign-banner__title">{campaign.name}</h3>
        {campaign.notes && <p className="campaign-banner__notes">{campaign.notes}</p>}
        <p className="campaign-banner__party">
          {shown.length > 0 ? `${shown.join(', ')}${extra > 0 ? ` +${extra} more` : ''}` : 'No party yet'}
        </p>
        <span className="campaign-banner__count">
          {sessionCount} session{sessionCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

// The hollow "+ Create Campaign" tile — same footprint as a real banner, no
// fill, so it reads as an empty slot in the grid.
export function CampaignBannerCreate({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="campaign-banner campaign-banner--hollow" onClick={onClick}>
      <span className="campaign-banner__hollow-plus">+</span>
      <span className="campaign-banner__hollow-label">Create Campaign</span>
    </button>
  );
}
