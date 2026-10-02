import type { MusicRegion, MusicTrack } from '../../api/music';
import { ContentCard, ContentCardList, MetaChip } from '../ContentCard';
import './RegionOverview.css';

interface RegionOverviewProps {
  regions: MusicRegion[];
  tracks: MusicTrack[];
  onOpen: (regionId: string) => void;
}

// An at-a-glance grid, one card per region — how many tracks it holds and
// what it currently resolves to, so a GM can spot "this region still needs
// a default" without clicking through every one. "Open" jumps the rail/
// selection below to that region — same ContentCard "Open" idiom the
// Session list already uses for drilling into a row.
export default function RegionOverview({ regions, tracks, onOpen }: RegionOverviewProps) {
  return (
    <ContentCardList
      layout="grid"
      items={regions}
      emptyMessage="No regions yet."
      getKey={(region) => region.id}
      renderItem={(region) => {
        const count = tracks.filter((t) => t.regionId === region.id).length;
        const defaultTrack = tracks.find((t) => t.id === region.defaultTrackId);
        return (
          <ContentCard title={region.name} editLabel="Open" onEdit={() => onOpen(region.id)} meta={<MetaChip label="Tracks" value={count} />}>
            <p className="region-overview__row">
              Default:{' '}
              <strong className={defaultTrack ? undefined : 'region-overview__unset'}>{defaultTrack?.name ?? 'Not set'}</strong>
            </p>
          </ContentCard>
        );
      }}
    />
  );
}
