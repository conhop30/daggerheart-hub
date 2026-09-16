import { useState } from 'react';
import HomePage from './pages/HomePage';
import ClassesPage from './pages/ClassesPage';
import AdversariesEnvironmentsPage from './pages/AdversariesEnvironmentsPage';
import DomainsPage from './pages/DomainsPage';
import HeritagePage from './pages/HeritagePage';
import EquipmentPage from './pages/EquipmentPage';
import OptionalMechanicsPage from './pages/OptionalMechanicsPage';
import AppShell, { type View } from './components/AppShell';
import { GameSetsProvider } from './context/GameSetsContext';

export default function App() {
  const [view, setView] = useState<View>('home');

  return (
    <GameSetsProvider>
      <AppShell view={view} onNavigate={setView}>
        {view === 'classes' && <ClassesPage />}
        {view === 'adversaries-environments' && <AdversariesEnvironmentsPage />}
        {view === 'domains' && <DomainsPage />}
        {view === 'heritage' && <HeritagePage />}
        {view === 'equipment' && <EquipmentPage />}
        {view === 'optional-mechanics' && <OptionalMechanicsPage />}
        {view === 'home' && <HomePage onNavigate={setView} />}
      </AppShell>
    </GameSetsProvider>
  );
}
