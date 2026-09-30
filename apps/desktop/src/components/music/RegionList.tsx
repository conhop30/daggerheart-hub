import { useState } from 'react';
import type { MusicRegion, MusicTrack } from '../../api/music';
import './RegionList.css';

interface RegionListProps {
  regions: MusicRegion[];
  tracks: MusicTrack[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

// Browse + create regions — the rail on the Music tab, and the region strip
// inside the in-session collapsible editor.
export default function RegionList({ regions, tracks, selectedId, onSelect, onCreate }: RegionListProps) {
  const [newRegionName, setNewRegionName] = useState<string | null>(null);

  function submitCreate() {
    const name = (newRegionName ?? '').trim();
    if (!name) return;
    onCreate(name);
    setNewRegionName(null);
  }

  return (
    <aside className="region-list" aria-label="Regions">
      <h2 className="region-list__title">Regions</h2>
      <ul className="region-list__regions">
        {regions.map((region) => (
          <li key={region.id}>
            <button
              type="button"
              className={`region-list__region${region.id === selectedId ? ' region-list__region--active' : ''}`}
              onClick={() => onSelect(region.id)}
            >
              <span>{region.name}</span>
              <span className="region-list__count">{tracks.filter((t) => t.regionId === region.id).length}</span>
            </button>
          </li>
        ))}
      </ul>
      {newRegionName === null ? (
        <button type="button" className="region-list__btn" onClick={() => setNewRegionName('')}>
          + New Region
        </button>
      ) : (
        <form
          className="region-list__inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitCreate();
          }}
        >
          <input
            autoFocus
            value={newRegionName}
            placeholder="Region name"
            aria-label="New region name"
            onChange={(e) => setNewRegionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setNewRegionName(null)}
          />
          <button type="submit" className="region-list__btn">
            Add
          </button>
        </form>
      )}
    </aside>
  );
}
