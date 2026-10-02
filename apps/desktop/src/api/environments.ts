import { createCrudApi } from './createCrudApi';
import type { FeatureSections } from '../lib/featureKinds';

export type EnvironmentCategory = 'EXPLORATION' | 'EVENT' | 'SOCIAL' | 'TRAVERSAL';

export interface Environment {
  id: string;
  name: string;
  category: EnvironmentCategory | null;
  tier: number | null;
  description: string | null;
  impulses: string[];
  difficulty: number | null;
  potentialAdversaries: string[];
  features: FeatureSections;
  gameSetId: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  category?: EnvironmentCategory | null;
  tier?: number;
  description?: string;
  impulses?: string[];
  difficulty?: number;
  potentialAdversaries?: string[];
  features?: FeatureSections;
  gameSetId: string;
}

export type UpdateEnvironmentRequest = Partial<CreateEnvironmentRequest>;

export const environmentsApi = createCrudApi<Environment, CreateEnvironmentRequest, UpdateEnvironmentRequest>(
  'environments'
);
