import { useState } from 'react';
import './TileGrid.css';

interface TileGridProps {
  heroClassCount: number;
  domainCount: number;
  onSelectClasses: () => void;
}

interface Tile {
  id: string;
  title: string;
  description: string;
  status: string;
  note: string;
}

export default function TileGrid({ heroClassCount, domainCount, onSelectClasses }: TileGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tiles: Tile[] = [
    {
      id: 'classes',
      title: 'Classes',
      description: 'Browse Classes and their Subclasses.',
      status: `${heroClassCount} built`,
      note: '',
    },
    {
      id: 'adversaries-environments',
      title: 'Adversaries & Environments',
      description: 'Threats and scenes to drop into a session.',
      status: 'not started',
      note: 'Both modules are still empty package stubs on the backend.',
    },
    {
      id: 'domains',
      title: 'Domains',
      description: 'The domain decks Classes draw from.',
      status: `${domainCount} built`,
      note: 'The gallery view for this isn\u2019t wired up yet \u2014 next on the list.',
    },
    {
      id: 'heritage',
      title: 'Heritage',
      description: 'Communities and Ancestries.',
      status: 'not started',
      note: 'This module is still an empty package stub on the backend.',
    },
    {
      id: 'equipment',
      title: 'Equipment',
      description: 'Weapons, Armor, Consumables, and Loot.',
      status: 'not started',
      note: 'This module is still an empty package stub on the backend.',
    },
    {
      id: 'optional-mechanics',
      title: 'Optional Mechanics',
      description: 'Transformation and mechanics like it.',
      status: 'not started',
      note: 'This module is still an empty package stub on the backend.',
    },
  ];

  return (
    <div className="tile-grid">
      {tiles.map((tile) => {
        const expanded = expandedId === tile.id;
        const isClasses = tile.id === 'classes';
        return (
          <button
            key={tile.id}
            type="button"
            className="tile"
            aria-expanded={!isClasses && expanded}
            onClick={() => (isClasses ? onSelectClasses() : setExpandedId(expanded ? null : tile.id))}
          >
            <div className="tile__row">
              <h3 className="tile__title">{tile.title}</h3>
              <span className="tile__status">{tile.status}</span>
            </div>
            <p className="tile__description">{tile.description}</p>
            {!isClasses && expanded && <p className="tile__note">{tile.note}</p>}
          </button>
        );
      })}
    </div>
  );
}
