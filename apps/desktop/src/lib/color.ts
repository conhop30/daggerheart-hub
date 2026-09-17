// Shared by any gallery tile that themes itself off a flat colorHex (Domain,
// Campaign, ...): a flat color isn't reliable contrast backdrop for white
// text on its own (e.g. Bone's #C9B896 is a light tan) — darkening it toward
// black fixes that everywhere the color is used, not just one component.
export function gradientForColor(colorHex: string | null | undefined): string {
  const base = colorHex ?? 'var(--fear-dim)';
  return `linear-gradient(160deg, ${base}, rgba(0, 0, 0, 0.55))`;
}
