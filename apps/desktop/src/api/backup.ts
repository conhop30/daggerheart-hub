import { apiClient } from './client';

// Export/import of the whole local store — the substitute for live sync
// described in daggerheart-hub-spec.md Section 6: no conflict resolution,
// just "copy this file to another device and import it there."
export const backupApi = {
  exportData: () => apiClient.exportData(),
  importData: () => apiClient.importData(),
};
