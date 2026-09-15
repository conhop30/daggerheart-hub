# Daggerheart homebrew hub — working spec

Status: locked, except Section 6 (Architecture), amended 2026-09-14 — the
original Spring Boot/hosted-server design was dropped in favor of a
local-first, no-server model so the same content can run on desktop and a
future mobile client without either depending on a backend process. Every
other section is unaffected.

## 1. Vision

A local desktop app that's a single hub for creating Daggerheart homebrew content: Classes, Subclasses, Domains, Equipment (Weapons — Primary and Secondary, Armor, Consumables, Loot), Adversaries, Environments, Heritage (Community, Ancestry), and Optional Mechanics (Transformation, plus future mechanics of the same kind). Every content type has an edit mode and a read-only display/presentation mode. Built to be modular enough that a whole content type can be added or removed without breaking the rest of the app.

## 2. Navigation and UX

**Philosophy:** single-page-app feel throughout — clicking between sections swaps layout in place, never a full reload.

**Home page**
- A full-width "Create" panel sits above the gallery grid. Drawn in the app's single accent color so it reads as the primary action on the page.
- Below it, a 3×2 grid of tiles, in this order: **Classes, Adversaries & Environments, Domains, Heritage, Equipment, Optional Mechanics.**

**Create panel behavior**
- Click to expand in place (no modal, no navigation).
- Shows all creatable types as chips: Class, Subclass, Domain, Adversary, Environment, Community, Ancestry, Weapon (Primary), Weapon (Secondary), Armor, Loot, Consumable, Transformation.
- **Flat types** (Class, Domain, Adversary, Environment, Community, Ancestry, Transformation) go straight into their creator on click.
- **Subclass** and **Equipment** are cascading: picking either fades out the full chip list and replaces it with a row of larger banners for the next decision — Subclass shows existing Classes to attach to; Equipment shows Primary Weapon / Secondary Weapon / Armor / Loot / Consumable. Selecting a banner loads the tailored creator.
- A back control is present at every stage, and steps back one level at a time (banner step → type list; result step → banner step), not straight to the top.

**Classes**
- Gallery view, hero images, one optional Featured slot, sortable alphabetically or by Domain.
- Clicking a Class opens a detail view: main Class panel plus a Subclass nav strip.
- Subclasses in the nav are grouped by Set automatically — one badge/icon marks the start of each Set's cluster, followed by that Set's Subclasses, then a divider, then the next Set's badge and its Subclasses. A Subclass always appears under its parent Class regardless of which Set it came from; Set filtering is a display concern, not a structural boundary.
- "Export to printable character sheet" (A4) is planned but deferred — not designed yet.

**Adversaries & Environments**
- Two independent galleries on one page, each with its own filters (Adversary role tags; Environment type tags), plus a "master filter" (Tier) that can drive both at once.

**Equipment**
- Weapons (Primary and Secondary get their own sections/filters), Armor, Consumables, and Loot each get their own view.
- Standard filters (Tier, Physical/Magical) and advanced filters (die size, one/two-handed, has-feature, armor score thresholds) as originally scoped.
- Loot is a flat, free-form list — no roll-table numbering.

**Domains, Heritage, Optional Mechanics**
- Top-level tiles exist; gallery layouts for these are not designed yet.

## 3. Visual design system

- Color language: Hope (warm gold) / Fear (deep violet) duality, matching your existing portfolio site's system. Exact palette values are placeholder in the mockups — real Daggerheart-accurate values still to be picked.
- Typography: Fraunces (display), Inter (body), IBM Plex Mono (data/labels/tags) — same trio as the portfolio.
- Dark mode and a colorblind-safe palette toggle (swaps the gold/violet pairing to blue/orange) are both in the mockup. Color alone is not yet paired with a secondary cue (shape/icon) for colorblind users — flagged as a future improvement, not yet built.
- Contrast is a standing priority across every screen and every mode.

## 4. Set / expansion system

