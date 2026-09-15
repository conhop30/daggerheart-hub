import { apiClient } from './client';
import type { Feature } from './heroClasses';

export interface Ancestry {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
  gameSetId: string;
}

export interface CreateAncestryRequest {
  name: string;
  description?: string;
  features?: Feature[];
  gameSetId: string;
}

export type UpdateAncestryRequest = Partial<CreateAncestryRequest>;

export const ancestriesApi = {
  list: () => apiClient.list<Ancestry>('ancestries'),
  create: (body: CreateAncestryRequest) => apiClient.create<Ancestry>('ancestries', body),
  update: (id: string, body: UpdateAncestryRequest) => apiClient.update<Ancestry>('ancestries', id, body),
  remove: (id: string) => apiClient.remove('ancestries', id),
};
