import { apiClient, type SessionContext } from './client';

// Most collections are plain CRUD over apiClient: list/create/update/remove
// against one collection name, nothing else. 13 of the ~24 files in this
// folder were independently re-typing that exact same 4-line object
// (only the collection name and the T/CreateReq/UpdateReq types changed) —
// real duplicated-operations redundancy, not just superficially similar
// code. This factory is the one place that shape lives now; a file using
// it keeps only what's actually distinct about it (its types, plus any
// extra method beyond plain CRUD — see cards.ts for an example of
// composing one in).
//
// Not every collection fits this: Subclass and HeroClass have no `remove`
// at all (pre-existing gaps in the backend, not something to paper over
// here), and PartyMember has two extra list methods plus an *optional*
// SessionContext — different enough from either factory below that
// forcing it in would need as much special-casing as it saves. Those stay
// hand-written.
export function createCrudApi<T, CreateReq, UpdateReq = Partial<CreateReq>>(collection: string) {
  return {
    list: () => apiClient.list<T>(collection),
    create: (body: CreateReq) => apiClient.create<T>(collection, body),
    update: (id: string, body: UpdateReq) => apiClient.update<T>(collection, id, body),
    remove: (id: string) => apiClient.remove(collection, id),
  };
}

// The session-scoped variant: SessionAdversary and SessionEnvironment are
// snapshots that only ever get edited/removed within a specific session's
// context, so — unlike createCrudApi above — ctx is required, not
// optional, on purpose: it's what stops a caller from forgetting to say
// which session an edit applies to. (PartyMember's ctx is genuinely
// optional instead — a carry-forward edit can default to "the Campaign's
// latest session" — which is exactly why it isn't built on this.)
export function createSessionScopedCrudApi<T, CreateReq, UpdateReq = Partial<CreateReq>>(collection: string) {
  return {
    list: () => apiClient.list<T>(collection),
    create: (body: CreateReq) => apiClient.create<T>(collection, body),
    update: (id: string, body: UpdateReq, ctx: SessionContext) => apiClient.update<T>(collection, id, body, ctx),
    remove: (id: string, ctx: SessionContext) => apiClient.remove(collection, id, ctx),
  };
}
