import { apiClient } from './client';

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

export const lootApi = {
  list: () => apiClient.list<Loot>('loot'),
  create: (body: CreateLootRequest) => apiClient.create<Loot>('loot', body),
  update: (id: string, body: UpdateLootRequest) => apiClient.update<Loot>('loot', id, body),
  remove: (id: string) => apiClient.remove('loot', id),
};
