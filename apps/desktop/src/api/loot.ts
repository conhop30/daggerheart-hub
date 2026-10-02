import { createCrudApi } from './createCrudApi';

export interface Loot {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
}

export interface CreateLootRequest {
  name: string;
  description?: string;
  gameSetId: string;
}

export type UpdateLootRequest = Partial<CreateLootRequest>;

export const lootApi = createCrudApi<Loot, CreateLootRequest, UpdateLootRequest>('loot');
