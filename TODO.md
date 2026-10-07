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
- [x] Text field styling: a from-scratch treatment, not a port of an
      existing Settings-button style (the one the TODO item originally
      pointed at didn't actually exist — see former `QUESTIONS.md` #1,
      now resolved and removed). Resting state: a curved Hope/Fear bevel
      on the left edge only, meeting at a pentagon badge (outline only,
      echoing the Dice Tray's own d12 icon) where the two halves join.
      On focus, a Hope line grows along the top and a Fear line along the
      bottom, askew on purpose (Top covers half the distance Bottom does
      in the same transition time). Built as one shared chrome
      (`TextFieldFrame.tsx`) behind three typed field components —
      `TextField` (text/number), `TextAreaField`, `SelectField` — plus a
      standalone `NumberInput` (`lib/numberInput.ts`) that drops a native
      `type="number"`'s spinner buttons AND its scroll/arrow-key
      stepping, not just hides the spinners cosmetically. Applied to
      every create/edit `*Form.tsx` component, every inline numeric chip
      (Thresholds, Trackables, stat chips, table positions), and
      single-field Notes cards (`SessionEnvironmentTile`). Deliberately
      NOT applied to: the dense list-editor rows (`FoundationFeatureListEditor`
      and siblings — already raw-styled for table-row density, predating
      this pass), or `GameSetSelect`/`StatGallery`/the music-panel selects
      (standalone pickers, not form fields). (`AdventuringPanel`'s old
      multi-field Notes grid, which would have needed the same treatment,
      was removed outright instead — see the Journal bubble entry below.)
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
- [x] Journal bubble — mockup rounds done (canvas:
      https://claude.ai/artifact/RpoXM9e5xgjzRMU8QJh4vs), plan written and
      approved (`~/.claude/plans/abundant-puzzling-emerson.md`), both
      phases landed:
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
      - **Phase 2**: drag-reorder within a category (reuses the existing
        `useDragReorder` hook — a small `JournalCategoryGroup` subcomponent
        owns one call per rendered group, since the hook can't be called
        conditionally/in a loop); the "expand" detail pane, aligned to the
        Journal panel's full fixed height with flattened touching corners
        so the two read as one split window (replaces Phase 1's plain
        inline edit); outside-click-anywhere-but-Journal/detail/bubble
        closes the Journal, bubble reopens it exactly as it was
        (`detailEntryId` is never cleared on close, only hidden).
        Explicitly **not** built: the mockup's rounds 2–3 tear-off/
        floating-dock system — cut once the feature's actual purpose
        (quick notes while browsing elsewhere, not a heavy multi-window
        tool) was clarified.
      - One real bug hit and fixed along the way: the outside-click
        handler first used a `click` listener on `document`, which fired
        *after* React's own click handler during bubbling — so selecting
        a Campaign (which swaps the panel's whole DOM subtree
        synchronously) detached the clicked button from the tree before
        the listener ran, making `target.closest()` fail to find its own
        ancestor and misfire as an outside click, instantly closing the
        panel it had just opened. Fixed by listening on `mousedown`
        instead, which fires before React's handler.
      - Verified: `npx tsc --noEmit -p .` clean, `npm test` (233 tests)
        green, `e2e/journal.spec.ts` (6 tests, up from 4 — added outside-
        click/reopen-restores-detail-pane and drag-reorder-persists)
        green, plus the full e2e suite (74 tests) green, per the plan's
        "full suite once after Phase 2" rule.
      - **Follow-up fix**: the Journal's "Open →" action could silently
        no-op — `CampaignsPage`'s `jumpToCampaign` effect set the new
        `selectedCampaignId` but never cleared a leftover `selectedSession`
        from browsing deep into a *different* campaign's Session, so the
        render branch that checks `selectedCampaign && selectedSession`
        kept showing the stale Session instead of switching campaigns.
        Fixed by clearing `selectedSession` in that same effect.
      - **Adventuring Notes removed**: `AdventuringPanel`'s old Campaign/
        NPC/Party/Session Notes fields were cut now that the Journal
        covers the same need (per-Campaign GM notes), per-Session rather
        than Journal's per-Campaign scope. `AdventuringPanel` now renders
        only the Loot Table roller. Removed end-to-end: the
        `campaignNotes`/`npcNotes`/`generalNotes`/`pcNotes` fields are
        gone from the Session data model (`electron/store.js`'s
        `CARRIED_SESSION_FIELDS`, `buildRecord`, `presentSession`,
        `mergeExtra`, `removeSession`, `cloneSession`; `carry.js`'s
        `resolvePcNotes`; `src/api/sessions.ts`), `SessionView` no longer
        tracks a `members` list solely to feed the notes panel, and every
        e2e spec that filled/asserted on a Notes field
        (`sessions.spec.ts`, `carryForward.spec.ts`, `campaignRow.spec.ts`)
        was updated to drop that coverage while keeping its other
        assertions (Fear/mode/loot carry-forward, rename/delete, clone).
        Only `fear` and `regionId` still carry forward as session-level
        scalars.
- [x] Merged the Adventuring/Combat Session tabs into one page, and let
      Music folders be scoped to a Campaign:
      - **SessionView**: `ModeToggle`/`ModeTransitionFX` (the sword/
        footstep switch animation) and `AdventuringPanel` are deleted
        outright — there's no more mode to toggle or animate between.
        `CombatPanel` (Adversaries/Environments) always renders in the
        main column now. `LootRoller` moved into the sidebar, after
        `SessionCombatSidebar`, and was compacted
        (`LootRoller.css`) to fit the ~260px column alongside
        `SessionMusicPanel` and the Adversary compactor. `Session.mode`
        is gone from the data model entirely — nothing replaced it, since
        Music no longer depends on it (see below). `CampaignsPage`'s
        `campaigns-page--wide` layout, previously conditional on
        `mode === 'combat'`, is now unconditional whenever a Session is
        open, since the wide grid it was built for is always on screen.
      - **Music folders, scoped to a Campaign**: a `musicRegion` gets a
        nullable `campaignId` — `null` is application-wide (today's
        behavior, picked from any Campaign's Sessions), set scopes it to
        just that one Campaign (offered only from that Campaign's own
        Sessions; a different Campaign never sees it). Deleting a
        Campaign promotes its scoped regions to application-wide rather
        than destroying them (same "keep the folder's tracks" spirit as
        deleting a region already had). Each region's two single-track
        mode-defaults (`adventuringTrackId`/`combatTrackId`) collapse
        into one `defaultTrackId`, since there's no more mode axis to
        pick between — a GM switches regions by hand whenever they want
        different music playing, same as picking a different playlist;
        `resolveDefaultTrack` (`src/lib/music.ts`) drops its `mode`
        parameter to match. New: `Campaign.defaultRegionId` (nullable,
        must be an application-wide region or one already scoped to that
        Campaign) pre-fills a Campaign's *first* Session's region only —
        every later Session still carries forward whatever the previous
        one had, same as today. `useMusicLibraryEditor`'s
        `scopeCampaignId` option (null = app-wide only, for the main
        Music tab; a Campaign's id = app-wide plus that Campaign's own,
        for the in-Session "Manage Music" editor) filters both the
        region list and what a new "+ New Region" gets stamped with;
        `MusicContext`'s own `regions` does the same narrowing for
        playback/the region `<select>` itself.
      - Backward-compatible: a region or Campaign record written by an
        older version of the app (missing `campaignId`/`defaultTrackId`/
        `defaultRegionId` entirely) is backfilled at read time, never
        rewritten on disk — same convention as the existing track-volume
        and Campaign-coverImage fixups. A region's old
        `adventuringTrackId`/`combatTrackId` pair, if present, resolves
        to the new `defaultTrackId` preferring the Adventuring one.
      - Updated: `electron/store.test.js`/`carry.test.js` (dropped the
        mode-enum tests, renamed the Music-region field assertions, added
        Campaign-scoped-region + `defaultRegionId` coverage, added the
        region/Campaign backfill tests), `e2e/music.spec.ts` (all 14
        existing tests moved to the single-`defaultTrackId` shape; the
        mode-switch test became a manual-region-switch test; added a new
        Campaign-scoping test), `e2e/sessions.spec.ts`/`carryForward.spec.ts`/
        `campaignRow.spec.ts` (dropped every `.mode-toggle` click/
        assertion).
      - Verified: `npx tsc --noEmit -p .` clean, `npm test` (238 tests)
        green, full `playwright test` suite (75 tests) green. Shipped as
        v1.7.0.
      - One real bug caught by the new Campaign-scoping e2e test itself
        (not the app): its helper assumed clicking the top "Campaigns"
        nav link resets `CampaignsPage` back to the gallery, but that
        page keeps its own drill-down state (`selectedCampaignId`/
        `selectedSession`) across that click by design — only its two
        dedicated back buttons clear it. Fixed by backing out through
        `.session-view__back`/`.campaign-detail__back` first when either
        is open.
- [x] Journal bubble polish, Session Notes, and two Adversary-tile/picker
      improvements, from live-play feedback on the merge above:
      - **No more entry-count badge** on the bubble — removed outright
        (`JournalBubble.tsx`/`.css`), nothing replaced it.
      - **The bubble itself is now freely draggable**, snapping to
        whichever window edge it's released nearest (new
        `src/lib/usePointerDrag.ts`, Pointer Events rather than HTML5
        DnD — a FAB drag should feel 1:1, with no browser ghost image).
        Position persists via `src/lib/bubblePosition.ts`
        (`daggerheart-journal-bubble-position`); the panel/detail stack's
        anchor flips to whichever side keeps it on screen
        (`.journal-stack--anchor-right`/`--anchor-top`). A drag always
        closes the panel first (you can't drag it open, same as a mobile
        chat bubble), and a real drag never also registers as a click.
      - **An entry can be dragged out of its list to detach it** into its
        own small floating note (new `JournalFloatingNote.tsx`, same
        underlying record, not a copy — editing either place edits the
        same data). Detected by wrapping the existing drag handle's
        `onDragEnd` to check whether it landed outside
        `.journal-panel__body`; `useDragReorder` itself is untouched.
        Detached notes cascade-avoid overlapping each other
        (`src/lib/floatingLayout.ts`) and reset on every launch (a
        working arrangement, not data) — a new `JournalEntryFields`
        component factors the shared label/notes editing body out of
        `JournalDetailPane` so both it and the floating note edit
        identically.
      - **Session Notes**: a new `JournalEntryKind = 'SESSION'`
        (deliberately excluded from the "+" add-entry menu — it's never
        hand-created) whose label is kept equal to a real Session's own
        `name`, found by that match rather than a stored link. The bubble
        gets a Campaign/Session toggle (`notesScope`); picking a Session
        there looks up or creates its entry on click, never on keystroke.
        A new `SessionNotesPanel.tsx` is the same feature from inside a
        live Session, below Combat. Renaming a Session now goes through
        `electron/store.js`'s `updateSessionAndSyncNotes` instead of the
        generic `sessions.update`, so the linked entry's label is
        relabeled in the same atomic write — `makeCollection` gained an
        unwrapped `applyUpdate(store, id, patch)` so this could happen
        inside one `mutate` call (nesting a second `mutate` call from
        inside the first would never resolve — see its own comment).
      - **Party/Adversaries/Notes are now drag-reorderable** on the
        Session page, the same `useDragReorder` hook applied at section
        rather than row granularity (new `SessionSectionShell.tsx` gives
        each a drag handle; `src/lib/sessionSectionOrder.ts` persists the
        order as one global GM layout preference, not per-session).
        `FearTrack` stays pinned above all three.
      - **Adversary tiles gain a second, independent collapse** —
        `bodyOpen` (owned in `CombatPanel.tsx` alongside the existing
        `tileFeaturesOpen`) hides HP/Stress, roll results, Experience,
        Conditions, and Features entirely, while the header/meta chips
        and both roll buttons stay unconditional. Orthogonal to the
        existing Features toggle, not a replacement for it.
      - **A quantity stepper on the Adversary picker** (`ItemPicker`'s
        new optional `quantity` prop, left unused by the Environment
        picker it's shared with) adds several copies in one click — new
        `QuantityStepper.tsx` (floors at 1, unlike `StatStepper`'s floor
        of 0) rather than reusing `StatStepper` and risking its HP/
        Stress/trackable callers. `SessionView.pullInAdversary` creates
        sequentially, not via `Promise.all`, since `CombatPanel`'s
        duplicate-suffix numbering (`#1`/`#2`/...) depends on
        `sessionAdversaries`' actual list order.
      - Updated: `electron/store.test.js` (SESSION kind, the rename-sync
        wrapper, a reverted-collision-rename case), `e2e/journal.spec.ts`
        (badge gone, bubble drag-and-snap, detach/reattach, the Campaign/
        Session toggle), `e2e/sessions.spec.ts` (the quantity stepper,
        the deeper tile collapse, Session Notes sync + rename-sync +
        section drag-reorder, all end to end).
      - Two real bugs caught by the new e2e coverage itself (not pre-existing,
        both introduced by this round and fixed before landing): (1) a
        floating note's own clicks (editing it, clicking Reattach) counted
        as "outside the Journal" and silently closed the whole panel —
        `.journal-floating-note` was missing from the outside-click
        detector's `closest()` selector in `JournalBubble.tsx`; (2) the
        Reattach button sat inside the header's drag-capture region, so
        `setPointerCapture` retargeted its click away from the button —
        fixed with `onPointerDown={(e) => e.stopPropagation()}` on the
        button itself (`JournalFloatingNote.tsx`). Also added
        `app.setPath('userData', ...)` in `electron/main.js`, gated on
        `DAGGERHEART_STORE_DIR` — Electron's userData dir (which backs a
        renderer's `localStorage`, now including the bubble's position and
        the Session section order) wasn't test-isolated the way the JSON
        store already is, which the bubble-position e2e test surfaced as a
        flaky "starts at the wrong corner" failure across repeated runs.
      - Verified: `npx tsc --noEmit -p .` clean, `npm test` (242 tests)
        green, full `playwright test` suite (84 tests) green.
      - **Follow-up (same day, live-play again)**: two more real bugs, this
        time found by Connor rather than tests. (1) Typing into Session
        Notes and clicking away could permanently stop accepting input —
        `DiceTray` is `position: fixed`, bottom-center of the *viewport*
        (not the main column), and on a short Session it visually lands
        right on top of Notes (the default last section); its own
        padding/background had no `pointer-events: none`, so
        `document.elementFromPoint` resolved to `.dice-tray` there and ate
        the click before it ever reached the textarea. Fixed in
        `DiceTray.css`: the container goes `pointer-events: none`, with
        `pointer-events: auto` re-enabled only on the actual die/roll/
        dismiss buttons — clicks on its dead space now pass through to
        whatever's underneath (this is the general fix; it also covers the
        Journal panel, which overlaps `DiceTray` at its default position
        too, not just a dragged one). A first attempt instead raised
        `SessionNotesPanel`/`JournalBubble`'s own z-index above DiceTray's
        — wrong fix, since it also raised their *non-interactive*
        background above DiceTray's own die buttons wherever they
        overlapped, breaking two existing dice-tray e2e tests; reverted in
        favor of the pointer-events approach. (2) "Notes don't show up on
        the other side" — `JournalBubble`'s entries fetch only ran once
        per Campaign selection (`[selectedCampaignId]`), not every time
        the panel reopened, so an edit made from `SessionNotesPanel` while
        the bubble was closed stayed invisible until something else
        happened to change `selectedCampaignId`. Added `open` to that
        effect's dependency array, matching the Campaigns-list effect's
        existing "refetch when it becomes visible" pattern.
      - Added regression coverage for both in `e2e/sessions.spec.ts`
        ("stays clickable even where it visually overlaps the fixed Dice
        Tray") and `e2e/journal.spec.ts` ("closing and reopening the
        Journal refetches, picking up an edit made elsewhere").
      - Re-verified: `npx tsc --noEmit -p .` clean, `npm test` (242 tests)
        green, full `playwright test` suite (86 tests) green.
- [x] **Combat tabs**: lets a GM prep multiple encounters ahead of time
      without disturbing the one currently live, from a design
      conversation (mockups, then follow-up questions) rather than a
      blank page per the project's standing rule for new creative UI.
      - A new horizontal tab bar (`CombatTabBar.tsx`/`.css`) sits above
        the Adversaries section; each tab scopes its own Adversary AND
        Environment roster. Fear/Loot/Dice Tray stay session-wide,
        untouched by any of this.
      - **New `combats` versioned collection** (`electron/store.js`),
        built on the exact same `makeVersionedCollection` factory as
        `sessionAdversaries`/`sessionEnvironments`/`partyMembers` — so a
        tab carries forward across Sessions in a Campaign, can be renamed/
        reordered from a later session without disturbing earlier ones,
        and deleting one only removes it from that session onward, with
        zero new engine code in `carry.js`. Only two fields beyond
        identity: `name` (double-click to rename) and `order` (drag-
        reordered, via the same `useDragReorder` hook already used
        elsewhere — a tab's whole label is its own drag handle here,
        the one deliberate exception to this app's usual separate-handle-
        glyph convention, since there's no competing free-text surface
        inside a tab except transiently during rename).
      - **`combatId`** added to `SessionAdversary`/`SessionEnvironment` —
        optional, not required (nothing about either record's own
        correctness depends on it), validated against a real Combat
        lineage id when present. A `null` `combatId` (every record that
        predates this feature) is **adopted into the session's first tab
        the first time that session is opened** — an ordinary `update`
        from the renderer (`SessionView` for Adversaries, `CombatPanel`
        for Environments, each after its own fetch has settled), so it
        stays put if tabs are reordered later. The first cut treated
        `null` as a wildcard visible from every tab instead; Connor's own
        live data (all of it pre-feature) made every tab show the same
        roster, which read as "the tab won't switch."
      - **Deleting a tab cascades** to every Adversary/Environment
        currently resolved under it, as of the same session — new
        `removeCombatAndContents` in `store.js`, mirroring
        `updateSessionAndSyncNotes`'s "one `mutate()`, call unwrapped
        mechanics directly" shape. Needed `makeVersionedCollection` to
        expose an unwrapped `applyRemove(store, id, ctx)` alongside
        `list/create/update/remove`, the same way `makeCollection` already
        exposes `applyUpdate`.
      - **Floor-guard** ("a Session never shows zero tabs") lives entirely
        in the renderer (`SessionView.tsx`), not the backend — a `useRef`
        guard (not `useState`) makes the lazy "create one named Combat if
        the list comes back empty" race-safe against a second effect run
        while that create is still in flight, reset per `session.id` so
        navigating between two different empty Sessions doesn't skip the
        second one's own guard.
      - Both `CombatPanel`'s and `SessionCombatSidebar`'s rosters are
        filtered client-side to the active tab (`SessionView`'s
        `activeSessionAdversaries`) rather than re-fetched per tab switch
        — `listBySession` already returns every tab's combined,
        correctly-carried set in one call, so filtering in memory avoids
        an IPC round trip and a loading flash on every click.
      - New `src/api/combats.ts` (built on the existing
        `createSessionScopedCrudApi` factory, same shape as
        `sessionEnvironments.ts`); wired through `main.js`/`preload.js`/
        `client.ts` following the existing `*BySession` precedent exactly.
      - Updated: `electron/store.test.js` (a new `describe('Combat')`
        suite, carry-forward/rename/reorder/delete coverage inside
        `describe('Carrying data across Sessions')`, the cascade-delete
        helper, and `VERSIONED`/`COLLECTIONS` now covering `combats` in
        the Session/Campaign-delete tests), `e2e/sessions.spec.ts` (tab
        creation with an independent roster, double-click rename
        persisting across reload, drag-reorder, delete-cascades-contents
        + the floor-guard regenerating "Combat", the sidebar scoping to
        the active tab only, and a second Session opening with the same
        carried-forward tabs).
      - Bugs the first real run caught and fixed: the wildcard rule
        above; the floor-guard's `useRef` was never re-armed after its
        first auto-create, so deleting the last tab left zero tabs (now
        reset in `.finally`); a tab carried the shared `.drag-handle`
        class, whose `.session-section-shell .drag-handle` rules outranked
        the active tab's own colors (the tab now uses only its own
        classes); and the tab bar's extra height pushed Notes below the
        fold in the Dice Tray overlap e2e test, which now scrolls Notes
        under the tray itself rather than relying on page length.
      - Verified: `npx tsc --noEmit -p .` clean, `npm test` (257 tests)
        green, full `playwright test` suite (93 tests) green.
- [x] **Battle Points and Minion stacks** (shipped as v1.7.2), from a
      design conversation with Connor (rules table + mockups + nine
      questions, answered before any code).
      - **Battle Points** (`lib/battlePoints.ts`, `BattlePointsBar.tsx`):
        the corebook's encounter budget, shown under the Combat tab bar and
        scored per tab. Budget is `(3 x PCs) + 2`; PCs default to the Party
        roster's size (reported up by `PartyRoster`'s existing `onChange`)
        and can be overridden per tab. Costs: Minions 1 per party-sized
        group (a partial group rounds up), Social/Support 1, Horde/Ranged/
        Skulk/Standard 2, Leader 3, Bruiser 4, Solo 5. Adjustments read off
        the roster automatically: two or more Solos (-2), an adversary below
        the party's tier (+1, tier from the Campaign's level: 1 / 2-4 / 5-7
        / 8-10), no Bruisers/Hordes/Leaders/Solos (+1). Three are GM intent
        and saved on the tab as checkboxes: easier (-1), harder (+2), +1d4
        damage (-2). Advisory only: over budget colors the total. These
        rules were written from memory of the corebook; Connor was asked to
        check them against the PDF.
      - New `Combat` fields: `partySizeOverride`, `easier`, `harder`,
        `bonusDamage` (a `presentCombat` defaults them on older tabs).
      - **Adversary type is now required on the form** (Connor: an untyped
        Adversary "shouldn't be possible"). Not enforced in `store.js`,
        which would reject every existing untyped record and most unit
        tests; an untyped one already pulled in is listed as "not counted"
        in the breakdown instead.
      - **Minion stacks** (`lib/minionGroups.ts`): a `SessionAdversary`
        gained `type` (snapshotted at pull-in; an older record reads it off
        the master), `count` and `groupId`. A Minion pulls in as ONE record
        with `count` = the quantity chosen, and joins a lone stack of the
        same Minion if the tab has one. Its tile shows a `xN` badge and one
        pip per Minion in place of an HP track; the sidebar shows `xN` and a
        count stepper, where minus defeats one Minion and the last one
        removes the tile.
      - **Dragging**: a pip drags one Minion, the `xN` badge drags the whole
        stack. Dropped on a stack of the same Minion they fold in; dropped
        on a different Minion the stacks share a `groupId` and render as one
        bordered "Minion group xN" block; dropped on the "new group" zone
        (only on screen mid-drag, pinned above the Dice Tray) they split
        off. `planMinionMove` returns the writes as plain data and
        `SessionView.handleMinionMove` carries them out. Drag state is React
        state, not `dataTransfer` (unreadable during `dragover`), and is set
        a tick after `dragstart` because re-rendering inside `dragstart`
        makes Chromium cancel the drag.
      - Updated: new `battlePoints.test.ts` and `minionGroups.test.ts`,
        three new `store.test.js` cases, two new `e2e/sessions.spec.ts`
        tests (one drag uses the real mouse), and the e2e Adversary helpers
        now choose a type.
      - Verification is PARTIAL, at Connor's direction ("don't run any
        tests", shipped as-is): `npm test` (282 tests) was green and the two
        new e2e tests passed before the final docs pass, but the full
        `playwright test` suite was NOT run against this change. The
        required-type form change touches every spec that creates an
        Adversary (`sessions`, `carryForward`, `featureSections`), so run
        the full suite before building on this.
