import { useEffect, useRef, useState } from 'react';
import { gameSetsApi, type GameSet } from '../api/gameSets';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
import { adversariesApi } from '../api/adversaries';
import { environmentsApi } from '../api/environments';
import { weaponsApi } from '../api/weapons';
import { armorsApi } from '../api/armors';
import { lootApi } from '../api/loot';
import { consumablesApi } from '../api/consumables';
import { communitiesApi } from '../api/communities';
import { ancestriesApi } from '../api/ancestries';
import { transformationsApi } from '../api/transformations';
import type { ContentKey } from '../api/contentKeys';
import { backupApi } from '../api/backup';
import CreatePanel from '../components/CreatePanel';
import TileGrid from '../components/TileGrid';
import type { View } from '../components/AppShell';
import { upsertById } from '../lib/upsert';
import './HomePage.css';

interface HomePageProps {
  onNavigate: (view: View) => void;
}

const EMPTY_COUNTS: Record<ContentKey, number> = {
  adversaries: 0,
  environments: 0,
  weapons: 0,
  armors: 0,
  loot: 0,
  consumables: 0,
  communities: 0,
  ancestries: 0,
  transformations: 0,
};

export default function HomePage({ onNavigate }: HomePageProps) {
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [heroClasses, setHeroClasses] = useState<HeroClass[]>([]);
  const [counts, setCounts] = useState<Record<ContentKey, number>>(EMPTY_COUNTS);
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
      const [
        sets,
        domainList,
        classList,
        adversaries,
        environments,
        weapons,
        armors,
        loot,
        consumables,
        communities,
        ancestries,
        transformations,
      ] = await Promise.all([
        gameSetsApi.list(),
        domainsApi.list(),
        heroClassesApi.list(),
        adversariesApi.list(),
        environmentsApi.list(),
        weaponsApi.list(),
        armorsApi.list(),
        lootApi.list(),
        consumablesApi.list(),
        communitiesApi.list(),
        ancestriesApi.list(),
        transformationsApi.list(),
      ]);
      if (!mountedRef.current) return;
      setGameSets(sets);
      setDomains(domainList);
      setHeroClasses(classList);
      setCounts({
        adversaries: adversaries.length,
        environments: environments.length,
        weapons: weapons.length,
        armors: armors.length,
        loot: loot.length,
        consumables: consumables.length,
        communities: communities.length,
        ancestries: ancestries.length,
        transformations: transformations.length,
      });
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

  function handleContentCreated(key: ContentKey) {
    setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }

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
        onContentCreated={handleContentCreated}
      />

      <TileGrid
        heroClassCount={heroClasses.length}
        domainCount={domains.length}
        adversaryEnvironmentCount={counts.adversaries + counts.environments}
        heritageCount={counts.communities + counts.ancestries}
        equipmentCount={counts.weapons + counts.armors + counts.loot + counts.consumables}
        optionalMechanicsCount={counts.transformations}
        onNavigate={onNavigate}
      />
    </div>
  );
}
