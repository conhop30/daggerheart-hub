import { apiClient } from './client';
import type { Feature } from './heroClasses';

// Mirrors SpellcastTrait on the backend — deliberately no UNKNOWN member.
// null on a Subclass/FoundationFeature means "not yet chosen"; NONE means
// "genuinely has no spellcast trait." See the backend enum for the same note.
export type SpellcastTrait =
  | 'STRENGTH'
  | 'FINESSE'
  | 'KNOWLEDGE'
  | 'PRESENCE'
  | 'AGILITY'
  | 'INSTINCT'
  | 'NONE';

// Mirrors FoundationFeatureDto — a Feature plus an optional per-feature
// spellcast trait override.
export interface FoundationFeature {
  name: string;
  description?: string;
  spellcastTrait?: SpellcastTrait | null;
}

// Mirrors SubclassResponse on the backend.
export interface Subclass {
  id: number;
  name: string;
  oneliner: string | null;
  parentClassId: number;
  spellcastTrait: SpellcastTrait | null;
  foundationFeatures: FoundationFeature[];
  specializationFeatures: Feature[];
  masteryFeatures: Feature[];
  gameSetId: number;
}

export interface CreateSubclassRequest {
  name: string;
  oneliner?: string;
  parentClassId: number;
  spellcastTrait?: SpellcastTrait | null;
  foundationFeatures?: FoundationFeature[];
  specializationFeatures?: Feature[];
  masteryFeatures?: Feature[];
  gameSetId: number;
}

// Mirrors UpdateSubclassRequest on the backend. Same PATCH semantics as
// UpdateHeroClassRequest — omitted fields are left alone.
export interface UpdateSubclassRequest {
  name?: string;
  oneliner?: string;
  parentClassId?: number;
  spellcastTrait?: SpellcastTrait | null;
  foundationFeatures?: FoundationFeature[];
  specializationFeatures?: Feature[];
  masteryFeatures?: Feature[];
  gameSetId?: number;
}

export const subclassesApi = {
  list: () => apiClient.request<Subclass[]>('/subclasses'),
  listByParentClass: (parentClassId: number) =>
    apiClient.request<Subclass[]>(`/subclasses?parentClassId=${parentClassId}`),
  get: (id: number) => apiClient.request<Subclass>(`/subclasses/${id}`),
  create: (body: CreateSubclassRequest) =>
    apiClient.request<Subclass>('/subclasses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number, body: UpdateSubclassRequest) =>
    apiClient.request<Subclass>(`/subclasses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
