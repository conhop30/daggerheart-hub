import { useState } from 'react';
import type { FormEvent } from 'react';
import { cardsApi, type Card, type CardType } from '../api/cards';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
import { titleCaseEnum } from '../lib/format';
import './forms.css';

interface CardFormProps {
  /** Every Card belongs to exactly one Domain — fixed by the gallery, not a form field. */
  domainId: string;
  /** Defaults the Game Set picker to the parent Domain's own Set. */
  defaultGameSetId: string;
  /** Pass an existing Card to edit it; omit to create a new one. */
  initial?: Card | null;
  onSaved: (card: Card) => void;
  onCancel: () => void;
}

const CARD_TYPES: CardType[] = ['SPELL', 'GRIMOIRE', 'ABILITY'];

export default function CardForm({ domainId, defaultGameSetId, initial, onSaved, onCancel }: CardFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<CardType>(initial?.type ?? 'SPELL');
  const [level, setLevel] = useState(initial?.level?.toString() ?? '1');
  const [recallCost, setRecallCost] = useState(initial?.recallCost?.toString() ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? '');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? defaultGameSetId);
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
    const body = {
      name,
      type,
      level: level ? Number(level) : undefined,
      recallCost: recallCost ? Number(recallCost) : undefined,
      description,
      imagePath,
      domainId,
      gameSetId,
    };
    try {
      const card = isEditing ? await cardsApi.update(initial!.id, body) : await cardsApi.create(body);
      onSaved(card);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Card.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Card'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <div className="create-form__row">
        <SelectField label="Type" value={type} onChange={(v) => setType(v as CardType)}>
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleCaseEnum(t)}
            </option>
          ))}
        </SelectField>
        <TextField label="Level" type="number" value={level} onChange={setLevel} min={1} />
      </div>
      <TextField label="Recall Cost" type="number" value={recallCost} onChange={setRecallCost} min={0} />
      <TextAreaField label="Description" value={description} onChange={setDescription} />
      <TextField label="Image URL" value={imagePath} onChange={setImagePath} placeholder="Optional card art" />
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Card'}
        </button>
      </div>
    </form>
  );
}
