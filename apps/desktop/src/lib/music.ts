import { EVERYWHERE_REGION_ID, type MusicRegion, type MusicTrack } from '../api/music';

/**
 * The track that should loop for a Session: the chosen region's own default
 * if it has one, else the Everywhere region's, else nothing. There's no
 * mode/combat axis here any more — a GM switches regions by hand whenever
 * they want different music playing.
 */
export function resolveDefaultTrack(
  regionId: string | null,
  regions: MusicRegion[],
  tracks: MusicTrack[]
): MusicTrack | null {
  const pick = (region: MusicRegion | undefined) =>
    region?.defaultTrackId ? (tracks.find((t) => t.id === region.defaultTrackId) ?? null) : null;
  const chosen = regionId ? regions.find((r) => r.id === regionId) : undefined;
  const everywhere = regions.find((r) => r.id === EVERYWHERE_REGION_ID);
  return pick(chosen) ?? pick(everywhere);
}

/** Tracks a region may pick its defaults from: Everywhere can use any, a user region only its own. */
export function defaultCandidates(region: MusicRegion, tracks: MusicTrack[]): MusicTrack[] {
  return region.isDefault ? tracks : tracks.filter((t) => t.regionId === region.id);
}
