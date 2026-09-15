import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { weaponsApi, type Burden, type DamageType, type Weapon, type WeaponSlot, type WeaponTrait } from '../api/weapons';
import TextField from './TextField';
import './forms.css';

interface WeaponFormProps {
  gameSets: GameSet[];
  weaponSlot: WeaponSlot;
  onSaved: (weapon: Weapon) => void;
  onCancel: () => void;
}

const TRAITS: WeaponTrait[] = ['AGILITY', 'PRESENCE', 'INSTINCT', 'KNOWLEDGE', 'FINESSE', 'STRENGTH'];
const DAMAGE_TYPES: DamageType[] = ['PHYSICAL', 'MAGICAL'];

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function WeaponForm({ gameSets, weaponSlot, onSaved, onCancel }: WeaponFormProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [feature, setFeature] = useState('');
  // Locked to One-Handed for Secondary — matches the store-level enforcement
  // in electron/store.js's validateWeapon, not just this default.
  const [burden, setBurden] = useState<Burden>('ONE_HANDED');
  const [damage, setDamage] = useState('');
  const [trait, setTrait] = useState<WeaponTrait | ''>('');
  const [damageType, setDamageType] = useState<DamageType | ''>('');
  const [gameSetId, setGameSetId] = useState<string>(gameSets[0]?.id ?? '');
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
    try {
      const weapon = await weaponsApi.create({
        weaponSlot,
        name,
        tier: tier ? Number(tier) : undefined,
        feature,
        burden: isSecondary ? 'ONE_HANDED' : burden,
        damage,
        trait: trait || null,
        damageType: damageType || null,
        gameSetId,
      });
      onSaved(weapon);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Weapon.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New {titleCase(weaponSlot)} Weapon</h3>
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
                {titleCase(t)}
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
              {titleCase(type)}
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
          {submitting ? 'Creating…' : 'Create Weapon'}
        </button>
      </div>
    </form>
  );
}
