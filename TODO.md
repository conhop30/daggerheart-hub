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
- [ ] Stop the Dice Tray from shifting itself around on click. Right now the
      Roll button only renders once a die is queued, so clicking a die
      button shoves every other die leftward to make room — meaning a second
      click on the same die (to queue a 2nd one) lands on whatever shifted
      into that spot instead. Same problem after rolling: the result row
      appears below with no reserved space, so the whole tray jumps up.
      Needs reserved layout space (fixed-width Roll slot, fixed-height
      result slot) so queuing/rolling never moves the die buttons themselves.
- [ ] Add a quick (~0.25s) transition animation when switching between
      Adventuring and Combat mode. Adventuring: small footsteps animating
      left-to-right, each step fading out as the next appears. Combat: two
      swords crossing into an X, then fading. Plays once on the mode switch,
      not a looping/idle animation.
- [ ] Standardize styling for side-by-side button pairs (e.g. a party
      member's Edit/Delete, a Session row's Open/Delete) — currently
      inconsistent across the app. Revisit as part of the Campaign launch
      redesign above, since that's where most of these pairs live.
