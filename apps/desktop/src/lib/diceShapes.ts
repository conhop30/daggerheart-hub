// 2D silhouettes for the Dice Tray's die buttons, keyed by die size — a
// deliberate simplification (a d100 has no real 100-sided shape to trace),
// matching the convention most tabletop apps use for die-face icons:
// triangle / square / diamond / kite / pentagon / hexagon / circle, not a
// literal unfolded net of each solid. Applied as a CSS clip-path on two
// stacked layers (border color behind, fill color inset on top) — see
// DiceTray.css — the same "clip-path pair" technique DomainRibbon.css uses
// for its pennant shape.
export const DIE_SHAPES: Record<number, string> = {
  4: 'polygon(50% 4%, 97% 94%, 3% 94%)', // triangle — tetrahedron
  6: 'none', // square — cube face, handled by border-radius instead
  8: 'polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)', // diamond — octahedron from a vertex
  10: 'polygon(50% 98%, 3% 61%, 20% 3%, 80% 3%, 97% 61%)', // pentagon, point down — pentagonal trapezohedron; mirror of d12's point-up pentagon, not the original kite outline (read as a toy kite, not a die)
  12: 'polygon(50% 2%, 97% 39%, 80% 97%, 20% 97%, 3% 39%)', // pentagon, point up — dodecahedron face
  20: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', // hexagon — icosahedron simplified
  100: 'circle(48% at 50% 50%)', // percentile — no solid of its own, shown as a circle
};
