import { useState } from 'react';
import { adversariesApi, type Adversary } from '../api/adversaries';
import { environmentsApi, type Environment } from '../api/environments';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { FeatureLines, StringLines } from '../components/ContentCard';
import { StatRail } from '../components/StatRail';
import { StatGallery } from '../components/StatGallery';
import AdversaryForm from '../components/AdversaryForm';
import EnvironmentForm from '../components/EnvironmentForm';
import './BrowsePage.css';

function thresholdsValue(a: Adversary): string | null {
  return a.thresholds.major != null || a.thresholds.severe != null
    ? `${a.thresholds.major ?? '—'}/${a.thresholds.severe ?? '—'}`
    : null;
}

function AdversaryTile({ a }: { a: Adversary }) {
  return (
    <>
      <span className="stat-gallery__tile-name">{a.name}</span>
      <StatRail
        compact
        items={[
          { label: 'Tier', value: a.tier },
          { label: 'Diff', value: a.difficulty },
          { label: 'HP', value: a.hp },
          { label: 'Stress', value: a.stress },
        ]}
      />
    </>
  );
}

function AdversarySpotlight({ a, onEdit, onDelete }: { a: Adversary; onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <div className="content-card__header">
        <h3 className="content-card__title">{a.name}</h3>
        <div className="content-card__actions">
          <button type="button" className="content-card__action" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <StatRail
        items={[
          { label: 'Tier', value: a.tier },
          { label: 'Difficulty', value: a.difficulty },
          { label: 'HP', value: a.hp },
          { label: 'Stress', value: a.stress },
          { label: 'Thresh', value: thresholdsValue(a) },
        ]}
      />
      {a.description && <p className="content-card__description">{a.description}</p>}
      {(a.attackModifier != null || a.attackRange || a.attackType || a.attackDescription) && (
        <div className="content-card__section">
          <p className="content-card__section-label">Attack</p>
          <p className="content-card__description">
            {a.attackModifier != null && (a.attackModifier >= 0 ? `+${a.attackModifier}` : a.attackModifier)}
            {a.attackRange && ` · ${titleCaseEnum(a.attackRange)}`}
            {a.attackType && ` · ${titleCaseEnum(a.attackType)}`}
            {a.attackDescription && ` — ${a.attackDescription}`}
          </p>
        </div>
      )}
      <StringLines label="Motives and Tactics" values={a.motivesAndTactics} />
      {a.experiences.length > 0 && (
        <div className="content-card__section">
          <p className="content-card__section-label">Experiences</p>
          <ul className="content-card__feature-list">
            {a.experiences.map((e, i) => (
              <li key={i}>
                {e.name}: {e.modifier >= 0 ? `+${e.modifier}` : e.modifier}
              </li>
            ))}
          </ul>
        </div>
      )}
      <FeatureLines label="Passives" features={a.features.passives} />
      <FeatureLines label="Actions" features={a.features.actions} />
      <FeatureLines label="Reactions" features={a.features.reactions} />
    </>
  );
}

function EnvironmentTile({ e }: { e: Environment }) {
  return (
    <>
      <span className="stat-gallery__tile-name">{e.name}</span>
      <StatRail
        compact
        items={[
          { label: 'Tier', value: e.tier },
          { label: 'Diff', value: e.difficulty },
        ]}
      />
    </>
  );
}

function EnvironmentSpotlight({
  e,
  onEdit,
  onDelete,
}: {
  e: Environment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="content-card__header">
        <h3 className="content-card__title">{e.name}</h3>
        <div className="content-card__actions">
          <button type="button" className="content-card__action" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <StatRail
        items={[
          { label: 'Tier', value: e.tier },
          { label: 'Difficulty', value: e.difficulty },
        ]}
      />
      {e.description && <p className="content-card__description">{e.description}</p>}
      <StringLines label="Impulses" values={e.impulses} />
      <StringLines label="Potential Adversaries" values={e.potentialAdversaries} />
      <FeatureLines label="Passives" features={e.features.passives} />
      <FeatureLines label="Actions" features={e.features.actions} />
      <FeatureLines label="Reactions" features={e.features.reactions} />
    </>
  );
}

