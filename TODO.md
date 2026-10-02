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
      themselves, a single hairline between the two, the hover gradient
      fills the full height of the row it's attached to, label grows
      slightly via a transform (not a reflow). Mockup:
      https://claude.ai/artifact/WxqaGQRTAHoLQHA9HHVhbF (board 1).

      Campaign launch redesign — landed, UX still settling before a
      release (see "e2e debt" below):
        - Campaigns tab: each Campaign is now a full-row card (CampaignBanner
          rebuilt), with an optional uploaded image (CampaignForm, stored as
          a data: URL on `coverImage` — no managed file directory yet, see
          note below), right-aligned, fading into the row so text stays
          readable. Hover: the fade slides left (a real transform, never
          fully clears), SELECT fades in large/capitalized, shadow lifts —
          no translateY. Edit/Delete are gone from the row entirely;
          CampaignDetail already had its own Edit/Delete, so that's still
          the only way in, now the sole one.
        - Party tab is collapsible (PartyRoster, defaults open). Tile SHAPE
          is unchanged from today (no box, no radius, same header/notes/
          trackables layout) — a member's optional `portraitImage` only
          adds MemberBackdrop behind that unchanged content: a tall image
          centers and fades both sides into the page background, a wide
          one fills the tile. Edit/Delete use the ethereal pair style on a
          frosted chip for legibility over art. No image = pixel-identical
          to before.
        - Known gap: CampaignDetail's own hero banner (once you've opened a
          Campaign) still only uses the colorHex gradient, not coverImage —
          out of scope for this pass, not yet asked for.

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
        - campaignBanner.spec.ts specifically will need rework beyond
          selectors: it likely asserts Edit/Delete behavior straight from
          the gallery, which no longer exists there.
        - New coverage worth adding, not just fixing: PartyRoster's
          collapse (open by default, toggle hides/unmounts the list),
          CampaignForm/PartyMemberForm's new image upload field round-
          tripping through the store, MemberBackdrop's orientation pick.
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
