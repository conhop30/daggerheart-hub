export type SessionSectionId = 'ADVERSARIES' | 'NOTES';

const DEFAULT_ORDER: SessionSectionId[] = ['ADVERSARIES', 'NOTES'];
const ORDER_KEY = 'daggerheart-session-section-order';

// A GM's personal layout habit, not campaign data — global across every
// Session (same category as Theme/Palette/Text Size), not scoped per
// session: a brand-new Session should open in the arrangement the GM just
// customized, not reset to the default.
export function loadSectionOrder(): SessionSectionId[] {
  try {
    const stored = window.localStorage.getItem(ORDER_KEY);
    if (!stored) return DEFAULT_ORDER;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const valid = parsed.filter((id): id is SessionSectionId => DEFAULT_ORDER.includes(id));
    // Guards against a corrupt/partial stored value silently dropping a
    // section off the page — fall back whole rather than render fewer than
    // all of them. (An order saved while the Party section still existed
    // filters down to exactly the two that remain, so it survives.)
    if (valid.length !== DEFAULT_ORDER.length) return DEFAULT_ORDER;
    return valid;
  } catch {
    return DEFAULT_ORDER;
  }
}

export function saveSectionOrder(order: SessionSectionId[]): void {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // Not persisting the layout is harmless.
  }
}
