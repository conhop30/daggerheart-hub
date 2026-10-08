import { apiClient } from './client';
import { createCrudApi } from './createCrudApi';

export type JournalEntryKind =
  | 'ADVERSARIES'
  | 'LOOT'
  | 'CONSUMABLES'
  | 'ARMOR'
  | 'WEAPONS'
  | 'WORLDBUILDING'
  | 'OTHER'
  /** One per Session, opened from the Journal's own Campaign/Session toggle, never from the "+" menu. */
  | 'SESSION';

export interface JournalEntry {
  id: string;
  campaignId: string;
  kind: JournalEntryKind;
  label: string;
  notes: string;
  /** Manual sort position within this (campaignId, kind) group. */
  order: number;
}

export interface CreateJournalEntryRequest {
  campaignId: string;
  kind: JournalEntryKind;
  label?: string;
  notes?: string;
}

export interface UpdateJournalEntryRequest {
  label?: string;
  notes?: string;
  order?: number;
}

export const journalApi = {
  ...createCrudApi<JournalEntry, CreateJournalEntryRequest, UpdateJournalEntryRequest>('journalEntries'),
  listByCampaign: (campaignId: string) => apiClient.listJournalEntriesByCampaign<JournalEntry>(campaignId),
};
