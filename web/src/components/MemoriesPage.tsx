import { useState, useEffect, type FormEvent } from 'react';
import { MemoryFilters } from './MemoryFilters';
import { FILTER_OPTIONS } from './filterOptions';
import type { FilterOption } from './filterOptions';
import { MemoryList } from './MemoryList';
import { getMemories } from '../services/memoryApi';
import type { MemoryView } from '../services/memoryApi';

interface MemoriesPageProps {
  onSelectMemory: (id: string) => void;
}

export function MemoriesPage({ onSelectMemory }: MemoriesPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(FILTER_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
      setLoading(true);
      setError(false);
      try {
        const data = await getMemories(selectedFilter.typeValue, activeSearch);
        if (!cancelled) {
          setMemories(data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMemories();

    return () => {
      cancelled = true;
    };
  }, [selectedFilter, activeSearch]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setActiveSearch(searchInput);
  }

  function handleClearSearch() {
    setSearchInput('');
    setActiveSearch('');
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Memories
        </h1>
        <p className="mt-1 text-slate-500">
          Browse and filter your captured memories.
        </p>
      </header>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search memories..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Search
        </button>
        {activeSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      <MemoryFilters
        selectedId={selectedFilter.id}
        onSelect={setSelectedFilter}
      />

      <MemoryList
        memories={memories}
        loading={loading}
        error={error}
        filterLabel={selectedFilter.label}
        onSelectMemory={onSelectMemory}
      />
    </div>
  );
}



