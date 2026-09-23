import { useRef, useState } from 'react';
import { adversariesApi, type Adversary } from '../api/adversaries';
import { environmentsApi, type Environment } from '../api/environments';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { exportNodeAsImage } from '../lib/exportImage';
import { StatRail } from '../components/StatRail';
import { StatGallery } from '../components/StatGallery';
import AdversaryForm from '../components/AdversaryForm';
import EnvironmentForm from '../components/EnvironmentForm';
import AdversarySheet from '../components/AdversarySheet';
import EnvironmentSheet from '../components/EnvironmentSheet';
import './BrowsePage.css';
import './StatSheetSpotlight.css';

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await exportNodeAsImage(sheetRef.current, a.name);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not export image.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="stat-sheet-spotlight__toolbar">
        <button type="button" className="content-card__action" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="content-card__action" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export as Image'}
        </button>
        <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <AdversarySheet a={a} ref={sheetRef} />
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await exportNodeAsImage(sheetRef.current, e.name);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not export image.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="stat-sheet-spotlight__toolbar">
        <button type="button" className="content-card__action" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="content-card__action" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export as Image'}
        </button>
        <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <EnvironmentSheet e={e} ref={sheetRef} />
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
            getSubtitle={(a) => (a.type ? titleCaseEnum(a.type) : null)}
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
            getSubtitle={(e) => (e.category ? titleCaseEnum(e.category) : null)}
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
