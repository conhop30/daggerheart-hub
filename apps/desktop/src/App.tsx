import { useState } from 'react';
import HomePage from './pages/HomePage';
import ClassesPage from './pages/ClassesPage';
import AdversariesEnvironmentsPage from './pages/AdversariesEnvironmentsPage';
import DomainsPage from './pages/DomainsPage';
import HeritagePage from './pages/HeritagePage';
import EquipmentPage from './pages/EquipmentPage';
import OptionalMechanicsPage from './pages/OptionalMechanicsPage';
import CampaignsPage, { type SessionJumpRequest } from './pages/CampaignsPage';
import SettingsPage from './pages/SettingsPage';
import AppShell, { type View } from './components/AppShell';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import { GameSetsProvider } from './context/GameSetsContext';
import { MusicProvider } from './context/MusicContext';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [jumpToSession, setJumpToSession] = useState<SessionJumpRequest | null>(null);

  return (
    <GameSetsProvider>
      <MusicProvider>
        <AppShell view={view} onNavigate={setView}>
          {view === 'classes' && <ClassesPage />}
          {view === 'adversaries-environments' && <AdversariesEnvironmentsPage />}
          {view === 'domains' && <DomainsPage />}
          {view === 'heritage' && <HeritagePage />}
          {view === 'equipment' && <EquipmentPage />}
          {view === 'optional-mechanics' && <OptionalMechanicsPage />}
          {view === 'campaigns' && (
            <CampaignsPage jumpToSession={jumpToSession} onJumpHandled={() => setJumpToSession(null)} />
          )}
          {view === 'settings' && <SettingsPage />}
          {view === 'home' && <HomePage onNavigate={setView} />}
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
