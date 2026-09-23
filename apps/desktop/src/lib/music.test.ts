import { describe, expect, it } from 'vitest';
import { defaultCandidates, resolveDefaultTrack } from './music';
import type { MusicRegion, MusicTrack } from '../api/music';

const track = (id: string, regionId = 'everywhere'): MusicTrack => ({
  id,
  name: id,
  regionId,
  fileName: `${id}.mp3`,
  sizeBytes: 1,
});
const region = (over: Partial<MusicRegion> & { id: string }): MusicRegion => ({
  name: over.id,
  isDefault: false,
  adventuringTrackId: null,
  combatTrackId: null,
  ...over,
});

const everywhere = region({ id: 'everywhere', isDefault: true, adventuringTrackId: 'calm', combatTrackId: 'drums' });
const coast = region({ id: 'coast', combatTrackId: 'surf' });
const tracks = [track('calm'), track('drums'), track('surf', 'coast')];
const regions = [everywhere, coast];

describe('resolveDefaultTrack', () => {
  it('uses the region\'s own default for the mode when it has one', () => {
    expect(resolveDefaultTrack('combat', 'coast', regions, tracks)?.id).toBe('surf');
  });

  it('falls back to Everywhere when the region has no default for that mode', () => {
    expect(resolveDefaultTrack('adventuring', 'coast', regions, tracks)?.id).toBe('calm');
  });

  it('uses Everywhere when the session has no region', () => {
    expect(resolveDefaultTrack('combat', null, regions, tracks)?.id).toBe('drums');
  });

  it('returns null when nothing is set anywhere, or the track no longer exists', () => {
    expect(resolveDefaultTrack('combat', null, [region({ id: 'everywhere', isDefault: true })], tracks)).toBeNull();
    expect(resolveDefaultTrack('combat', 'coast', regions, [])).toBeNull();
  });
});

describe('defaultCandidates', () => {
  it('lets Everywhere pick any track but a user region only its own', () => {
    expect(defaultCandidates(everywhere, tracks)).toHaveLength(3);
    expect(defaultCandidates(coast, tracks).map((t) => t.id)).toEqual(['surf']);
  });
});
