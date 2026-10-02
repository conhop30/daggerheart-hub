# AI Memory

Continuity doc for AI-assisted work on this repo — not interviewer-facing
(see `README.md` for that), not a backlog (see `TODO.md` for that), not the
original frozen design (see `daggerheart-hub-spec.md` for that, mostly
locked except its Section 6). This file exists so a fresh AI agent, with
no memory of prior sessions and nothing but this repo (commits + code +
these docs), can pick up seamlessly — per Connor's standing "AI Project
Initiation Regulations." Keep it current: update it whenever architecture,
status, or the rules below actually change, not just when asked.

## Standing development rules (from Connor's AI Project Initiation Regulations)

These govern how AI-assisted work happens on this project. They're
condensed here from a PDF Connor supplied directly (not itself committed
to the repo) — ask him for the source document if finer detail is needed.

**Quality bar**, in the vocabulary to use when reviewing or designing code:
- **Redundancy** (duplicated operations across files/classes): aim for
  Distinct (none); Minor (duplication only in non-adjacent files) is an
  acceptable fallback; Critical (siblings duplicate) or worse should be
  flagged and fixed.
- **Coupling** (interface complexity between units): never go below
  Document (needs a rich contract to use correctly) — Trivial/
  Encapsulated/Simple are the targets.
- **Cohesion**: Strong (one module does one task completely) is the goal;
  Extraneous/Partial/Weak are the failure modes to name explicitly.
- Big-O efficiency matters less at this app's scale (a local desktop data
  tool, hundreds of records) — performance work here has mostly been
  real-world launch/startup latency (Electron/GPU behavior), not
  algorithmic complexity.

**Process:**
- A brand-new feature gets no code until Connor has been included in the
  design/goals conversation — mockups-before-code for genuinely new,
  creative work (not for bugfixes or applying an established pattern).
- Features/systems/components should be built detachable — removable
  without breaking the rest of the app.
- Commit on completion (tests green, typecheck clean) without waiting to
  be asked. **Do not push** — pushing to `origin/main` is Connor's own
  action, run by him first. (This reverses an earlier project convention
  of commit-and-push together; the newer rule wins as of 2026-10-02.)
- PC vs. Mobile: already resolved for this project specifically — see
  `daggerheart-hub-spec.md` Section 6. The original hosted-backend design
  was dropped for a local-first/no-server model specifically so the same
  content logic could serve both a desktop and a future mobile client.

## Architecture snapshot

- **Electron + Vite + React (TypeScript)**, desktop app at `apps/desktop`.
  No backend/server at all — `electron/main.js` runs a local JSON data
  store (`electron/store.js`), exposed to the renderer via
  `electron/preload.cjs` → `window.daggerheart` → `src/api/client.ts`'s
  `apiClient`. Every per-collection API file (`src/api/*.ts`) is a thin
  typed wrapper over that bridge.
- Dev loop: `npm run electron:dev` (Vite dev server + Electron pointed at
  it, see `vite.config.ts` for the `DAGGERHEART_DEV_PORT` override). CSS
  changes hot-reload live with no app restart.
- Styling: `src/styles/tokens.css` is the single source of CSS custom
  properties — surfaces, the Hope/Fear accent pair, spacing, motion. Two
  independent theme axes: Light/Dark (`ThemeContext`, `[data-theme]`) and
  Color Theme/palette (`PaletteContext`, `[data-palette]`, Settings >
  Color Theme) — palette only swaps the Hope/Fear-derived tokens, never
  the surface tokens, so every palette still reads as "this app."
- Shared form-field components (`src/components/TextField.tsx`,
  `TextAreaField.tsx`, `SelectField.tsx`, `TextFieldFrame.tsx`,
  `NumberInput.tsx`) are the canonical input pattern for the whole app —
  curved Hope/Fear-accented focus treatment, no native number-input
  spinners anywhere (see `src/lib/numberInput.ts` for why). New form
  fields should go through these, not raw `<input>`/`<textarea>`/
  `<select>`.
- Testing: Vitest for unit tests (`electron/*.test.js`, `src/lib/*.test.ts`),
  Playwright for e2e (`apps/desktop/e2e/*.spec.ts`). A change to a shared
  component (TextField family, ContentCard, etc.) gets the *full* e2e
  suite run, not a spot check — regressions in other consumers are easy
  to miss otherwise.

## Current status (as of 2026-10-02)

Recently landed: the Campaign/Party launch redesign, a Settings > Color
Theme system (4 aesthetic palettes + 2 colorblind-safe themes), the
Journal bubble (app-wide floating GM notes, scoped per-Campaign), and a
from-scratch text-field focus treatment (curved Hope/Fear bevel, pentagon
seam, askew growing focus lines) applied to every create/edit `*Form.tsx`
component, every inline numeric chip, and single-field Notes cards —
including a full number-input overhaul (no native spinners, no
scroll/arrow-key stepping anywhere). Deliberately not applied to the
dense list-editor rows, standalone pickers (`GameSetSelect`, `StatGallery`,
the music-panel selects), or `AdventuringPanel`'s notes grid — see
`TODO.md`'s "Text field styling" entry for why each was left alone.

The **Music System Refactor** (editing reachable from inside a live
session, drag-and-drop import, per-track volume, compact track rows) has
landed — see `e2e/music.spec.ts` for the covered behavior.

The code-quality findings flagged 2026-10-02 have all since been acted
on: `createCrudApi`/`createSessionScopedCrudApi` factories now back every
`src/api/*.ts` file and a shared edit/delete list hook exists
(`a54f7eb`); `EquipmentPage.tsx` was split into one sub-component per
entity type (`b027dbc`); the four list-editor components were unified
behind a shared `useListEditor` hook (`befe7bb`). Treat this repo's own
`git log` as the source of truth for whether a future finding like this
has since been resolved, rather than trusting this note indefinitely.

See `TODO.md` for the live backlog. (`QUESTIONS.md` — logged blockers
from unattended work — gets created on demand and deleted once empty; if
it's not present, there's nothing currently blocked on Connor's input.)
