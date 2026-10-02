// Shared by every "number" field in the app (TextField plus the various
// raw inline number inputs — ContentCard, ThresholdsInput,
// ExperienceListEditor, TrackableEditor, SessionAdversaryTile,
// TableDetail): a true <input type="number"> brings its spinner buttons
// along, and even with those hidden via CSS, the value still changes on
// an accidental scroll or an arrow-key press while focused. Rendering as
// type="text" (inputMode="numeric" still gets the numeric keyboard on
// mobile) with this validation instead drops the spinners AND the
// scroll/arrow-key stepping entirely, rather than just hiding the buttons
// cosmetically.
export function isValidNumberInput(raw: string, min?: number | string): boolean {
  const allowNegative = !(min !== undefined && Number(min) >= 0);
  return (allowNegative ? /^-?\d*$/ : /^\d*$/).test(raw);
}
