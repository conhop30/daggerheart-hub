import { adversariesApi, type Adversary } from '../api/adversaries';
import { environmentsApi, type Environment } from '../api/environments';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, ContentCardList, MetaChip, FeatureLines, StringLines } from '../components/ContentCard';
import './BrowsePage.css';

function AdversaryCard({ a }: { a: Adversary }) {
  return (
    <ContentCard
      title={a.name}
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

function EnvironmentCard({ e }: { e: Environment }) {
  return (
    <ContentCard
      title={e.name}
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
            renderItem={(a) => <AdversaryCard a={a} />}
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
            renderItem={(e) => <EnvironmentCard e={e} />}
          />
        )}
      </div>
    </div>
  );
}
