import { createCrudApi } from './createCrudApi';
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

export const communitiesApi = createCrudApi<Community, CreateCommunityRequest, UpdateCommunityRequest>('communities');
