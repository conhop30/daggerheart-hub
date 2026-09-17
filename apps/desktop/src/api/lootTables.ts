import { apiClient } from './client';
import type { RarityEntries } from '../lib/lootRarity';

export interface LootTableEntry {
  position: number;
  lootId: string;
}

export interface LootTable {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
  entries: RarityEntries<LootTableEntry>;
}

export interface CreateLootTableRequest {
  name: string;
  description?: string;
  gameSetId: string;
  entries?: RarityEntries<LootTableEntry>;
}

export interface UpdateLootTableRequest {
  name?: string;
  description?: string;
  gameSetId?: string;
  entries?: RarityEntries<LootTableEntry>;
}

export const lootTablesApi = {
  list: () => apiClient.list<LootTable>('lootTables'),
  create: (body: CreateLootTableRequest) => apiClient.create<LootTable>('lootTables', body),
  update: (id: string, body: UpdateLootTableRequest) => apiClient.update<LootTable>('lootTables', id, body),
  remove: (id: string) => apiClient.remove('lootTables', id),
};
