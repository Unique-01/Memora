import type { MemoryView } from '../services/memoryApi';
import { formatDueLabel } from '../utils/formatDueDate';

const TYPE_EMOJI: Record<string, string> = {
  BORROWED: '🤝',
  STORED: '📦',
  LAST_DONE: '✅',
  PROMISED: '🤞',
};

export function MemoryCard({ memory }: { memory: MemoryView }) {
  const dueLabel = formatDueLabel(memory.dueAt);
  const emoji = TYPE_EMOJI[memory.type] ?? '💭';

  return (
    <section
      aria-label="Remembered"
      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <span aria-hidden="true">✓</span> Remembered
      </p>

      <h2 className="mt-3 text-xl font-semibold text-slate-900">
        <span aria-hidden="true" className="mr-2">
          {emoji}
        </span>
        {memory.title?.trim() || memory.summary?.trim() || 'Saved to your memories'}
      </h2>

      {memory.summary && (
        <p className="mt-2 leading-relaxed text-slate-600">{memory.summary}</p>
      )}

      {dueLabel && (
        <p className="mt-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          {dueLabel}
        </p>
      )}
    </section>
  );
}