- Set is modeled as its own entity (id, name, and likely a display order and a badge icon), not a hardcoded enum — every content type references it by foreign key.
- Every single content type requires a Set reference, no exceptions.
- Known Sets so far: **Core**, **Hope and Fear**. Designed so a new Set is just a new row, never a schema change.

## 5. Data schemas

Enums are written as `Enum(...)`. Relationships are written as `→ TypeName`.

**Set** (lookup entity)
- Name: String
- DisplayOrder: Int (optional)
- Badge: reference/icon used in the Subclass nav grouping

**Class**
- Name: String
- Description: String
- Domains: Tuple of exactly 2 → Domain
- StartingEvasion: Int
- StartingHP: Int
- ClassItems: String (flavor text, not linked to real Equipment records)
- HopeFeature: String
- ClassFeatures: Dict(Name: String, Description: String) — this is the only feature list on Class; Foundation/Specialization/Mastery tiers exist on Subclass only, not Class
- Set → Set
- *(Subclasses are not stored on Class — see Subclass.ParentClass below)*
- *(Sheet fields intentionally dropped for now — see note at the end of this section)*

**Subclass**
- Name: String
- Oneliner: String
- ParentClass → Class (required)
- SpellcastTrait: nullable Enum(Strength, Finesse, Knowledge, Presence, Agility, Instinct, None) — null represents "not yet chosen" during editing; None is a real, distinct value meaning "genuinely has no spellcast trait"
- FoundationFeatures: Dict(Name: String, Description: String, SpellcastTrait: nullable Enum — optional per-feature override)
- SpecializationFeatures: Dict(Name: String, Description: String)
- MasteryFeatures: Dict(Name: String, Description: String)
- Set → Set

**Adversary**
- Name: String
- Tier: Int
- Description: String
- MotivesAndTactics: Array[String]
- Difficulty: Int
- Thresholds: Tuple of exactly 2 (Major, Severe)
- HP: Int
- Stress: Int
- AttackModifier: Int (display logic: render with a leading "+" for values ≥ 0, "−" for negative)
- AttackDescription: String
- AttackRange: nullable Enum(Melee, Very Close, Close, Far, Very Far, Out of Range) — null while a record is still being drafted, same pattern as SpellcastTrait
- AttackType: nullable Enum(Physical, Magical, Direct Physical, Direct Magical) — same pattern
- Experiences: Dict(Name: String → Modifier: Int)
- Features: Dict(Passives: Dict(Name, Description), Actions: Dict(Name, Description), Reactions: Dict(Name, Description))
- Set → Set

**Environment**
- Name: String
- Tier: Int
- Description: String
- Impulses: Array[String]
- Difficulty: Int
- PotentialAdversaries: Array[String] — free text, entered via a repeatable add-a-field UI, not linked to real Adversary records
- Features: same Passives/Actions/Reactions structure as Adversary
- Set → Set

**Transformation**
- Name: String
- Description: String
- Features: Dict(Name: String, Description: String)
- Set → Set

**Community**
- Name: String
- Description: String
- Features: Dict(Name: String, Description: String)
- Set → Set

**Ancestry**
- Name: String
- Description: String
- Features: Dict(Name: String, Description: String)
- Set → Set

**Domain**
- DomainIcon: Image
- DomainColor: hex string (e.g. "#A97815")
- Name: String
- Description: String
- Set → Set
- *(Cards are not stored on Domain — see Card.Domain below)*

**Card** (own entity, one per Domain Card)
- Name: String
- Description: String
- Type: Enum(Spell, Grimoire, Ability)
- Level: Int
- RecallCost: Int
- DomainIcon: Image
- Image: Image
- Domain → Domain (required)
- Set → Set — deliberate, not just inherited from the parent Domain, so a future Card gallery that disregards Domain as a container still knows exactly what Set each Card came from

