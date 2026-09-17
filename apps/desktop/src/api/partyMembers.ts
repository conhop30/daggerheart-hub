import { apiClient } from './client';

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
}

export interface CreatePartyMemberRequest {
  campaignId: string;
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
  listByCampaign: (campaignId: string) => apiClient.listPartyMembersByCampaign<PartyMember>(campaignId),
  create: (body: CreatePartyMemberRequest) => apiClient.create<PartyMember>('partyMembers', body),
  update: (id: string, body: UpdatePartyMemberRequest) => apiClient.update<PartyMember>('partyMembers', id, body),
  remove: (id: string) => apiClient.remove('partyMembers', id),
};
