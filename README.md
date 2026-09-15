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

**Built:** the full local data layer (Electron main process, JSON store,
preload bridge, validation, seeding) for GameSets, Domains, HeroClasses, and
Subclasses; Export/Import; the Electron dev workflow (`npm run electron:dev`
launches Vite and Electron together) and a base `electron-builder` config.
On the UI side: Home page, the Create panel's full cascading chip/banner
flow with working transitions, Class/Subclass creation and editing forms,
and a Classes gallery with a Class/Subclass detail spread.

**Not built:** Adversary, Environment, Equipment, Heritage, and Optional
Mechanics are still UI stubs — the Create panel says so when you pick one.
`App.tsx`'s routing is an explicit placeholder (flagged in its own code
comment) for the real single-page navigation the spec describes. No
automated tests exist yet (Vitest/RTL/Playwright, per the spec).

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

**Packaging a real installer** (`npm run electron:build`, via
electron-builder) is configured in `package.json` but hasn't been run in
this environment — try it before relying on it.
