import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { weaponsApi, type Burden, type DamageType, type Weapon, type WeaponSlot, type WeaponTrait } from '../api/weapons';
import TextField from './TextField';
import { titleCaseEnum } from '../lib/format';
import './forms.css';

interface WeaponFormProps {
  gameSets: GameSet[];
  weaponSlot: WeaponSlot;
  /** Pass an existing Weapon to edit it; omit to create a new one. */
  initial?: Weapon | null;
  onSaved: (weapon: Weapon) => void;
  onCancel: () => void;
}

const TRAITS: WeaponTrait[] = ['AGILITY', 'PRESENCE', 'INSTINCT', 'KNOWLEDGE', 'FINESSE', 'STRENGTH'];
const DAMAGE_TYPES: DamageType[] = ['PHYSICAL', 'MAGICAL'];

export default function WeaponForm({ gameSets, weaponSlot, initial, onSaved, onCancel }: WeaponFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [tier, setTier] = useState(initial?.tier?.toString() ?? '');
  const [feature, setFeature] = useState(initial?.feature ?? '');
  // Locked to One-Handed for Secondary — matches the store-level enforcement
  // in electron/store.js's validateWeapon, not just this default.
  const [burden, setBurden] = useState<Burden>(initial?.burden ?? 'ONE_HANDED');
  const [damage, setDamage] = useState(initial?.damage ?? '');
  const [trait, setTrait] = useState<WeaponTrait | ''>(initial?.trait ?? '');
  const [damageType, setDamageType] = useState<DamageType | ''>(initial?.damageType ?? '');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? gameSets[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSecondary = weaponSlot === 'SECONDARY';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!gameSetId) {
      setError('Choose a Game Set.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body = {
      weaponSlot,
      name,
      tier: tier ? Number(tier) : undefined,
      feature,
      burden: isSecondary ? ('ONE_HANDED' as const) : burden,
      damage,
      trait: trait || null,
      damageType: damageType || null,
      gameSetId,
    };
    try {
      const weapon = isEditing ? await weaponsApi.update(initial!.id, body) : await weaponsApi.create(body);
      onSaved(weapon);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Weapon.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">
        {isEditing ? `Edit ${initial!.name}` : `New ${titleCaseEnum(weaponSlot)} Weapon`}
      </h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <div className="create-form__row">
        <TextField label="Tier" type="number" value={tier} onChange={setTier} min={1} />
        <TextField label="Damage" value={damage} onChange={setDamage} placeholder="e.g. d8+3" />
      </div>
      <label>
        Feature
        <textarea value={feature} onChange={(e) => setFeature(e.target.value)} rows={2} />
      </label>
      <div className="create-form__row">
        <label>
          Burden
          <select
            value={isSecondary ? 'ONE_HANDED' : burden}
            onChange={(e) => setBurden(e.target.value as Burden)}
            disabled={isSecondary}
            title={isSecondary ? 'Secondary weapons are always One-Handed' : undefined}
          >
            <option value="ONE_HANDED">One-Handed</option>
            <option value="TWO_HANDED">Two-Handed</option>
          </select>
        </label>
        <label>
          Trait
          <select value={trait} onChange={(e) => setTrait(e.target.value as WeaponTrait | '')}>
            <option value="">Not yet chosen</option>
            {TRAITS.map((t) => (
              <option key={t} value={t}>
                {titleCaseEnum(t)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Damage Type
        <select value={damageType} onChange={(e) => setDamageType(e.target.value as DamageType | '')}>
          <option value="">Not yet chosen</option>
          {DAMAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {titleCaseEnum(type)}
            </option>
          ))}
        </select>
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
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Weapon'}
        </button>
      </div>
    </form>
  );
}
