# Questions

Logged while working through the TODO list unattended (per instruction: log
blockers, skip to the next doable item, don't wait). Scratch file, not meant
to be long-lived — delete entries as they're answered, delete the whole file
once it's empty.

## 1. Text field styling — can't find the referenced precedent

The TODO item says: "give inputs the same curved, initially-invisible border
treatment Settings buttons already have, plus a focus animation where color
'grows' out along the top and bottom edges."

I went looking for that treatment on the actual Settings page
(`SettingsPage.css`) to copy it, and couldn't find it — the theme/window-size
picker buttons (`.settings-page__option`) have `border: none` entirely, with
a radial-gradient glow on hover/active instead of any border, curved or
otherwise. There's no "corner curve" treatment anywhere in the CSS I could
find to match "retracting back to just the corner curve on blur" against.

Possibilities:
- You're picturing a *mockup* for Settings buttons that was discussed but
  never actually built this way — in which case the "already have" part
  isn't true yet, and this task is really "design + build a new treatment
  for both Settings buttons and text fields," not "copy an existing one."
- You mean the borderless radial-glow *philosophy* (nothing visible at rest,
  something appears on interaction) loosely, not a literal border — fine,
  but "curved" and "corner curve on blur" are specific enough that I don't
  want to guess at the exact shape.
- There's a different component I'm not thinking of that actually has this.

**What I need:** either a quick description/sketch of the corner-curve shape
you're picturing, or tell me to treat this as a fresh design (maybe worth a
quick mockup round like the Campaign/Party button-pair work got, rather than
guessing blind at a focus micro-interaction).

## 2. Theme system — needs real creative/scoping input, not a guess

The TODO item: "Add a set of selectable themes beyond the current Light/
Dark/System choice — each theme should be able to change things like the
Fear tracker's token colors and backgrounds, not just light-vs-dark."

Unlike everything else on the list, this isn't "find the bug" or "apply an
existing pattern" — it's "invent N new visual identities," which is a real
creative decision I don't want to make blind and have you find out later it
doesn't match what you pictured. Specific things I'd need from you before
writing any code:

- **How many themes, and what are they?** Named how, roughly what mood/
  palette each one is going for (the TODO's own example is "Fear tracker
  token colors and backgrounds" — are we talking a handful of palette
  swaps, or does each theme have its own distinct visual identity beyond
  color, like the Domain ribbons have their own shape language)?
- **Relationship to the existing Light/Dark/System setting** — do themes
  replace that control, sit alongside it (so System still means "follow the
  OS," and a theme is a separate axis), or does each theme carry its own
  light/dark pair?
- **Scope of what a theme can touch** — just CSS custom properties (the
  existing `tokens.css` light/dark split already does this for the whole
  app), or does "the Fear tracker's token colors and backgrounds" imply
  some themes need bespoke per-component art (shapes, textures), not just
  recolored tokens?

Given the size of this (new data model, Settings UI, and now however many
themes' worth of actual palette decisions), I think this is worth a mockup
round like the Campaign/Party remodel got, rather than something to crank
out from a two-sentence TODO line. Skipped for now rather than guessed at.
