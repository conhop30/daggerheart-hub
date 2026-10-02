import { createCrudApi } from './createCrudApi';
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

export const ancestriesApi = createCrudApi<Ancestry, CreateAncestryRequest, UpdateAncestryRequest>('ancestries');