export default function AdversariesEnvironmentsPage() {
  const adversaries = useApiList(adversariesApi.list);
  const environments = useApiList(environmentsApi.list);
  const [editingAdversaryId, setEditingAdversaryId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [creatingAdversary, setCreatingAdversary] = useState(false);
  const [creatingEnvironment, setCreatingEnvironment] = useState(false);

  async function handleDeleteAdversary(a: Adversary) {
    if (!window.confirm(`Delete "${a.name}"? This can't be undone.`)) return;
    try {
      await adversariesApi.remove(a.id);
      adversaries.remove(a.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Adversary.');
    }
  }

  async function handleDeleteEnvironment(e: Environment) {
    if (!window.confirm(`Delete "${e.name}"? This can't be undone.`)) return;
    try {
      await environmentsApi.remove(e.id);
      environments.remove(e.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Environment.');
    }
  }

  return (
    <div className="browse-page">
      <h1 className="browse-page__title">Adversaries &amp; Environments</h1>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Adversaries</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingAdversary(true)}>
            + New Adversary
          </button>
        </div>
        {creatingAdversary && (
          <div className="browse-page__inline-form">
            <AdversaryForm
              onSaved={(saved) => {
                adversaries.upsert(saved);
                setCreatingAdversary(false);
              }}
              onCancel={() => setCreatingAdversary(false)}
            />
          </div>
        )}
        {adversaries.loading && <p className="browse-page__status">Loading Adversaries&hellip;</p>}
        {adversaries.error && <p className="browse-page__status browse-page__status--error">{adversaries.error}</p>}
        {!adversaries.loading && !adversaries.error && (
          <StatGallery
            items={adversaries.items}
            getKey={(a) => a.id}
            getName={(a) => a.name}
            getTier={(a) => a.tier}
            searchMatch={(a, q) => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q)}
            emptyMessage="No Adversaries yet — click + New Adversary above to create one."
            itemLabel="Adversary"
            renderTile={(a) => <AdversaryTile a={a} />}
            renderSpotlight={(a) =>
              editingAdversaryId === a.id ? (
                <AdversaryForm
                  initial={a}
                  onSaved={(saved) => {
                    adversaries.upsert(saved);
                    setEditingAdversaryId(null);
                  }}
                  onCancel={() => setEditingAdversaryId(null)}
                />
              ) : (
                <AdversarySpotlight
                  a={a}
                  onEdit={() => setEditingAdversaryId(a.id)}
                  onDelete={() => handleDeleteAdversary(a)}
                />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <div className="browse-page__section-header">
          <h2 className="browse-page__section-title">Environments</h2>
          <button type="button" className="browse-page__add-button" onClick={() => setCreatingEnvironment(true)}>
            + New Environment
          </button>
        </div>
        {creatingEnvironment && (
          <div className="browse-page__inline-form">
            <EnvironmentForm
              onSaved={(saved) => {
                environments.upsert(saved);
                setCreatingEnvironment(false);
              }}
              onCancel={() => setCreatingEnvironment(false)}
            />
          </div>
        )}
        {environments.loading && <p className="browse-page__status">Loading Environments&hellip;</p>}
        {environments.error && (
          <p className="browse-page__status browse-page__status--error">{environments.error}</p>
        )}
        {!environments.loading && !environments.error && (
          <StatGallery
            items={environments.items}
            getKey={(e) => e.id}
            getName={(e) => e.name}
            getTier={(e) => e.tier}
            searchMatch={(e, q) => e.name.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q)}
            emptyMessage="No Environments yet — click + New Environment above to create one."
            itemLabel="Environment"
            renderTile={(e) => <EnvironmentTile e={e} />}
            renderSpotlight={(e) =>
              editingEnvironmentId === e.id ? (
                <EnvironmentForm
                  initial={e}
                  onSaved={(saved) => {
                    environments.upsert(saved);
                    setEditingEnvironmentId(null);
                  }}
                  onCancel={() => setEditingEnvironmentId(null)}
                />
              ) : (
                <EnvironmentSpotlight
                  e={e}
                  onEdit={() => setEditingEnvironmentId(e.id)}
                  onDelete={() => handleDeleteEnvironment(e)}
                />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
