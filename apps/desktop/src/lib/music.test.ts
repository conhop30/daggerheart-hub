import { describe, expect, it } from 'vitest';
import { defaultCandidates, resolveDefaultTrack } from './music';
import type { MusicRegion, MusicTrack } from '../api/music';

const track = (id: string, regionId = 'everywhere'): MusicTrack => ({
  id,
  name: id,
  regionId,
  fileName: `${id}.mp3`,
  sizeBytes: 1,
  volume: 1,
});
const region = (over: Partial<MusicRegion> & { id: string }): MusicRegion => ({
  name: over.id,
  isDefault: false,
  campaignId: null,
  defaultTrackId: null,
  ...over,
});

const everywhere = region({ id: 'everywhere', isDefault: true, defaultTrackId: 'calm' });
const coast = region({ id: 'coast', defaultTrackId: 'surf' });
const tracks = [track('calm'), track('surf', 'coast')];
const regions = [everywhere, coast];

describe('resolveDefaultTrack', () => {
  it("uses the region's own default when it has one", () => {
    expect(resolveDefaultTrack('coast', regions, tracks)?.id).toBe('surf');
  });

  it('falls back to Everywhere when the region has no default set', () => {
    const empty = region({ id: 'empty' });
    expect(resolveDefaultTrack('empty', [everywhere, empty], tracks)?.id).toBe('calm');
  });

  it('uses Everywhere when the session has no region', () => {
    expect(resolveDefaultTrack(null, regions, tracks)?.id).toBe('calm');
  });

  it('returns null when nothing is set anywhere, or the track no longer exists', () => {
    expect(resolveDefaultTrack(null, [region({ id: 'everywhere', isDefault: true })], tracks)).toBeNull();
    expect(resolveDefaultTrack('coast', regions, [])).toBeNull();
  });
});

describe('defaultCandidates', () => {
  it('lets Everywhere pick any track but a user region only its own', () => {
    expect(defaultCandidates(everywhere, tracks)).toHaveLength(2);
    expect(defaultCandidates(coast, tracks).map((t) => t.id)).toEqual(['surf']);
  });
});
