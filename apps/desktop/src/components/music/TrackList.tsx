import { useState } from 'react';
import type { MusicRegion, MusicTrack } from '../../api/music';
import './TrackList.css';

interface TrackListProps {
  tracks: MusicTrack[];
  regions: MusicRegion[];
  selectedRegion: MusicRegion;
  previewId: string | null;
  onPreviewToggle: (trackId: string) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onRename: (track: MusicTrack, name: string) => void;
  onMove: (track: MusicTrack, regionId: string) => void;
  onDelete: (track: MusicTrack) => void;
}

// One compact line per track (preview, name, a default-mode tag, and a
// "⋯" menu for Rename/File in region/Remove) — deliberately not a row of
// always-visible inline controls, so this reads cleanly at the in-session
// sidebar's fixed 260px as well as the full-width Music tab.
export default function TrackList({
  tracks,
  regions,
  selectedRegion,
  previewId,
  onPreviewToggle,
  volume,
  onVolumeChange,
  onRename,
  onMove,
  onDelete,
}: TrackListProps) {
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function startRename(track: MusicTrack) {
    setNameDraft(track.name);
    setRenamingTrackId(track.id);
    setOpenMenuId(null);
  }

  function submitRename(track: MusicTrack) {
    setRenamingTrackId(null);
    onRename(track, nameDraft);
  }

  if (tracks.length === 0) {
    return <p className="track-list__empty">No music in this region yet. Use &ldquo;+ Add Music&rdquo; to bring in audio files.</p>;
  }

  return (
    <div className="track-list">
      {tracks.map((track) => (
        <div className="track-list__track" key={track.id}>
          <button
            type="button"
            className="track-list__play"
            aria-label={previewId === track.id ? `Stop ${track.name}` : `Preview ${track.name}`}
            onClick={() => onPreviewToggle(track.id)}
          >
            {previewId === track.id ? '■' : '▶'}
          </button>

          {renamingTrackId === track.id ? (
            <input
              autoFocus
              className="track-list__rename"
              value={nameDraft}
              aria-label="Track name"
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => submitRename(track)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename(track);
                if (e.key === 'Escape') setRenamingTrackId(null);
              }}
            />
          ) : (
            <span className="track-list__name">{track.name}</span>
          )}

          {selectedRegion.adventuringTrackId === track.id && <em className="track-list__tag">ADV</em>}
          {selectedRegion.combatTrackId === track.id && <em className="track-list__tag">COM</em>}

          <div className="track-list__menu">
            <button
              type="button"
              className="track-list__kebab"
              aria-label={`More actions for ${track.name}`}
              aria-expanded={openMenuId === track.id}
              onClick={() => setOpenMenuId((id) => (id === track.id ? null : track.id))}
            >
              &#8942;
            </button>
            {openMenuId === track.id && (
              <div className="track-list__popover" role="menu">
                <button type="button" onClick={() => startRename(track)}>
                  Rename
                </button>
                <label className="track-list__popover-move">
                  File in region
                  <select
                    aria-label={`Move ${track.name} to region`}
                    value={track.regionId}
                    onChange={(e) => {
                      onMove(track, e.target.value);
                      setOpenMenuId(null);
                    }}
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="track-list__popover-danger"
                  onClick={() => {
                    setOpenMenuId(null);
                    onDelete(track);
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      <label className="track-list__volume">
        Preview volume
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={volume}
          aria-label="Preview volume"
          onChange={(e) => onVolumeChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
