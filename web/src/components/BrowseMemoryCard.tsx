import type { MemoryView } from '../services/memoryApi';
import { formatDueLabel } from '../utils/formatDueDate';

const TYPE_EMOJI: Record<string, string> = {
  BORROWED: '🤝',
  STORED: '📦',
  LAST_DONE: '✅',
  PROMISED: '🤞',
};

const TYPE_LABEL: Record<string, string> = {
  BORROWED: 'Borrowed',
  STORED: 'Stored',
  LAST_DONE: 'Last Done',
  PROMISED: 'Promised',
};

interface BrowseMemoryCardProps {
  memory: MemoryView;
  onSelect: (id: string) => void;
}

export function BrowseMemoryCard({ memory, onSelect }: BrowseMemoryCardProps) {
  const dueLabel = formatDueLabel(memory.dueAt);
  const emoji = TYPE_EMOJI[memory.type] ?? '💭';
  const typeName = TYPE_LABEL[memory.type] ?? memory.type;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(memory.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(memory.id);
        }
      }}
      className="w-full text-left cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">{emoji}</span>
          {typeName}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-semibold text-slate-900">
        {memory.title?.trim() || memory.summary?.trim() || 'Untitled memory'}
      </h2>

      {memory.summary && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{memory.summary}</p>
      )}

      {dueLabel && (
        <div className="mt-4">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {dueLabel}
          </span>
        </div>
      )}
    </div>
  );
}

