import { useEffect, useState } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import { gameSetsApi, type GameSet } from '../api/gameSets';
import ClassSpread from '../components/ClassSpread';
import ClassForm from '../components/ClassForm';
import { upsertById } from '../lib/upsert';
import './ClassesPage.css';

interface ClassesPageProps {
  onBack: () => void;
}

export default function ClassesPage({ onBack }: ClassesPageProps) {
  const [heroClasses, setHeroClasses] = useState<HeroClass[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [editingClass, setEditingClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([heroClassesApi.list(), domainsApi.list(), gameSetsApi.list()])
      .then(([classList, domainList, gameSetList]) => {
        if (cancelled) return;
        setHeroClasses(classList);
        setDomains(domainList);
        setGameSets(gameSetList);
        setSelectedClassId(classList[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load Classes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const domainsById = new Map(domains.map((d) => [d.id, d]));
  const selectedClass = heroClasses.find((c) => c.id === selectedClassId) ?? null;

  function handleClassSaved(updated: HeroClass) {
    setHeroClasses((prev) => upsertById(prev, updated));
    setSelectedClassId(updated.id);
    setEditingClass(false);
  }

  return (
    <div className="classes-page">
      <button type="button" className="classes-page__back" onClick={onBack}>
        &larr; Back to Home
      </button>

      <h1 className="classes-page__title">Classes</h1>

      {loading && <p className="classes-page__status">Loading Classes&hellip;</p>}
      {error && <p className="classes-page__status classes-page__status--error">{error}</p>}
      {!loading && !error && heroClasses.length === 0 && (
        <p className="classes-page__status">No Classes yet &mdash; create one from Home first.</p>
      )}

      {!loading && !error && heroClasses.length > 0 && (
        <>
          <div className="classes-page__tabstrip">
            {heroClasses.map((hc) => (
              <button
                key={hc.id}
                type="button"
                className={`classes-page__tab${hc.id === selectedClassId ? ' active' : ''}`}
                onClick={() => {
                  setSelectedClassId(hc.id);
                  setEditingClass(false);
                }}
              >
                {hc.name}
              </button>
            ))}
          </div>

          {selectedClass && !editingClass && (
            <>
              <div className="classes-page__toolbar">
                <button type="button" className="classes-page__edit-trigger" onClick={() => setEditingClass(true)}>
                  Edit Class
                </button>
              </div>
              <ClassSpread heroClass={selectedClass} domainsById={domainsById} gameSets={gameSets} />
            </>
          )}

          {selectedClass && editingClass && (
            <div className="classes-page__edit-panel">
              <ClassForm
                gameSets={gameSets}
                domains={domains}
                initial={selectedClass}
                onSaved={handleClassSaved}
                onCancel={() => setEditingClass(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
