# TO DO

Working backlog of feedback and small fixes not yet acted on. Not
interviewer-facing (see README's Feature Roadmap for that) — this is a
scratch list for planning the next pass of work.

- [x] Data-driven/modularity pass — four
      findings from a codebase review against the metrics in Connor's AI
      Project Initiation Regulations (see `AI_MEMORY.md`'s "Standing
      development rules" section for the vocabulary: Redundancy,
      Coupling, Cohesion). In priority order:
      1. [x] **API CRUD factory** — `src/api/createCrudApi.ts` (two
         factories: plain `createCrudApi`, and `createSessionScopedCrudApi`
         for collections where edits need a SessionContext). All 15
         applicable files converted: `adversaries.ts`, `ancestries.ts`,
         `armors.ts`, `campaigns.ts`, `communities.ts`,
         `consumableTables.ts`, `consumables.ts`, `domains.ts`,
         `environments.ts`, `loot.ts`, `lootTables.ts`,
         `transformations.ts`, `weapons.ts`, `cards.ts` (composed with its
         extra `listByDomain`), `sessionAdversaries.ts` +
         `sessionEnvironments.ts` (session-scoped factory, each keeps its
         own `listBySession`). Deliberately NOT touched: `subclasses.ts`
         and `heroClasses.ts` (both are missing `remove` entirely — a
         pre-existing backend gap, not something to paper over by forcing
         them into the factory), `partyMembers.ts` (optional ctx + two
         list variants — different enough from both factories that
         forcing it in isn't worth it). `npx tsc --noEmit -p .` clean.
      2. [x] **Shared delete/edit hook** — `useEntityActions` added to
         `lib/useApiList.ts`: takes a `useApiList` result, an api's
         `remove`, and an entity label, returns
         `{ editingId, editingItem, edit, cancelEdit, handleDelete }` (id-
         based, so memoized cards keep their stable identity). Adopted in
         all 5 target pages: `EquipmentPage.tsx` (6x — Weapon/Armor/Loot/
         Consumable; LootTable/ConsumableTable reuse the same hook for
         "which table is open" instead of inline edit), fixed also
         previously-unconverted DomainsPage.tsx (plain `useState`, not
         `useApiList` — wrapped its own domain list/remove in the hook's
         expected shape), AdversariesEnvironmentsPage.tsx, HeritagePage.tsx,
         OptionalMechanicsPage.tsx. `npx tsc --noEmit -p .` and `npm test`
         (227 tests) both clean.
      3. [x] **Split `EquipmentPage.tsx`** — 627 lines down to a 118-line
         composer; each entity type now owns its own file
         (`components/WeaponsSection.tsx`, `ArmorSection.tsx`,
         `LootSection.tsx`, `ConsumablesSection.tsx`,
         `LootTablesSection.tsx`, `ConsumableTablesSection.tsx`), plus a
         small `EquipmentCards.tsx` for the two memoized card shapes shared
         across two entity types each (`NameDescriptionCard`, `TableCard`).
         Weapons/Armor are fully self-contained (own `useApiList`/
         `useEntityActions`/filters/creating-state — nothing else on the
         page reads their data). Loot/Consumables take their `useApiList`
         result as a prop because the matching Table type's drill-in
         (still page-level — see below) needs `loot.items`/
         `consumables.items` as its rollable-entry picker list.
         LootTables/ConsumableTables take both their list and
         `useEntityActions` result as props because EquipmentPage itself
         needs `actions.editingItem` to decide the full-page swap to
         TableDetail — deliberately NOT changed to a per-section swap, to
         keep this a pure structural refactor with zero behavior change.
         Verified: `npx tsc --noEmit -p .` clean, `npm test` (227 tests)
         green, and e2e `equipmentTables.spec.ts` (3 tests) +
         `app.spec.ts` + `sessions.spec.ts` (25 tests, cover the other two
         paths that touch this page) all green — not the full suite, since
         the TODO's own note below says to hold that for once all four
         findings land.
      4. [x] **Unify the four list-editor components** —
         `lib/useListEditor.ts` added: wraps `useDragReorder` and returns
         `{ getHandleProps, getRowClassName, update, remove, add }`.
         `update(index, updater: (item: T) => T)` takes a whole-item
         transform rather than a field/value pair, which is what lets it
         stay correct for `StringListEditor`'s `T = string` (no field to
         key into) while the three object-shaped editors
         (`FeatureListEditor`, `FoundationFeatureListEditor`,
         `ExperienceListEditor`) just wrap their own field assignment in
         the transform — `FoundationFeatureListEditor`'s spellcast-trait
         null-conversion and `ExperienceListEditor`'s `Number(raw) || 0`
         conversion both still live in their own file, only the
         boilerplate moved. All four adopted.

      All four findings now landed. `npx tsc --noEmit -p .` and
      `npm test` (227 tests) clean throughout; e2e run so far has been
      scoped per finding (equipmentTables/app/sessions for #2-3,
      featureSections/app/sessions for #4) rather than the full suite —
      run the full suite once, now that all four are in, per the
      shared-component rule in `AI_MEMORY.md`. Per the current push
      policy (see `AI_MEMORY.md`), commit on completion but don't push —
      that's Connor's own action.

- [x] Add a set of selectable themes beyond the current Light/Dark/System
      choice — landed as Settings > Color Theme (PaletteContext,
      [data-palette] on <html>), a second axis independent of Light/Dark:
      Ember (default, zero-config), Abyss, Verdant, Frost, plus two
      colorblind-safe themes built on the Okabe-Ito palette (red-green for
      deuteranopia/protanopia, blue-yellow for tritanopia — different CVD
      axes need different safe pairs, not one "colorblind mode"). Swaps
      only the Hope/Fear accent pair (and -dim/-on-dark text-role
      variants) everywhere that already reads off those tokens — Fear
      Track, Hope/Fear buttons, etc. — never --void/--panel/--ink, so every
      surface still reads as "this app." Each non-Ember role color is WCAG
      contrast-verified (>=4.5:1 for text roles) against both dark and
      light surfaces, same discipline as Ember's own existing tokens.css
      comment. Domain colors are untouched — those are per-Domain user
      data (`colorHex`), not part of the app chrome theme. Picked via
      mockup round: https://claude.ai/artifact/HPufwdLh7ZyVBajTVH2EcM
      (board 2) — all 6 approved as-is.
- [x] Redesign the Campaign launch process (creating/opening a Campaign for
      the first time) — this is the Campaign/Party remodel entry below
      (full-row CampaignBanner with cover images, the ethereal button-pair
      styling it asked to fold in, PartyRoster collapse/portraits, and now
      the staggered open animation) — that whole pass **is** this item,
      landed across several commits this session. Marking done rather than
      leaving it open after the fact actually happened; flag if there's a
      specific piece of "the flow isn't good enough" that still feels
      unaddressed and this should reopen.
- [x] Standardize styling for side-by-side button pairs (e.g. a party
      member's Edit/Delete, a Session row's Open/Delete) — ethereal pair
      style landed in ContentCard.css: no border on the buttons
      themselves, a single hairline between the two, labels padded further
      from the hairline/row edge. The hover fill's height is a per-caller
      choice (`actionsLayout`, default `'inline'`): Party's Edit/Delete
      span just the header/Name row's own top-to-bottom edges (tried
      full-card-height there first, reverted — it swallowed HP/Stress into
      the same visual block as the button), while Sessions' Open/Delete
      use `'full-height'` and span the whole tile, centered, since a
      Session row has nothing below the header worth keeping visually
      separate. Mockup: https://claude.ai/artifact/WxqaGQRTAHoLQHA9HHVhbF
      (board 1).

      Campaign launch redesign — landed, UX still settling before a
      release (see "e2e debt" below):
        - Campaigns tab: each Campaign is a full-row card (CampaignBanner),
          with an optional uploaded image (CampaignForm, stored as a
          data: URL on `coverImage` — no managed file directory yet, see
          note below), fading into the row so text stays readable. The
          image is full-bleed behind the row (not a width-constrained
          strip) so there's no hard rectangular edge for the hover slide
          to expose — only the gradient's own soft edge is ever visible.
          Hover: a flat `.campaign-row__shade` darkens the whole row (not
          a blur on the art — tried that first, but blur softens the image
          without adding contrast, so SELECT and the description still
          fought it) while SELECT (large, capitalized) fades in. The fade
          also slides left (never fully clears) and the shadow lifts, no
          translateY. Description no longer truncates to 2 lines — wraps,
          up to ~2/3 of the row's width. Edit/Delete are gone from the
          row; CampaignDetail covers both once open, and its hero now also
          shows `coverImage` the same way.
        - Party tab is collapsible (PartyRoster, defaults open). Tile SHAPE
          is unchanged from today — a member's optional `portraitImage`
          adds MemberBackdrop behind that unchanged content: a tall image
          centers, a wide one fills the tile. Legibility for both the Name
          row and HP/Stress comes entirely from MemberBackdrop's own scrim
          gradient — a vertical vignette (darker top and bottom edges,
          clear through the middle) layered with the existing left/right
          fade on portrait images — never from a blur sitting on top of the
          content; an earlier masked-`backdrop-filter` version behind
          HP/Stress read as "dreadful"/"very blatant" and was dropped
          entirely, not just softened. Edit/Delete stay header-row height,
          on a flat (non-blurred) frosted-looking tint chip for legibility
          over art. Name/HP/Stress also got a bit of horizontal padding on
          the tile (`.party-roster__member .content-card`) — they were
          flush against the card's edge, `.content-card` has no horizontal
          padding by design elsewhere. No image = pixel-identical to
          before.
        - Sessions' Open/Delete use `ContentCard`'s `actionsLayout="full-
          height"` (Party stays on the default `'inline'`, scoped to just
          the Name row — that's deliberate, see below) — the background
          fill and label centering span the Session tile's real top/bottom
          border, not just the title line.
        - ImageUploadField restyled to match the rest of the app: the
          native `<input type="file">` is visually hidden and triggered by
          a bordered "Choose Image" button (same idiom as
          `.party-roster__add`), with a dashed placeholder box (matching
          `.campaign-row--hollow`'s "empty slot" look) before anything's
          chosen. Preview/placeholder size via a per-field `aspectRatio`
          prop (CampaignForm: wide, matching the row; PartyMemberForm:
          tall, matching a portrait) instead of a fixed square, and the
          hint text dropped its redundant leading "Optional —" (the field
          already reads as optional from having no `required` marker).
- [x] Campaign open animation: selecting a Campaign reads as pushing
      further into the same space now, not a hard page swap — two
      staggered CSS entrance animations (`campaignDetailSlideIn` in
      CampaignDetail.css) on CampaignDetail's existing mount: the hero
      slides up + fades in first (420ms), the body layout (Party/Sessions/
      sidebar) follows on a 140ms delay with `animation-fill-mode: both`
      so it stays invisible during the delay instead of flashing visible
      first. Not a true shared-element transition (no pixel-tracking the
      image's position from the gallery row into the hero) — deliberately
      the cheaper version of this idea. Verified: the 8 campaign-opening
      e2e tests across campaignRow.spec.ts/campaigns.spec.ts still pass
      with no added flakiness (Playwright's actionability auto-wait
      absorbs the ~560ms entrance with no retry logic needed).

      e2e debt — DONE, all 36 affected tests passing (`campaignRow.spec.ts`
      — renamed from `campaignBanner.spec.ts` —, `campaigns.spec.ts`,
      `carryForward.spec.ts`, `sessions.spec.ts`, `music.spec.ts`):
        - Every stale `.campaign-banner`/`.campaign-banner__hit` selector
          renamed to `.campaign-row` (the row IS the button now, no
          separate `__hit`); the now-redundant `.locator('.campaign-row__hit')`
          hop dropped from each click chain. `.campaign-grid` never
          actually had any e2e references, so nothing to do there.
        - Two tests specifically asserted Edit/Delete straight off the
          gallery row, which is gone now (CampaignDetail owns both once a
          Campaign's open) — `campaigns.spec.ts`'s full create→edit→delete
          round trip, and `sessions.spec.ts`'s cascade-delete test. Both
          rewritten to open the Campaign first, then use CampaignDetail's
          "Edit Campaign"/"Delete Campaign" buttons.
        - `coverImage`/`portraitImage` are no longer unbounded: both
          `ImageUploadField.tsx` (immediate client-side error, no round
          trip) and `electron/store.js` (`validateImageDataUrl` — rejects
          outright, not a clamp, since there's no sensible way to shrink an
          oversized image) now cap uploads at 4MB, with unit coverage in
          `store.test.js`. Still a raw data: URL in store.json either way
          (no managed file directory like Music's imports) — fine for now,
          a bigger lift if it ever needs to be.
        - [x] The three gaps above are now covered too, in
          campaigns.spec.ts: PartyRoster's collapse toggle (unmounts the
          roster, header stays); a Campaign cover image round-tripping
          through create -> reload -> Edit -> Remove; a Party member's
          portrait round-tripping the same way plus MemberBackdrop
          re-reading orientation correctly when the image is swapped
          (portrait -> landscape via Edit, not just read once on create).
          A small hand-rolled PNG encoder (same technique the manual
          verification scripts used earlier) writes flat-color fixture
          images at test time — no binary fixture files committed.

- [x] Subclass creation root-caused and fixed (electron/store.js):
      `createSubclass`'s duplicate-name check searched the *entire*
      `store.subclasses` list, not scoped to `parentClassId` — unlike
      Session's identical "two different parents can each have their own
      same-named child" shape, which does scope (`scope: (r) =>
      r.campaignId`). Two different classes with a same-named Subclass
      silently collided: the second `create()` call just returned the
      FIRST class's existing record, so whichever class got tried second
      read as "doesn't accept input" (no error, nothing appears) — matches
      "works in a fresh custom class, fails on Ranger" exactly, since a
      brand-new custom class's first subclass name is virtually guaranteed
      not to collide with anything, while an official class already has
      real seeded sibling names more likely to be hit during testing.
      `updateSubclass`'s rename-collision check had the identical
      unscoped bug. Both fixed, scoped to parentClassId; added 2 unit
      tests covering create and rename across two different classes.
      Separately: the Foundation feature's own spellcast trait no longer
      shows per-feature on the page (ClassSpread.tsx) — it only ever
      existed on `FoundationFeature` (not the plain `Feature` type
      Specialization/Mastery use), and the Subclass-level "Spellcast
      Trait: X" line already shown above made it purely redundant; the
      underlying data field is untouched, still editable, since a
      Foundation feature really can declare a trait in the corebook.
      Still blocked, not actionable: "once card generation exists, the
      Foundation feature should auto-place into a foundation card" — no
      card-generation feature exists in this codebase yet (checked), so
      this has no dependency to act on.
- [ ] Text field styling: give inputs the same curved, initially-invisible
      border treatment Settings buttons already have, plus a focus
      animation where color "grows" out along the top and bottom edges
      (a responsive border extending in on focus, retracting back to just
      the corner curve on blur).
- [x] Heritage tab (EntryCard.tsx — also used by Optional Mechanics'
      Transformation, which gets both fixes for free): Features now render
      unconditionally, right after the tagline — only the long-form
      elaboration paragraph past the tagline stays behind "Read entry".
      The toggle itself now only appears when there's actually prose to
      reveal (`hasMore` no longer counts Features). Communities/Ancestries
      also now pass `layout="grid"` to their `ContentCardList`s — same
      `repeat(auto-fill, minmax(300px, 1fr))` mechanism PartyRoster/
      RegionOverview already use, not StatGallery's own (much heavier,
      stat-block-specific) grid the TODO's wording pointed at; visually
      verified this reads cleanly at 3-per-row with real content (tagline
      + Feature + Read entry toggle all fit without cramping).
- [x] Domain ribbon icon (DomainRibbon.tsx/.css — this is the Domain's own
      symbol on its gallery row/hero, not an individual Domain Card): gold
      divider bar under the icon dropped, icon enlarged (38px -> 54px) and
      centered within the ribbon's rectangular body (its top 78%, above
      where the clip-path's pointed tail starts) instead of a fixed offset
      that assumed the divider's space was spoken for. Bone's icon (its
      domain color is a near-white silver, #D4E4E7) flips to black via a
      `.domain-ribbon--bone` modifier class — every other Domain keeps the
      white icon. Verified visually against all 9 seeded SRD Domains —
      confirmed Blade's *ribbon* icon renders fine (an axe), so the "Blade
      domain's image is broken" report below is specifically about its
      Domain Cards' illustrations, not this ribbon.
- [x] Domain Cards (DomainCardTile.tsx/.css — the individual 2.5"x3.5" card
      tiles, Spell/Grimoire/Ability, not the Domain's own ribbon above):
      checked all 21 of the real Blade domain's cards against a *copy* of
      the user's actual store (never pointed the app at the real file —
      zero risk to it) — every one rendered its ABILITY hexagon glyph
      correctly, nothing reproduced. Whatever this was, it isn't
      reproducing now; left as-is rather than changing working code to
      fix a bug that's no longer there.
      Cards never scroll now: `useFitRulesText` (a small hook in
      DomainCardTile.tsx) measures the rules text's actual rendered
      height against its fixed container and steps the font-size down
      (0.66rem floor to 0.46rem) until it fits, re-running via
      ResizeObserver so a window resize re-fits too — driven by a real DOM
      measurement, not a character-count guess, since the same text can
      need a different size depending on the gallery's actual column
      width. `overflow: hidden` replaces the old `overflow-y: auto` as a
      backstop for text so long it still doesn't fit at the floor (clips
      silently, like a real card's printer would never have let it run
      off the edge, rather than a scrollbar). Verified against the Blade
      deck's real text: several previously-truncated cards (Versatile
      Fighter, Champion's Edge) now read complete at a smaller size; only
      the one genuine outlier (Onslaught, by far the longest) still clips
      at the floor, which is the intended edge-case behavior.
      Dread domain's official card art is
      in the Hope and Fear pdf (ask again if that's needed).
- [x] Adversary picker (StatGallery.tsx — shared with Environment, which
      has no `type` field so its filter row stays Tier-only): "Recently
      Viewed" is stored newest-first still (that's what decides which 8
      survive once the cap hits — eviction has to track real recency) but
      now *displayed* alphabetically, so the list reads as a stable lookup
      instead of reshuffling on every click. New `getType` prop (optional,
      same `items.length > 0` guard pattern as Tier's own filter) adds a
      second "All Types" dropdown next to Tier's, wired up for Adversary
      only.
- [ ] Journal bubble — mockup rounds done (canvas:
      https://claude.ai/artifact/RpoXM9e5xgjzRMU8QJh4vs), plan written and
      approved (`~/.claude/plans/abundant-puzzling-emerson.md`), Phase 1
      landed:
      - **Data layer**: new `journalEntries` collection in
        `electron/store.js` (hand-written, not `makeCollection` — label
        isn't unique and starts blank, which that generic shape doesn't
        support). 7 fixed kinds mirroring the app's own content types —
        Adversaries/Loot/Consumables/Armor/Weapons/Worldbuilding/Other —
        chosen so a note taken while looking at e.g. Equipment's Weapons
        section lands where you'd expect. Cascade-deletes with its
        Campaign. `journalApi` (`src/api/journal.ts`) composed via
        `createCrudApi` + `listByCampaign`, same pattern as `cardsApi`.
      - **`JournalBubble.tsx`** (+ `.css`): app-wide, always visible next
        to `FloatingMusicPlayer`. Its own campaign selection is local,
        transient state — fully decoupled from which page you're on, so a
        GM can browse Adversaries/Equipment/etc. and jot a note against
        whichever Campaign they picked without navigating away. Global
        list of Campaigns when nothing's selected; each row also has a
        separate "Open →" action that *does* navigate the whole app there
        (reuses `App.tsx`'s `jumpToSession`-style one-shot-request
        convention, now `jumpToCampaign`). "+" menu uses plain text
        buttons for the 7 kinds (no icons — matches Equipment's own
        plain-text section headers for these same entity names).
      - Verified: `npx tsc --noEmit -p .` clean, `npm test` (233 tests,
        was 227 — 6 new `JournalEntry` backend tests) green, new
        `e2e/journal.spec.ts` (4 tests) green, plus `app.spec.ts` +
        `campaigns.spec.ts` (19 tests, shared-chrome rule since this adds
        a new always-mounted component) green.
      - **Still open — Phase 2** (see the plan file): drag-reorder within
        a category, the "expand" slide-out detail pane (aligned to the
        Journal panel's full height, flattened touching corners — from
        the mockup's validated design) replacing Phase 1's plain inline
        edit, and outside-click-closes-the-Journal. Full e2e suite once
        Phase 2 lands, not after each phase individually. Explicitly
        **not** building the mockup's rounds 2–3 tear-off/floating-dock
        system — cut once the feature's actual purpose (quick notes while
        browsing elsewhere, not a heavy multi-window tool) was clarified.
