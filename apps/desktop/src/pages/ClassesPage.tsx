import { useEffect, useState } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import ClassSpread from '../components/ClassSpread';
import ClassForm from '../components/ClassForm';
import { upsertById } from '../lib/upsert';
import './ClassesPage.css';

export default function ClassesPage() {
  const [heroClasses, setHeroClasses] = useState<HeroClass[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([heroClassesApi.list(), domainsApi.list()])
      .then(([classList, domainList]) => {
        if (cancelled) return;
        setHeroClasses(classList);
        setDomains(domainList);
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
    setCreatingClass(false);
  }

  return (
    <div className="classes-page">
      <div className="classes-page__header">
        <h1 className="classes-page__title">Classes</h1>
        <button type="button" className="classes-page__edit-trigger" onClick={() => setCreatingClass(true)}>
          + New Class
        </button>
      </div>

      {creatingClass && (
        <div className="classes-page__edit-panel">
          <ClassForm domains={domains} onSaved={handleClassSaved} onCancel={() => setCreatingClass(false)} />
        </div>
      )}

      {loading && <p className="classes-page__status">Loading Classes&hellip;</p>}
      {error && <p className="classes-page__status classes-page__status--error">{error}</p>}
      {!loading && !error && !creatingClass && heroClasses.length === 0 && (
        <p className="classes-page__status">No Classes yet &mdash; click + New Class above to create one.</p>
      )}

      {!loading && !error && !creatingClass && heroClasses.length > 0 && (
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
              <ClassSpread heroClass={selectedClass} domainsById={domainsById} />
            </>
          )}

          {selectedClass && editingClass && (
            <div className="classes-page__edit-panel">
              <ClassForm
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
