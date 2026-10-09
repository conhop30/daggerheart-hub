# TO DO

Working backlog of feedback and small fixes not yet acted on. Not
interviewer-facing (see README's Feature Roadmap for that) — this is a
scratch list for planning the next pass of work.

Everything completed up to v1.8.0 was cleared out of this file on
2026-10-07. Those entries (with their file-by-file breakdowns, which
`AI_MEMORY.md` still points at by name) are in git history: see `TODO.md`
as of commit `d1a8669`.

## Loose ends from the v1.8.0 round

- [ ] **Remaining Subclass pictures.** Beastbound, Plague Doctor, Poisoners
      Guild, School of Knowledge and Stalwart have none yet. They go in
      Connor's own `~/.daggerheart-hub/subclass-backdrops/` folder, named
      after the Subclass (`stalwart.jpg`). Never in the repo or a release:
      the pictures are official art kept private on purpose.
- [ ] **Error pop-ups still use the system dialog.** Only delete
      confirmations moved to the app's own dialog (`lib/confirm` +
      `ConfirmHost`). The ~40 `window.alert` calls ("Could not save that
      change" and the like) are untouched. Decide whether they should be
      restyled too, and as a dialog or as something quieter (a toast).
- [ ] **Portfolio music screenshot is pre-1.8.** The demo data set used for
      the v1.8.0 screenshots has no audio, so the Music slide on the
      portfolio page is the old image, and the narrow in-session music
      screenshot was dropped. Reshoot both with a couple of demo tracks.
- [ ] **One unexplained e2e flake.** "a quantity stepper on the Adversary
      picker adds several copies in one click" (`e2e/sessions.spec.ts`)
      failed once in a full run with the Session title reading
      "Session 1-------", then passed on every rerun with no change. Not
      reproduced, cause unknown. Watch for it; if it recurs, look at what
      could type into the Session name field during
      `createCampaignAndOpenSession`.
- [ ] **Portfolio homepage logo placement, unconfirmed.** The tankard icon
      sits in the margin to the left of the Daggerheart Brewery card
      (portfolio commit `06fdc3d`, committed but NOT pushed). Confirm the
      placement with Connor, then push.
- [ ] **Party tile colours may read dark.** The Domain-colour fallback sits
      under the same dark tint that keeps white text readable over a
      photo. Flagged to Connor, no answer yet on whether to brighten it.

## Loose ends from the 2026-10-08 feedback round (v1.8.1)

- [ ] **Condense / Standard / Expand are still there.** Table is the
      default for Adversaries and Environments (Connor's call), and the
      other three modes remain as options. Ask whether any should go once
      he has used the table for a while.
- [ ] **A collapsed stack still lists every member's row.** Collapse All
      hides HP/Stress on single tiles, but a stack's rows are its trackers
      and stay. Not asked for; noted in case it reads as inconsistent.

## Carried over (also on the README roadmap)

- [ ] **Galleries for the other content pages.** Weapons, Armor, Loot,
      Ancestries, Communities and the rest still use the plain
      `ContentCard` list; only Adversaries & Environments got the gallery /
      spotlight / `StatRail` treatment.
- [ ] **Designed pages for Heritage and Optional Mechanics.** Both are now
      the same card grid (`EntrySection`: alphabetical, Set filter,
      full-width features), fixed up after Connor's 2026-10-08 feedback,
      but not the gallery treatment the roadmap means.
- [ ] **A code-signing certificate** for the installer. It is self-signed,
      so SmartScreen shows the "unknown publisher" warning.
- [ ] **Corebook Loot/Consumables and Hope & Fear Consumables.** The source
      tables' two-column layout defeated automated text extraction; needs
      a manual pass or a different extraction approach.

## Waiting on a decision from Connor

- [ ] **Rename the GitHub repo** from `daggerheart-hub` to match
      "Daggerheart Brewery"? Left alone so far because it changes every
      public link (releases, the updater feed, the portfolio).
- [ ] **Faster verification runs** (low priority). Each Electron launch
      costs about half a second. Ideas noted: batch more checks into one
      launch, or drive the Vite dev server in a plain browser where
      Electron itself isn't what's being tested.
