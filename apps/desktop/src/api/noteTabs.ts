import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';

// One tab of a Session's Notes section — see electron/store.js's "Note
// tabs" section. Versioned the same way a Combat tab is: written in one
// Session, it carries forward into the Campaign's later Sessions, where
// editing or deleting it leaves the earlier Sessions' copy alone.
export interface NoteTab {
  id: string;
  sessionId: string;
  name: string;
  order: number;
  notes: string;
  /** True when this tab was last changed in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreateNoteTabRequest {
  sessionId: string;
  name: string;
  order: number;
  notes?: string;
}

export interface UpdateNoteTabRequest {
  name?: string;
  order?: number;
  notes?: string;
}

export const noteTabsApi = {
  ...createSessionScopedCrudApi<NoteTab, CreateNoteTabRequest, UpdateNoteTabRequest>('noteTabs'),
  listBySession: (sessionId: string) => apiClient.listNoteTabsBySession<NoteTab>(sessionId),
};
