import { createCrudApi } from './createCrudApi';

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

export const campaignsApi = createCrudApi<Campaign, CreateCampaignRequest, UpdateCampaignRequest>('campaigns');
