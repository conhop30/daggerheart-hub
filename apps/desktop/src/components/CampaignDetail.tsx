import { useEffect, useState } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import { sessionsApi, type Session } from '../api/sessions';
import CampaignMusicSidebar from './CampaignMusicSidebar';
import CampaignForm from './CampaignForm';
import PartyRoster from './PartyRoster';
import SessionList from './SessionList';
import { gradientForColor } from '../lib/color';
import './CampaignDetail.css';
import { confirmDialog } from '../lib/confirm';

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
  const [mostRecentSession, setMostRecentSession] = useState<Session | null>(null);

  // Sessions come back in creation order, so the last one is the most
  // recent — same convention SessionList already relies on for "Clone Most
  // Recent". Only used to seed the sidebar preview; SessionList owns the
  // actual list and its own create/delete.
  useEffect(() => {
    let cancelled = false;
    sessionsApi.listByCampaign(campaign.id).then((list) => {
      if (!cancelled) setMostRecentSession(list.length > 0 ? list[list.length - 1] : null);
    });
    return () => {
      cancelled = true;
    };
  }, [campaign.id]);

  async function handleDelete() {
    if (!(await confirmDialog(`Delete "${campaign.name}"? This removes its whole Party and Sessions too, and can't be undone.`)))
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
        <div
          className="campaign-detail__hero"
          style={!campaign.coverImage ? { background: gradientForColor(campaign.colorHex) } : undefined}
        >
          {campaign.coverImage && (
            <div className="campaign-detail__art" style={{ backgroundImage: `url(${campaign.coverImage})` }} />
          )}
          <div className="campaign-detail__scrim" />
          <div className="campaign-detail__content">
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
            <span className="campaign-detail__level">Party Level {campaign.level}</span>
            <h1 className="campaign-detail__title">{campaign.name}</h1>
            {campaign.notes && <p className="campaign-detail__notes">{campaign.notes}</p>}
          </div>
        </div>
      )}

      <div className="campaign-detail__layout">
        <div className="campaign-detail__main">
          <SessionList campaignId={campaign.id} onOpenSession={onOpenSession} />
          <PartyRoster campaignId={campaign.id} layout="grid" />
        </div>
        <aside className="campaign-detail__sidebar">
          <CampaignMusicSidebar campaignId={campaign.id} session={mostRecentSession} />
        </aside>
      </div>
    </div>
  );
}
