import { useState } from 'react';
import './TileGrid.css';

interface TileGridProps {
  heroClassCount: number;
  domainCount: number;
  adversaryEnvironmentCount: number;
  heritageCount: number;
  equipmentCount: number;
  optionalMechanicsCount: number;
  onSelectClasses: () => void;
}

interface Tile {
  id: string;
  title: string;
  description: string;
  status: string;
  note: string;
}

export default function TileGrid({
  heroClassCount,
  domainCount,
  adversaryEnvironmentCount,
  heritageCount,
  equipmentCount,
  optionalMechanicsCount,
  onSelectClasses,
}: TileGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const noGalleryYet = 'The gallery view for this isn\u2019t wired up yet \u2014 next on the list.';

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
      status: `${adversaryEnvironmentCount} built`,
      note: noGalleryYet,
    },
    {
      id: 'domains',
      title: 'Domains',
      description: 'The domain decks Classes draw from.',
      status: `${domainCount} built`,
      note: noGalleryYet,
    },
    {
      id: 'heritage',
      title: 'Heritage',
      description: 'Communities and Ancestries.',
      status: `${heritageCount} built`,
      note: noGalleryYet,
    },
    {
      id: 'equipment',
      title: 'Equipment',
      description: 'Weapons, Armor, Consumables, and Loot.',
      status: `${equipmentCount} built`,
      note: noGalleryYet,
    },
    {
      id: 'optional-mechanics',
      title: 'Optional Mechanics',
      description: 'Transformation and mechanics like it.',
      status: `${optionalMechanicsCount} built`,
      note: noGalleryYet,
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
