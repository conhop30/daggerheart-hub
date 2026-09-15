import { apiClient } from './client';
import type { Feature } from './heroClasses';

export interface Transformation {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
  gameSetId: string;
}

export interface CreateTransformationRequest {
  name: string;
  description?: string;
  features?: Feature[];
  gameSetId: string;
}

export type UpdateTransformationRequest = Partial<CreateTransformationRequest>;

export const transformationsApi = {
  list: () => apiClient.list<Transformation>('transformations'),
  create: (body: CreateTransformationRequest) => apiClient.create<Transformation>('transformations', body),
  update: (id: string, body: UpdateTransformationRequest) =>
    apiClient.update<Transformation>('transformations', id, body),
  remove: (id: string) => apiClient.remove('transformations', id),
};
