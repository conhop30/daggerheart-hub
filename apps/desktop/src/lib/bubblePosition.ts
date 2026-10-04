export type BubbleEdge = 'left' | 'right' | 'top' | 'bottom';

export interface BubblePosition {
  edge: BubbleEdge;
  /** Distance along the edge from its near corner — the `top` CSS value for left/right edges, `left` for top/bottom edges. */
  offset: number;
}

const POSITION_KEY = 'daggerheart-journal-bubble-position';
const BUBBLE_SIZE = 52;
/** Mirrors tokens.css's --space-3 (1.25rem), the inset the bubble has always sat at. */
const MARGIN = 20;

export function loadBubblePosition(): BubblePosition | null {
  try {
    const stored = window.localStorage.getItem(POSITION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      (parsed.edge === 'left' || parsed.edge === 'right' || parsed.edge === 'top' || parsed.edge === 'bottom') &&
      typeof parsed.offset === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Fall through to null — the bubble just keeps its default corner.
  }
  return null;
}

export function saveBubblePosition(position: BubblePosition): void {
  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Not persisting the position is harmless.
  }
}

/** Keeps a stored offset on-screen if the window has resized smaller since it was saved. */
export function clampOffset(edge: BubbleEdge, offset: number): number {
  const limit = (edge === 'left' || edge === 'right' ? window.innerHeight : window.innerWidth) - BUBBLE_SIZE - MARGIN;
  return Math.max(MARGIN, Math.min(Math.max(MARGIN, limit), offset));
}

/** Given the pointer's final position, picks whichever viewport edge is closest and derives the offset along it. */
export function snapToNearestEdge(x: number, y: number): BubblePosition {
  const distances: Record<BubbleEdge, number> = {
    left: x,
    right: window.innerWidth - x,
    top: y,
    bottom: window.innerHeight - y,
  };
  const edge = (Object.keys(distances) as BubbleEdge[]).reduce((closest, candidate) =>
    distances[candidate] < distances[closest] ? candidate : closest
  );
  const offset = clampOffset(edge, edge === 'left' || edge === 'right' ? y - BUBBLE_SIZE / 2 : x - BUBBLE_SIZE / 2);
  return { edge, offset };
}
