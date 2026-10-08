import { apiClient, type SessionContext } from './client';

export interface PartyMember {
  id: string;
  campaignId: string;
  name: string;
  notes: string | null;
  classId: string | null;
  subclassId: string | null;
  /** A multiclassed PC's second Class and Subclass. */
  secondClassId: string | null;
  secondSubclassId: string | null;
  /** Heritage is the pair: Ancestry + Community. */
  ancestryId: string | null;
  communityId: string | null;
  /** Optional portrait for the member's tile, as a data: URL — wins over their Subclass backdrop(s) when set. A tall image centers and fades on both sides; a wide one fills the tile. */
  portraitImage: string | null;
  /** True when this member was last changed in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreatePartyMemberRequest {
  campaignId: string;
  /** The session to add them in (they appear from it onward). Omit for the Campaign's latest. */
  sessionId?: string;
  name: string;
  notes?: string;
  portraitImage?: string | null;
  classId?: string | null;
  subclassId?: string | null;
  secondClassId?: string | null;
  secondSubclassId?: string | null;
  ancestryId?: string | null;
  communityId?: string | null;
}

export interface UpdatePartyMemberRequest {
  campaignId?: string;
  name?: string;
  notes?: string;
  portraitImage?: string | null;
  classId?: string | null;
  subclassId?: string | null;
  secondClassId?: string | null;
  secondSubclassId?: string | null;
  ancestryId?: string | null;
  communityId?: string | null;
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
