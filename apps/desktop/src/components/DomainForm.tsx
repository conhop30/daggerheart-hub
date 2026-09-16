import { useState } from 'react';
import type { FormEvent } from 'react';
import { domainsApi, type Domain } from '../api/domains';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import './forms.css';

interface DomainFormProps {
  /** Pass an existing Domain to edit it; omit to create a new one. */
  initial?: Domain | null;
  onSaved: (domain: Domain) => void;
  onCancel: () => void;
}

export default function DomainForm({ initial, onSaved, onCancel }: DomainFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? '#A97815');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? '');
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
    const body = { name, description, colorHex, gameSetId };
    try {
      const domain = isEditing ? await domainsApi.update(initial!.id, body) : await domainsApi.create(body);
      onSaved(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Domain.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Domain'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label className="create-form__color">
        Color
        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
      </label>
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Domain'}
        </button>
      </div>
    </form>
  );
}
