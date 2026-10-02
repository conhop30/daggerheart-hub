import { apiClient } from './client';

/** The built-in region: holds the app-wide default tracks and can't be renamed or removed. */
export const EVERYWHERE_REGION_ID = 'everywhere';

/** Custom drag MIME type carrying a track id — TrackList sets it, RegionList reads it, for the "drag a track onto a region to copy it there" interaction. A dedicated type (not text/plain) so an unrelated text drag from elsewhere in the app never accidentally triggers a copy. */
export const TRACK_DRAG_MIME = 'application/x-daggerheart-track';

export interface MusicRegion {
  id: string;
  name: string;
  isDefault: boolean;
  /** null = application-wide, offered from every Campaign's Sessions. Set = scoped to just that one Campaign. */
  campaignId: string | null;
  /** What loops when a Session picks this region. null = inherit from Everywhere. */
  defaultTrackId: string | null;
}

export interface MusicTrack {
  id: string;
  name: string;
  regionId: string;
  /** The generated name of the audio file copied into the app's music folder. */
  fileName: string;
  sizeBytes: number | null;
  /** 0–1, per-track trim applied on top of the shared Volume slider — tracks are innately different in loudness. */
  volume: number;
}

export type UpdateMusicRegionRequest = Partial<Pick<MusicRegion, 'name' | 'defaultTrackId'>>;
export interface UpdateMusicTrackRequest {
  name?: string;
  regionId?: string;
  volume?: number;
}

export const musicApi = {
  listRegions: () => apiClient.list<MusicRegion>('musicRegions'),
  /** campaignId omitted or null creates an application-wide region; set it to scope the new region to just that Campaign. */
  createRegion: (body: { name: string; campaignId?: string | null }) => apiClient.create<MusicRegion>('musicRegions', body),
  updateRegion: (id: string, body: UpdateMusicRegionRequest) =>
    apiClient.update<MusicRegion>('musicRegions', id, body),
  removeRegion: (id: string) => apiClient.remove('musicRegions', id),
  listTracks: () => apiClient.list<MusicTrack>('musicTracks'),
  updateTrack: (id: string, body: UpdateMusicTrackRequest) => apiClient.update<MusicTrack>('musicTracks', id, body),
  removeTrack: (id: string) => apiClient.remove('musicTracks', id),
  /** Opens a file picker and copies the chosen audio files into the library. */
  importFiles: (regionId: string) => apiClient.importMusicFiles<MusicTrack>(regionId),
  /** Same, but for files dragged straight from the OS onto a track list — filePaths come from the dropped Files' Electron-only `.path`. */
  importDroppedPaths: (regionId: string, filePaths: string[]) => apiClient.importDroppedMusicPaths<MusicTrack>(regionId, filePaths),
  /** Copies a track into another region (new file + new record) — the original is left untouched, unlike moving it. */
  copyTrackToRegion: (trackId: string, targetRegionId: string) => apiClient.copyMusicTrackToRegion<MusicTrack>(trackId, targetRegionId),
};

/** Where the renderer plays a track from — served by the main process's dhmedia:// protocol. */
export function trackUrl(track: Pick<MusicTrack, 'fileName'>): string {
  return `dhmedia://track/${encodeURIComponent(track.fileName)}`;
}
