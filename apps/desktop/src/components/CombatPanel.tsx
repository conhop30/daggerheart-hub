import { useEffect, useState } from 'react';
import { adversariesApi } from '../api/adversaries';
import { environmentsApi } from '../api/environments';
import { sessionAdversariesApi, type SessionAdversary, type UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import { sessionEnvironmentsApi, type SessionEnvironment, type UpdateSessionEnvironmentRequest } from '../api/sessionEnvironments';
import { useApiList } from '../lib/useApiList';
import ItemPicker from './ItemPicker';
import SessionAdversaryTile from './SessionAdversaryTile';
import SessionEnvironmentTile from './SessionEnvironmentTile';
import './CombatPanel.css';

interface CombatPanelProps {
  sessionId: string;
}

// Fully self-contained: hand this just a sessionId and it fetches, pulls
// in, and persists its own SessionAdversaries/SessionEnvironments — the
// same "own your own collection" shape PartyRoster already uses for
// campaignId. What was pulled in during earlier sessions shows here too
// (marked "Carried over"); changing one of those takes effect from this session
// onward, and pushing one out removes it from this session only. Swapping this
// panel out for a redesign later never touches SessionView or AdventuringPanel.
export default function CombatPanel({ sessionId }: CombatPanelProps) {
  const [sessionAdversaries, setSessionAdversaries] = useState<SessionAdversary[]>([]);
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
    Promise.all([sessionAdversariesApi.listBySession(sessionId), sessionEnvironmentsApi.listBySession(sessionId)])
      .then(([sa, se]) => {
        if (cancelled) return;
        setSessionAdversaries(sa);
        setSessionEnvironments(se);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load this session’s combatants.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function pullInAdversary(adversaryId: string) {
    setPickerOpen(null);
    try {
      const pulled = await sessionAdversariesApi.create({ sessionId, adversaryId });
      setSessionAdversaries((prev) => [...prev, pulled]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not pull that Adversary in.');
    }
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

  async function handleAdversaryChange(adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) {
    setSessionAdversaries((prev) => prev.map((a) => (a.id === adversary.id ? { ...a, ...patch } : a)));
    try {
      await sessionAdversariesApi.update(adversary.id, patch, { sessionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleAdversaryRemove(adversary: SessionAdversary) {
    setSessionAdversaries((prev) => prev.filter((a) => a.id !== adversary.id));
    try {
      await sessionAdversariesApi.remove(adversary.id, { sessionId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not push that Adversary out.');
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

      {loading && <p className="combat-panel__status">Loading combatants&hellip;</p>}
      {error && <p className="combat-panel__status combat-panel__status--error">{error}</p>}

      {!loading && !error && sessionAdversaries.length === 0 && sessionEnvironments.length === 0 && (
        <p className="combat-panel__status">Nothing pulled in yet — use the buttons above to bring in a fight.</p>
      )}

      <div className="combat-panel__grid">
        {sessionAdversaries.map((adversary) => (
          <SessionAdversaryTile
            key={adversary.id}
            adversary={adversary}
            onChange={(patch) => handleAdversaryChange(adversary, patch)}
            onRemove={() => handleAdversaryRemove(adversary)}
          />
        ))}
        {sessionEnvironments.map((environment) => (
          <SessionEnvironmentTile
            key={environment.id}
            environment={environment}
            onChange={(patch) => handleEnvironmentChange(environment, patch)}
            onRemove={() => handleEnvironmentRemove(environment)}
          />
        ))}
      </div>
    </div>
  );
}
