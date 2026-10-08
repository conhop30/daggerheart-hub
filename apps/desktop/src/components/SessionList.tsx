import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sessionsApi, type Session } from '../api/sessions';
import { ContentCard, ContentCardList, MetaChip } from './ContentCard';
import SessionForm from './SessionForm';
import { upsertById } from '../lib/upsert';
import './SessionList.css';
import { confirmDialog } from '../lib/confirm';

/** How many Sessions show before the list scrolls — about the height of a full Party of six beside it. */
const MAX_VISIBLE = 7;

interface SessionListProps {
  campaignId: string;
  onOpenSession: (session: Session) => void;
}

// The Campaign -> Session nested list, same self-contained fetch-by-parent
// shape as PartyRoster. Renaming happens inside SessionView itself (like
// TableDetail's own Edit), so this list only ever needs to open or delete a
// row.
export default function SessionList({ campaignId, onOpenSession }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sessionsApi
      .listByCampaign(campaignId)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load Sessions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  function handleCreated(session: Session) {
    setSessions((prev) => upsertById(prev, session));
    setCreating(false);
  }

  // Sessions come back in creation order, so the last one is the most recent.
  const mostRecent = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  // Displayed newest-first — a reversed copy, not a re-sort, so the
  // creation-order array above (and `mostRecent`) stays untouched.
  const orderedSessions = [...sessions].reverse();

  // The list is as tall as its first MAX_VISIBLE Sessions and scrolls from
  // there, so a long Campaign doesn't grow the page without end. Measured,
  // not a fixed height: a Session whose name wraps is a taller row.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    function measure() {
      const rows = scrollRef.current?.querySelectorAll<HTMLElement>(':scope > .content-card-list > *');
      if (!rows || rows.length <= MAX_VISIBLE) return setMaxHeight(undefined);
      const list = rows[0].parentElement!.getBoundingClientRect();
      setMaxHeight(rows[MAX_VISIBLE - 1].getBoundingClientRect().bottom - list.top);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sessions, loading]);

  // A fresh Session starts blank; "Session N" is just a starting suggestion for the name.
  const suggestedName = `Session ${sessions.length + 1}`;

  async function handleClone() {
    if (!mostRecent) return;
    setCloning(true);
    try {
      const copy = await sessionsApi.clone(mostRecent.id);
      setSessions((prev) => upsertById(prev, copy));
      onOpenSession(copy);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not clone the Session.');
    } finally {
      setCloning(false);
    }
  }

  async function handleDelete(session: Session) {
    if (!(await confirmDialog(`Delete "${session.name}"? This can't be undone.`))) return;
    try {
      await sessionsApi.remove(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Session.');
    }
  }

  return (
    <div className="session-list">
      <div className="session-list__header">
        <h2 className="session-list__title">Sessions</h2>
        {!creating && (
          <div className="session-list__header-actions">
            <button
              type="button"
              className="session-list__clone"
              onClick={handleClone}
              disabled={!mostRecent || cloning}
              title={
                mostRecent
                  ? `Start a new session that also copies the mode from "${mostRecent.name}"`
                  : 'Nothing to clone yet'
              }
            >
              Clone Most Recent
            </button>
            <button
              type="button"
              className="session-list__add"
              onClick={() => setCreating(true)}
              title="Start a new session — the Party, board and Fear carry over"
            >
              + New Session
            </button>
          </div>
        )}
      </div>

      {creating && (
        <div className="session-list__form">
          <SessionForm
            campaignId={campaignId}
            defaultName={suggestedName}
            onSaved={handleCreated}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {loading && <p className="session-list__status">Loading Sessions&hellip;</p>}
      {error && <p className="session-list__status session-list__status--error">{error}</p>}

      {!loading && !error && (
        <div className="session-list__scroll" ref={scrollRef} style={{ maxHeight }}>
        <ContentCardList
          items={orderedSessions}
          emptyMessage="No sessions yet."
          getKey={(s) => s.id}
          renderItem={(session) => (
            <ContentCard
              title={session.name}
              onEdit={() => onOpenSession(session)}
              editLabel="Open"
              onDelete={() => handleDelete(session)}
              actionsLayout="full-height"
              meta={
                <>
                  <MetaChip label="Fear" value={`${session.fear} / 12`} />
                </>
              }
            >
              {/* Which Session of the Campaign this is, counted from the
                  first one played — a small detail, not a heading. */}
              <p className="session-list__number" title={`Session ${sessions.indexOf(session) + 1} of ${sessions.length}`}>
                #{sessions.indexOf(session) + 1}
              </p>
            </ContentCard>
          )}
        />
        </div>
      )}
    </div>
  );
}
