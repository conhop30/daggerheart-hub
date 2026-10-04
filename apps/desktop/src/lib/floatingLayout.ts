export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

const CASCADE_STEP = 24;
const MAX_ITERATIONS = 8;
const SCREEN_MARGIN = 8;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Good-enough cascading placement for detached Journal floating notes, not
// bin-packing — nudges the desired spot by a fixed step away from whatever
// it collides with, up to a handful of tries, then just accepts whatever
// overlap remains (rare in practice — a GM rarely has more than two or
// three notes detached at once).
export function findNonOverlappingSpot(
  desired: Point,
  size: { width: number; height: number },
  existingRects: Rect[],
  viewport: { width: number; height: number }
): Point {
  let candidate: Point = { ...desired };
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const rect: Rect = { x: candidate.x, y: candidate.y, width: size.width, height: size.height };
    if (!existingRects.some((r) => overlaps(rect, r))) break;
    candidate = { x: candidate.x + CASCADE_STEP, y: candidate.y + CASCADE_STEP };
  }
  return {
    x: Math.max(SCREEN_MARGIN, Math.min(viewport.width - size.width - SCREEN_MARGIN, candidate.x)),
    y: Math.max(SCREEN_MARGIN, Math.min(viewport.height - size.height - SCREEN_MARGIN, candidate.y)),
  };
}
