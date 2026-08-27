import { FILTER_OPTIONS } from './filterOptions';
import type { FilterOption } from './filterOptions';

interface MemoryFiltersProps {
  selectedId: string;
  onSelect: (filter: FilterOption) => void;
}

export function MemoryFilters({ selectedId, onSelect }: MemoryFiltersProps) {
  return (
    <div
      role="region"
      aria-label="Memory filters"
      className="flex flex-wrap gap-2"
    >
      {FILTER_OPTIONS.map((filter) => {
        const isSelected = filter.id === selectedId;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelect(filter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isSelected
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

