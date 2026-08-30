import type { FormEvent } from 'react';
import type { MemoryView } from '../services/memoryApi';
import { BrowseMemoryCard } from './BrowseMemoryCard';

interface AskPageProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  outcome:
    | { kind: 'idle' }
    | { kind: 'found'; answer: string; memories: MemoryView[] }
    | { kind: 'unsupported'; reason?: string }
    | { kind: 'ambiguous'; reason?: string }
    | { kind: 'error' };
  onSelectMemory: (id: string) => void;
}

export function AskPage({
  input,
  onInputChange,
  onSubmit,
  submitting,
  outcome,
  onSelectMemory,
}: AskPageProps) {
  const isBlank = input.trim().length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isBlank && !submitting) {
      onSubmit();
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Ask your memories
        </h1>
        <p className="mt-1 text-slate-500">
          Ask a question in plain English and retrieve matching memories.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="e.g. Where did I put my passport?"
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={submitting || isBlank}
          aria-busy={submitting}
          className="w-full rounded-2xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Searching memories…' : 'Ask'}
        </button>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {submitting && (
          <div className="py-12 text-center text-slate-500" aria-busy="true">
            Searching your memories…
          </div>
        )}

        {!submitting && outcome.kind === 'found' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Answer
              </h2>
              <p className="text-lg font-medium text-slate-900 leading-relaxed">
                {outcome.answer}
              </p>
            </div>

            {outcome.memories.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Relevant memories
                </h2>
                {outcome.memories.map((memory, index) => (
                  <BrowseMemoryCard
                    key={memory.id ?? `${memory.type}-${index}`}
                    memory={memory}
                    onSelect={onSelectMemory}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!submitting && outcome.kind === 'unsupported' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            <p className="font-medium">I couldn't understand that question as a memory query.</p>
            {outcome.reason && <p className="mt-1 text-sm text-slate-500">{outcome.reason}</p>}
          </div>
        )}

        {!submitting && outcome.kind === 'ambiguous' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <p className="font-medium">I'm not quite sure what you're asking about.</p>
            {outcome.reason ? (
              <p className="mt-1 text-sm">{outcome.reason}</p>
            ) : (
              <p className="mt-1 text-sm">Could you give me a little more detail?</p>
            )}
          </div>
        )}

        {!submitting && outcome.kind === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            <p className="font-medium">Something went wrong while searching your memories.</p>
            <p className="mt-1 text-sm">Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
