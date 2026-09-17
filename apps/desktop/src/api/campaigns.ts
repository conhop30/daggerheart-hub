import { apiClient } from './client';

export interface Campaign {
  id: string;
  name: string;
  notes: string | null;
  colorHex: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  notes?: string;
  colorHex?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  notes?: string;
  colorHex?: string;
}

export const campaignsApi = {
  list: () => apiClient.list<Campaign>('campaigns'),
  create: (body: CreateCampaignRequest) => apiClient.create<Campaign>('campaigns', body),
  update: (id: string, body: UpdateCampaignRequest) => apiClient.update<Campaign>('campaigns', id, body),
  remove: (id: string) => apiClient.remove('campaigns', id),
};
