import { apiClient } from './client';

// Mirrors DomainResponse on the backend.
export interface Domain {
  id: number;
  name: string;
  description: string | null;
  colorHex: string | null;
  iconPath: string | null;
  gameSetId: number;
}

export interface CreateDomainRequest {
  name: string;
  description?: string;
  colorHex?: string;
  iconPath?: string;
  gameSetId: number;
}

export const domainsApi = {
  list: () => apiClient.request<Domain[]>('/domains'),
  get: (id: number) => apiClient.request<Domain>(`/domains/${id}`),
  create: (body: CreateDomainRequest) =>
    apiClient.request<Domain>('/domains', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
