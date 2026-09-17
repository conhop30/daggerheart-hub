import { apiClient } from './client';
import type { AttackRange, AttackType } from './adversaries';
import type { Thresholds } from '../components/ThresholdsInput';

// A snapshot of a master Adversary at pull-in time, not a live reference —
// see electron/store.js's comment on buildSessionAdversary for why.
export interface SessionAdversary {
  id: string;
  sessionId: string;
  adversaryId: string;
  label: string;
  name: string;
  tier: number | null;
  difficulty: number | null;
  thresholds: Thresholds;
  hpMax: number | null;
  stressMax: number | null;
  attackModifier: number | null;
  attackDescription: string | null;
  attackRange: AttackRange | null;
  attackType: AttackType | null;
  hpMarked: number;
  stressMarked: number;
  conditions: string[];
}

export interface CreateSessionAdversaryRequest {
  sessionId: string;
  adversaryId: string;
  /** Defaults to the master Adversary's name — set this to tell two pulled-in copies apart. */
  label?: string;
}

export interface UpdateSessionAdversaryRequest {
  label?: string;
  hpMarked?: number;
  stressMarked?: number;
  conditions?: string[];
}

export const sessionAdversariesApi = {
  list: () => apiClient.list<SessionAdversary>('sessionAdversaries'),
  listBySession: (sessionId: string) => apiClient.listSessionAdversariesBySession<SessionAdversary>(sessionId),
  create: (body: CreateSessionAdversaryRequest) => apiClient.create<SessionAdversary>('sessionAdversaries', body),
  update: (id: string, body: UpdateSessionAdversaryRequest) =>
    apiClient.update<SessionAdversary>('sessionAdversaries', id, body),
  remove: (id: string) => apiClient.remove('sessionAdversaries', id),
};
