import { useEffect, useState } from 'react';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import { ContentCard, ContentCardList } from './ContentCard';
import PartyMemberForm from './PartyMemberForm';
import StatStepper from './StatStepper';
import { upsertById } from '../lib/upsert';
import './PartyRoster.css';

interface PartyRosterProps {
  campaignId: string;
}

// The standing roster for a Campaign — reused across every Session run
// against it (see SessionView's Party panel, Phase 3). Same fetch-by-parent
// shape as DomainDetail's Cards list: its own effect keyed on the parent id,
// not useApiList (which only fetches once on mount and can't refetch on a
// changing parent).
export default function PartyRoster({ campaignId }: PartyRosterProps) {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    partyMembersApi
      .listByCampaign(campaignId)
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load the Party.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  function handleSaved(member: PartyMember) {
    setMembers((prev) => upsertById(prev, member));
    setCreating(false);
    setEditingId(null);
  }

  async function handleDelete(member: PartyMember) {
    if (!window.confirm(`Remove "${member.name}" from the Party? This can't be undone.`)) return;
    try {
      await partyMembersApi.remove(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove the party member.');
    }
  }

  async function handleTrackableChange(member: PartyMember, index: number, current: number) {
    const nextTrackables = member.trackables.map((t, i) => (i === index ? { ...t, current } : t));
    // Optimistic — this is a quick, frequent adjustment (marking HP/Stress
    // mid-session), not a form submit, so it shouldn't wait on the round
    // trip to feel responsive.
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, trackables: nextTrackables } : m)));
    try {
      await partyMembersApi.update(member.id, { trackables: nextTrackables });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  return (
    <div className="party-roster">
      <div className="party-roster__header">
        <h2 className="party-roster__title">Party</h2>
        {!creating && (
          <button type="button" className="party-roster__add" onClick={() => setCreating(true)}>
            + Add Party Member
          </button>
        )}
      </div>

      {creating && (
        <div className="party-roster__form">
          <PartyMemberForm campaignId={campaignId} onSaved={handleSaved} onCancel={() => setCreating(false)} />
        </div>
      )}

      {loading && <p className="party-roster__status">Loading the Party&hellip;</p>}
      {error && <p className="party-roster__status party-roster__status--error">{error}</p>}

      {!loading && !error && (
        <ContentCardList
          items={members}
          emptyMessage="No party members yet."
          getKey={(m) => m.id}
          renderItem={(member) =>
            editingId === member.id ? (
              <div className="party-roster__form">
                <PartyMemberForm
                  campaignId={campaignId}
                  initial={member}
                  onSaved={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <ContentCard title={member.name} onEdit={() => setEditingId(member.id)} onDelete={() => handleDelete(member)}>
                {member.notes && <p className="party-roster__notes">{member.notes}</p>}
                {member.trackables.length > 0 && (
                  <div className="party-roster__trackables">
                    {member.trackables.map((t, index) => (
                      <StatStepper
                        key={index}
                        label={t.label}
                        current={t.current}
                        max={t.max}
                        onChange={(current) => handleTrackableChange(member, index, current)}
                      />
                    ))}
                  </div>
                )}
              </ContentCard>
            )
          }
        />
      )}
    </div>
  );
}
