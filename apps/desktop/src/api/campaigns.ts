import { apiClient } from './client';

export interface Campaign {
  id: string;
  name: string;
  notes: string | null;
  colorHex: string | null;
  /** The party's level (1-10), shown on the Campaign banner. */
  level: number;
}

export interface CreateCampaignRequest {
  name: string;
  notes?: string;
  colorHex?: string;
  level?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  notes?: string;
  colorHex?: string;
  level?: number;
}

export const campaignsApi = {
  list: () => apiClient.list<Campaign>('campaigns'),
  create: (body: CreateCampaignRequest) => apiClient.create<Campaign>('campaigns', body),
  update: (id: string, body: UpdateCampaignRequest) => apiClient.update<Campaign>('campaigns', id, body),
  remove: (id: string) => apiClient.remove('campaigns', id),
};
