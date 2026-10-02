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
