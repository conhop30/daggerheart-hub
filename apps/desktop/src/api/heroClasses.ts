import { apiClient } from './client';

// Mirrors FeatureDto on the backend — shared by HeroClass.classFeatures and
// Subclass's specialization/mastery features.
export interface Feature {
  name: string;
  description?: string;
}

// Mirrors HeroClassResponse on the backend.
export interface HeroClass {
  id: number;
  name: string;
  description: string | null;
  primaryDomainId: number;
  secondaryDomainId: number;
  startingEvasion: number | null;
  startingHp: number | null;
  classItems: string | null;
  hopeFeature: string | null;
  classFeatures: Feature[];
  gameSetId: number;
}

export interface CreateHeroClassRequest {
  name: string;
  description?: string;
  primaryDomainId: number;
  secondaryDomainId: number;
  startingEvasion?: number;
  startingHp?: number;
  classItems?: string;
  hopeFeature?: string;
  classFeatures?: Feature[];
  gameSetId: number;
}

// Mirrors UpdateHeroClassRequest on the backend. Every field is optional —
// PATCH semantics: an omitted field leaves the existing value alone, an
// explicit "" clears a string field, and omitting classFeatures leaves the
// list alone while sending [] clears it.
export interface UpdateHeroClassRequest {
  name?: string;
  description?: string;
  primaryDomainId?: number;
  secondaryDomainId?: number;
  startingEvasion?: number;
  startingHp?: number;
  classItems?: string;
  hopeFeature?: string;
  classFeatures?: Feature[];
  gameSetId?: number;
}

export const heroClassesApi = {
  list: () => apiClient.request<HeroClass[]>('/hero-classes'),
  get: (id: number) => apiClient.request<HeroClass>(`/hero-classes/${id}`),
  create: (body: CreateHeroClassRequest) =>
    apiClient.request<HeroClass>('/hero-classes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number, body: UpdateHeroClassRequest) =>
    apiClient.request<HeroClass>(`/hero-classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
