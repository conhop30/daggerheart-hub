import { apiClient } from './client';
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

export const armorsApi = {
  list: () => apiClient.list<Armor>('armors'),
  create: (body: CreateArmorRequest) => apiClient.create<Armor>('armors', body),
  update: (id: string, body: UpdateArmorRequest) => apiClient.update<Armor>('armors', id, body),
};
