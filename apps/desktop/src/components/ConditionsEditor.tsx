import { useDragReorder } from '../lib/useDragReorder';
import { conditionEffect, type SessionCondition } from '../lib/conditions';
import './FeatureListEditor.css';
import './ConditionsEditor.css';

interface ConditionsEditorProps {
  values: SessionCondition[];
  onChange: (values: SessionCondition[]) => void;
}

// Like StringListEditor, but each row is a stacked count instead of a bare
// string — "Restrained" twice is one row reading "×2", not two identical
// rows. A row whose name matches a known keyword (see lib/conditions) shows
// its live mechanical effect next to the stack count, so e.g. Corrosive's
// Difficulty penalty is visible right where it's being adjusted.
export default function ConditionsEditor({ values, onChange }: ConditionsEditorProps) {
  const { getHandleProps, getRowClassName } = useDragReorder(values, onChange);

  function update(index: number, patch: Partial<SessionCondition>) {
    const next = values.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...values, { name: '', count: 1 }]);
  }

  return (
    <div className="feature-editor">
      <div className="feature-editor__label conditions-editor__label-row">
        Conditions
        <span className="conditions-editor__help" tabIndex={0} aria-label="Condition reference: Hidden, Restrained, Vulnerable">
          <span aria-hidden="true">?</span>
          <span className="conditions-editor__tooltip" role="tooltip">
            <dl>
              <dt>Hidden</dt>
              <dd>
                While you're out of sight from all enemies and they don't otherwise know your location, you gain the
                Hidden condition. Any rolls against a Hidden creature have disadvantage. After an adversary moves to
                where they would see you, you move into their line of sight, or you make an attack, you are no
                longer Hidden.
              </dd>
              <dt>Restrained</dt>
              <dd>Restrained characters can't move, but you can still take actions from their current position.</dd>
              <dt>Vulnerable</dt>
              <dd>When a creature is Vulnerable, all rolls targeting them have advantage.</dd>
            </dl>
          </span>
        </span>
      </div>
      {values.map((condition, index) => {
        const effect = conditionEffect(condition.name);
        const effectDifficulty = effect ? effect.difficultyPerStack * condition.count : 0;
        return (
          <div className={`feature-editor__row conditions-editor__row${getRowClassName(index)}`} key={index}>
            <span {...getHandleProps(index)}>⠿</span>
            <input
              type="text"
              placeholder="e.g. Restrained"
              value={condition.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <div className="conditions-editor__count">
              <button
                type="button"
                className="conditions-editor__count-button"
                onClick={() => update(index, { count: Math.max(1, condition.count - 1) })}
                disabled={condition.count <= 1}
                aria-label={`Decrease ${condition.name || 'condition'} stacks`}
              >
                &minus;
              </button>
              <span className="conditions-editor__count-value">&times;{condition.count}</span>
              <button
                type="button"
                className="conditions-editor__count-button"
                onClick={() => update(index, { count: condition.count + 1 })}
                aria-label={`Increase ${condition.name || 'condition'} stacks`}
              >
                +
              </button>
            </div>
            {effectDifficulty !== 0 && (
              <span className="conditions-editor__effect">{effectDifficulty > 0 ? `+${effectDifficulty}` : effectDifficulty} Difficulty</span>
            )}
            <button type="button" className="feature-editor__remove" onClick={() => remove(index)} aria-label="Remove condition">
              &times;
            </button>
          </div>
        );
      })}
      <button type="button" className="feature-editor__add" onClick={add}>
        + Add condition
      </button>
    </div>
  );
}
