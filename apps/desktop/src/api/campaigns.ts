import { apiClient } from './client';

export interface Campaign {
  id: string;
  name: string;
  notes: string | null;
  colorHex: string | null;
  /** The party's level (1-10), shown on the Campaign banner. */
  level: number;
  /** Optional cover art for the Campaign row, as a data: URL. Falls back to the colorHex gradient when unset. */
  coverImage: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  notes?: string;
  colorHex?: string;
  level?: number;
  coverImage?: string | null;
}

export interface UpdateCampaignRequest {
  name?: string;
  notes?: string;
  colorHex?: string;
  level?: number;
  coverImage?: string | null;
}

export const campaignsApi = {
  list: () => apiClient.list<Campaign>('campaigns'),
  create: (body: CreateCampaignRequest) => apiClient.create<Campaign>('campaigns', body),
  update: (id: string, body: UpdateCampaignRequest) => apiClient.update<Campaign>('campaigns', id, body),
  remove: (id: string) => apiClient.remove('campaigns', id),
};
