import { createCrudApi } from './createCrudApi';

export type WeaponSlot = 'PRIMARY' | 'SECONDARY';
export type Burden = 'ONE_HANDED' | 'TWO_HANDED';
export type WeaponTrait = 'AGILITY' | 'PRESENCE' | 'INSTINCT' | 'KNOWLEDGE' | 'FINESSE' | 'STRENGTH';
export type DamageType = 'PHYSICAL' | 'MAGICAL';

export interface Weapon {
  id: string;
  weaponSlot: WeaponSlot;
  name: string;
  tier: number | null;
  feature: string | null;
  burden: Burden;
  damage: string | null;
  trait: WeaponTrait | null;
  damageType: DamageType | null;
  gameSetId: string;
}

export interface CreateWeaponRequest {
  weaponSlot: WeaponSlot;
  name: string;
  tier?: number;
  feature?: string;
  burden: Burden;
  damage?: string;
  trait?: WeaponTrait | null;
  damageType?: DamageType | null;
  gameSetId: string;
}

export type UpdateWeaponRequest = Partial<CreateWeaponRequest>;

export const weaponsApi = createCrudApi<Weapon, CreateWeaponRequest, UpdateWeaponRequest>('weapons');
