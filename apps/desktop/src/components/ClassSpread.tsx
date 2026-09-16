import { useEffect, useState } from 'react';
import type { Domain } from '../api/domains';
import type { HeroClass } from '../api/heroClasses';
import { subclassesApi, type Subclass, type SpellcastTrait } from '../api/subclasses';
import SubclassForm from './SubclassForm';
import { upsertById } from '../lib/upsert';
import './ClassSpread.css';

interface ClassSpreadProps {
  heroClass: HeroClass;
  domainsById: Map<string, Domain>;
}

// Title-cases a SpellcastTrait enum value for display (e.g. "STRENGTH" -> "Strength").
function formatTrait(trait: SpellcastTrait): string {
  if (trait === 'NONE') return 'No spellcast trait';
  return trait.charAt(0) + trait.slice(1).toLowerCase();
}

export default function ClassSpread({ heroClass, domainsById }: ClassSpreadProps) {
  const [subclasses, setSubclasses] = useState<Subclass[]>([]);
  const [selectedSubclassId, setSelectedSubclassId] = useState<string | null>(null);
  const [editingSubclass, setEditingSubclass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditingSubclass(false);
    subclassesApi
      .listByParentClass(heroClass.id)
      .then((list) => {
        if (cancelled) return;
        setSubclasses(list);
        setSelectedSubclassId(list[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load Subclasses.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [heroClass.id]);

  const primaryDomain = domainsById.get(heroClass.primaryDomainId);
  const secondaryDomain = domainsById.get(heroClass.secondaryDomainId);
  const gradient = `linear-gradient(160deg, ${primaryDomain?.colorHex ?? 'var(--fear-dim)'}, ${
    secondaryDomain?.colorHex ?? primaryDomain?.colorHex ?? 'var(--fear-dim)'
  })`;

  const selectedSubclass = subclasses.find((s) => s.id === selectedSubclassId) ?? null;

  function handleSubclassSaved(updated: Subclass) {
    setSubclasses((prev) => upsertById(prev, updated));
    setSelectedSubclassId(updated.id);
    setEditingSubclass(false);
  }

  return (
    <div className="class-spread">
      <div className="spread-left" style={{ background: gradient }}>
        <h1 className="spread-title">{heroClass.name}</h1>
        {heroClass.description && <p className="spread-desc">{heroClass.description}</p>}

        <StatRow label="Domains" value={[primaryDomain?.name, secondaryDomain?.name].filter(Boolean).join(' and ')} />
        <StatRow label="Starting Evasion" value={heroClass.startingEvasion ?? undefined} />
        <StatRow label="Starting Hit Points" value={heroClass.startingHp ?? undefined} />
        <StatRow label="Class Items" value={heroClass.classItems ?? undefined} />

        {heroClass.hopeFeature && (
          <div className="spread-hope-row">
            <p className="spread-stat-label">Hope Feature</p>
            <p className="spread-stat-value">{heroClass.hopeFeature}</p>
          </div>
        )}

        {heroClass.classFeatures.length > 0 && (
          <>
            <p className="spread-features-header">Class Features</p>
            {heroClass.classFeatures.map((feature, i) => (
              <div key={i}>
                <p className="spread-feature-name">{feature.name}</p>
                {feature.description && <p className="spread-feature-desc">{feature.description}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="spread-right">
        {loading && <p className="spread-subclass-status">Loading Subclasses&hellip;</p>}
        {error && <p className="spread-subclass-status spread-subclass-status--error">{error}</p>}

        {!loading && !error && subclasses.length === 0 && (
          <p className="spread-subclass-status">No Subclasses yet for {heroClass.name}.</p>
        )}

        {!loading && !error && subclasses.length > 0 && !editingSubclass && (
          <>
            <div className="spread-subclass-tabs">
              {subclasses.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className={`spread-sub-tab${sub.id === selectedSubclassId ? ' active' : ''}`}
                  onClick={() => setSelectedSubclassId(sub.id)}
                >
                  {sub.name}
                </button>
              ))}
            </div>

            {selectedSubclass && (
              <SubclassBody
                subclass={selectedSubclass}
                className={heroClass.name}
                onEdit={() => setEditingSubclass(true)}
              />
            )}
          </>
        )}

        {!loading && !error && editingSubclass && selectedSubclass && (
          <SubclassForm
            parentClassId={heroClass.id}
            parentClassName={heroClass.name}
            initial={selectedSubclass}
            onSaved={handleSubclassSaved}
            onCancel={() => setEditingSubclass(false)}
          />
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="spread-stat">
      <p className="spread-stat-label">{label}</p>
      <p className="spread-stat-value">{value}</p>
    </div>
  );
}

function SubclassBody({
  subclass,
  className,
  onEdit,
}: {
  subclass: Subclass;
  className: string;
  onEdit: () => void;
}) {
  return (
    <div key={subclass.id} className="spread-subclass-body">
      <div className="spread-subclass-header-row">
        <p className="spread-subclass-eyebrow">{className} Subclasses</p>
        <button type="button" className="spread-edit-trigger" onClick={onEdit}>
          Edit Subclass
        </button>
      </div>
      <p className="spread-subclass-chooser">Choose a subclass to specialize your {className}.</p>
      <div className="spread-subclass-banner">{subclass.name}</div>
      {subclass.oneliner && <p className="spread-subclass-hook">{subclass.oneliner}</p>}
      {subclass.spellcastTrait && (
        <p className="spread-subclass-trait">Spellcast Trait: {formatTrait(subclass.spellcastTrait)}</p>
      )}

      <FeatureTier label="Foundation" features={subclass.foundationFeatures} />
      <FeatureTier label="Specialization" features={subclass.specializationFeatures} />
      <FeatureTier label="Mastery" features={subclass.masteryFeatures} />
    </div>
  );
}

function FeatureTier({
  label,
  features,
}: {
  label: string;
  features: { name: string; description?: string; spellcastTrait?: SpellcastTrait | null }[];
}) {
  if (features.length === 0) return null;
  return (
    <>
      <p className="spread-tier-header">
        <span className="spread-tier-bullet" />
        {label} Features
      </p>
      {features.map((feature, i) => (
        <p key={i} className="spread-feature-inline">
          <em>{feature.name}:</em> {feature.description}
          {feature.spellcastTrait && (
            <span className="spread-trait-tag"> {formatTrait(feature.spellcastTrait)}</span>
          )}
        </p>
      ))}
    </>
  );
}
