import { useState } from 'react';
import { trackUrl } from '../api/music';
import { useMusicLibraryEditor } from '../lib/useMusicLibraryEditor';
import RegionOverview from './music/RegionOverview';
import RegionList from './music/RegionList';
import RegionHeader from './music/RegionHeader';
import RegionDefaults from './music/RegionDefaults';
import TrackList from './music/TrackList';
import './MusicLibrary.css';

// The Campaigns > Music tab: a full-page library-management surface, for
// organizing your whole collection before a session starts (bulk imports,
// filing tracks, sorting out defaults) — not the same job as the in-session
// "Manage Music" drawer (MusicLibraryEditor, embedded via SessionMusicPanel),
// which trades this page's room for being reachable without leaving a live
// Session. Both are built from the exact same hook and building blocks;
// this one just has a whole page to arrange them in, plus the guide text,
// overview grid, and search a cramped sidebar has no room for.
export default function MusicLibrary() {
  const editor = useMusicLibraryEditor();
  const [search, setSearch] = useState('');

  if (editor.loading) return <p className="music-library__status">Loading the music library&hellip;</p>;
  if (!editor.selected) return <p className="music-library__status music-library__status--error">{editor.error ?? 'No regions.'}</p>;

  const query = search.trim().toLowerCase();
  const visibleTracks = query ? editor.regionTracks.filter((t) => t.name.toLowerCase().includes(query)) : editor.regionTracks;

  return (
    <div className="music-library">
      <p className="music-library__guide">
        Organize your library into <strong>regions</strong> &mdash; folders of tracks &mdash; then set one default
        track per region: what loops when a Session picks it to play from. The built-in <strong>Global</strong>{' '}
        region is the fallback used whenever a more specific region has no default of its own set. These regions
        are application-wide, reachable from every Campaign's Sessions &mdash; a Campaign can also have its own
        private regions, managed from inside that Campaign's own Sessions instead.
      </p>

      <h2 className="music-library__overview-title">Library overview</h2>
      <RegionOverview regions={editor.regions} tracks={editor.tracks} onOpen={editor.setSelectedId} />

      <div className="music-library__layout">
        <RegionList
          regions={editor.regions}
          tracks={editor.tracks}
          selectedId={editor.selected.id}
          onSelect={editor.setSelectedId}
          onCreate={editor.addRegion}
          onCopyTrackToRegion={(trackId, regionId) => {
            const track = editor.tracks.find((t) => t.id === trackId);
            if (track) editor.copyTrackToRegion(track, regionId);
          }}
        />

        <section className="music-library__main">
          <RegionHeader
            region={editor.selected}
            importing={editor.importing}
            onRename={(name) => editor.renameRegion(editor.selected!, name)}
            onDelete={() => editor.deleteRegion(editor.selected!)}
            onAddFiles={editor.addFiles}
          />

          <RegionDefaults
            region={editor.selected}
            candidates={editor.candidates}
            inheritLabel={editor.inheritLabel}
            onSetDefault={(trackId) => editor.setDefault(editor.selected!, trackId)}
          />

          {editor.error && <p className="music-library__status music-library__status--error">{editor.error}</p>}

          {editor.regionTracks.length > 0 && (
            <div className="music-library__search">
              <input
                type="search"
                placeholder="Search tracks in this region&hellip;"
                aria-label="Search tracks"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {query && (
                <span className="music-library__search-count">
                  {visibleTracks.length} of {editor.regionTracks.length} tracks shown
                </span>
              )}
            </div>
          )}

          {query && visibleTracks.length === 0 ? (
            <p className="music-library__status">No tracks in this region match &ldquo;{search.trim()}&rdquo;.</p>
          ) : (
            <TrackList
              tracks={visibleTracks}
              regions={editor.regions}
              selectedRegion={editor.selected}
              previewId={editor.previewId}
              onPreviewToggle={editor.togglePreview}
              volume={editor.volume}
              onVolumeChange={editor.setVolume}
              onRename={editor.renameTrack}
              onMove={editor.moveTrack}
              onTrackVolumeChange={editor.setTrackVolume}
              onDelete={editor.deleteTrack}
              onDropFiles={editor.addDroppedFiles}
            />
          )}
        </section>
      </div>

      <audio
        ref={editor.previewRef}
        src={editor.previewTrack ? trackUrl(editor.previewTrack) : undefined}
        onEnded={editor.stopPreview}
        onError={editor.handlePreviewError}
      />
    </div>
  );
}
