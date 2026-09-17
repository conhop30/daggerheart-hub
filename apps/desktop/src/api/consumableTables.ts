import { apiClient } from './client';
import type { RarityEntries } from '../lib/lootRarity';

export interface ConsumableTableEntry {
  position: number;
  consumableId: string;
}

export interface ConsumableTable {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
  entries: RarityEntries<ConsumableTableEntry>;
}

export interface CreateConsumableTableRequest {
  name: string;
  description?: string;
  gameSetId: string;
  entries?: RarityEntries<ConsumableTableEntry>;
}

export interface UpdateConsumableTableRequest {
  name?: string;
  description?: string;
  gameSetId?: string;
  entries?: RarityEntries<ConsumableTableEntry>;
}

export const consumableTablesApi = {
  list: () => apiClient.list<ConsumableTable>('consumableTables'),
  create: (body: CreateConsumableTableRequest) => apiClient.create<ConsumableTable>('consumableTables', body),
  update: (id: string, body: UpdateConsumableTableRequest) =>
    apiClient.update<ConsumableTable>('consumableTables', id, body),
  remove: (id: string) => apiClient.remove('consumableTables', id),
};
