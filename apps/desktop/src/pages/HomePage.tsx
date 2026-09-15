import { useEffect, useRef, useState } from 'react';
import { gameSetsApi, type GameSet } from '../api/gameSets';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import { backupApi } from '../api/backup';
import CreatePanel from '../components/CreatePanel';
import TileGrid from '../components/TileGrid';
import { upsertById } from '../lib/upsert';
import './HomePage.css';

interface HomePageProps {
  onNavigateToClasses: () => void;
}

export default function HomePage({ onNavigateToClasses }: HomePageProps) {
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [heroClasses, setHeroClasses] = useState<HeroClass[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  // Guards against setting state after this component has unmounted — e.g.
  // navigating to Classes while the initial load is still in flight.
  const mountedRef = useRef(true);

  async function loadReferenceData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [sets, domainList, classList] = await Promise.all([
        gameSetsApi.list(),
        domainsApi.list(),
        heroClassesApi.list(),
      ]);
      if (!mountedRef.current) return;
      setGameSets(sets);
      setDomains(domainList);
      setHeroClasses(classList);
    } catch (err) {
      if (!mountedRef.current) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load your data.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadReferenceData();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleExport() {
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      const result = await backupApi.exportData();
      setBackupStatus(result.canceled ? null : `Exported to ${result.filePath}`);
    } catch (err) {
      setBackupStatus(err instanceof Error ? err.message : 'Could not export.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleImport() {
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      const result = await backupApi.importData();
      if (!result.canceled) {
        setBackupStatus(`Imported ${result.importedCount} record${result.importedCount === 1 ? '' : 's'} from ${result.filePath}`);
        await loadReferenceData();
      }
    } catch (err) {
      setBackupStatus(err instanceof Error ? err.message : 'Could not import.');
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Daggerheart Homebrew Hub</h1>
        <p className="home__subtitle">Build your own Classes, Domains, Adversaries, and more.</p>
        <div className="home__backup">
          <button type="button" className="home__backup-button" onClick={handleExport} disabled={backupBusy}>
            Export Data
          </button>
          <button type="button" className="home__backup-button" onClick={handleImport} disabled={backupBusy}>
            Import Data
          </button>
          {backupStatus && <span className="home__backup-status">{backupStatus}</span>}
        </div>
      </header>

      {loadError && (
        <div className="home__error" role="alert">
          Couldn&rsquo;t load your data: {loadError}
        </div>
      )}

      <CreatePanel
        loading={loading}
        gameSets={gameSets}
        domains={domains}
        heroClasses={heroClasses}
        onDomainCreated={(domain) => setDomains((prev) => upsertById(prev, domain))}
        onHeroClassCreated={(heroClass) => setHeroClasses((prev) => upsertById(prev, heroClass))}
      />

      <TileGrid
        heroClassCount={heroClasses.length}
        domainCount={domains.length}
        onSelectClasses={onNavigateToClasses}
      />
    </div>
  );
}
