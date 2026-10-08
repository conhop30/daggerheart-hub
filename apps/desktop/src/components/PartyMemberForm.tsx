import { useState } from 'react';
import type { FormEvent } from 'react';
import { partyMembersApi, type PartyMember } from '../api/partyMembers';
import type { HeroClass } from '../api/heroClasses';
import type { Subclass } from '../api/subclasses';
import type { Ancestry } from '../api/ancestries';
import type { Community } from '../api/communities';
import ChipSelect from './ChipSelect';
import ImageUploadField from './ImageUploadField';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import './forms.css';

/** The master lists a Party member's Class/Subclass/Heritage are picked from — fetched once by PartyRoster and shared with every form it opens. */
export interface PartyMemberOptions {
  classes: HeroClass[];
  subclasses: Subclass[];
  ancestries: Ancestry[];
  communities: Community[];
}

interface PartyMemberFormProps {
  campaignId: string;
  /** The session the change is made in (it applies from there onward). Omit for the Campaign's latest. */
  sessionId?: string;
  /** Pass an existing PartyMember to edit it; omit to create a new one. */
  initial?: PartyMember | null;
  options: PartyMemberOptions;
  onSaved: (member: PartyMember) => void;
  onCancel: () => void;
}

const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

export default function PartyMemberForm({ campaignId, sessionId, initial, options, onSaved, onCancel }: PartyMemberFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [classId, setClassId] = useState(initial?.classId ?? '');
  const [subclassId, setSubclassId] = useState(initial?.subclassId ?? '');
  const [multiclass, setMulticlass] = useState(Boolean(initial?.secondClassId || initial?.secondSubclassId));
  const [secondClassId, setSecondClassId] = useState(initial?.secondClassId ?? '');
  const [secondSubclassId, setSecondSubclassId] = useState(initial?.secondSubclassId ?? '');
  const [ancestryId, setAncestryId] = useState(initial?.ancestryId ?? '');
  const [communityId, setCommunityId] = useState(initial?.communityId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [portraitImage, setPortraitImage] = useState<string | null>(initial?.portraitImage ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subclassesOf = (id: string) => byName(options.subclasses.filter((s) => s.parentClassId === id));

  // A Subclass belongs to one Class; switching Class clears a Subclass that
  // no longer fits.
  function chooseClass(next: string) {
    setClassId(next);
    if (!options.subclasses.some((s) => s.id === subclassId && s.parentClassId === next)) setSubclassId('');
  }

  function chooseSecondClass(next: string) {
    setSecondClassId(next);
    if (!options.subclasses.some((s) => s.id === secondSubclassId && s.parentClassId === next)) setSecondSubclassId('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = {
      name,
      notes,
      portraitImage,
      classId: classId || null,
      subclassId: subclassId || null,
      secondClassId: (multiclass && secondClassId) || null,
      secondSubclassId: (multiclass && secondSubclassId) || null,
      ancestryId: ancestryId || null,
      communityId: communityId || null,
    };
    try {
      const member = isEditing
        ? await partyMembersApi.update(initial!.id, body, { sessionId })
        : await partyMembersApi.create({ campaignId, sessionId, ...body });
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

      <ChipSelect label="Class" options={byName(options.classes)} value={classId} onChange={chooseClass} />
      <ChipSelect
        label="Subclass"
        options={subclassesOf(classId)}
        value={subclassId}
        onChange={setSubclassId}
        emptyHint={classId ? 'This Class has no Subclasses yet.' : 'Choose a Class first.'}
      />

      {multiclass ? (
        <>
          <ChipSelect label="Second Class" options={byName(options.classes)} value={secondClassId} onChange={chooseSecondClass} />
          <ChipSelect
            label="Second Subclass"
            options={subclassesOf(secondClassId)}
            value={secondSubclassId}
            onChange={setSecondSubclassId}
            emptyHint={secondClassId ? 'This Class has no Subclasses yet.' : 'Choose a second Class first.'}
          />
          <button type="button" className="create-form__link" onClick={() => setMulticlass(false)}>
            Remove multiclass
          </button>
        </>
      ) : (
        <button type="button" className="create-form__link" onClick={() => setMulticlass(true)}>
          + Multiclass
        </button>
      )}

      <ChipSelect label="Ancestry" options={byName(options.ancestries)} value={ancestryId} onChange={setAncestryId} />
      <ChipSelect label="Community" options={byName(options.communities)} value={communityId} onChange={setCommunityId} />

      <TextAreaField label="Notes" value={notes} onChange={setNotes} />
      <ImageUploadField
        label="Portrait"
        hint="Optional. Their tile uses their Subclass's background on its own; a portrait here replaces it."
        value={portraitImage}
        onChange={setPortraitImage}
        aspectRatio="0.75"
      />
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
