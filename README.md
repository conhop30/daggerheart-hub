# Daggerheart homebrew hub

Local desktop app for creating Daggerheart homebrew content. Full context on
the vision, UX flows, schemas, and architecture decisions behind this
structure lives in `daggerheart-hub-spec.md` (kept alongside this scaffold,
not inside the repo itself) — read that first if anything here seems
under-explained.

## Layout

```
apps/desktop/electron/  Electron main process — the local JSON data layer
apps/desktop/seed/      Core Set flavor text (Domains, Classes), loaded on first run
apps/desktop/src/       React + TypeScript frontend
```

There used to be a `server/` (Spring Boot + SQLite). It's gone — no backend
process exists anymore, on desktop or otherwise. See "Architecture" below.

## Architecture

This was originally built as Electron talking to a local Spring Boot backend
over HTTP. That's been dropped in favor of a local-first model with no
backend process at all, because a future mobile (React Native) client can't
embed a JVM the way Electron could. See `daggerheart-hub-spec.md` Section 6
for the full reasoning.

**How it actually works now:** `apps/desktop/electron/main.js` owns a single
JSON file on disk (`~/.daggerheart-hub/data.json`) as the entire database —
`electron/store.js` has the CRUD + validation logic (the direct replacement
for the deleted Spring services, same rules, ported from git history), and
`electron/preload.js` exposes it to the renderer as `window.daggerheart` over
IPC. `src/api/client.ts` calls that bridge instead of `fetch`. On first run,
the store seeds itself from `apps/desktop/seed/core-content.json` (the Core
Set's 9 Domains and 9 Classes).

**Export/Import** (Home page) is the substitute for live sync: Export writes
the whole store to a JSON file via a native save dialog; Import reads one
back and upserts by id. No conflict resolution — last-imported-wins, by
design, not as a placeholder for something smarter later.

## What's actually built vs. stubbed

**Built:** every content type in the spec — Class, Subclass, Domain,
Adversary, Environment, Weapon (Primary/Secondary), Armor, Loot, Consumable,
Community, Ancestry, Transformation — has working create, edit, and delete,
backed by the real local data layer (validation included, e.g. a Secondary
weapon can't be Two-Handed). Every content type also has a place to
actually see what you made: a persistent top nav bar (`AppShell`) reaches
Classes' full gallery/detail view or one of five simpler "browse" pages
(Domains; Adversaries & Environments; Heritage; Equipment; Optional
Mechanics) — minimal list/card views, not the fully designed galleries the
spec describes, but real enough that nothing is write-only anymore.
Export/Import, the Electron dev workflow, a working `electron-builder`
installer build (see the gotcha below), and a real automated test suite
round it out.

Editing and deleting now work for all twelve content types (Class/Subclass
had it already; the other ten got Edit/Delete buttons on their browse-page
cards, backed by the same store validation as create). Deleting a Domain
that a HeroClass still references is a known, deliberate gap — same
limitation the original Spring services had — the UI degrades gracefully
(falls back to a placeholder color) rather than crashing; see the comment
on `removeDomain` in `electron/store.js`.

There's also a real automated test suite now: `npm test` (Vitest) covers
`electron/store.js`'s validation and CRUD rules directly — the idempotent-
by-name creates, the rename-collision skip, the domain-pair and weapon-
burden validation, export/import merge semantics, and first-run seeding —
without touching your real `~/.daggerheart-hub`. `npm run test:e2e`
(Playwright) drives the actual packaged-shape app (real Electron window,
real IPC, a throwaway store directory per test) through navigation, a full
create → edit → delete round trip, and export.

**Not built:** Domain, Heritage, and Optional Mechanics don't have the
fully designed galleries the spec describes (filters, sort, etc.) — just
plain lists.

## Running it

```
cd apps/desktop
npm install
npm run electron:dev
```
This starts the Vite dev server and opens the real Electron window against
it — this is the actual app now, not a browser preview. A plain `npm run
dev` in a browser tab still works for quick UI iteration, but any screen
that touches data will show "This app needs to run inside the Electron
shell," since `window.daggerheart` only exists inside Electron.

Your data lives at `~/.daggerheart-hub/data.json` — delete it to reset to a
fresh seeded state.

## Testing

```
npm test          # Vitest — electron/store.js's rules, no Electron needed
npm run test:e2e  # Playwright — drives the real Electron app end to end
```
Both are hermetic: `test` never touches `~/.daggerheart-hub` (each test gets
a throwaway directory via the `DAGGERHEART_STORE_DIR` env var override), and
`test:e2e` starts and stops its own Vite dev server automatically. Use `npm
run test:watch` for Vitest's watch mode while iterating on `store.js`.

## Packaging a real installer

`npm run electron:build` (via `electron-builder`) has been run for real and
produces a working, launchable NSIS installer — confirmed by installing the
unpacked build and driving it end to end (data loads, navigation works, no
console errors). Two things worth knowing before you run it yourself:

- **Vite's default absolute asset paths (`/assets/...`) break the packaged
  app.** The built app loads `dist/index.html` over `file://`, where a
  leading `/` resolves to the filesystem root, not the `dist/` folder — the
  window opens but silently stays blank because the script tag 404s. Fixed
  already, via `base: './'` in `vite.config.ts` — flagging it in case that
  line ever looks removable, because removing it un-fixes exactly this.
- **Building from inside a OneDrive-synced folder fails with `EPERM:
  operation not permitted, rename ... win-unpacked.tmp -> win-unpacked`.**
  This repo lives under `OneDrive\Documents`, and OneDrive's sync agent
  locks the freshly-extracted Electron files before electron-builder can
  rename them into place. It's not a code or config problem — the same
  build succeeds immediately when the output directory is outside the
  synced folder. Workaround: point the build somewhere not synced, e.g.
  `npx electron-builder --config.directories.output=C:/some/local/path`, or
  pause OneDrive sync for the duration of the build.

Not yet done: a real application icon (the default Electron icon is used —
`electron-builder` warns about this but it isn't fatal), and code signing
with a real certificate (the build self-signs with a local test cert, which
is why Windows will still show an "unknown publisher" warning on install).
