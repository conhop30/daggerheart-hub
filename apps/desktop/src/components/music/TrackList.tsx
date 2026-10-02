import { useState } from 'react';
import { TRACK_DRAG_MIME, type MusicRegion, type MusicTrack } from '../../api/music';
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
  onTrackVolumeChange: (track: MusicTrack, volume: number) => void;
  onDelete: (track: MusicTrack) => void;
  /** Audio files dragged in from the OS and dropped on this list — imported straight into selectedRegion, no picker dialog. */
  onDropFiles: (filePaths: string[]) => void;
}

// One compact line per track (preview, name, a default-mode tag, and a
// "⋯" menu for Rename/File in region/Remove) — deliberately not a row of
// always-visible inline controls, so this reads cleanly at the in-session
// sidebar's fixed 260px as well as the full-width Music tab. Also: each row
// is draggable (onto a region in RegionList, to copy it there) and the list
// itself is a drop target for audio files dragged straight from the OS.
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
  onTrackVolumeChange,
  onDelete,
  onDropFiles,
}: TrackListProps) {
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);

  function startRename(track: MusicTrack) {
    setNameDraft(track.name);
    setRenamingTrackId(track.id);
    setOpenMenuId(null);
  }

  function submitRename(track: MusicTrack) {
    setRenamingTrackId(null);
    onRename(track, nameDraft);
  }

  // Electron adds `.path` to a File dragged in from the OS — the one
  // extension of the web File API this relies on. A drag of one of our own
  // track rows (see draggable below) carries TRACK_DRAG_MIME instead and
  // has no Files at all, so it never trips this.
  function isFileDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.includes('Files');
  }

  function handleDrop(e: React.DragEvent) {
    setFileDragOver(false);
    if (!isFileDrag(e)) return;
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as File & { path?: string }).path)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) onDropFiles(paths);
  }

  return (
    <div
      className={`track-list${fileDragOver ? ' track-list--drag-over' : ''}`}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        setFileDragOver(true);
      }}
      onDragLeave={() => setFileDragOver(false)}
      onDrop={handleDrop}
    >
      {tracks.length === 0 ? (
        <p className="track-list__empty">No music in this region yet. Use &ldquo;+ Add Music&rdquo; or drag audio files in.</p>
      ) : (
        tracks.map((track) => (
          <div className="track-list__item" key={track.id}>
            <div className="track-list__track">
              <span
                className="track-list__handle"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(TRACK_DRAG_MIME, track.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                aria-label={`Drag ${track.name} onto a region to copy it there`}
                title="Drag onto a region to copy"
              >
                ⠿
              </span>
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

              {selectedRegion.defaultTrackId === track.id && <em className="track-list__tag">DEFAULT</em>}

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

            <label className="track-list__track-volume">
              <span className="track-list__track-volume-label">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={track.volume}
                aria-label={`${track.name} volume`}
                onChange={(e) => onTrackVolumeChange(track, Number(e.target.value))}
              />
              <span className="track-list__track-volume-value">{Math.round(track.volume * 100)}%</span>
            </label>
          </div>
        ))
      )}

      {fileDragOver && <p className="track-list__dropzone">Drop audio files here to add them to {selectedRegion.name}</p>}

      {tracks.length > 0 && (
        <label className="track-list__volume">
          Preview volume (master)
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Preview volume"
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
