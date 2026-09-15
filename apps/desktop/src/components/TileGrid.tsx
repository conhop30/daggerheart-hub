import type { View } from './AppShell';
import './TileGrid.css';

interface TileGridProps {
  heroClassCount: number;
  domainCount: number;
  adversaryEnvironmentCount: number;
  heritageCount: number;
  equipmentCount: number;
  optionalMechanicsCount: number;
  onNavigate: (view: View) => void;
}

interface Tile {
  view: View;
  title: string;
  description: string;
  status: string;
}

export default function TileGrid({
  heroClassCount,
  domainCount,
  adversaryEnvironmentCount,
  heritageCount,
  equipmentCount,
  optionalMechanicsCount,
  onNavigate,
}: TileGridProps) {
  const tiles: Tile[] = [
    {
      view: 'classes',
      title: 'Classes',
      description: 'Browse Classes and their Subclasses.',
      status: `${heroClassCount} built`,
    },
    {
      view: 'adversaries-environments',
      title: 'Adversaries & Environments',
      description: 'Threats and scenes to drop into a session.',
      status: `${adversaryEnvironmentCount} built`,
    },
    {
      view: 'domains',
      title: 'Domains',
      description: 'The domain decks Classes draw from.',
      status: `${domainCount} built`,
    },
    {
      view: 'heritage',
      title: 'Heritage',
      description: 'Communities and Ancestries.',
      status: `${heritageCount} built`,
    },
    {
      view: 'equipment',
      title: 'Equipment',
      description: 'Weapons, Armor, Consumables, and Loot.',
      status: `${equipmentCount} built`,
    },
    {
      view: 'optional-mechanics',
      title: 'Optional Mechanics',
      description: 'Transformation and mechanics like it.',
      status: `${optionalMechanicsCount} built`,
    },
  ];

  return (
    <div className="tile-grid">
      {tiles.map((tile) => (
        <button key={tile.view} type="button" className="tile" onClick={() => onNavigate(tile.view)}>
          <div className="tile__row">
            <h3 className="tile__title">{tile.title}</h3>
            <span className="tile__status">{tile.status}</span>
          </div>
          <p className="tile__description">{tile.description}</p>
        </button>
      ))}
    </div>
  );
}
