import { apiClient } from './client';
import type { Feature } from './heroClasses';
import type { Thresholds } from '../components/ThresholdsInput';
import type { Experience } from '../components/ExperienceListEditor';

export type AttackRange = 'MELEE' | 'VERY_CLOSE' | 'CLOSE' | 'FAR' | 'VERY_FAR' | 'OUT_OF_RANGE';
export type AttackType = 'PHYSICAL' | 'MAGICAL' | 'DIRECT_PHYSICAL' | 'DIRECT_MAGICAL';

export interface FeatureTiers {
  passives: Feature[];
  actions: Feature[];
  reactions: Feature[];
}

export interface Adversary {
  id: string;
  name: string;
  tier: number | null;
  description: string | null;
  motivesAndTactics: string[];
  difficulty: number | null;
  thresholds: Thresholds;
  hp: number | null;
  stress: number | null;
  attackModifier: number | null;
  attackDescription: string | null;
  attackRange: AttackRange | null;
  attackType: AttackType | null;
  experiences: Experience[];
  features: FeatureTiers;
  gameSetId: string;
}

export interface CreateAdversaryRequest {
  name: string;
  tier?: number;
  description?: string;
  motivesAndTactics?: string[];
  difficulty?: number;
  thresholds?: Thresholds;
  hp?: number;
  stress?: number;
  attackModifier?: number;
  attackDescription?: string;
  attackRange?: AttackRange | null;
  attackType?: AttackType | null;
  experiences?: Experience[];
  features?: FeatureTiers;
  gameSetId: string;
}

export type UpdateAdversaryRequest = Partial<CreateAdversaryRequest>;

export const adversariesApi = {
  list: () => apiClient.list<Adversary>('adversaries'),
  create: (body: CreateAdversaryRequest) => apiClient.create<Adversary>('adversaries', body),
  update: (id: string, body: UpdateAdversaryRequest) => apiClient.update<Adversary>('adversaries', id, body),
  remove: (id: string) => apiClient.remove('adversaries', id),
};
