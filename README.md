# Daggerheart homebrew hub

Local desktop app for creating Daggerheart homebrew content. Full context on
the vision, UX flows, schemas, and architecture decisions behind this
structure lives in `daggerheart-hub-spec.md` (kept alongside this scaffold,
not inside the repo itself) — read that first if anything here seems
under-explained.

## Layout

```
server/           Spring Boot backend (Java 21, Spring Modulith, SQLite)
apps/desktop/     Electron + React + TypeScript frontend
```

## What's actually built vs. stubbed

**Built, end to end:** the `gameset` module — entity, repository, service,
controller, Flyway migration seeding Core and Hope and Fear, an
`@ApplicationModuleTest`, and a frontend `App.tsx` that calls it as a live
wiring check. This is the reference pattern — copy its shape for every
other module.

**Stubbed:** every other module (`heroclass`, `subclass`, `domain`,
`adversary`, `environment`, `equipment`, `heritage`, `optionalmechanics`)
exists only as a `package-info.java` establishing its module boundary.
No entities yet.

**Not started:** the real home screen and Create-panel UI from the
mockups (App.tsx is a placeholder), Electron packaging/jar-launching,
electron-builder config, CI, and anything under "deliberately deferred"
in the spec (Sheet, printable character sheet export).

## Running it

This was scaffolded in an environment with no access to Maven Central or
npm outside a fixed allowlist, so **none of this has actually been
compiled or run yet.** Expect to fix at least a few dependency-version or
typo issues on the first attempt — that's normal for a from-scratch
scaffold, not a sign something is deeply wrong.

Backend:
```
cd server
mvn spring-boot:run
```
Should start on `localhost:8787` and create `~/.daggerheart-hub/data.db`
on first run via the Flyway migration.

Frontend:
```
cd apps/desktop
npm install
npm run dev
```
Opens on `localhost:5173`. With the backend running, it should list "Core"
and "Hope and Fear" — that confirms the full chain (SQLite → Spring Boot →
REST → React) is actually wired correctly.

Electron itself isn't wired to launch both automatically yet — for now,
run the two commands above in separate terminals, then separately run
`npm run electron:dev` to open a native window pointed at the dev server.

## Adding the next module

Using `gameset` as the template, for e.g. `heroclass`:
1. Write the JPA entity (`HeroClass.java`) in `heroclass/`.
2. Add a package-private `HeroClassRepository`.
3. Add a `HeroClassService` — this is the only thing other modules should
   ever call.
4. Add a `HeroClassController` under `/api/hero-classes`.
5. Add a Flyway migration (`V2__create_hero_class.sql` — next number after
   the game_set migration).
6. Add an `@ApplicationModuleTest` proving it works in isolation.
7. Run `ModularityTests` — it should still pass; if it doesn't, something
   reaches across a module boundary it shouldn't.

## Known open items from the spec worth double-checking during setup

- Flyway's SQLite support may need an extra community artifact depending
  on the exact Flyway version resolved — check this first if migrations
  fail to run.
- Spring Modulith and Spring Boot Parent versions in `pom.xml` are
  believed current but unverified — check for newer releases before
  building.
