import { useState } from 'react';
import { useDragReorder } from '../lib/useDragReorder';
import './TabBar.css';

export interface Tab {
  id: string;
  name: string;
}

interface TabBarProps<T extends Tab> {
  tabs: T[];
  activeId: string;
  /** What one tab is called in labels read out to assistive tech: "Combat", "Notes". */
  noun: string;
  /** Prefix for this bar's own hook classes (`combat-tab-bar__tab`, ...) alongside the shared `tab-bar__*` styling ones, so two bars on one page can still be told apart. */
  hook: string;
  onSelect: (id: string) => void;
  onReorder: (next: T[]) => void;
  onRename: (tab: T, name: string) => void;
  onAdd: () => void;
  onDelete: (tab: T) => void;
}

// A row of renamable, reorderable, deletable tabs with a "+" at the end —
// the Session page's Combat tabs and its Notes tabs are both this.
//
// A tab's entire label is its own drag handle, not a separate small handle
// glyph (the convention useDragReorder's other consumers follow for list
// rows) — there's no competing free-text input inside a tab except
// transiently during rename, so a mousedown-drag anywhere on it hijacking
// input focus isn't a risk the way it would be in a row full of text
// fields. draggable is explicitly turned off while that one tab is mid-
// rename, so a click-drag starting inside the open input can't still
// hijack its own text selection.
export default function TabBar<T extends Tab>({
  tabs,
  activeId,
  noun,
  hook,
  onSelect,
  onReorder,
  onRename,
  onAdd,
  onDelete,
}: TabBarProps<T>) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { getHandleProps, getRowClassName } = useDragReorder(tabs, onReorder);

  function startRename(tab: T) {
    setDraft(tab.name);
    setRenamingId(tab.id);
  }

  function submitRename(tab: T) {
    setRenamingId(null);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== tab.name) onRename(tab, trimmed);
  }

  return (
    <div className={`tab-bar ${hook}`}>
      {tabs.map((tab, index) => {
        const handleProps = getHandleProps(index);
        const renaming = renamingId === tab.id;
        return (
          <div
            key={tab.id}
            {...handleProps}
            draggable={!renaming}
            aria-label={tab.name}
            title="Double-click to rename, drag to reorder"
            // Not handleProps.className: the shared .drag-handle rules (a
            // small muted glyph) are scoped under .session-section-shell,
            // which this bar sits inside, and would outrank the tab's own
            // active colors.
            className={`tab-bar__tab ${hook}__tab${tab.id === activeId ? ` tab-bar__tab--active ${hook}__tab--active` : ''}${
              handleProps.className.includes('drag-handle--dragging') ? ' tab-bar__tab--dragging' : ''
            }${getRowClassName(index)}`}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab)}
          >
            {renaming ? (
              <input
                autoFocus
                className={`tab-bar__rename ${hook}__rename`}
                value={draft}
                aria-label={`${noun} tab name`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => submitRename(tab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(tab);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />
            ) : (
              <span className={`tab-bar__label ${hook}__label`}>{tab.name}</span>
            )}
            <button
              type="button"
              className={`tab-bar__delete ${hook}__delete`}
              aria-label={`Delete ${tab.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tab);
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
      <button type="button" className={`tab-bar__add ${hook}__add`} aria-label={`Add ${noun} tab`} onClick={onAdd}>
        +
      </button>
    </div>
  );
}
