import { useState } from 'react';
import type { FormEvent } from 'react';
import { sessionsApi, type Session } from '../api/sessions';
import TextField from './TextField';
import './forms.css';

interface SessionFormProps {
  campaignId: string;
  /** Pass an existing Session to rename it; omit to create a new one. */
  initial?: Session | null;
  /** Pre-fills the name when creating (ignored when renaming). */
  defaultName?: string;
  onSaved: (session: Session) => void;
  onCancel: () => void;
}

export default function SessionForm({ campaignId, initial, defaultName, onSaved, onCancel }: SessionFormProps) {
  const isEditing = initial != null;
  const [name, setName] = useState(initial?.name ?? defaultName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = isEditing
        ? await sessionsApi.update(initial!.id, { name })
        : await sessionsApi.create({ campaignId, name });
      onSaved(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Session.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Rename ${initial!.name}` : 'New Session'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Start Session'}
        </button>
      </div>
    </form>
  );
}
