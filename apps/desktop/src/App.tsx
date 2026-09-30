import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { SessionJumpRequest } from './pages/CampaignsPage';
import AppShell, { type View } from './components/AppShell';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import { GameSetsProvider } from './context/GameSetsContext';
import { MusicProvider } from './context/MusicContext';

// Lazy per page — App.tsx used to statically import all 8 pages, so
// everything shipped in one bundle and loaded up front even for pages the
// user might never open in a given run. Each page's chunk now only
// downloads the first time its view is visited.
const HomePage = lazy(() => import('./pages/HomePage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const AdversariesEnvironmentsPage = lazy(() => import('./pages/AdversariesEnvironmentsPage'));
const DomainsPage = lazy(() => import('./pages/DomainsPage'));
const HeritagePage = lazy(() => import('./pages/HeritagePage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const OptionalMechanicsPage = lazy(() => import('./pages/OptionalMechanicsPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoading() {
  return <p className="app-shell__page-loading">Loading&hellip;</p>;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [jumpToSession, setJumpToSession] = useState<SessionJumpRequest | null>(null);

  // Every view the user has opened this run stays mounted (hidden via CSS)
  // instead of unmounting on nav away — a page's own useApiList calls only
  // fire once per run instead of refiring on every revisit.
  const [visited, setVisited] = useState<Set<View>>(() => new Set<View>(['home']));
  useEffect(() => {
    setVisited((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, [view]);

  function page(pageView: View, node: ReactNode) {
    if (!visited.has(pageView)) return null;
    return (
      <div key={pageView} className="app-shell__page" style={view === pageView ? undefined : { display: 'none' }}>
        <Suspense fallback={<PageLoading />}>{node}</Suspense>
      </div>
    );
  }

  return (
    <GameSetsProvider>
      <MusicProvider>
        <AppShell view={view} onNavigate={setView}>
          {page('classes', <ClassesPage />)}
          {page('adversaries-environments', <AdversariesEnvironmentsPage />)}
          {page('domains', <DomainsPage />)}
          {page('heritage', <HeritagePage />)}
          {page('equipment', <EquipmentPage />)}
          {page('optional-mechanics', <OptionalMechanicsPage />)}
          {page(
            'campaigns',
            <CampaignsPage jumpToSession={jumpToSession} onJumpHandled={() => setJumpToSession(null)} />
          )}
          {page('settings', <SettingsPage />)}
          {page('home', <HomePage onNavigate={setView} />)}
        </AppShell>
        <FloatingMusicPlayer
          onOpenSession={(campaignId, sessionId) => {
            setJumpToSession({ campaignId, sessionId });
            setView('campaigns');
          }}
        />
      </MusicProvider>
    </GameSetsProvider>
  );
}
