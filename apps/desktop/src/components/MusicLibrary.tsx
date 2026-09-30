import { trackUrl } from '../api/music';
import { useMusicLibraryEditor } from '../lib/useMusicLibraryEditor';
import RegionList from './music/RegionList';
import RegionHeader from './music/RegionHeader';
import RegionDefaults from './music/RegionDefaults';
import TrackList from './music/TrackList';
import './MusicLibrary.css';

// The Campaigns > Music tab: a small library filed into user-made "regions",
// with a default loop per Session mode. Self-contained (owns its own
// fetching via useMusicLibraryEditor), like PartyRoster and CombatPanel —
// this component itself is now just layout, composing the same building
// blocks the in-session collapsible editor (MusicLibraryEditor.tsx) uses.
export default function MusicLibrary() {
  const editor = useMusicLibraryEditor();

  if (editor.loading) return <p className="music-library__status">Loading the music library&hellip;</p>;
  if (!editor.selected) return <p className="music-library__status music-library__status--error">{editor.error ?? 'No regions.'}</p>;

  return (
    <div className="music-library">
      <RegionList
        regions={editor.regions}
        tracks={editor.tracks}
        selectedId={editor.selected.id}
        onSelect={editor.setSelectedId}
        onCreate={editor.addRegion}
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
          onSetDefault={(field, trackId) => editor.setDefault(editor.selected!, field, trackId)}
        />

        {editor.error && <p className="music-library__status music-library__status--error">{editor.error}</p>}

        <TrackList
          tracks={editor.regionTracks}
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
        />
      </section>

      <audio
        ref={editor.previewRef}
        src={editor.previewTrack ? trackUrl(editor.previewTrack) : undefined}
        onEnded={editor.stopPreview}
        onError={editor.handlePreviewError}
      />
    </div>
  );
}
