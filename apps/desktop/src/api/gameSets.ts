import { apiClient } from './client';

export interface GameSet {
  id: string;
  name: string;
  displayOrder: number | null;
  badgeIcon: string | null;
}

export interface CreateGameSetRequest {
  name: string;
  displayOrder?: number;
  badgeIcon?: string;
}

export const gameSetsApi = {
  list: () => apiClient.list<GameSet>('gameSets'),
  create: (body: CreateGameSetRequest) => apiClient.create<GameSet>('gameSets', body),
};
