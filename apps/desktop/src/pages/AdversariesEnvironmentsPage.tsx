import { memo, useRef, useState } from 'react';
import { adversariesApi, type Adversary } from '../api/adversaries';
import { environmentsApi, type Environment } from '../api/environments';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { exportNodeAsImage } from '../lib/exportImage';
import { StatRail } from '../components/StatRail';
import { StatGallery, type StatGalleryColumn } from '../components/StatGallery';
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

const dash = (value: number | null) => value ?? '—';

// Table mode's columns, after Name. What's left out (description, attack,
// Features) is what opening the row is for.
const ADVERSARY_COLUMNS: StatGalleryColumn<Adversary>[] = [
  { key: 'tier', label: 'Tier', width: '64px', align: 'center', render: (a) => dash(a.tier) },
  { key: 'difficulty', label: 'Difficulty', width: '96px', align: 'center', render: (a) => dash(a.difficulty) },
  { key: 'hp', label: 'HP', width: '60px', align: 'center', render: (a) => dash(a.hp) },
  { key: 'stress', label: 'Stress', width: '72px', align: 'center', render: (a) => dash(a.stress) },
  { key: 'type', label: 'Type', width: '110px', render: (a) => (a.type ? titleCaseEnum(a.type) : '—') },
  {
    key: 'experiences',
    label: 'Experiences',
    width: '2fr',
    render: (a) =>
      a.experiences.length > 0
        ? a.experiences.map((e) => `${e.name} ${e.modifier >= 0 ? `+${e.modifier}` : e.modifier}`).join(', ')
        : '—',
  },
];

const ENVIRONMENT_COLUMNS: StatGalleryColumn<Environment>[] = [
  { key: 'tier', label: 'Tier', width: '64px', align: 'center', render: (e) => dash(e.tier) },
  { key: 'type', label: 'Type', render: (e) => (e.category ? titleCaseEnum(e.category) : '—') },
];

export default function AdversariesEnvironmentsPage() {
  const adversaries = useApiList(adversariesApi.list);
  const environments = useApiList(environmentsApi.list);
  const [creatingAdversary, setCreatingAdversary] = useState(false);
  const [creatingEnvironment, setCreatingEnvironment] = useState(false);

  const adversaryActions = useEntityActions(adversaries, adversariesApi.remove, 'Adversary');
  const environmentActions = useEntityActions(environments, environmentsApi.remove, 'Environment');

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
            getType={(a) => (a.type ? titleCaseEnum(a.type) : null)}
            searchMatch={(a, q) => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q)}
            emptyMessage="No Adversaries yet — click + New Adversary above to create one."
            itemLabel="Adversary"
            renderTile={(a) => <AdversaryTile a={a} />}
            renderTileCondensed={(a) => <AdversaryTileCondensed a={a} />}
            tableColumns={ADVERSARY_COLUMNS}
            renderSpotlight={(a) =>
              adversaryActions.editingId === a.id ? (
                <AdversaryForm
                  initial={a}
                  onSaved={(saved) => {
                    adversaries.upsert(saved);
                    adversaryActions.cancelEdit();
                  }}
                  onCancel={adversaryActions.cancelEdit}
                />
              ) : (
                <AdversarySpotlight a={a} onEdit={adversaryActions.edit} onDelete={adversaryActions.handleDelete} />
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
            tableColumns={ENVIRONMENT_COLUMNS}
            renderSpotlight={(e) =>
              environmentActions.editingId === e.id ? (
                <EnvironmentForm
                  initial={e}
                  onSaved={(saved) => {
                    environments.upsert(saved);
                    environmentActions.cancelEdit();
                  }}
                  onCancel={environmentActions.cancelEdit}
                />
              ) : (
                <EnvironmentSpotlight e={e} onEdit={environmentActions.edit} onDelete={environmentActions.handleDelete} />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
