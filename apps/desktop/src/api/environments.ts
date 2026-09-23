import { apiClient } from './client';
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

export const environmentsApi = {
  list: () => apiClient.list<Environment>('environments'),
  create: (body: CreateEnvironmentRequest) => apiClient.create<Environment>('environments', body),
  update: (id: string, body: UpdateEnvironmentRequest) => apiClient.update<Environment>('environments', id, body),
  remove: (id: string) => apiClient.remove('environments', id),
};
