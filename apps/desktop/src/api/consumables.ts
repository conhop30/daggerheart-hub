import { createCrudApi } from './createCrudApi';

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

export const consumablesApi = createCrudApi<Consumable, CreateConsumableRequest, UpdateConsumableRequest>(
  'consumables'
);
