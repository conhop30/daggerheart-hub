import { useState } from 'react';
import HomePage from './pages/HomePage';
import ClassesPage from './pages/ClassesPage';

type View = 'home' | 'classes';

// Temporary routing: a plain view-state switch, not the real spotlight/
// sidebar single-page interaction discussed for Home. This exists so
// Classes has *some* way to be reached while that redesign is still being
// worked out — flagged to Connor, expected to be replaced, not final.
export default function App() {
  const [view, setView] = useState<View>('home');

  if (view === 'classes') {
    return <ClassesPage onBack={() => setView('home')} />;
  }

  return <HomePage onNavigateToClasses={() => setView('classes')} />;
}
