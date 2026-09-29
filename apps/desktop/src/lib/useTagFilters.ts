import { useMemo, useState } from 'react';

export interface FilterDimension<T> {
  key: string;
  label: string;
  /** Null/undefined means "no value" — items with no value never match an active filter on this dimension. */
  getValue: (item: T) => string | number | null | undefined;
  /** Formats a raw value (e.g. an enum constant) for display as a filter pill. */
  formatValue?: (value: string) => string;
}

export interface FilterDimensionState {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  active: Set<string>;
}

// Generic "filter a list by any number of its own tag-like fields" hook —
// each dimension's available pills are derived from what's actually present
// in `items` (so a Tier 4 pill only shows up once something is Tier 4), and
// a dimension with nothing toggled on doesn't filter at all. Multiple active
// pills within one dimension are OR'd together; multiple dimensions are
// AND'd, matching how the printed equipment tables' columns work together.
export function useTagFilters<T>(items: T[], dimensions: FilterDimension<T>[]) {
  const [active, setActive] = useState<Record<string, Set<string>>>({});

  const dimensionStates: FilterDimensionState[] = useMemo(
    () =>
      dimensions.map((dim) => {
        const seen = new Map<string, string>();
        for (const item of items) {
          const raw = dim.getValue(item);
          if (raw === null || raw === undefined || raw === '') continue;
          const value = String(raw);
          if (!seen.has(value)) seen.set(value, dim.formatValue ? dim.formatValue(value) : value);
        }
        const options = [...seen.entries()]
          .sort((a, b) => {
            const na = Number(a[0]);
            const nb = Number(b[0]);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return a[1].localeCompare(b[1]);
          })
          .map(([value, label]) => ({ value, label }));
        return { key: dim.key, label: dim.label, options, active: active[dim.key] ?? new Set<string>() };
      }),
    [items, dimensions, active]
  );

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        dimensions.every((dim) => {
          const activeSet = active[dim.key];
          if (!activeSet || activeSet.size === 0) return true;
          const raw = dim.getValue(item);
          if (raw === null || raw === undefined || raw === '') return false;
          return activeSet.has(String(raw));
        })
      ),
    [items, dimensions, active]
  );

  function toggle(dimensionKey: string, value: string) {
    setActive((prev) => {
      const next = new Set(prev[dimensionKey] ?? []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [dimensionKey]: next };
    });
  }

  function clear() {
    setActive({});
  }

  const hasActiveFilters = Object.values(active).some((set) => set.size > 0);

  return { filtered, dimensions: dimensionStates, toggle, clear, hasActiveFilters };
}
