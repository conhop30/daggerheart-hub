import { useEffect, useRef, useState } from 'react';
import { EVERYWHERE_REGION_ID, musicApi, trackUrl, type MusicRegion, type MusicTrack } from '../api/music';
import { defaultCandidates } from '../lib/music';
import './MusicLibrary.css';

// The Campaigns > Music tab: a small library filed into user-made "regions",
// with a default loop per Session mode. Self-contained (owns its own
// fetching), like PartyRoster and CombatPanel.
export default function MusicLibrary() {
  const [regions, setRegions] = useState<MusicRegion[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedId, setSelectedId] = useState(EVERYWHERE_REGION_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [newRegionName, setNewRegionName] = useState<string | null>(null);
  const [renamingRegion, setRenamingRegion] = useState<string | null>(null);
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  // One shared element for previewing tracks in the library.
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([musicApi.listRegions(), musicApi.listTracks()])
      .then(([r, t]) => {
        if (cancelled) return;
        setRegions(r);
        setTracks(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the music library.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stop any preview when leaving the tab.
  useEffect(() => {
    const audio = previewRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const selected = regions.find((r) => r.id === selectedId) ?? regions[0];
  const regionTracks = selected ? tracks.filter((t) => t.regionId === selected.id) : [];
  const previewTrack = tracks.find((t) => t.id === previewId) ?? null;

  useEffect(() => {
    const audio = previewRef.current;
    if (!audio) return;
    if (previewTrack) {
      audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // superseded by a newer preview
        setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
        setPreviewId(null);
      });
    } else {
      audio.pause();
    }
  }, [previewTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function fail(err: unknown, fallback: string) {
    window.alert(err instanceof Error ? err.message : fallback);
  }

  async function addRegion() {
    const name = (newRegionName ?? '').trim();
    if (!name) return;
    try {
      const region = await musicApi.createRegion({ name });
      setRegions((prev) => (prev.some((r) => r.id === region.id) ? prev : [...prev, region]));
      setSelectedId(region.id);
      setNewRegionName(null);
    } catch (err) {
      fail(err, 'Could not create the region.');
    }
  }

  async function renameRegion(region: MusicRegion) {
    const name = nameDraft.trim();
    setRenamingRegion(null);
    if (!name || name === region.name) return;
    try {
      const saved = await musicApi.updateRegion(region.id, { name });
      setRegions((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } catch (err) {
      fail(err, 'Could not rename the region.');
    }
  }

  async function deleteRegion(region: MusicRegion) {
    const count = tracks.filter((t) => t.regionId === region.id).length;
    const note = count > 0 ? ` Its ${count} track${count === 1 ? '' : 's'} will move to Everywhere.` : '';
    if (!window.confirm(`Delete the region "${region.name}"?${note}`)) return;
    try {
      await musicApi.removeRegion(region.id);
      setRegions((prev) => prev.filter((r) => r.id !== region.id));
      setTracks((prev) => prev.map((t) => (t.regionId === region.id ? { ...t, regionId: EVERYWHERE_REGION_ID } : t)));
      setSelectedId(EVERYWHERE_REGION_ID);
    } catch (err) {
      fail(err, 'Could not delete the region.');
    }
  }

  async function setDefault(region: MusicRegion, field: 'adventuringTrackId' | 'combatTrackId', trackId: string) {
    try {
      const saved = await musicApi.updateRegion(region.id, { [field]: trackId || null });
      setRegions((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } catch (err) {
      fail(err, 'Could not set that default.');
    }
  }

  async function addFiles() {
    if (!selected) return;
    setImporting(true);
    setError(null);
    try {
      const result = await musicApi.importFiles(selected.id);
      if (!result.canceled) setTracks((prev) => [...prev, ...result.tracks]);
    } catch (err) {
      fail(err, 'Could not add those files.');
    } finally {
      setImporting(false);
    }
  }

  async function renameTrack(track: MusicTrack) {
    const name = nameDraft.trim();
    setRenamingTrackId(null);
    if (!name || name === track.name) return;
    try {
      const saved = await musicApi.updateTrack(track.id, { name });
      setTracks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err) {
      fail(err, 'Could not rename the track.');
    }
  }

  async function moveTrack(track: MusicTrack, regionId: string) {
    try {
      const saved = await musicApi.updateTrack(track.id, { regionId });
      setTracks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      // Moving a track out of a user region can clear that region's default for it.
      setRegions(await musicApi.listRegions());
    } catch (err) {
      fail(err, 'Could not move the track.');
    }
  }

  async function deleteTrack(track: MusicTrack) {
    if (!window.confirm(`Remove "${track.name}" from the library? The copy the app keeps is deleted; your original file is untouched.`)) return;
    try {
      if (previewId === track.id) setPreviewId(null);
      await musicApi.removeTrack(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setRegions(await musicApi.listRegions());
    } catch (err) {
      fail(err, 'Could not remove the track.');
    }
  }

  if (loading) return <p className="music-library__status">Loading the music library&hellip;</p>;
  if (!selected) return <p className="music-library__status music-library__status--error">{error ?? 'No regions.'}</p>;

  const candidates = defaultCandidates(selected, tracks);
  const inheritLabel = selected.isDefault ? 'None' : 'Use the Everywhere default';

  return (
    <div className="music-library">
      <aside className="music-library__rail" aria-label="Regions">
        <h2 className="music-library__rail-title">Regions</h2>
        <ul className="music-library__regions">
          {regions.map((region) => (
            <li key={region.id}>
              <button
                type="button"
                className={`music-library__region${region.id === selected.id ? ' music-library__region--active' : ''}`}
                onClick={() => setSelectedId(region.id)}
              >
                <span>{region.name}</span>
                <span className="music-library__region-count">{tracks.filter((t) => t.regionId === region.id).length}</span>
              </button>
            </li>
          ))}
        </ul>
        {newRegionName === null ? (
          <button type="button" className="music-library__btn" onClick={() => setNewRegionName('')}>
            + New Region
          </button>
        ) : (
          <form
            className="music-library__inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              void addRegion();
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
            <button type="submit" className="music-library__btn">
              Add
            </button>
          </form>
        )}
      </aside>

      <section className="music-library__main">
        <div className="music-library__header">
          {renamingRegion === selected.id ? (
            <input
              autoFocus
              className="music-library__rename"
              value={nameDraft}
              aria-label="Region name"
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => void renameRegion(selected)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void renameRegion(selected);
                if (e.key === 'Escape') setRenamingRegion(null);
              }}
            />
          ) : (
            <h2 className="music-library__title">{selected.name}</h2>
          )}
          <div className="music-library__header-actions">
            {!selected.isDefault && (
              <>
                <button
                  type="button"
                  className="music-library__btn"
                  onClick={() => {
                    setNameDraft(selected.name);
                    setRenamingRegion(selected.id);
                  }}
                >
                  Rename
                </button>
                <button type="button" className="music-library__btn music-library__btn--danger" onClick={() => deleteRegion(selected)}>
                  Delete Region
                </button>
              </>
            )}
            <button type="button" className="music-library__btn music-library__btn--primary" onClick={addFiles} disabled={importing}>
              {importing ? 'Adding…' : '+ Add Music'}
            </button>
          </div>
        </div>

        {selected.isDefault && (
          <p className="music-library__hint">
            Everywhere is the fallback: a region without its own default, or a session with no region, plays these.
          </p>
        )}

        <div className="music-library__defaults">
          <label>
            Adventuring loops
            <select
              aria-label="Adventuring default"
              value={selected.adventuringTrackId ?? ''}
              onChange={(e) => setDefault(selected, 'adventuringTrackId', e.target.value)}
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
              value={selected.combatTrackId ?? ''}
              onChange={(e) => setDefault(selected, 'combatTrackId', e.target.value)}
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

        {error && <p className="music-library__status music-library__status--error">{error}</p>}

        {regionTracks.length === 0 ? (
          <p className="music-library__status">No music in this region yet. Use &ldquo;+ Add Music&rdquo; to bring in audio files.</p>
        ) : (
          <ul className="music-library__tracks">
            {regionTracks.map((track) => (
              <li key={track.id} className="music-library__track">
                <button
                  type="button"
                  className="music-library__btn music-library__play"
                  aria-label={previewId === track.id ? `Stop ${track.name}` : `Preview ${track.name}`}
                  onClick={() => setPreviewId(previewId === track.id ? null : track.id)}
                >
                  {previewId === track.id ? '■' : '▶'}
                </button>
                {renamingTrackId === track.id ? (
                  <input
                    autoFocus
                    className="music-library__rename"
                    value={nameDraft}
                    aria-label="Track name"
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => void renameTrack(track)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void renameTrack(track);
                      if (e.key === 'Escape') setRenamingTrackId(null);
                    }}
                  />
                ) : (
                  <span className="music-library__track-name">
                    {track.name}
                    {selected.adventuringTrackId === track.id && <em className="music-library__tag">Adventuring</em>}
                    {selected.combatTrackId === track.id && <em className="music-library__tag">Combat</em>}
                  </span>
                )}
                <select
                  className="music-library__move"
                  aria-label={`Move ${track.name} to region`}
                  value={track.regionId}
                  onChange={(e) => moveTrack(track, e.target.value)}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="music-library__btn"
                  onClick={() => {
                    setNameDraft(track.name);
                    setRenamingTrackId(track.id);
                  }}
                >
                  Rename
                </button>
                <button type="button" className="music-library__btn music-library__btn--danger" onClick={() => deleteTrack(track)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <audio
        ref={previewRef}
        src={previewTrack ? trackUrl(previewTrack) : undefined}
        onEnded={() => setPreviewId(null)}
        onError={() => {
          if (previewTrack) setError(`Couldn't play "${previewTrack.name}" — the audio file may be missing.`);
          setPreviewId(null);
        }}
      />
    </div>
  );
}
