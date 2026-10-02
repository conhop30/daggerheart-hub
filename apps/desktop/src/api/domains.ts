import { createCrudApi } from './createCrudApi';

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

export const domainsApi = createCrudApi<Domain, CreateDomainRequest, UpdateDomainRequest>('domains');
