import { useState } from 'react';
import type { FormEvent } from 'react';
import { partyMembersApi, type PartyMember, type Trackable } from '../api/partyMembers';
import TextField from './TextField';
import TrackableEditor from './TrackableEditor';
import './forms.css';

interface PartyMemberFormProps {
  campaignId: string;
  /** The session the change is made in (it applies from there onward). Omit for the Campaign's latest. */
  sessionId?: string;
  /** Pass an existing PartyMember to edit it; omit to create a new one. */
  initial?: PartyMember | null;
  onSaved: (member: PartyMember) => void;
  onCancel: () => void;
}

export default function PartyMemberForm({ campaignId, sessionId, initial, onSaved, onCancel }: PartyMemberFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [trackables, setTrackables] = useState<Trackable[]>(initial?.trackables ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const member = isEditing
        ? await partyMembersApi.update(initial!.id, { name, notes, trackables }, { sessionId })
        : await partyMembersApi.create({ campaignId, sessionId, name, notes, trackables });
      onSaved(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the party member.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Party Member'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <TrackableEditor trackables={trackables} onChange={setTrackables} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Party Member'}
        </button>
      </div>
    </form>
  );
}
