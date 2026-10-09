import { useState } from 'react';
import { communitiesApi } from '../api/communities';
import { ancestriesApi } from '../api/ancestries';
import EntrySection from '../components/EntrySection';
import SetFilter from '../components/SetFilter';
import './BrowsePage.css';

export default function HeritagePage() {
  const [setFilter, setSetFilter] = useState('all');

  return (
    <div className="browse-page">
      <div className="browse-page__header">
        <h1 className="browse-page__title">Heritage</h1>
        <SetFilter value={setFilter} onChange={setSetFilter} />
      </div>
      <EntrySection title="Communities" itemLabel="Community" api={communitiesApi} setFilter={setFilter} />
      <EntrySection title="Ancestries" itemLabel="Ancestry" api={ancestriesApi} setFilter={setFilter} />
    </div>
  );
}
