import { createCrudApi } from './createCrudApi';
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

export const lootTablesApi = createCrudApi<LootTable, CreateLootTableRequest, UpdateLootTableRequest>('lootTables');
