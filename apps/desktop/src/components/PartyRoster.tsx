import { useEffect, useRef, useState } from 'react';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import { ContentCard, ContentCardList } from './ContentCard';
import PartyMemberForm from './PartyMemberForm';
import StatStepper from './StatStepper';
import { upsertById } from '../lib/upsert';
import './PartyRoster.css';

interface PartyRosterProps {
  campaignId: string;
  /**
   * The session being viewed. The party follows the Campaign from session to
   * session: changes made here (marking HP, renaming, adding or removing a
   * member) apply from this session onward and never rewrite earlier ones.
   * Omitted (the Campaign page), it shows and edits the party as of the most
   * recent session.
   */
  sessionId?: string;
  /** Called with the roster whenever it loads or changes, so a parent can share it. */
  onChange?: (members: PartyMember[]) => void;
}

// The party for a Campaign, carried across its Sessions. Same fetch-by-parent
// shape as DomainDetail's Cards list: its own effect keyed on the parent id,
// not useApiList (which only fetches once on mount and can't refetch on a
// changing parent).
export default function PartyRoster({ campaignId, sessionId, onChange }: PartyRosterProps) {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(members);
  }, [members]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (sessionId ? partyMembersApi.listBySession(sessionId) : partyMembersApi.listByCampaign(campaignId))
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
  }, [campaignId, sessionId]);

  function handleSaved(member: PartyMember) {
    setMembers((prev) => upsertById(prev, member));
    setCreating(false);
    setEditingId(null);
  }

  async function handleDelete(member: PartyMember) {
    if (!window.confirm(`Remove "${member.name}" from the Party? This can't be undone.`)) return;
    try {
      await partyMembersApi.remove(member.id, { sessionId });
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
      await partyMembersApi.update(member.id, { trackables: nextTrackables }, { sessionId });
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
          <PartyMemberForm
            campaignId={campaignId}
            sessionId={sessionId}
            onSaved={handleSaved}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      <p className="party-roster__hint">
        {sessionId
          ? 'Changes here apply from this session onward; earlier sessions keep what they had.'
          : 'Shown as of your most recent session. Changes apply from that session onward.'}
      </p>

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
                  sessionId={sessionId}
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
