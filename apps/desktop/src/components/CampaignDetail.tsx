import { useState } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import type { Session } from '../api/sessions';
import CampaignForm from './CampaignForm';
import PartyRoster from './PartyRoster';
import SessionList from './SessionList';
import { gradientForColor } from '../lib/color';
import './CampaignDetail.css';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
  onCampaignSaved: (updated: Campaign) => void;
  onCampaignDeleted: (id: string) => void;
  onOpenSession: (session: Session) => void;
}

export default function CampaignDetail({
  campaign,
  onBack,
  onCampaignSaved,
  onCampaignDeleted,
  onOpenSession,
}: CampaignDetailProps) {
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${campaign.name}"? This removes its whole Party and Sessions too, and can't be undone.`))
      return;
    try {
      await campaignsApi.remove(campaign.id);
      onCampaignDeleted(campaign.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Campaign.');
    }
  }

  return (
    <div className="campaign-detail">
      <button type="button" className="campaign-detail__back" onClick={onBack}>
        &larr; All Campaigns
      </button>

      {editing ? (
        <div className="campaign-detail__edit-panel">
          <CampaignForm
            initial={campaign}
            onSaved={(saved) => {
              onCampaignSaved(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="campaign-detail__hero" style={{ background: gradientForColor(campaign.colorHex) }}>
          <div className="campaign-detail__hero-actions">
            <button type="button" className="campaign-detail__hero-action" onClick={() => setEditing(true)}>
              Edit Campaign
            </button>
            <button
              type="button"
              className="campaign-detail__hero-action campaign-detail__hero-action--danger"
              onClick={handleDelete}
            >
              Delete Campaign
            </button>
          </div>
          <h1 className="campaign-detail__title">{campaign.name}</h1>
          {campaign.notes && <p className="campaign-detail__notes">{campaign.notes}</p>}
        </div>
      )}

      <PartyRoster campaignId={campaign.id} />
      <SessionList campaignId={campaign.id} onOpenSession={onOpenSession} />
    </div>
  );
}
