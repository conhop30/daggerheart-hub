import { useEffect, useState } from 'react';
import { gameSetsApi, type GameSet } from '../api/gameSets';
import { domainsApi, type Domain } from '../api/domains';
import { heroClassesApi, type HeroClass } from '../api/heroClasses';
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

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [sets, domainList, classList] = await Promise.all([
          gameSetsApi.list(),
          domainsApi.list(),
          heroClassesApi.list(),
        ]);
        if (cancelled) return;
        setGameSets(sets);
        setDomains(domainList);
        setHeroClasses(classList);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Could not reach the backend.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Daggerheart Homebrew Hub</h1>
        <p className="home__subtitle">Build your own Classes, Domains, Adversaries, and more.</p>
      </header>

      {loadError && (
        <div className="home__error" role="alert">
          Can't reach the backend at localhost:8787 — is <code>mvn spring-boot:run</code> running
          in <code>server/</code>? ({loadError})
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
