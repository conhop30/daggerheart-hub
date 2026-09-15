import { apiClient } from './client';
import type { Feature } from './heroClasses';

// null on a Subclass/FoundationFeature means "not yet chosen"; NONE means
// "genuinely has no spellcast trait."
export type SpellcastTrait =
  | 'STRENGTH'
  | 'FINESSE'
  | 'KNOWLEDGE'
  | 'PRESENCE'
  | 'AGILITY'
  | 'INSTINCT'
  | 'NONE';

// A Feature plus an optional per-feature spellcast trait override.
export interface FoundationFeature {
  name: string;
  description?: string;
  spellcastTrait?: SpellcastTrait | null;
}

export interface Subclass {
  id: string;
  name: string;
  oneliner: string | null;
  parentClassId: string;
  spellcastTrait: SpellcastTrait | null;
  foundationFeatures: FoundationFeature[];
  specializationFeatures: Feature[];
  masteryFeatures: Feature[];
  gameSetId: string;
}

export interface CreateSubclassRequest {
  name: string;
  oneliner?: string;
  parentClassId: string;
  spellcastTrait?: SpellcastTrait | null;
  foundationFeatures?: FoundationFeature[];
  specializationFeatures?: Feature[];
  masteryFeatures?: Feature[];
  gameSetId: string;
}

// Same PATCH semantics as UpdateHeroClassRequest — omitted fields are left
// alone.
export interface UpdateSubclassRequest {
  name?: string;
  oneliner?: string;
  parentClassId?: string;
  spellcastTrait?: SpellcastTrait | null;
  foundationFeatures?: FoundationFeature[];
  specializationFeatures?: Feature[];
  masteryFeatures?: Feature[];
  gameSetId?: string;
}

export const subclassesApi = {
  list: () => apiClient.list<Subclass>('subclasses'),
  listByParentClass: (parentClassId: string) => apiClient.listSubclassesByParentClass<Subclass>(parentClassId),
  create: (body: CreateSubclassRequest) => apiClient.create<Subclass>('subclasses', body),
  update: (id: string, body: UpdateSubclassRequest) => apiClient.update<Subclass>('subclasses', id, body),
};
