import { apiClient } from './client';

// Shared by HeroClass.classFeatures and Subclass's specialization/mastery
// features.
export interface Feature {
  name: string;
  description?: string;
}

export interface HeroClass {
  id: string;
  name: string;
  description: string | null;
  primaryDomainId: string;
  secondaryDomainId: string;
  startingEvasion: number | null;
  startingHp: number | null;
  classItems: string | null;
  hopeFeature: string | null;
  classFeatures: Feature[];
  gameSetId: string;
}

export interface CreateHeroClassRequest {
  name: string;
  description?: string;
  primaryDomainId: string;
  secondaryDomainId: string;
  startingEvasion?: number;
  startingHp?: number;
  classItems?: string;
  hopeFeature?: string;
  classFeatures?: Feature[];
  gameSetId: string;
}

// PATCH semantics: an omitted field leaves the existing value alone, an
// explicit "" clears a string field, and omitting classFeatures leaves the
// list alone while sending [] clears it.
export interface UpdateHeroClassRequest {
  name?: string;
  description?: string;
  primaryDomainId?: string;
  secondaryDomainId?: string;
  startingEvasion?: number;
  startingHp?: number;
  classItems?: string;
  hopeFeature?: string;
  classFeatures?: Feature[];
  gameSetId?: string;
}

export const heroClassesApi = {
  list: () => apiClient.list<HeroClass>('heroClasses'),
  create: (body: CreateHeroClassRequest) => apiClient.create<HeroClass>('heroClasses', body),
  update: (id: string, body: UpdateHeroClassRequest) => apiClient.update<HeroClass>('heroClasses', id, body),
};
