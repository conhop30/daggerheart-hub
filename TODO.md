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
- [ ] Standardize styling for side-by-side button pairs (e.g. a party
      member's Edit/Delete, a Session row's Open/Delete) — currently
      inconsistent across the app. IN PROGRESS: no border on the buttons
      themselves, a single hairline between the two, gradient-wash
      background + slightly enlarged label on hover. Mockup published:
      https://claude.ai/artifact/WxqaGQRTAHoLQHA9HHVhbF (board 1).
      Being designed together with the Campaign launch redesign above —
      see that item for the fuller remodel it's part of.

      Campaign launch redesign, in progress — mockups published at the
      link above (boards 2a/2b):
        - Campaigns tab: each Campaign becomes a full-row card (not a grid
          tile), with an optional uploaded image, right-aligned, fading
          right-to-left into the panel so the text stays readable. Hover:
          the fade retreats left (exposing more image), a "Select" label
          fades in center, and a drop shadow lifts the row — the whole row
          acts as one big, grand "open" button. Removes the Edit/Delete
          buttons entirely (opening is the only action needed here).
        - Party tab becomes collapsible, with the same optional-image idea
          per member: a vertical portrait is centered with the gradient
          fading on both left and right; a landscape photo fills the whole
          card edge to edge. Edit/Delete stay (via the ethereal button-pair
          style above), set on a frosted chip for legibility over art.

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
