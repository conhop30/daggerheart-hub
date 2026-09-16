import { useState } from 'react';
import type { DragEvent } from 'react';

// Vanilla HTML5 drag-and-drop, no library — every list editor in the app
// (FeatureListEditor, FoundationFeatureListEditor, StringListEditor,
// ExperienceListEditor) has a different row shape, but they all share this
// exact same "reorder an array of N rows by dragging a handle" behavior, so
// it's factored out here once instead of reimplemented per editor.
//
// draggable lives on a small handle within each row, not the row itself —
// making the whole row draggable would fight text selection inside its
// inputs, since a mousedown-drag anywhere in a draggable ancestor can
// hijack input focus.
export function useDragReorder<T>(items: T[], onChange: (items: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop() {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const next = items.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      onChange(next);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  function getHandleProps(index: number) {
    return {
      draggable: true as const,
      onDragStart: () => setDragIndex(index),
      onDragEnter: () => setOverIndex(index),
      onDragOver: (e: DragEvent) => e.preventDefault(), // required to allow a drop at all
      onDragEnd: handleDrop,
      className: `drag-handle${dragIndex === index ? ' drag-handle--dragging' : ''}`,
      'aria-label': 'Drag to reorder',
      title: 'Drag to reorder',
    };
  }

  function getRowClassName(index: number): string {
    return overIndex === index && dragIndex !== null && dragIndex !== index ? ' is-drag-over' : '';
  }

  return { getHandleProps, getRowClassName };
}
