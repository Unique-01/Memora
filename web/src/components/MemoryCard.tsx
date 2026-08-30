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

export function MemoryCard({ memory }: { memory: MemoryView }) {
  const dueLabel = formatDueLabel(memory.dueAt);
  const typeName = TYPE_LABEL[memory.type] ?? memory.type;
  const badgeClass = TYPE_CLASSES[memory.type] ?? 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <section
      aria-label="Remembered"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">
            ✓
          </span>
          Successfully remembered
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide ${badgeClass}`}
        >
          {typeName}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {memory.title?.trim() || memory.summary?.trim() || 'Saved to your memories'}
        </h2>

        {memory.summary && (
          <p className="mt-2 leading-relaxed text-slate-600">{memory.summary}</p>
        )}
      </div>

      {dueLabel && (
        <div>
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {dueLabel}
          </span>
        </div>
      )}
    </section>
  );
}
