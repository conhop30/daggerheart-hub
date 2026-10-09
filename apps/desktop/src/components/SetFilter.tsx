import { useGameSets } from '../context/GameSetsContext';
import './SetFilter.css';

interface SetFilterProps {
  /** A Set's id, or 'all'. */
  value: string;
  onChange: (value: string) => void;
}

// "Show me only this Set's entries." Hidden until there's a second Set to
// choose between.
export default function SetFilter({ value, onChange }: SetFilterProps) {
  const { gameSets } = useGameSets();
  if (gameSets.length < 2) return null;
  const sets = [...gameSets].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <select className="set-filter" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by Set">
      <option value="all">All Sets</option>
      {sets.map((set) => (
        <option key={set.id} value={set.id}>
          {set.name}
        </option>
      ))}
    </select>
  );
}
