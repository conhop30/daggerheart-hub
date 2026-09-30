import type { MusicRegion, MusicTrack } from '../../api/music';
import './RegionDefaults.css';

interface RegionDefaultsProps {
  region: MusicRegion;
  candidates: MusicTrack[];
  inheritLabel: string;
  onSetDefault: (field: 'adventuringTrackId' | 'combatTrackId', trackId: string) => void;
}

// The two mode-default pickers for the selected region — what loops while
// Adventuring vs. in Combat.
export default function RegionDefaults({ region, candidates, inheritLabel, onSetDefault }: RegionDefaultsProps) {
  return (
    <div className="region-defaults">
      <label>
        Adventuring loops
        <select
          aria-label="Adventuring default"
          value={region.adventuringTrackId ?? ''}
          onChange={(e) => onSetDefault('adventuringTrackId', e.target.value)}
        >
          <option value="">{inheritLabel}</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Combat loops
        <select
          aria-label="Combat default"
          value={region.combatTrackId ?? ''}
          onChange={(e) => onSetDefault('combatTrackId', e.target.value)}
        >
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
