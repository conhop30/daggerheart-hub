import { useEffect, useState } from 'react';
import { adversariesApi } from '../api/adversaries';
import { environmentsApi } from '../api/environments';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import { sessionEnvironmentsApi, type SessionEnvironment, type UpdateSessionEnvironmentRequest } from '../api/sessionEnvironments';
import { useApiList } from '../lib/useApiList';
import ItemPicker from './ItemPicker';
import SessionAdversaryTile from './SessionAdversaryTile';
import SessionEnvironmentTile from './SessionEnvironmentTile';
import './CombatPanel.css';

interface CombatPanelProps {
  sessionId: string;
  // Adversaries are lifted up into SessionView (not owned here) because
  // SessionCombatSidebar shows the very same live list at the same time,
  // on the same screen — unlike Environments, which nothing else renders
  // concurrently, so they can stay fully self-contained below.
  sessionAdversaries: SessionAdversary[];
  adversariesLoading: boolean;
  adversariesError: string | null;
  onPullInAdversary: (adversaryId: string) => void;
  onAdversaryChange: (adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) => void;
  onAdversaryRemove: (adversary: SessionAdversary) => void;
}

// Pulls in, and persists its own SessionEnvironments — the same "own your
// own collection" shape PartyRoster already uses for campaignId.
// SessionAdversaries are handed down from SessionView instead (see the
// props comment above). What was pulled in during earlier sessions shows
// here too (marked "Carried over"); changing one of those takes effect from
// this session onward, and pushing one out removes it from this session
// only.
export default function CombatPanel({
  sessionId,
  sessionAdversaries,
  adversariesLoading,
  adversariesError,
  onPullInAdversary,
  onAdversaryChange,
  onAdversaryRemove,
}: CombatPanelProps) {
  const [sessionEnvironments, setSessionEnvironments] = useState<SessionEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'adversary' | 'environment' | null>(null);

  const adversaries = useApiList(adversariesApi.list);
  const environments = useApiList(environmentsApi.list);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sessionEnvironmentsApi
      .listBySession(sessionId)
      .then((se) => {
        if (!cancelled) setSessionEnvironments(se);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load this session’s Environments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function pullInAdversary(adversaryId: string) {
    setPickerOpen(null);
    onPullInAdversary(adversaryId);
  }

  async function pullInEnvironment(environmentId: string) {
    setPickerOpen(null);
    try {
      const pulled = await sessionEnvironmentsApi.create({ sessionId, environmentId });
      setSessionEnvironments((prev) => [...prev, pulled]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not pull that Environment in.');
    }
  }

  async function handleEnvironmentChange(environment: SessionEnvironment, patch: UpdateSessionEnvironmentRequest) {
    setSessionEnvironments((prev) => prev.map((e) => (e.id === environment.id ? { ...e, ...patch } : e)));
    try {
      await sessionEnvironmentsApi.update(environment.id, patch, { sessionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleEnvironmentRemove(environment: SessionEnvironment) {
    setSessionEnvironments((prev) => prev.filter((e) => e.id !== environment.id));
    try {
      await sessionEnvironmentsApi.remove(environment.id, { sessionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not push that Environment out.');
    }
  }

  return (
    <div className="combat-panel">
      <div className="combat-panel__toolbar">
        <button
          type="button"
          className="combat-panel__pull-button"
          onClick={() => setPickerOpen(pickerOpen === 'adversary' ? null : 'adversary')}
        >
          + Pull In Adversary
        </button>
        <button
          type="button"
          className="combat-panel__pull-button"
          onClick={() => setPickerOpen(pickerOpen === 'environment' ? null : 'environment')}
        >
          + Pull In Environment
        </button>
      </div>

      {pickerOpen === 'adversary' && (
        <div className="combat-panel__picker">
          <ItemPicker items={adversaries.items} value={null} onChange={pullInAdversary} />
        </div>
      )}
      {pickerOpen === 'environment' && (
        <div className="combat-panel__picker">
          <ItemPicker items={environments.items} value={null} onChange={pullInEnvironment} />
        </div>
      )}

      {(loading || adversariesLoading) && <p className="combat-panel__status">Loading combatants&hellip;</p>}
      {(error || adversariesError) && (
        <p className="combat-panel__status combat-panel__status--error">{error || adversariesError}</p>
      )}

      {!loading && !error && !adversariesLoading && !adversariesError && sessionAdversaries.length === 0 && sessionEnvironments.length === 0 && (
        <p className="combat-panel__status">Nothing pulled in yet — use the buttons above to bring in a fight.</p>
      )}

      <div className="combat-panel__grid">
        {sessionAdversaries.map((adversary) => (
          <SessionAdversaryTile
            key={adversary.id}
            adversary={adversary}
            // Features aren't part of the session snapshot (nothing about them
            // is live-tracked state), so they're looked up live from the master
            // record instead of duplicating them into every pull-in — undefined
            // just means the master was deleted since, and the section hides.
            masterFeatures={adversaries.items.find((a) => a.id === adversary.adversaryId)?.features}
            onChange={(patch) => onAdversaryChange(adversary, patch)}
            onRemove={() => onAdversaryRemove(adversary)}
          />
        ))}
        {sessionEnvironments.map((environment) => (
          <SessionEnvironmentTile
            key={environment.id}
            environment={environment}
            masterFeatures={environments.items.find((e) => e.id === environment.environmentId)?.features}
            onChange={(patch) => handleEnvironmentChange(environment, patch)}
            onRemove={() => handleEnvironmentRemove(environment)}
          />
        ))}
      </div>
    </div>
  );
}
