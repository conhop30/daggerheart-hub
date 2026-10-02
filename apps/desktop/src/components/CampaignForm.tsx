import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import { musicApi, type MusicRegion } from '../api/music';
import ImageUploadField from './ImageUploadField';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
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
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [defaultRegionId, setDefaultRegionId] = useState(initial?.defaultRegionId ?? '');
  const [regions, setRegions] = useState<MusicRegion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Application-wide regions plus this Campaign's own scoped ones — a
  // brand-new Campaign (no id yet) can't own any scoped regions, so this
  // naturally only offers application-wide ones until first saved.
  useEffect(() => {
    musicApi
      .listRegions()
      .then((list) => setRegions(list.filter((r) => r.campaignId == null || r.campaignId === initial?.id)))
      .catch(() => {
        // No library yet, or running outside Electron — the field just shows "No default".
      });
  }, [initial?.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = {
      name,
      notes,
      colorHex,
      level: Number(level) || 1,
      coverImage,
      defaultRegionId: defaultRegionId || null,
    };
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
      <TextAreaField label="Notes" value={notes} onChange={setNotes} />
      <TextField label="Party Level" type="number" value={level} onChange={setLevel} min={1} />
      <label className="create-form__color">
        Color
        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
      </label>
      <ImageUploadField
        label="Cover image"
        hint="Fades into the Campaign row behind the title. Falls back to the color above when unset."
        value={coverImage}
        onChange={setCoverImage}
        aspectRatio="2.4"
      />
      <SelectField label="Default Music Folder" value={defaultRegionId} onChange={setDefaultRegionId}>
        <option value="">No default</option>
        {regions.map((region) => (
          <option key={region.id} value={region.id}>
            {region.name}
          </option>
        ))}
      </SelectField>
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
