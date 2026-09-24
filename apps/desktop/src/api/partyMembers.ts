import { apiClient, type SessionContext } from './client';

export interface Trackable {
  label: string;
  current: number;
  max: number;
}

export interface PartyMember {
  id: string;
  campaignId: string;
  name: string;
  notes: string | null;
  trackables: Trackable[];
  /** True when this member was last changed in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreatePartyMemberRequest {
  campaignId: string;
  /** The session to add them in (they appear from it onward). Omit for the Campaign's latest. */
  sessionId?: string;
  name: string;
  notes?: string;
  trackables?: Trackable[];
}

export interface UpdatePartyMemberRequest {
  campaignId?: string;
  name?: string;
  notes?: string;
  trackables?: Trackable[];
}

export const partyMembersApi = {
  list: () => apiClient.list<PartyMember>('partyMembers'),
  /** The party as of the Campaign's latest session. */
  listByCampaign: (campaignId: string) => apiClient.listPartyMembersByCampaign<PartyMember>(campaignId),
  /** The party as one session sees it. */
  listBySession: (sessionId: string) => apiClient.listPartyMembersBySession<PartyMember>(sessionId),
  create: (body: CreatePartyMemberRequest) => apiClient.create<PartyMember>('partyMembers', body),
  /** Edits from `ctx.sessionId` onward (earlier sessions keep what they had). */
  update: (id: string, body: UpdatePartyMemberRequest, ctx?: SessionContext) =>
    apiClient.update<PartyMember>('partyMembers', id, body, ctx),
  /** Removes the member from `ctx.sessionId` only (earlier sessions keep them). */
  remove: (id: string, ctx?: SessionContext) => apiClient.remove('partyMembers', id, ctx),
};
