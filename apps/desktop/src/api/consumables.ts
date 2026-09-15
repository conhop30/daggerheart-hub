import { apiClient } from './client';

export interface Consumable {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
}

export interface CreateConsumableRequest {
  name: string;
  description?: string;
  gameSetId: string;
}

export type UpdateConsumableRequest = Partial<CreateConsumableRequest>;

export const consumablesApi = {
  list: () => apiClient.list<Consumable>('consumables'),
  create: (body: CreateConsumableRequest) => apiClient.create<Consumable>('consumables', body),
  update: (id: string, body: UpdateConsumableRequest) => apiClient.update<Consumable>('consumables', id, body),
  remove: (id: string) => apiClient.remove('consumables', id),
};
