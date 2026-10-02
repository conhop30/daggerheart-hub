# TO DO

Working backlog of feedback and small fixes not yet acted on. Not
interviewer-facing (see README's Feature Roadmap for that) — this is a
scratch list for planning the next pass of work.

- [ ] Add a set of selectable themes beyond the current Light/Dark/System
      choice — each theme should be able to change things like the Fear
      tracker's token colors and backgrounds, not just light-vs-dark.
- [ ] Redesign the Campaign launch process (creating/opening a Campaign for
      the first time) — current flow isn't good enough; needs a proper
      pass, not just a tweak. Fold the adjacent-button styling pass (below)
      into this discussion, since Campaigns/Sessions is where it shows up
      most.
- [x] Standardize styling for side-by-side button pairs (e.g. a party
      member's Edit/Delete, a Session row's Open/Delete) — ethereal pair
      style landed in ContentCard.css: no border on the buttons
      themselves, a single hairline between the two, labels padded further
      from that hairline/the row's edge. Mockup:
      https://claude.ai/artifact/WxqaGQRTAHoLQHA9HHVhbF (board 1).

      ContentCard also gained `actionsLayout?: 'inline' | 'full-height'`
      (default 'inline', unchanged behavior/DOM for every existing
      consumer). 'full-height' moves the actions out of the header to a
      sibling of the body, spanning the row's true top-to-bottom edges —
      used by PartyRoster, since its tiles are short and uniform; left as
      'inline' everywhere else (Sessions, Adversaries, Equipment, ...)
      since a button stretched the full height of a long card with lots
      of meta/features below would look stretched/odd there, not
      intentional.

      Campaign launch redesign — landed, UX still settling before a
      release (see "e2e debt" below):
        - Campaigns tab: each Campaign is a full-row card (CampaignBanner),
          with an optional uploaded image (CampaignForm, stored as a
          data: URL on `coverImage` — no managed file directory yet, see
          note below), fading into the row so text stays readable. The
          image itself is full-bleed behind the row (not a width-
          constrained strip) so there's no hard rectangular image edge for
          the hover slide to expose — only the gradient's own soft edge is
          ever visible. Hover: the fade slides left (never fully clears),
          SELECT fades in large/capitalized, shadow lifts, no translateY.
          The description no longer truncates to 2 lines — it wraps, with
          up to ~2/3 of the row's width to do it in. Edit/Delete are gone
          from the row; CampaignDetail covers both once a Campaign is open,
          and its hero now also shows `coverImage` the same way (full-bleed
          art + a literal-dark scrim, same reasoning as the row's).
        - Party tab is collapsible (PartyRoster, defaults open). Tile SHAPE
          is unchanged from today — a member's optional `portraitImage`
          adds MemberBackdrop behind that unchanged content: a tall image
          centers and fades both sides toward the page background (now
          via `color-mix()` so the edges stay partly see-through instead
          of a flat wall), a wide one fills the tile. A subtle blurred
          strip sits behind HP/Stress specifically (not the name/notes)
          for readability. Edit/Delete use the ethereal pair style, now
          full tile height via `actionsLayout="full-height"`, on a frosted
          chip for legibility over art. No image = pixel-identical to
          before.
        - ImageUploadField restyled to match the rest of the app: the
          native `<input type="file">` is visually hidden and triggered by
          a bordered "Choose Image" button (same idiom as
          `.party-roster__add`), with a dashed placeholder box (matching
          `.campaign-row--hollow`'s "empty slot" look) before anything's
          chosen.
        - Open question, not yet built: "the Campaign image should
          translate into the selected Campaign" — I read this as "the
          image should carry over" and implemented that (CampaignDetail's
          hero now shows it too), but if a literal animated handoff (the
          image visually moving from the gallery row into the hero as you
          open it) is what's wanted, that's a bigger feature — worth its
          own scoping/mockup pass rather than guessing at, given what a
          real shared-element transition costs to build correctly across
          CampaignsPage's list/detail swap.

      e2e debt from this pass (not yet done — fast-iteration UX pass, come
      back before cutting a release):
        - CampaignBanner's whole DOM shape changed:
          `.campaign-banner`/`.campaign-banner__hit`/`.campaign-banner__action`
          → `.campaign-row` (the row IS the button now, no separate `__hit`;
          no `__action` at all, onEdit/onDelete removed). Hits 35 selector
          occurrences across e2e/campaigns.spec.ts, e2e/campaignBanner.spec.ts,
          e2e/sessions.spec.ts, e2e/carryForward.spec.ts, e2e/music.spec.ts —
          mostly their shared "create a Campaign" setup helpers.
          `.campaign-grid` → `.campaign-list` (CampaignsPage.css) too.
          (Checked: CampaignDetail's own hero selectors — `.campaign-detail__level`,
          `.campaign-detail__title`, `.campaign-detail__hero-action--danger`,
          `.campaign-detail__back` — are untouched by the new art/scrim/content
          wrapper, all class-based, no direct-child assumptions. Those are fine.)
        - campaignBanner.spec.ts specifically will need rework beyond
          selectors: it likely asserts Edit/Delete behavior straight from
          the gallery, which no longer exists there.
        - New coverage worth adding, not just fixing:
            - PartyRoster's collapse (open by default, toggle hides/unmounts).
            - CampaignForm/PartyMemberForm's image upload round-tripping
              through the store (pick a file -> preview -> save -> reload
              shows it; Remove clears it).
            - MemberBackdrop's orientation pick (tall vs wide image).
            - ContentCard's `actionsLayout="full-height"` rendering actions
              outside the header — checked, not actually a risk: every
              existing e2e use of Edit/Delete goes through
              `getByRole('button', { name: 'Edit' | 'Delete' })` (accessible
              name, unaffected by moving the button in the DOM or wrapping
              its label in a `<span>`), never the `.content-card__action`
              class directly or a header-scoped selector.
        - `coverImage`/`portraitImage` are raw data: URLs saved straight
          into store.json (no size cap, no managed directory like Music's
          imports) — fine for iterating on the UX, but worth hardening
          before this ships in a release if people upload large photos.

- [ ] Subclass creation doesn't accept input for an official/core class
      (reproduced with Ranger) but does work fine inside a custom class —
      needs root-causing. Separately: the Foundation feature doesn't need
      the spellcast trait listed on the page. Once card generation exists,
      the Foundation feature should auto-place into a foundation card.
- [ ] Text field styling: give inputs the same curved, initially-invisible
      border treatment Settings buttons already have, plus a focus
      animation where color "grows" out along the top and bottom edges
      (a responsive border extending in on focus, retracting back to just
      the corner curve on blur).
- [ ] Heritage tab: the Feature should stay visible when a tile is
      collapsed. Also add a layout option that packs multiple Heritage
      tiles per row (more on screen at once), like Equipment/Adversary
      grids already allow.
- [ ] Domain cards: drop the gold line under the symbol so the symbol can
      be bigger/centered with the extra space. The Blade domain's image is
      broken (renders as a plain square, not its symbol). Recolor the Bone
      domain's icon black — it doesn't read against the silver background.
      Dread domain's official card art is in the Hope and Fear pdf (ask
      again if that's needed). Cards should never scroll — they should
      read as an actual printed card, sized proportionally to a real 2.5"
      x 3.5" card.
- [ ] Adversary picker: "Recently Viewed" should stay alphabetically
      sorted (not most-recent-first). Add filters by Tier and by Type.
- [ ] (For further pondering — discuss with mockups before building.) A
      draggable "Journal" bubble, dockable to a screen edge. Clicking it
      opens a notes window with no default text fields; instead, a
      dropdown of buttons for the kind of entry to add — e.g. a "+ person
      silhouette" button for "Add Player," which then provides a Name
      field and a Notes field. Each entry should have a short Label plus
      a larger text field, so a GM gets a fast-glance label and still has
      room for detail.
