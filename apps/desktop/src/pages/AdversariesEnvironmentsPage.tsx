import { memo, useCallback, useRef, useState } from 'react';
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
import './AdversariesEnvironmentsPage.css';

// Memoized — StatGallery re-renders on every search keystroke/filter click
// (its own internal state), calling renderTile for every item each time;
// with no callback props to go stale, a plain memo is enough to let an
// unaffected tile skip re-rendering.
const AdversaryTile = memo(function AdversaryTile({ a }: { a: Adversary }) {
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
});

const AdversaryTileCondensed = memo(function AdversaryTileCondensed({ a }: { a: Adversary }) {
  return (
    <>
      <span className="stat-gallery__tile-name">{a.name}</span>
      <span className="stat-gallery__tile-subtitle">
        {a.tier != null ? `Tier ${a.tier}` : ''}
        {a.type ? ` ${titleCaseEnum(a.type)}` : ''}
      </span>
    </>
  );
});

// Also memoized: in StatGallery's Expanded mode, renderSpotlight is called
// once per visible item (not just the single selected one), so this is a
// real per-item list callback too — same onEdit/onDelete-takes-an-id
// pattern as EquipmentPage's cards, so a stable handler is what makes the
// memo comparison actually pass.
const AdversarySpotlight = memo(function AdversarySpotlight({
  a,
  onEdit,
  onDelete,
}: {
  a: Adversary;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
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
        <button type="button" className="content-card__action" onClick={() => onEdit(a.id)}>
          Edit
        </button>
        <button type="button" className="content-card__action" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export as Image'}
        </button>
        <button type="button" className="content-card__action content-card__action--danger" onClick={() => onDelete(a.id)}>
          Delete
        </button>
      </div>
      <AdversarySheet a={a} ref={sheetRef} />
    </>
  );
});

const EnvironmentTile = memo(function EnvironmentTile({ e }: { e: Environment }) {
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
});

const EnvironmentTileCondensed = memo(function EnvironmentTileCondensed({ e }: { e: Environment }) {
  return (
    <>
      <span className="stat-gallery__tile-name">{e.name}</span>
      <span className="stat-gallery__tile-subtitle">
        {e.tier != null ? `Tier ${e.tier}` : ''}
        {e.category ? ` ${titleCaseEnum(e.category)}` : ''}
      </span>
    </>
  );
});

const EnvironmentSpotlight = memo(function EnvironmentSpotlight({
  e,
  onEdit,
  onDelete,
}: {
  e: Environment;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
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
        <button type="button" className="content-card__action" onClick={() => onEdit(e.id)}>
          Edit
        </button>
        <button type="button" className="content-card__action" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export as Image'}
        </button>
        <button type="button" className="content-card__action content-card__action--danger" onClick={() => onDelete(e.id)}>
          Delete
        </button>
      </div>
      <EnvironmentSheet e={e} ref={sheetRef} />
    </>
  );
});

export default function AdversariesEnvironmentsPage() {
  const adversaries = useApiList(adversariesApi.list);
  const environments = useApiList(environmentsApi.list);
  const [editingAdversaryId, setEditingAdversaryId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [creatingAdversary, setCreatingAdversary] = useState(false);
  const [creatingEnvironment, setCreatingEnvironment] = useState(false);

  const handleEditAdversary = useCallback((id: string) => setEditingAdversaryId(id), []);
  const handleDeleteAdversary = useCallback(
    async (id: string) => {
      const a = adversaries.items.find((x) => x.id === id);
      if (!a || !window.confirm(`Delete "${a.name}"? This can't be undone.`)) return;
      try {
        await adversariesApi.remove(a.id);
        adversaries.remove(a.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Adversary.');
      }
    },
    [adversaries.items]
  );

  const handleEditEnvironment = useCallback((id: string) => setEditingEnvironmentId(id), []);
  const handleDeleteEnvironment = useCallback(
    async (id: string) => {
      const e = environments.items.find((x) => x.id === id);
      if (!e || !window.confirm(`Delete "${e.name}"? This can't be undone.`)) return;
      try {
        await environmentsApi.remove(e.id);
        environments.remove(e.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete the Environment.');
      }
    },
    [environments.items]
  );

  return (
    <div className="browse-page browse-page--wide">
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
            renderTileCondensed={(a) => <AdversaryTileCondensed a={a} />}
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
                <AdversarySpotlight a={a} onEdit={handleEditAdversary} onDelete={handleDeleteAdversary} />
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
            renderTileCondensed={(e) => <EnvironmentTileCondensed e={e} />}
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
                <EnvironmentSpotlight e={e} onEdit={handleEditEnvironment} onDelete={handleDeleteEnvironment} />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
