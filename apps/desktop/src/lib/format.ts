// Formats a SCREAMING_SNAKE_CASE enum value for display, e.g.
// "DIRECT_PHYSICAL" -> "Direct Physical". Shared by every form/card that
// renders one of the backend's string enums (SpellcastTrait, AttackRange,
// AttackType, WeaponTrait, DamageType, Burden, WeaponSlot).
export function titleCaseEnum(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
