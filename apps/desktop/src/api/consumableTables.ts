import { createCrudApi } from './createCrudApi';
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

export const consumableTablesApi = createCrudApi<
  ConsumableTable,
  CreateConsumableTableRequest,
  UpdateConsumableTableRequest
>('consumableTables');
