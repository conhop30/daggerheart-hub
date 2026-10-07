import { useState } from 'react';
import type { Combat } from '../api/combats';
import { useDragReorder } from '../lib/useDragReorder';
import './CombatTabBar.css';

interface CombatTabBarProps {
  combats: Combat[];
  activeCombatId: string;
  onSelect: (id: string) => void;
  onReorder: (next: Combat[]) => void;
  onRename: (combat: Combat, name: string) => void;
  onAdd: () => void;
  onDelete: (combat: Combat) => void;
}

// A tab's entire label is its own drag handle, not a separate small handle
// glyph (the convention useDragReorder's other consumers follow for list
// rows) — there's no competing free-text input inside a tab except
// transiently during rename, so a mousedown-drag anywhere on it hijacking
// input focus isn't a risk the way it would be in a row full of text
// fields. draggable is explicitly turned off while that one tab is mid-
// rename, so a click-drag starting inside the open input can't still
// hijack its own text selection.
export default function CombatTabBar({
  combats,
  activeCombatId,
  onSelect,
  onReorder,
  onRename,
  onAdd,
  onDelete,
}: CombatTabBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { getHandleProps, getRowClassName } = useDragReorder(combats, onReorder);

  function startRename(combat: Combat) {
    setDraft(combat.name);
    setRenamingId(combat.id);
  }

  function submitRename(combat: Combat) {
    setRenamingId(null);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== combat.name) onRename(combat, trimmed);
  }

  return (
    <div className="combat-tab-bar">
      {combats.map((combat, index) => {
        const handleProps = getHandleProps(index);
        const renaming = renamingId === combat.id;
        return (
          <div
            key={combat.id}
            {...handleProps}
            draggable={!renaming}
            aria-label={combat.name}
            title="Double-click to rename, drag to reorder"
            // Not handleProps.className: the shared .drag-handle rules (a
            // small muted glyph) are scoped under .session-section-shell,
            // which this bar sits inside, and would outrank the tab's own
            // active colors.
            className={`combat-tab-bar__tab${combat.id === activeCombatId ? ' combat-tab-bar__tab--active' : ''}${
              handleProps.className.includes('drag-handle--dragging') ? ' combat-tab-bar__tab--dragging' : ''
            }${getRowClassName(index)}`}
            onClick={() => onSelect(combat.id)}
            onDoubleClick={() => startRename(combat)}
          >
            {renaming ? (
              <input
                autoFocus
                className="combat-tab-bar__rename"
                value={draft}
                aria-label="Combat tab name"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => submitRename(combat)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(combat);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />
            ) : (
              <span className="combat-tab-bar__label">{combat.name}</span>
            )}
            <button
              type="button"
              className="combat-tab-bar__delete"
              aria-label={`Delete ${combat.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(combat);
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
      <button type="button" className="combat-tab-bar__add" aria-label="Add Combat tab" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
