import { apiClient } from './client';

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  iconPath: string | null;
  gameSetId: string;
}

export interface CreateDomainRequest {
  name: string;
  description?: string;
  colorHex?: string;
  iconPath?: string;
  gameSetId: string;
}

export interface UpdateDomainRequest {
  name?: string;
  description?: string;
  colorHex?: string;
  iconPath?: string;
  gameSetId?: string;
}

export const domainsApi = {
  list: () => apiClient.list<Domain>('domains'),
  create: (body: CreateDomainRequest) => apiClient.create<Domain>('domains', body),
  update: (id: string, body: UpdateDomainRequest) => apiClient.update<Domain>('domains', id, body),
  remove: (id: string) => apiClient.remove('domains', id),
};
