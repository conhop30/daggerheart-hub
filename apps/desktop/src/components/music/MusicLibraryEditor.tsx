import { trackUrl } from '../../api/music';
import { useMusicLibraryEditor } from '../../lib/useMusicLibraryEditor';
import RegionList from './RegionList';
import RegionHeader from './RegionHeader';
import RegionDefaults from './RegionDefaults';
import TrackList from './TrackList';
import './MusicLibraryEditor.css';

interface MusicLibraryEditorProps {
  /** Scopes the region list (and new "+ New Region" creates) to this Campaign's own folders, on top of the application-wide ones — see SessionMusicPanel, the only embedder. */
  campaignId: string;
  /** Called after every successful edit — wired to MusicContext.refreshLibrary so a live Session picks up the change immediately. */
  onLibraryChanged?: () => void;
}

// The same region/track editing surface as the Music tab (MusicLibrary.tsx)
// — same building blocks, same hook — just stacked in one narrow column
// instead of a two-column page, since this is what mounts inside
// SessionMusicPanel's collapsible "Manage Music" section at the sidebar's
// fixed width. Deliberately has no page chrome of its own (no guide text,
// no overview grid — that's the Music tab's job); this is the "edit
// without leaving the session" surface, not the "organize your whole
// library" one.
export default function MusicLibraryEditor({ campaignId, onLibraryChanged }: MusicLibraryEditorProps) {
  const editor = useMusicLibraryEditor({ onLibraryChanged, scopeCampaignId: campaignId });

  if (editor.loading) return <p className="music-library-editor__status">Loading&hellip;</p>;
  if (!editor.selected) return <p className="music-library-editor__status">{editor.error ?? 'No regions.'}</p>;

  return (
    <div className="music-library-editor">
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

      {editor.error && <p className="music-library-editor__status music-library-editor__status--error">{editor.error}</p>}

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
        onDropFiles={editor.addDroppedFiles}
      />

      <audio
        ref={editor.previewRef}
        src={editor.previewTrack ? trackUrl(editor.previewTrack) : undefined}
        onEnded={editor.stopPreview}
        onError={editor.handlePreviewError}
      />
    </div>
  );
}
