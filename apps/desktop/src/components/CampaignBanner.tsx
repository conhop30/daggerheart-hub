import { memo } from 'react';
import type { Campaign } from '../api/campaigns';
import { gradientForColor } from '../lib/color';
import './CampaignBanner.css';

interface CampaignBannerProps {
  campaign: Campaign;
  partyNames: string[];
  sessionCount: number;
  onOpen: (id: string) => void;
}

// The Campaigns gallery row — one full-width row per Campaign instead of a
// grid tile, so there's room for an optional cover image: right-aligned,
// fading into the row's own background so the text never fights it for
// legibility. No Edit/Delete here anymore — CampaignDetail (once you've
// opened it) owns those; this row's only job is opening it, so the whole
// thing is one big button with a "Select" cue on hover instead.
// Most names that fit before the rest collapse to "+N more".
const MAX_NAMES = 4;

// Memoized — the page passes a stabilized (useCallback) onOpen, so an
// unrelated row can skip re-rendering.
export const CampaignBanner = memo(function CampaignBanner({ campaign, partyNames, sessionCount, onOpen }: CampaignBannerProps) {
  const shown = partyNames.slice(0, MAX_NAMES);
  const extra = partyNames.length - shown.length;
  return (
    <button
      type="button"
      className="campaign-row"
      onClick={() => onOpen(campaign.id)}
      aria-label={`Open ${campaign.name}`}
      style={!campaign.coverImage ? { background: gradientForColor(campaign.colorHex) } : undefined}
    >
      {campaign.coverImage && (
        <div className="campaign-row__art" style={{ backgroundImage: `url(${campaign.coverImage})` }} />
      )}
      <div className="campaign-row__scrim" />
      <div className="campaign-row__body">
        <span className="campaign-row__level">Level {campaign.level}</span>
        <h3 className="campaign-row__title">{campaign.name}</h3>
        {campaign.notes && <p className="campaign-row__notes">{campaign.notes}</p>}
        <p className="campaign-row__party">
          {shown.length > 0 ? `${shown.join(', ')}${extra > 0 ? ` +${extra} more` : ''}` : 'No party yet'}
        </p>
        <span className="campaign-row__count">
          {sessionCount} session{sessionCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="campaign-row__select">
        <span>Select</span>
      </div>
    </button>
  );
});

// The hollow "+ Create Campaign" row — same full-width footprint as a real
// row, no fill, so it reads as an empty slot at the end of the list.
export function CampaignBannerCreate({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="campaign-row campaign-row--hollow" onClick={onClick}>
      <span className="campaign-row__hollow-plus">+</span>
      <span className="campaign-row__hollow-label">Create Campaign</span>
    </button>
  );
}
