import { useState, useEffect } from 'react';
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
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
      setLoading(true);
      setError(false);
      try {
        const data = await getMemories(selectedFilter.typeValue);
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
  }, [selectedFilter]);

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


