import { apiClient } from './client';
import type { Rarity } from '../lib/lootRarity';

export interface LootLogResult {
  tableId: string;
  tableName: string;
  gameSetName: string;
  tableType: 'LOOT' | 'CONSUMABLE';
  /** null = "Nothing found" at that rolled position. */
  itemId: string | null;
  itemName: string | null;
}

export interface LootLogEntry {
  /** Assigned by the store when the entry is added. */
  id: string;
  /** The session it was rolled in (an earlier one than the session being viewed means it was carried over). */
  sessionId: string;
  rolledAt: string;
  rarity: Rarity;
  poolSize: number;
  rollTotal: number;
  results: LootLogResult[];
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
  fear: number;
  /** The music region this session plays from; null = the built-in Everywhere region. */
  regionId: string | null;
  lootLog: LootLogEntry[];
}

/** A roll as it's handed to the store, which assigns its id and session. */
export type NewLootLogEntry = Omit<LootLogEntry, 'id' | 'sessionId'>;

export interface CreateSessionRequest {
  campaignId: string;
  name: string;
  fear?: number;
  regionId?: string | null;
}

export type UpdateSessionRequest = Partial<Omit<CreateSessionRequest, 'campaignId'>>;

export const sessionsApi = {
  list: () => apiClient.list<Session>('sessions'),
  listByCampaign: (campaignId: string) => apiClient.listSessionsByCampaign<Session>(campaignId),
  create: (body: CreateSessionRequest) => apiClient.create<Session>('sessions', body),
  /** A new session at the end of the timeline, same as a plain create (there's no non-carried field left to copy). */
  clone: (sourceId: string, options?: { name?: string }) => apiClient.cloneSession<Session>(sourceId, options),
  update: (id: string, body: UpdateSessionRequest) => apiClient.update<Session>('sessions', id, body),
  remove: (id: string) => apiClient.remove('sessions', id),
  /** Adds a roll to the loot log from this session onward. */
  addLoot: (sessionId: string, entry: NewLootLogEntry) => apiClient.addSessionLoot<Session>(sessionId, entry),
  /** Hides an entry from this session onward (earlier sessions keep it). */
  removeLoot: (sessionId: string, entryId: string) => apiClient.removeSessionLoot<Session>(sessionId, entryId),
};
