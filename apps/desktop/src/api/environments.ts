import { apiClient } from './client';
import type { FeatureTiers } from './adversaries';

export interface Environment {
  id: string;
  name: string;
  tier: number | null;
  description: string | null;
  impulses: string[];
  difficulty: number | null;
  potentialAdversaries: string[];
  features: FeatureTiers;
  gameSetId: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  tier?: number;
  description?: string;
  impulses?: string[];
  difficulty?: number;
  potentialAdversaries?: string[];
  features?: FeatureTiers;
  gameSetId: string;
}

export type UpdateEnvironmentRequest = Partial<CreateEnvironmentRequest>;

export const environmentsApi = {
  list: () => apiClient.list<Environment>('environments'),
  create: (body: CreateEnvironmentRequest) => apiClient.create<Environment>('environments', body),
  update: (id: string, body: UpdateEnvironmentRequest) => apiClient.update<Environment>('environments', id, body),
};
