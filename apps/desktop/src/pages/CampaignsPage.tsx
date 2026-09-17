import { useEffect, useMemo, useState } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import { CampaignBanner, CampaignBannerCreate } from '../components/CampaignBanner';
import CampaignDetail from '../components/CampaignDetail';
import CampaignForm from '../components/CampaignForm';
import { useApiList } from '../lib/useApiList';
import './CampaignsPage.css';

export default function CampaignsPage() {
  const { items: campaigns, loading, error, upsert, remove } = useApiList<Campaign>(campaignsApi.list);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    partyMembersApi.list().then((list) => {
      if (!cancelled) setPartyMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const partyCountByCampaign = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of partyMembers) {
      counts.set(member.campaignId, (counts.get(member.campaignId) ?? 0) + 1);
    }
    return counts;
  }, [partyMembers]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  function handleSaved(saved: Campaign) {
    upsert(saved);
    setCreating(false);
    setEditingId(null);
  }

  async function handleDelete(campaign: Campaign) {
    if (!window.confirm(`Delete "${campaign.name}"? This removes its whole Party too and can't be undone.`)) return;
    try {
      await campaignsApi.remove(campaign.id);
      remove(campaign.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Campaign.');
    }
  }

  if (selectedCampaign) {
    return (
      <div className="campaigns-page">
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaignId(null)}
          onCampaignSaved={upsert}
          onCampaignDeleted={(id) => {
            remove(id);
            setSelectedCampaignId(null);
          }}
        />
      </div>
    );
  }

  const editingCampaign = editingId ? campaigns.find((c) => c.id === editingId) ?? null : null;

  return (
    <div className="campaigns-page">
      <div className="campaigns-page__header">
        <h1 className="campaigns-page__title">Campaigns</h1>
      </div>

      {loading && <p className="campaigns-page__status">Loading Campaigns&hellip;</p>}
      {error && <p className="campaigns-page__status campaigns-page__status--error">{error}</p>}

      {!loading && !error && (
        <>
          {(creating || editingCampaign) && (
            <div className="campaigns-page__edit-panel">
              <CampaignForm
                initial={editingCampaign}
                onSaved={handleSaved}
                onCancel={() => {
                  setCreating(false);
                  setEditingId(null);
                }}
              />
            </div>
          )}

          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <CampaignBanner
                key={campaign.id}
                campaign={campaign}
                partyCount={partyCountByCampaign.get(campaign.id) ?? 0}
                sessionCount={0}
                onOpen={() => setSelectedCampaignId(campaign.id)}
                onEdit={() => setEditingId(campaign.id)}
                onDelete={() => handleDelete(campaign)}
              />
            ))}
            <CampaignBannerCreate onClick={() => setCreating(true)} />
          </div>
        </>
      )}
    </div>
  );
}
