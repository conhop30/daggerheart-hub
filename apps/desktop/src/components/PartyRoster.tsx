import { useEffect, useRef, useState } from 'react';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import { ContentCard, ContentCardList } from './ContentCard';
import MemberBackdrop, { type BackdropLayer } from './MemberBackdrop';
import { domainsApi } from '../api/domains';
import { useSubclassBackdrops } from '../lib/subclassBackdrops';
import PartyMemberForm, { type PartyMemberOptions } from './PartyMemberForm';
import { heroClassesApi } from '../api/heroClasses';
import { subclassesApi } from '../api/subclasses';
import { ancestriesApi } from '../api/ancestries';
import { communitiesApi } from '../api/communities';
import { useApiList } from '../lib/useApiList';
import { upsertById } from '../lib/upsert';
import './PartyRoster.css';

interface PartyRosterProps {
  campaignId: string;
  /**
   * The session being viewed. The party follows the Campaign from session to
   * session: changes made here (renaming, adding or removing a member)
   * apply from this session onward and never rewrite earlier ones.
   * Omitted (the Campaign page), it shows and edits the party as of the most
   * recent session.
   */
  sessionId?: string;
  /** Called with the roster whenever it loads or changes, so a parent can share it. */
  onChange?: (members: PartyMember[]) => void;
  /** 'grid' packs members into responsive columns — used on the Campaign page and during Combat, where a full-width row per member wastes space. Defaults to 'list'. */
  layout?: 'list' | 'grid';
}

// The party for a Campaign, carried across its Sessions. Same fetch-by-parent
// shape as DomainDetail's Cards list: its own effect keyed on the parent id,
// not useApiList (which only fetches once on mount and can't refetch on a
// changing parent).
export default function PartyRoster({ campaignId, sessionId, onChange, layout = 'list' }: PartyRosterProps) {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

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

  // The lists a member's Class/Subclass/Heritage ids are looked up in (and
  // that PartyMemberForm picks from). An id whose record has since been
  // deleted just reads as not set.
  const classes = useApiList(heroClassesApi.list);
  const subclasses = useApiList(subclassesApi.list);
  const ancestries = useApiList(ancestriesApi.list);
  const communities = useApiList(communitiesApi.list);
  const options: PartyMemberOptions = {
    classes: classes.items,
    subclasses: subclasses.items,
    ancestries: ancestries.items,
    communities: communities.items,
  };
  const nameOf = (list: { id: string; name: string }[], id: string | null) => list.find((r) => r.id === id)?.name ?? null;
  const domains = useApiList(domainsApi.list);
  const subclassBackdropUrl = useSubclassBackdrops();
  // A Class's primary and secondary Domain colours, skipping any not set.
  const domainColorsOf = (classId: string | null): string[] => {
    const heroClass = classes.items.find((c) => c.id === classId);
    if (!heroClass) return [];
    return [heroClass.primaryDomainId, heroClass.secondaryDomainId].flatMap((id) => {
      const color = domains.items.find((d) => d.id === id)?.colorHex;
      return color ? [color] : [];
    });
  };

  return (
    <div className="party-roster">
      <div className="party-roster__header">
        <button
          type="button"
          className={`party-roster__toggle${open ? ' party-roster__toggle--open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="party-roster__chevron" aria-hidden="true">
            &#9656;
          </span>
          <h2 className="party-roster__title">Party</h2>
        </button>
        {!creating && (
          <button type="button" className="party-roster__add" onClick={() => setCreating(true)}>
            + Add Party Member
          </button>
        )}
      </div>

      {open && (
        <>
          {creating && (
            <div className="party-roster__form">
              <PartyMemberForm
                campaignId={campaignId}
                sessionId={sessionId}
                options={options}
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
              layout={layout}
              renderItem={(member) =>
                editingId === member.id ? (
                  <div className="party-roster__form">
                    <PartyMemberForm
                      campaignId={campaignId}
                      sessionId={sessionId}
                      options={options}
                      initial={member}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  (() => {
                    // One line per Class the PC has: "Class · Subclass".
                    const classLines = [
                      [member.classId, member.subclassId],
                      [member.secondClassId, member.secondSubclassId],
                    ]
                      .map(([classId, subclassId]) =>
                        [nameOf(classes.items, classId), nameOf(subclasses.items, subclassId)].filter(Boolean).join(' · ')
                      )
                      .filter(Boolean);
                    const heritage = [nameOf(ancestries.items, member.ancestryId), nameOf(communities.items, member.communityId)]
                      .filter(Boolean)
                      .join(' ');
                    // Chosen for them, not by them: the background of the
                    // Subclass they play, or both halves when multiclassed.
                    // Only their own portrait, if one was added, overrides it.
                    // Under each sits a blend of that Class's two Domain
                    // colours, which is all there is to show when a
                    // Subclass has no image yet, or its image won't load.
                    const classLayers: BackdropLayer[] = [
                      [member.classId, member.subclassId],
                      [member.secondClassId, member.secondSubclassId],
                    ]
                      .map(([classId, subclassId]) => {
                        const subclass = subclasses.items.find((sc) => sc.id === subclassId);
                        // One uploaded on the Subclass itself wins over the
                        // picture in this install's own folder for that name.
                        const image = subclass ? (subclass.backdropImage ?? subclassBackdropUrl(subclass.name) ?? null) : null;
                        return { image, colors: domainColorsOf(classId) };
                      })
                      .filter((layer) => layer.image || layer.colors.length > 0);
                    const backdrop = member.portraitImage
                      ? [{ image: member.portraitImage, colors: classLayers[0]?.colors ?? [] }]
                      : classLayers;
                    return (
                      <div className={`party-roster__member${backdrop.length ? ' party-roster__member--photo' : ''}`}>
                        {backdrop.length > 0 && <MemberBackdrop layers={backdrop} />}
                        <ContentCard title={member.name} onEdit={() => setEditingId(member.id)} onDelete={() => handleDelete(member)}>
                          {classLines.map((line) => (
                            <p className="party-roster__class" key={line}>
                              {line}
                            </p>
                          ))}
                          {heritage && <p className="party-roster__heritage">{heritage}</p>}
                          {member.notes && <p className="party-roster__notes">{member.notes}</p>}
                        </ContentCard>
                      </div>
                    );
                  })()
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}
