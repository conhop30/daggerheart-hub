import { apiClient } from './client';

// Mirrors GameSetResponse on the backend.
export interface GameSet {
  id: number;
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
  list: () => apiClient.request<GameSet[]>('/game-sets'),
  get: (id: number) => apiClient.request<GameSet>(`/game-sets/${id}`),
  create: (body: CreateGameSetRequest) =>
    apiClient.request<GameSet>('/game-sets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
