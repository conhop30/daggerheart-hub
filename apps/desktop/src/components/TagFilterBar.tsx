import type { FilterDimensionState } from '../lib/useTagFilters';
import './TagFilterBar.css';

interface TagFilterBarProps {
  dimensions: FilterDimensionState[];
  onToggle: (dimensionKey: string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function TagFilterBar({ dimensions, onToggle, onClear, hasActiveFilters }: TagFilterBarProps) {
  const visible = dimensions.filter((dim) => dim.options.length > 1);
  if (visible.length === 0) return null;

  return (
    <div className="tag-filter-bar">
      {visible.map((dim) => (
        <div className="tag-filter-bar__group" key={dim.key}>
          <span className="tag-filter-bar__label">{dim.label}</span>
          <div className="tag-filter-bar__pills">
            {dim.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`tag-filter-bar__pill${dim.active.has(option.value) ? ' active' : ''}`}
                onClick={() => onToggle(dim.key, option.value)}
                aria-pressed={dim.active.has(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {hasActiveFilters && (
        <button type="button" className="tag-filter-bar__clear" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
