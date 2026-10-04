import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface UsePointerDragOptions {
  onDragStart?: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  /** Pixels of movement before a pointerdown counts as a drag rather than a pending click. */
  threshold?: number;
}

// Pointer Events, not HTML5 drag-and-drop — used for the Journal bubble
// (JournalBubble) and a detached floating note's header (JournalFloatingNote),
// both of which should feel like a native, 1:1-tracking free-space drag with
// no browser-drawn ghost image. useDragReorder's list-row reordering is a
// different interaction (swap position within a list) and deliberately
// stays on HTML5 DnD — this hook isn't a replacement for it.
//
// setPointerCapture redirects every subsequent pointermove/pointerup back to
// the element that received pointerdown, even once the cursor leaves it, so
// onPointerMove/onPointerUp can be plain props on that same element rather
// than needing window-level listeners.
export function usePointerDrag({ onDragStart, onDrag, onDragEnd, threshold = 6 }: UsePointerDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  // Left true after a real drag until the next pointerdown resets it, so the
  // element's own onClick (which fires right after pointerup, same gesture)
  // can check `wasDragged()` and suppress itself — a drag should never also
  // register as a click.
  const draggedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (e.buttons === 0) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!draggedRef.current) {
      if (Math.hypot(dx, dy) < threshold) return;
      draggedRef.current = true;
      setIsDragging(true);
      onDragStart?.();
    }
    onDrag(e.clientX, e.clientY);
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (draggedRef.current) onDragEnd(e.clientX, e.clientY);
    setIsDragging(false);
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDragging,
    wasDragged: () => draggedRef.current,
  };
}
