import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import type { Domain } from '../api/domains';
import type { HeroClass } from '../api/heroClasses';
import { domainsApi } from '../api/domains';
import TextField from './TextField';
import ClassForm from './ClassForm';
import SubclassForm from './SubclassForm';
import './forms.css';
import './CreatePanel.css';

type FlatType = 'Class' | 'Domain' | 'Adversary' | 'Environment' | 'Community' | 'Ancestry' | 'Transformation';
type EquipmentBanner = 'Weapon (Primary)' | 'Weapon (Secondary)' | 'Armor' | 'Loot' | 'Consumable';

const FLAT_TYPES: FlatType[] = ['Class', 'Domain', 'Adversary', 'Environment', 'Community', 'Ancestry', 'Transformation'];
const BUILT_FLAT_TYPES = new Set<FlatType>(['Class', 'Domain']);
const EQUIPMENT_BANNERS: EquipmentBanner[] = ['Weapon (Primary)', 'Weapon (Secondary)', 'Armor', 'Loot', 'Consumable'];

type Stage =
  | { kind: 'chips' }
  | { kind: 'subclass-banners' }
  | { kind: 'equipment-banners' }
  | { kind: 'form'; type: FlatType }
  | { kind: 'subclass-form'; parentClassId: string; parentClassName: string }
  | { kind: 'unavailable'; label: string; back: 'chips' | 'equipment-banners' };

interface CreatePanelProps {
  loading: boolean;
  gameSets: GameSet[];
  domains: Domain[];
  heroClasses: HeroClass[];
  onDomainCreated: (domain: Domain) => void;
  onHeroClassCreated: (heroClass: HeroClass) => void;
}

export default function CreatePanel({
  loading,
  gameSets,
  domains,
  heroClasses,
  onDomainCreated,
  onHeroClassCreated,
}: CreatePanelProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'chips' });

  // Tracks the content's natural height so opening/closing and switching
  // between differently-sized stages (a short chip row vs. a tall form) can
  // animate as a real height transition instead of a hard snap. Kept
  // up to date even while closed, so the very first open already knows the
  // right target height instead of animating from a stale one.
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContentHeight(entry.target.scrollHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function pickFlat(type: FlatType) {
    setStage(
      BUILT_FLAT_TYPES.has(type)
        ? { kind: 'form', type }
        : { kind: 'unavailable', label: type, back: 'chips' }
    );
  }

  function reset() {
    setStage({ kind: 'chips' });
    setOpen(false);
  }

  return (
    <section className="create-panel">
      <button
        type="button"
        className="create-panel__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="create-panel__toggle-label">Create</span>
        <span className="create-panel__toggle-hint">
          {open ? 'Close' : 'Add a Class, Domain, Subclass, and more'}
        </span>
      </button>

      <div
        className={`create-panel__body-wrapper${open ? ' create-panel__body-wrapper--open' : ''}`}
        style={{ height: open ? contentHeight : 0 }}
        aria-hidden={!open}
      >
        <div className="create-panel__body" ref={contentRef}>
          {stage.kind !== 'chips' && (
            <button type="button" className="create-panel__back" onClick={() => setStage({ kind: 'chips' })}>
              &larr; Back
            </button>
          )}

          {stage.kind === 'chips' && (
            <div className="create-panel__chips create-panel__stage" key="chips">
              {FLAT_TYPES.map((type) => (
                <button key={type} type="button" className="chip" onClick={() => pickFlat(type)}>
                  {type}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => setStage({ kind: 'subclass-banners' })}>
                Subclass
              </button>
              <button type="button" className="chip" onClick={() => setStage({ kind: 'equipment-banners' })}>
                Equipment
              </button>
            </div>
          )}

          {stage.kind === 'subclass-banners' && (
            <div className="create-panel__banners create-panel__stage" key="subclass-banners">
              <p className="create-panel__prompt">Attach the Subclass to which Class?</p>
              {heroClasses.length === 0 && (
                <p className="create-panel__empty">No Classes exist yet — create one first.</p>
              )}
              {heroClasses.map((hc) => (
                <button
                  key={hc.id}
                  type="button"
                  className="banner"
                  onClick={() => setStage({ kind: 'subclass-form', parentClassId: hc.id, parentClassName: hc.name })}
                >
                  {hc.name}
                </button>
              ))}
            </div>
          )}

          {stage.kind === 'equipment-banners' && (
            <div className="create-panel__banners create-panel__stage" key="equipment-banners">
              {EQUIPMENT_BANNERS.map((banner) => (
                <button
                  key={banner}
                  type="button"
                  className="banner"
                  onClick={() => setStage({ kind: 'unavailable', label: banner, back: 'equipment-banners' })}
                >
                  {banner}
                </button>
              ))}
            </div>
          )}

          {stage.kind === 'unavailable' && (
            <div className="create-panel__unavailable create-panel__stage" key="unavailable">
              <p>
                <strong>{stage.label}</strong> isn&rsquo;t built on the backend yet — that module is still an
                empty package stub.
              </p>
              <button
                type="button"
                className="create-panel__back"
                onClick={() => setStage(stage.back === 'chips' ? { kind: 'chips' } : { kind: 'equipment-banners' })}
              >
                &larr; Back
              </button>
            </div>
          )}

          {stage.kind === 'form' && stage.type === 'Domain' && (
            <DomainForm
              gameSets={gameSets}
              onCreated={(domain) => {
                onDomainCreated(domain);
                reset();
              }}
              onCancel={reset}
            />
          )}

          {stage.kind === 'form' && stage.type === 'Class' && (
            <ClassForm
              gameSets={gameSets}
              domains={domains}
              onSaved={(heroClass) => {
                onHeroClassCreated(heroClass);
                reset();
              }}
              onCancel={reset}
            />
          )}

          {stage.kind === 'subclass-form' && (
            <SubclassForm
              gameSets={gameSets}
              parentClassId={stage.parentClassId}
              parentClassName={stage.parentClassName}
              onSaved={reset}
              onCancel={reset}
            />
          )}

          {loading && stage.kind === 'chips' && (
            <p className="create-panel__loading">Loading Game Sets, Domains, and Classes&hellip;</p>
          )}
        </div>
      </div>
    </section>
  );
}

// --- Domain form -----------------------------------------------------------
// Stays local for now — Domain doesn't have an Edit flow yet, so there's no
// second caller that would need this extracted the way Class/Subclass did.

function DomainForm({
  gameSets,
  onCreated,
  onCancel,
}: {
  gameSets: GameSet[];
  onCreated: (domain: Domain) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#A97815');
  const [gameSetId, setGameSetId] = useState<string>(gameSets[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!gameSetId) {
      setError('Choose a Game Set.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const domain = await domainsApi.create({ name, description, colorHex, gameSetId });
      onCreated(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Domain.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New Domain</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label className="create-form__color">
        Color
        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
      </label>
      <label>
        Game Set
        <select value={gameSetId} onChange={(e) => setGameSetId(e.target.value)}>
          {gameSets.map((gs) => (
            <option key={gs.id} value={gs.id}>
              {gs.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Creating\u2026' : 'Create Domain'}
        </button>
      </div>
    </form>
  );
}
