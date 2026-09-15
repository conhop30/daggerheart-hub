// The nine content types that share the generic collection shape in
// electron/store.js — matches its COLLECTIONS array (minus GameSet/Domain/
// HeroClass/Subclass, which have their own dedicated props/state since
// other forms reference them by id).
export type ContentKey =
  | 'adversaries'
  | 'environments'
  | 'weapons'
  | 'armors'
  | 'loot'
  | 'consumables'
  | 'communities'
  | 'ancestries'
  | 'transformations';
