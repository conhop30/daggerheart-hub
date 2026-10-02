import type { MusicRegion, MusicTrack } from '../../api/music';
import './RegionDefaults.css';

interface RegionDefaultsProps {
  region: MusicRegion;
  candidates: MusicTrack[];
  inheritLabel: string;
  onSetDefault: (trackId: string) => void;
}

// The default-track picker for the selected region — what loops when a
// Session picks this region to play from.
export default function RegionDefaults({ region, candidates, inheritLabel, onSetDefault }: RegionDefaultsProps) {
  return (
    <div className="region-defaults">
      <label>
        Default track
        <select aria-label="Default track" value={region.defaultTrackId ?? ''} onChange={(e) => onSetDefault(e.target.value)}>
          <option value="">{inheritLabel}</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
