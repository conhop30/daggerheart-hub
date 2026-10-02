import { apiClient } from './client';
import { createCrudApi } from './createCrudApi';

export type CardType = 'SPELL' | 'GRIMOIRE' | 'ABILITY';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  level: number | null;
  recallCost: number | null;
  description: string | null;
  imagePath: string | null;
  domainIcon: string | null;
  domainId: string;
  gameSetId: string;
}

export interface CreateCardRequest {
  name: string;
  type: CardType;
  level?: number;
  recallCost?: number;
  description?: string;
  imagePath?: string;
  domainIcon?: string;
  domainId: string;
  gameSetId: string;
}

export interface UpdateCardRequest {
  name?: string;
  type?: CardType;
  level?: number;
  recallCost?: number;
  description?: string;
  imagePath?: string;
  domainIcon?: string;
  domainId?: string;
  gameSetId?: string;
}

export const cardsApi = {
  ...createCrudApi<Card, CreateCardRequest, UpdateCardRequest>('cards'),
  listByDomain: (domainId: string) => apiClient.listCardsByDomain<Card>(domainId),
};
