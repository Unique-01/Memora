import type { MemoryView } from '../services/memoryApi';
import { BrowseMemoryCard } from './BrowseMemoryCard';

interface MemoryListProps {
  memories: MemoryView[];
  loading: boolean;
  error: boolean;
  filterLabel: string;
  onSelectMemory: (id: string) => void;
}

export function MemoryList({
  memories,
  loading,
  error,
  filterLabel,
  onSelectMemory,
}: MemoryListProps) {
  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500" aria-busy="true">
        Loading memories…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        <p className="font-medium">Something went wrong while loading memories.</p>
        <p className="mt-1 text-sm">Please try again later.</p>
      </div>
    );
  }

  if (memories.length === 0) {
    const emptyText =
      filterLabel === 'All'
        ? 'No memories yet.'
        : `No ${filterLabel.toLowerCase()} memories yet.`;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        <p className="text-base font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memories.map((memory, index) => (
        <BrowseMemoryCard
          key={memory.id ?? `${memory.type}-${index}`}
          memory={memory}
          onSelect={onSelectMemory}
        />
      ))}
    </div>
  );
}

