import { apiClient } from './client';
import type { Rarity } from '../lib/lootRarity';

export type SessionMode = 'adventuring' | 'combat';

export interface PcNote {
  partyMemberId: string;
  text: string;
}

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
  mode: SessionMode;
  /** The music region this session plays from; null = the built-in Everywhere region. */
  regionId: string | null;
  /** Session Notes: belongs to this one session and is never carried into later ones. */
  generalNotes: string | null;
  /** Everything below follows the Campaign: a session shows what it set itself, else what the nearest earlier session did. */
  campaignNotes: string | null;
  npcNotes: string | null;
  pcNotes: PcNote[];
  lootLog: LootLogEntry[];
}

/** A roll as it's handed to the store, which assigns its id and session. */
export type NewLootLogEntry = Omit<LootLogEntry, 'id' | 'sessionId'>;

export interface CreateSessionRequest {
  campaignId: string;
  name: string;
  fear?: number;
  mode?: SessionMode;
  regionId?: string | null;
  generalNotes?: string;
  campaignNotes?: string;
  npcNotes?: string;
  /** Only the members whose notes changed; the rest keep what they carry from earlier sessions. */
  pcNotes?: PcNote[];
}

export type UpdateSessionRequest = Partial<Omit<CreateSessionRequest, 'campaignId'>>;

export const sessionsApi = {
  list: () => apiClient.list<Session>('sessions'),
  listByCampaign: (campaignId: string) => apiClient.listSessionsByCampaign<Session>(campaignId),
  create: (body: CreateSessionRequest) => apiClient.create<Session>('sessions', body),
  /** A new session that also starts with the source's Session Notes and mode (everything else carries anyway). */
  clone: (sourceId: string, options?: { name?: string }) => apiClient.cloneSession<Session>(sourceId, options),
  update: (id: string, body: UpdateSessionRequest) => apiClient.update<Session>('sessions', id, body),
  remove: (id: string) => apiClient.remove('sessions', id),
  /** Adds a roll to the loot log from this session onward. */
  addLoot: (sessionId: string, entry: NewLootLogEntry) => apiClient.addSessionLoot<Session>(sessionId, entry),
  /** Hides an entry from this session onward (earlier sessions keep it). */
  removeLoot: (sessionId: string, entryId: string) => apiClient.removeSessionLoot<Session>(sessionId, entryId),
};
