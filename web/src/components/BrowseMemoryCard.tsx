import type { MemoryView } from '../services/memoryApi';
import { formatDueLabel } from '../utils/formatDueDate';

const TYPE_LABEL: Record<string, string> = {
  BORROWED: 'Borrowed',
  STORED: 'Stored',
  LAST_DONE: 'Last Done',
  PROMISED: 'Promised',
};

const TYPE_CLASSES: Record<string, string> = {
  BORROWED: 'bg-amber-50 text-amber-800 border-amber-200/60',
  STORED: 'bg-sky-50 text-sky-800 border-sky-200/60',
  LAST_DONE: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
  PROMISED: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
};

interface BrowseMemoryCardProps {
  memory: MemoryView;
  onSelect: (id: string) => void;
}

export function BrowseMemoryCard({ memory, onSelect }: BrowseMemoryCardProps) {
  const dueLabel = formatDueLabel(memory.dueAt);
  const typeName = TYPE_LABEL[memory.type] ?? memory.type;
  const badgeClass = TYPE_CLASSES[memory.type] ?? 'bg-slate-100 text-slate-800 border-slate-200';
  const isCompleted = Boolean(memory.completedAt);

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
      className={`w-full text-left cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isCompleted ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide ${badgeClass}`}
        >
          {typeName}
        </span>

        {isCompleted && (
          <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Completed
          </span>
        )}
      </div>

      <h2 className={`mt-3 text-lg font-semibold text-slate-900 ${isCompleted ? 'line-through text-slate-600' : ''}`}>
        {memory.title?.trim() || memory.summary?.trim() || 'Untitled memory'}
      </h2>

      {memory.summary && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{memory.summary}</p>
      )}

      {dueLabel && !isCompleted && (
        <div className="mt-4">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {dueLabel}
          </span>
        </div>
      )}
    </div>
  );
}

