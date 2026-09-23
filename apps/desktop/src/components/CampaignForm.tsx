import { useState } from 'react';
import type { FormEvent } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import TextField from './TextField';
import './forms.css';

interface CampaignFormProps {
  /** Pass an existing Campaign to edit it; omit to create a new one. */
  initial?: Campaign | null;
  onSaved: (campaign: Campaign) => void;
  onCancel: () => void;
}

export default function CampaignForm({ initial, onSaved, onCancel }: CampaignFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? '#A97815');
  const [level, setLevel] = useState(String(initial?.level ?? 1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = { name, notes, colorHex, level: Number(level) || 1 };
    try {
      const campaign = isEditing ? await campaignsApi.update(initial!.id, body) : await campaignsApi.create(body);
      onSaved(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Campaign.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Campaign'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <TextField label="Party Level" type="number" value={level} onChange={setLevel} min={1} />
      <label className="create-form__color">
        Color
        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
      </label>
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
