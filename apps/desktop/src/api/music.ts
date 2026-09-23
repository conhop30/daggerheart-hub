import { apiClient } from './client';

/** The built-in region: holds the app-wide default tracks and can't be renamed or removed. */
export const EVERYWHERE_REGION_ID = 'everywhere';

export interface MusicRegion {
  id: string;
  name: string;
  isDefault: boolean;
  /** What loops while adventuring. null = inherit from Everywhere. */
  adventuringTrackId: string | null;
  /** What loops in combat. null = inherit from Everywhere. */
  combatTrackId: string | null;
}

export interface MusicTrack {
  id: string;
  name: string;
  regionId: string;
  /** The generated name of the audio file copied into the app's music folder. */
  fileName: string;
  sizeBytes: number | null;
}

export type UpdateMusicRegionRequest = Partial<Pick<MusicRegion, 'name' | 'adventuringTrackId' | 'combatTrackId'>>;

export const musicApi = {
  listRegions: () => apiClient.list<MusicRegion>('musicRegions'),
  createRegion: (body: { name: string }) => apiClient.create<MusicRegion>('musicRegions', body),
  updateRegion: (id: string, body: UpdateMusicRegionRequest) =>
    apiClient.update<MusicRegion>('musicRegions', id, body),
  removeRegion: (id: string) => apiClient.remove('musicRegions', id),
  listTracks: () => apiClient.list<MusicTrack>('musicTracks'),
  updateTrack: (id: string, body: { name?: string; regionId?: string }) =>
    apiClient.update<MusicTrack>('musicTracks', id, body),
  removeTrack: (id: string) => apiClient.remove('musicTracks', id),
  /** Opens a file picker and copies the chosen audio files into the library. */
  importFiles: (regionId: string) => apiClient.importMusicFiles<MusicTrack>(regionId),
};

/** Where the renderer plays a track from — served by the main process's dhmedia:// protocol. */
export function trackUrl(track: Pick<MusicTrack, 'fileName'>): string {
  return `dhmedia://track/${encodeURIComponent(track.fileName)}`;
}
