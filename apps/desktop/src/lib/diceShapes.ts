// Wireframe outlines for the Dice Tray's die buttons, keyed by die size —
// drawn as real SVG paths (not a CSS clip-path silhouette) so each one can
// show the die's actual edges, not just its outer shape. A d100 has no
// solid of its own, so it's drawn as a plain circle instead of a path; see
// DiceTray.tsx. Coordinates are in a 0–100 viewBox.
export const DIE_PATHS: Record<number, string> = {
  // Tetrahedron: outer triangle, one edge down to the hidden back vertex.
  4: 'M50,6 L94,90 L6,90 Z M50,6 L38,90',
  // Cube: three visible faces (front/top/right) meeting at one vertex.
  6: 'M40,15 L80,15 L80,65 L65,85 L25,85 L25,35 Z M25,35 L65,35 M65,35 L65,85 M65,35 L80,15',
  // Octahedron: a hexagonal silhouette with one face's triangle inscribed.
  8: 'M50,8 L88,30 L88,74 L50,96 L12,74 L12,30 Z M50,8 L88,74 L12,74 Z',
  // Pentagonal trapezohedron, simplified to a faceted kite (the shape every
  // flat dice-icon set uses for a d10 — the real solid has no flat profile).
  10: 'M50,4 L90,42 L50,97 L10,42 Z M50,4 L50,97 M10,42 L50,50 M90,42 L50,50',
  // Dodecahedron: the front pentagon face, surrounded by its five neighbors.
  12: 'M50,6 L91,37 L75,88 L25,88 L9,37 Z M50,34 L68,48 L61,69 L39,69 L32,48 Z M50,6 L50,34 M91,37 L68,48 M75,88 L61,69 M25,88 L39,69 M9,37 L32,48',
  // Icosahedron: denser hex-on-hex triangulation — the most faceted of the set.
  20: 'M50,8 L88,30 L88,74 L50,96 L12,74 L12,30 Z M50,30 L69,41 L69,63 L50,74 L31,63 L31,41 Z M50,8 L50,30 M88,30 L69,41 M88,74 L69,63 M50,96 L50,74 M12,74 L31,63 M12,30 L31,41',
};
