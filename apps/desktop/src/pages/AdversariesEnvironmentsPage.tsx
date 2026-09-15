import { useState } from 'react';
import { adversariesApi, type Adversary } from '../api/adversaries';
import { environmentsApi, type Environment } from '../api/environments';
import { gameSetsApi } from '../api/gameSets';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, ContentCardList, MetaChip, FeatureLines, StringLines } from '../components/ContentCard';
import AdversaryForm from '../components/AdversaryForm';
import EnvironmentForm from '../components/EnvironmentForm';
import './BrowsePage.css';

function AdversaryCard({ a, onEdit, onDelete }: { a: Adversary; onEdit: () => void; onDelete: () => void }) {
  return (
    <ContentCard
      title={a.name}
      onEdit={onEdit}
      onDelete={onDelete}
      meta={
        <>
          <MetaChip label="Tier" value={a.tier} />
          <MetaChip label="Difficulty" value={a.difficulty} />
          <MetaChip label="HP" value={a.hp} />
          <MetaChip label="Stress" value={a.stress} />
          <MetaChip
            label="Thresholds"
            value={a.thresholds.major != null || a.thresholds.severe != null ? `${a.thresholds.major ?? '—'} / ${a.thresholds.severe ?? '—'}` : null}
          />
        </>
      }
    >
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
    </ContentCard>
  );
}

function EnvironmentCard({ e, onEdit, onDelete }: { e: Environment; onEdit: () => void; onDelete: () => void }) {
  return (
    <ContentCard
      title={e.name}
      onEdit={onEdit}
      onDelete={onDelete}
      meta={
        <>
          <MetaChip label="Tier" value={e.tier} />
          <MetaChip label="Difficulty" value={e.difficulty} />
        </>
      }
    >
      {e.description && <p className="content-card__description">{e.description}</p>}
      <StringLines label="Impulses" values={e.impulses} />
      <StringLines label="Potential Adversaries" values={e.potentialAdversaries} />
      <FeatureLines label="Passives" features={e.features.passives} />
      <FeatureLines label="Actions" features={e.features.actions} />
      <FeatureLines label="Reactions" features={e.features.reactions} />
    </ContentCard>
  );
}

export default function AdversariesEnvironmentsPage() {
  const adversaries = useApiList(adversariesApi.list);
  const environments = useApiList(environmentsApi.list);
  const gameSets = useApiList(gameSetsApi.list);
  const [editingAdversaryId, setEditingAdversaryId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);

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
        <h2 className="browse-page__section-title">Adversaries</h2>
        {adversaries.loading && <p className="browse-page__status">Loading Adversaries&hellip;</p>}
        {adversaries.error && <p className="browse-page__status browse-page__status--error">{adversaries.error}</p>}
        {!adversaries.loading && !adversaries.error && (
          <ContentCardList
            items={adversaries.items}
            emptyMessage="No Adversaries yet — create one from Home first."
            getKey={(a) => a.id}
            renderItem={(a) =>
              editingAdversaryId === a.id ? (
                <AdversaryForm
                  gameSets={gameSets.items}
                  initial={a}
                  onSaved={(saved) => {
                    adversaries.upsert(saved);
                    setEditingAdversaryId(null);
                  }}
                  onCancel={() => setEditingAdversaryId(null)}
                />
              ) : (
                <AdversaryCard
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
        <h2 className="browse-page__section-title">Environments</h2>
        {environments.loading && <p className="browse-page__status">Loading Environments&hellip;</p>}
        {environments.error && <p className="browse-page__status browse-page__status--error">{environments.error}</p>}
        {!environments.loading && !environments.error && (
          <ContentCardList
            items={environments.items}
            emptyMessage="No Environments yet — create one from Home first."
            getKey={(e) => e.id}
            renderItem={(e) =>
              editingEnvironmentId === e.id ? (
                <EnvironmentForm
                  gameSets={gameSets.items}
                  initial={e}
                  onSaved={(saved) => {
                    environments.upsert(saved);
                    setEditingEnvironmentId(null);
                  }}
                  onCancel={() => setEditingEnvironmentId(null)}
                />
              ) : (
                <EnvironmentCard
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
