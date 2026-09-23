import { EVERYWHERE_REGION_ID, type MusicRegion, type MusicTrack } from '../api/music';
import type { SessionMode } from '../api/sessions';

/**
 * The track that should loop for a session mode: the chosen region's own
 * default if it has one, else the Everywhere region's, else nothing.
 */
export function resolveDefaultTrack(
  mode: SessionMode,
  regionId: string | null,
  regions: MusicRegion[],
  tracks: MusicTrack[]
): MusicTrack | null {
  const pick = (region: MusicRegion | undefined) => {
    const id = mode === 'combat' ? region?.combatTrackId : region?.adventuringTrackId;
    return id ? (tracks.find((t) => t.id === id) ?? null) : null;
  };
  const chosen = regionId ? regions.find((r) => r.id === regionId) : undefined;
  const everywhere = regions.find((r) => r.id === EVERYWHERE_REGION_ID);
  return pick(chosen) ?? pick(everywhere);
}

/** Tracks a region may pick its defaults from: Everywhere can use any, a user region only its own. */
export function defaultCandidates(region: MusicRegion, tracks: MusicTrack[]): MusicTrack[] {
  return region.isDefault ? tracks : tracks.filter((t) => t.regionId === region.id);
}
