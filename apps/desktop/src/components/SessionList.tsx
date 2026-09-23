import { useEffect, useState } from 'react';
import { sessionsApi, type Session } from '../api/sessions';
import { ContentCard, ContentCardList, MetaChip } from './ContentCard';
import SessionForm from './SessionForm';
import { upsertById } from '../lib/upsert';
import './SessionList.css';

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
    if (!window.confirm(`Delete "${session.name}"? This can't be undone.`)) return;
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
              title={mostRecent ? `Copy Fear, notes, and the whole board from "${mostRecent.name}"` : 'Nothing to clone yet'}
            >
              Clone Most Recent
            </button>
            <button type="button" className="session-list__add" onClick={() => setCreating(true)}>
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
        <ContentCardList
          items={sessions}
          emptyMessage="No sessions yet."
          getKey={(s) => s.id}
          renderItem={(session) => (
            <ContentCard
              title={session.name}
              onEdit={() => onOpenSession(session)}
              editLabel="Open"
              onDelete={() => handleDelete(session)}
              meta={
                <>
                  <MetaChip label="Fear" value={`${session.fear} / 12`} />
                </>
              }
            />
          )}
        />
      )}
    </div>
  );
}
