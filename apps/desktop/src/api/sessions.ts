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
  generalNotes: string | null;
  npcNotes: string | null;
  pcNotes: PcNote[];
  lootLog: LootLogEntry[];
}

export interface CreateSessionRequest {
  campaignId: string;
  name: string;
  fear?: number;
  mode?: SessionMode;
  generalNotes?: string;
  npcNotes?: string;
  pcNotes?: PcNote[];
  lootLog?: LootLogEntry[];
}

export type UpdateSessionRequest = Partial<Omit<CreateSessionRequest, 'campaignId'>>;

export const sessionsApi = {
  list: () => apiClient.list<Session>('sessions'),
  listByCampaign: (campaignId: string) => apiClient.listSessionsByCampaign<Session>(campaignId),
  create: (body: CreateSessionRequest) => apiClient.create<Session>('sessions', body),
  update: (id: string, body: UpdateSessionRequest) => apiClient.update<Session>('sessions', id, body),
  remove: (id: string) => apiClient.remove('sessions', id),
};
