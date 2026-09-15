import { apiClient } from './client';
import type { Feature } from './heroClasses';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
  gameSetId: string;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  features?: Feature[];
  gameSetId: string;
}

export type UpdateCommunityRequest = Partial<CreateCommunityRequest>;

export const communitiesApi = {
  list: () => apiClient.list<Community>('communities'),
  create: (body: CreateCommunityRequest) => apiClient.create<Community>('communities', body),
  update: (id: string, body: UpdateCommunityRequest) => apiClient.update<Community>('communities', id, body),
};
