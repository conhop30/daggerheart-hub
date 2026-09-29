const VIEW_KEY = 'daggerheart-equipment-view';

export type EquipmentView = 'cards' | 'table';

// Persisted like the theme/volume preferences — a per-machine UI choice,
// not game content.
export function loadEquipmentView(): EquipmentView {
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === 'table' || stored === 'cards') return stored;
  } catch {
    // localStorage can be unavailable; the default is fine.
  }
  return 'cards';
}

export function saveEquipmentView(view: EquipmentView): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Not persisting the choice is harmless.
  }
}
