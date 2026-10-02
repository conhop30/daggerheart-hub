import { createCrudApi } from './createCrudApi';
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

export const transformationsApi = createCrudApi<Transformation, CreateTransformationRequest, UpdateTransformationRequest>(
  'transformations'
);
