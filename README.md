# Daggerheart Homebrew Hub

A local-first Electron desktop app for authoring and running homebrew
content for **Daggerheart**, Darrington Press's tabletop RPG. It covers both
halves of what a Game Master actually needs: a structured content builder
for every rule-book type (Classes, Domains, Adversaries, Equipment, etc.),
and a **Session Builder** for running a live game session on top of that
content (Fear tracking, live Adversary/Environment stat tracking, a
standing Party roster, dice-backed loot rolls).

Full product context — vision, UX flows, and the original data model — lives
in [`daggerheart-hub-spec.md`](daggerheart-hub-spec.md).

## Overview

The app started as a two-tier system (Electron + a Spring Boot/SQLite
backend) and was deliberately re-architected into a **local-first, backend-
less desktop app**: a single JSON file on disk is the entire database, owned
directly by Electron's main process and exposed to the React UI over a
narrow IPC bridge. That decision — and the reasoning behind it — is the
first entry in [Engineering Challenges](#engineering-challenges--how-they-were-solved)
below, since it's the architectural decision everything else in the repo
builds on.

Every content type (12 in total) has full create/edit/delete backed by real
validation logic (e.g. a Secondary weapon can't be Two-Handed, a Class's two
Domains must be distinct), a real automated test suite (unit + end-to-end),
and a working, installable Windows/macOS/Linux build via `electron-builder`.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Desktop shell | **Electron 31** | Cross-platform native window + filesystem access, with `contextIsolation: true` / `nodeIntegration: false` — the renderer never touches Node or the filesystem directly, only a narrow `contextBridge` API (`window.daggerheart`). |
| UI | **React 18 + TypeScript** | Component-driven UI with types enforced end-to-end, from the store's data shapes through the IPC bridge to the components that render them. |
| Build tool | **Vite 5** | Fast dev server + HMR during UI iteration, and the same config's transform pipeline is reused by Vitest for unit tests. |
| Data layer | **A single JSON file, no database engine or ORM** | `electron/store.js` is plain Node — synchronous CRUD + validation functions operating on an in-memory cache that's flushed to `~/.daggerheart-hub/data.json`. No SQLite, no Prisma/TypeORM. Chosen specifically so the same data-layer approach can be ported to a future React Native mobile client, which can't embed a JVM (ruling out the original Spring Boot backend) or a native SQLite driver the same way Electron can. |
| State management | **Component state + one React Context** | No Redux/Zustand. Almost all state is local to the page that owns it (the same drill-down pattern used throughout: gallery → detail → nested list). The one exception is `GameSetsProvider`, a root-mounted context for the handful of values (Game Sets) that genuinely need to be visible from every form at once. |
| Styling | **Plain CSS with custom-property design tokens** | No Tailwind/MUI dependency. Light/dark theming is two value sets under the same CSS variable names (`tokens.css`), swapped via a `data-theme` attribute — component CSS never needed to change when theming was added. |
| Unit testing | **Vitest** | Drives `electron/store.js`'s CRUD and validation rules directly (idempotent-by-name creates, rename-collision handling, domain-pair/weapon-burden validation, export/import merge semantics) without ever touching the real on-disk store — each test run gets a throwaway directory via a `DAGGERHEART_STORE_DIR` env override. |
| End-to-end testing | **Playwright**, via `_electron.launch()` | Drives the *actual* packaged-shape Electron app — a real window, real IPC round trips, a real (throwaway) store file — not a mocked browser page. |
| Packaging | **electron-builder** | Produces a real NSIS installer on Windows (dmg/AppImage configured for macOS/Linux), verified by installing and running the unpacked build end to end. |

## Architecture

```
apps/desktop/electron/   Electron main process: owns the JSON data file,
                          exposes it to the renderer via a preload bridge
apps/desktop/seed/       Core Set content (Domains, Classes, Cards,
                          Ancestries, Communities), loaded on first run
apps/desktop/src/        React + TypeScript frontend (the renderer process)
```

- **`electron/store.js`** is the entire database: an in-memory cache backed
  by `~/.daggerheart-hub/data.json`, with a `makeCollection()` factory
  giving every content type idempotent-by-name create, PATCH-semantics
  update, and delete for free, plus per-type validation (foreign-key checks,
  enum checks, cross-field rules) layered on top.
- **`electron/preload.js`** exposes that store to the renderer as
  `window.daggerheart` via `contextBridge` — a fixed, narrow set of
  `list/create/update/remove` calls, never raw Node/filesystem access.
- **`src/api/client.ts`** is the renderer-side counterpart: every API call
  goes through this bridge instead of `fetch`, and gracefully degrades (with
  a clear on-screen message, not a crash) when the app is opened in a plain
  browser tab where `window.daggerheart` doesn't exist.
- **Export/Import** (from the Home page) is the deliberate substitute for
  live sync: Export writes the whole store to a JSON file via a native save
  dialog, Import reads one back and upserts by id. No conflict resolution —
  last-imported-wins is a design choice, not a placeholder for something
  smarter later.

## Features

### Content authoring (complete)

All twelve Daggerheart content types — Class, Subclass, Domain, Domain
Card, Adversary, Environment, Weapon, Armor, Loot, Consumable, Community,
Ancestry, and Transformation — have full create/edit/delete, backed by real
validation. Highlights:

- **Domains render as a real gallery**, not a flat list: color-swatched
  banners, a Class-filter row that narrows the grid to a selected Class's
  two Domains, and a click-through to that Domain's own card builder — a
  grid of poker-card-shaped tiles (`aspect-ratio: 2.5 / 3.5`) with an
  illustration band, level badge, and scrollable rules text.
- **Game Sets** (the mechanism for grouping Core vs. homebrew content) can
  be created inline from any form via a shared `GameSetSelect` component,
  immediately available everywhere else through `GameSetsProvider`.
- **Feature lists are drag-to-reorder** (Class Features, Specialization/
  Mastery/Foundation Features, Impulses, Experiences, etc.) via a shared
  `useDragReorder` hook — plain HTML5 drag-and-drop, no external library.
- **Settings**: Light/Dark/System theme (System tracks the OS preference
  live) and window-size presets, persisted to `localStorage` since it's a
  per-machine UI preference, not game content.
- **Adversaries & Environments render as a condensed stat-block gallery**
  with three viewing modes instead of one fixed layout: **Standard** (the
  default — compact tiles + a spotlight column showing the full stat block
  for whichever tile was last clicked, without reflowing the grid),
  **Condense** (name/tier/type only, maximizing how many entries fit on
  screen at once), and **Expand** (every matching entry renders as its own
  full stat sheet inline, opting into more screen space on purpose instead
  of a single narrow detail column). A compressed "Recently Viewed" history
  (name, tier, and Adversary type/Environment category) sits pinned above
  the spotlight's own scroll region — visible at all times, never requiring
  a scroll to reach it — with name/description search and a Tier filter
  alongside the mode toggle. The generic `StatGallery<T>` component (tile
  grid/expanded grid + spotlight + MRU history + search/filter/mode state)
  and `StatRail` (a bordered, hairline-divided stat band replacing rounded
  pill chips, mirroring the corebook's own boxed stat line under a name)
  are reusable — this pass applies them to Adversaries and Environments
  only, the two content types with the most stats per entry. The page
  itself runs wider than the app's other browse pages (`min(1680px, 96vw)`
  vs. the shared 1100px default) since the browsing area is meant to be
  the strong point of sizing here.
- **The spotlight view renders a book-accurate stat sheet**, not the app's
  usual dark theme — `AdversarySheet`/`EnvironmentSheet` reproduce the
  corebook's own printed layout (parchment surface, black serif type, an
  oxblood accent for the subtitle/section headers, a boxed stat line,
  italic feature-type tags) via a scoped `StatSheet.css`, a deliberate,
  intentional exception to the rest of the app's dark UI palette. Each
  sheet has an **Export as Image** button (`html-to-image` rendering the
  DOM node to a PNG, saved via the same native save-dialog pattern as
  Export/Import) so a GM can pull a single Adversary or Environment out as
  a shareable image. Adversary carries the corebook's own type taxonomy
  (Standard/Bruiser/Horde/Leader/Minion/Ranged/Skulk/Social/Solo/Support,
  plus a free-text note for Horde's "(N/HP)" parenthetical) and Environment
  carries its category (Exploration/Event/Social/Traversal) — both
  editable in their forms, and backfilled for all 251 imported Adversaries
  and 47 imported Environments by recovering the type/category word the
  original PDF parse had left stuck onto the front of each description.
- Content is seeded in directly from official PDFs rather than hand-typed:
  the **Core** Game Set carries the full 189-card domain reference, 251
  Adversaries, 47 Environments, 152 Weapons, and 39 Armors, all parsed out
  of the corebook. A second Game Set, **Hope & Fear**, adds that expansion's
  4 Classes/8 Subclasses, 6 new Ancestries, 6 new Communities, 6
  Transformations, a new Dread Domain, and its own Adversary/Environment/
  Equipment/Loot tables — kept fully separate from Core so it can be
  toggled off. A follow-up sanitization pass cleaned the parser's residue
  out of the imported Adversaries/Environments: trailing next-entry names
  and page headers glued onto feature text, features whose name/description
  boundary had shifted (rebuilt by hand from the raw text), dropped numbers
  in "Relentless ()"/"Minion ()", and encoding artifacts. Corebook
  Loot/Consumables and the Hope & Fear Consumables
  table are the one known gap: their source tables interleave two
  print columns badly enough under text extraction that automated parsing
  couldn't hit the same accuracy bar as everything else, so they were
  deliberately left unseeded rather than imported with silent corruption.

### Session Builder (complete)

A second top-level section for actually *running* a game on top of the
content above, as opposed to authoring it. Delivered in three phases:

- **Phase 1 — Campaigns & Party (done).** A Campaign gallery (same
  banner-grid pattern as Domains) holding a standing Party roster per
  Campaign. Party members are deliberately lightweight — name and notes —
  plus a fully freeform list of "trackables" (`{label, current, max}`,
  rendered as a −/+ stepper), so a GM can track HP/Stress/Hope/Armor Slots
  or anything homebrew without a fixed schema. Deleting a Campaign cascades
  to delete its Party — the one deliberate exception to the rest of the
  app's no-cascade-delete rule (see [Engineering Challenges](#engineering-challenges--how-they-were-solved)).
- **Phase 2 — Loot & Consumable Tables (done).** Reusable, rollable tables
  scoped to a Game Set, on the Equipment page: each table holds up to four
  rarity sections (Common/Uncommon/Rare/Legendary), and each entry is a
  `{position, lootId}` reference into a real Loot or Consumable record —
  never a copy, so editing the source item is reflected everywhere it's
  referenced. Positions are validated against the corebook's actual
  item-rarity mechanic (Common caps at 24, Uncommon 36, Rare 48, Legendary
  60 — the highest sum reachable by that rarity's larger d12 pool), with
  uniqueness enforced per rarity. A shared `ItemPicker` (searchable across
  every Game Set, not a flat dropdown) selects which item an entry points
  to. The actual roll math (`rollD12Pool`/`sumPool`/`resolveTableRoll`) is
  pure, dependency-free functions with an injectable RNG, so the dice logic
  itself is unit-tested deterministically rather than through the UI.
- **Phase 3 — Live Sessions (done).** Fear tracking (0–12, a clickable pip
  track), pulling Adversaries/Environments into a session as independent
  snapshot copies — not references, so editing or even deleting the master
  content later can't corrupt an in-progress session — with HP/Stress
  tracked as *marked boxes* (Daggerheart's actual mechanic) via the same
  stepper UI as Party trackables. A combat/adventuring mode toggle swaps
  between a live combatant grid and a notes-and-loot-rolling view (general/
  NPC/per-PC notes, plus a Loot Roller wired directly to Phase 2's tables
  that appends every roll to a reverse-chronological session log). Built as
  independent, self-contained panels on purpose — `SessionView` itself is a
  thin shell that owns no combat/notes state at all, so any one panel can
  be reworked without touching the others (see
  [Engineering Challenges](#engineering-challenges--how-they-were-solved)).

## Engineering Challenges & How They Were Solved

**1. The original architecture couldn't reach a future mobile client.**
The app originally paired Electron with a local Spring Boot + SQLite
backend. That's a dead end for a planned React Native client, which can't
embed a JVM (or a native SQLite driver) the way Electron can. Rather than
maintaining two backend implementations long-term, the Spring services were
dropped entirely in favor of a local-first model: `electron/store.js` is
plain Node holding the exact same CRUD/validation rules, operating on a
single JSON file instead of a database. Record ids moved from server-
assigned auto-increment integers to client-generated UUIDs, since there's
no longer a single authority handing out ids. This is the single biggest
architectural decision in the project, and every layer above it (IPC
bridge, API client, component data-fetching pattern) was built to match.

**2. A packaged build opened a completely blank window.**
`electron-builder`'s output loads `dist/index.html` over `file://`, where
Vite's default *absolute* asset paths (`/assets/index.js`) resolve against
the filesystem root, not the `dist/` folder — the script tag 404s silently,
the window opens, and nothing renders. Root-caused by comparing dev vs.
packaged network behavior, then fixed with one line (`base: './'` in
`vite.config.ts`) to emit relative paths instead. Verified by installing
the actual built installer and confirming the app loads real data with no
console errors.

**3. The installer build failed only inside this repo's folder.**
`npm run electron:build` intermittently failed with
`EPERM: operation not permitted, rename ... win-unpacked.tmp -> win-unpacked`.
Not a code or config bug — the repo lives inside a OneDrive-synced folder,
and OneDrive's sync agent was locking freshly-extracted Electron files
before `electron-builder` could rename them into place. Confirmed by
reproducing the same build against an output directory outside the synced
folder, where it succeeded immediately. Documented as a known environment
gotcha with a one-line workaround (`--config.directories.output` pointed
outside the sync scope, or pausing sync for the build) rather than papering
over it with a retry loop.

**4. A silent React crash produced "a blank colored background, no error."**
Opening the app in a plain browser tab (`window.daggerheart` undefined)
should show a clear "needs Electron" message — instead the page went
completely blank. Root cause: `apiClient`'s methods threw *synchronously*
instead of returning a rejected Promise, so the `.catch()` on every caller
(`useApiList`, `GameSetsContext`) never ran — the throw happened before a
Promise existed to attach it to. A synchronous throw inside a `useEffect`
with no error boundary anywhere in the tree causes React to unmount
*everything*, not just the failing component — hence the blank page with no
console-visible explanation. Fixed by making every `apiClient` method
genuinely `async`, turning the throw into a rejected Promise the existing
`.catch()` handlers could actually see. A permanent regression test was
added that runs against a plain Chromium tab instead of Electron (every
prior Playwright test ran inside Electron, so none of them could have
caught this class of bug).

**5. A dev-server port collision silently loaded the wrong app.**
`wait-on tcp:5173` only confirms *something* is listening on that port —
not that it's this project's Vite server. Since 5173 is Vite's universal
default, running this project alongside another freshly-scaffolded Vite
project risked a different dev server winning the port; `wait-on` would be
satisfied regardless, and `electron/main.js`'s hardcoded
`win.loadURL('http://localhost:5173')` would load a completely unrelated
app into the window with zero indication anything was wrong. Fixed two
ways: moved the dev port off the universal default (5183), and added
`strictPort: true` so a real collision now fails immediately with an
explicit "port already in use" error instead of drifting to 5174/5175 and
masking the problem.

**6. Cascade deletes are usually the wrong default, except when they're
not.** Every content type in the original design deliberately has *no*
cascade delete — deleting a Domain that a HeroClass still references leaves
a dangling reference that the UI degrades around gracefully, rather than
silently deleting a HeroClass a user didn't ask to touch. When the Session
Builder introduced Campaigns owning a Party roster, that same rule would
have left orphaned Party members with no page in the entire app that could
ever reach or delete them again — a real dead end, not a graceful
degradation. The fix was a deliberate, narrow exception rather than a
blanket policy change: `removeCampaign` cascades specifically because a
Party member has no independent reachability path, documented in
`electron/store.js` as the one case where the rule doesn't apply.

**7. Loot Tables and Consumable Tables are the same UI wearing two
labels.** Once the corebook's rarity mechanic was implemented for Loot,
Consumable Tables needed the exact same four-rarity ordered-entry editor —
differing only in which record type an entry references (`lootId` vs.
`consumableId`) and which collection backs the picker. Writing that editor
twice would mean every future bug fix or UX change had to land in two
places and stay manually in sync. Instead `TableDetail.tsx` is generic over
the entry shape, taking `makeEntry`/`getItemId` callbacks to abstract over
the one field that actually differs, the same way `SimpleNameDescriptionForm<T>`
already generalizes the plain name+description forms used by Loot,
Consumable, and now both Table types. One component, two call sites, zero
duplicated validation or layout logic.

**8. A generic factory doesn't always generalize — pulling the same
Adversary into a session twice exposed where `makeCollection` stops
fitting.** Every other content type's create is idempotent-by-name (create
"Ogre" twice, get the same record back) and requires a user-supplied name.
Neither holds for `SessionAdversary`: a GM pulling two Ogres into one fight
needs two independent records, and there's no user-typed name at all — the
display name is snapshotted from the master Adversary at pull-in time. Using
`makeCollection` here would have silently collapsed the second Ogre into the
first. Caught by working through the real scenario before writing the
collection, not after; fixed by hand-writing `sessionAdversaries`'/
`sessionEnvironments`' CRUD directly (always-insert create, the same
reasoning `GameSet` already established for "no natural idempotency key"),
rather than forcing every collection through one factory regardless of fit.

**9. Building Phase 3 as independent panels instead of one screen, on
request.** Sessions needed to compose a lot at once — Fear, a mode toggle, a
combat view, a notes-and-loot view — and the ask going in was explicit:
build it so any one piece can be "unplugged" and reworked without a ripple
effect, expecting several iteration passes. The result mirrors the
ownership boundaries already established elsewhere in the app rather than
inventing a new pattern: `FearTrack` and `ModeToggle` are purely controlled
(no API awareness, like `StatStepper`); `CombatPanel` is fully self-contained
given only a `sessionId` (it fetches and persists its own
SessionAdversaries/SessionEnvironments, the same shape `PartyRoster` already
uses for a `campaignId`); `LootRoller` needs nothing but a log array and an
`onRoll` callback, so it's droppable anywhere a "roll and report" button
would make sense later. `SessionView` itself ends up owning almost no state —
it's a thin shell wiring independent pieces together, so a rewrite of, say,
the combat grid never touches the notes panel or the Fear track.

## Testing

```
npm test          # Vitest — electron/store.js's CRUD/validation rules
npm run test:e2e  # Playwright — drives the real packaged-shape Electron app
```

Both suites are hermetic — neither ever touches a developer's real
`~/.daggerheart-hub/data.json`. `npm test` points the store at a fresh
`DAGGERHEART_STORE_DIR` temp directory per test; `npm run test:e2e` launches
a real Electron process per test with the same env override, and starts/
stops its own Vite dev server automatically. `npm run test:watch` runs
Vitest in watch mode while iterating on the store.

## Feature Roadmap

**Done**
- [x] Full CRUD + validation for all 12 core content types
- [x] Domain gallery with a per-Domain Card builder
- [x] Drag-to-reorder feature lists
- [x] Inline Game Set creation from any form
- [x] Export/Import (JSON snapshot, upsert-by-id merge)
- [x] Light/Dark/System theming + window-size presets
- [x] Real installer builds (Windows NSIS; macOS/Linux targets configured)
- [x] Unit (Vitest) + end-to-end (Playwright) automated test coverage
- [x] **Session Builder Phase 1** — Campaigns gallery + standing Party
      roster with freeform trackables
- [x] **Session Builder Phase 2** — reusable Loot/Consumable Tables on the
      Equipment page, and the pure-function d12-pool roll mechanic
      (`rollD12Pool`/`sumPool`/`resolveTableRoll`) driving the in-session
      Loot Roller
- [x] **Session Builder Phase 3** — live Sessions: Fear tracking, pulled-in
      Adversary/Environment snapshot tracking, per-PC/NPC/general notes, a
      combat/adventuring mode toggle, and a Loot Roller wired to the Phase 2
      tables with a reverse-chronological session log — **the whole Session
      Builder feature is now complete**
- [x] Real corebook + Hope & Fear expansion content imported (Adversaries,
      Environments, Weapons, Armor, Loot, Classes, Ancestries, Communities,
      Transformations) as two independent Game Sets, replacing placeholder
      data
- [x] Condensed gallery view for Adversaries & Environments — a compact tile
      grid, a spotlight column showing the full stat block for whichever
      tile was last clicked (without reflowing the grid), a compressed
      "Recently Viewed" history (name + tier), name/description search, a
      Tier filter, and a bordered `StatRail` frame replacing the old
      rounded pill chips
- [x] Book-accurate stat sheet in the spotlight view (parchment/serif/
      oxblood styling matching the corebook's own printed layout), an
      Export as Image button per sheet, and the Adversary type / Environment
      category taxonomy (editable in both forms, backfilled for all 251
      Adversaries and 47 Environments already imported)
- [x] Condense/Standard/Expand viewing modes for the Adversaries &
      Environments gallery, a wider page layout, and a "Recently Viewed"
      history pinned above the spotlight's scroll region instead of
      requiring a scroll to reach it

**In progress / planned**
- [ ] Same gallery/spotlight/`StatRail` treatment for the other
      `ContentCard`-based pages (Weapons, Armor, Loot, Ancestries,
      Communities, etc.) — this pass deliberately scoped to Adversaries &
      Environments first
- [ ] Fully designed galleries for Heritage and Optional Mechanics (currently
      plain list views — every other content type already got this treatment)
- [ ] A real application icon and code-signing certificate for the packaged
      installer (currently uses Electron's default icon and a self-signed
      test cert)
- [ ] Corebook Loot/Consumables and Hope & Fear Consumables — the source
      tables' two-column layout defeated automated text-extraction parsing
      accurately enough to trust; needs a manual pass or a different
      extraction approach

## Getting Started

```
cd apps/desktop
npm install
npm run electron:dev
```

This starts the Vite dev server and opens the real Electron window against
it — this is the actual app, not a browser preview. A plain `npm run dev`
in a browser tab still works for quick UI iteration, but any screen that
touches data will show a "needs to run inside the Electron shell" message,
since `window.daggerheart` only exists inside Electron.

Your data lives at `~/.daggerheart-hub/data.json` — delete it to reset to a
fresh seeded state.

## Packaging a Real Installer

`npm run electron:build` (via `electron-builder`) produces a working,
launchable NSIS installer on Windows — confirmed by installing the unpacked
build and driving it end to end. See items 2 and 3 under
[Engineering Challenges](#engineering-challenges--how-they-were-solved) for
the two non-obvious issues that had to be solved to get there, and their
fixes/workarounds.

Not yet done: a real application icon (the default Electron icon is used —
`electron-builder` warns about this but it isn't fatal), and code signing
with a real certificate (the build self-signs with a local test cert, which
is why Windows still shows an "unknown publisher" warning on install).