**Sheet — deferred**
Intentionally set aside for now; it was creating friction against the rest of the schema. Class and Subclass have no Sheet-related fields in this pass. Will be designed and added back as its own milestone once the core content types are working — likely reintroducing AdditionalSheetsRequired/AdditionalSheets on Subclass (and possibly Class) at that point.

**Weapon**
- WeaponSlot: Enum(Primary, Secondary) — chosen at creation via the Create-panel banner, drives everything below
- Name: String
- Tier: Int
- Feature: String
- Burden: Enum(One-Handed, Two-Handed) — **locked to One-Handed when WeaponSlot = Secondary**, enforced at the schema/validation level, not just a UI default
- Damage: String
- Trait: Enum(Agility, Presence, Instinct, Knowledge, Finesse, Strength)
- DamageType: Enum(Physical, Magical) — free choice regardless of WeaponSlot; Secondary weapons are not restricted to Physical
- Set → Set

**Armor**
- Name: String
- Tier: Int
- BaseScore: Int
- Thresholds: Tuple of exactly 2 (Major, Severe)
- Feature: String
- Set → Set

**Loot**
- Name: String
- Description: String
- Set → Set

**Consumable**
- Name: String
- Description: String
- Set → Set

## 6. Architecture

No backend process, on either target platform — a hosted or embedded server
was dropped specifically because a future React Native mobile client can't
embed one the way Electron could, and running two divergent data layers (one
server-backed, one not) for the two platforms was worse than running neither.
Layered, top to bottom:
- **Presentation** — React + TypeScript, talks only to the data layer below, never touches file I/O directly. Edit mode and Display mode are two rendering paths over the same data contract.
- **Data layer** — TypeScript, one module per content type (Classes, Subclasses, Domains, Adversaries, Environments, Equipment, Heritage, Optional Mechanics), each owning validation and CRUD-in-memory operations over its own slice of the store. This is where the business rules that used to live in Spring services now live (e.g. "a Class needs two distinct Domains," "a Subclass needs a valid ParentClass"), and it's shared code — the same module is imported by the desktop app today and would be imported by a future mobile client, so a rule only has to be written once.
- **Local store** — a single JSON document per device holding every content type, keyed by client-generated UUIDs (not server-assigned auto-increment ids, since there's no server to assign them). On desktop, Electron's main process reads/writes this file on disk and exposes it to the renderer through a preload bridge, since the renderer can't touch the filesystem directly.
- **Cross-device movement** — manual JSON export/import, not live sync. Exporting copies (all or part of) the local store to a file; importing merges that file into another device's store. This is a deliberate, simpler substitute for real-time sync, not a placeholder for it — see the milestone note below for what's different if that ever changes.

**Testing**
- Vitest for the data layer's validation and CRUD logic — this is the direct equivalent of the old `@ApplicationModuleTest` isolation proof: each content module's tests run against nothing but that module.
- Vitest + React Testing Library for components, plus axe-core for automated contrast/accessibility checks.
- Playwright driving the real packaged Electron build for end-to-end flows, including a full export-on-one-store/import-into-another round trip.
- CI via GitHub Actions from day one.

**Packaging:** electron-builder for the shell. No JRE bundling step — dropped along with the Java backend.

**Possible future milestone — live sync:** not being built now, and no longer the assumed end state the way it was when a hosted Spring Boot service was planned. If real-time, always-merging sync across devices is ever wanted, it would need a hosted service to broker conflicts plus per-record version/updated-at metadata — the UUID-keyed local store this section describes is a reasonable foundation for that, but building it is a distinct, larger effort from JSON export/import and isn't assumed to happen.

## 7. Deliberately deferred, not forgotten

These aren't blockers — just work that's explicitly scoped for later rather than now:

- **Sheet** — its internal structure and its fields on Class/Subclass, reintroduced as its own milestone.
- **Domain, Heritage, and Optional Mechanics gallery layouts** — designed when we get there.
- **Printable character sheet export (A4)** — a real milestone in its own right, not started.

Everything else from the original open-items list is resolved and folded into the sections above. This is the baseline for scaffolding.
