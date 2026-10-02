import { createCrudApi } from './createCrudApi';
import type { Thresholds } from '../components/ThresholdsInput';

export interface Armor {
  id: string;
  name: string;
  tier: number | null;
  baseScore: number | null;
  thresholds: Thresholds;
  feature: string | null;
  gameSetId: string;
}

export interface CreateArmorRequest {
  name: string;
  tier?: number;
  baseScore?: number;
  thresholds?: Thresholds;
  feature?: string;
  gameSetId: string;
}

export type UpdateArmorRequest = Partial<CreateArmorRequest>;

export const armorsApi = createCrudApi<Armor, CreateArmorRequest, UpdateArmorRequest>('armors');
