import { useDragReorder } from './useDragReorder';

// FeatureListEditor/StringListEditor/FoundationFeatureListEditor/
// ExperienceListEditor each reimplement the same add/update/remove-by-index
// shape around useDragReorder, differing only in what a "blank" new row
// looks like and how a field edit is applied to one row. `update` takes a
// whole-item transform (not a field/value pair) so it stays correct for
// StringListEditor's T = string, where there's no field to key into — the
// object-shaped editors just wrap their own field assignment in the
// transform instead.
export function useListEditor<T>(items: T[], onChange: (items: T[]) => void, makeEmpty: () => T) {
  const { getHandleProps, getRowClassName } = useDragReorder(items, onChange);

  function update(index: number, updater: (item: T) => T) {
    const next = items.slice();
    next[index] = updater(next[index]);
    onChange(next);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, makeEmpty()]);
  }

  return { getHandleProps, getRowClassName, update, remove, add };
}
