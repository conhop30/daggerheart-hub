import { useState } from 'react';
import { transformationsApi } from '../api/transformations';
import EntrySection from '../components/EntrySection';
import SetFilter from '../components/SetFilter';
import './BrowsePage.css';

// Laid out exactly as Heritage is: the same sections, cards and Set filter.
export default function OptionalMechanicsPage() {
  const [setFilter, setSetFilter] = useState('all');

  return (
    <div className="browse-page">
      <div className="browse-page__header">
        <h1 className="browse-page__title">Optional Mechanics</h1>
        <SetFilter value={setFilter} onChange={setSetFilter} />
      </div>
      <EntrySection title="Transformations" itemLabel="Transformation" api={transformationsApi} setFilter={setFilter} />
    </div>
  );
}
