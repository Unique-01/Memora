import { useState, useEffect } from 'react';
import { getMemoryById, updateMemory } from '../services/memoryApi';
import type { MemoryDetail } from '../services/memoryApi';
import { formatHumanDate } from '../utils/formatHumanDate';
import { MetadataView } from './MetadataView';

const TYPE_LABEL: Record<string, string> = {
  BORROWED: 'Borrowed',
  STORED: 'Stored',
  LAST_DONE: 'Last Done',
  PROMISED: 'Promised',
};

interface MemoryDetailPageProps {
  memoryId: string;
  onBack: () => void;
}

export function MemoryDetailPage({ memoryId, onBack }: MemoryDetailPageProps) {
  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMemory() {
      setLoading(true);
      setError(false);
      try {
        const data = await getMemoryById(memoryId);
        if (!cancelled) {
          setMemory(data);
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

    loadMemory();

    return () => {
      cancelled = true;
    };
  }, [memoryId]);

  async function handleToggleComplete() {
    if (!memory || updating) return;
    setUpdating(true);
    setUpdateError(false);

    const newCompletedAt = memory.completedAt
      ? null
      : new Date().toISOString();

    try {
      const updated = await updateMemory(memory.id, {
        completedAt: newCompletedAt,
      });
      setMemory(updated);
    } catch {
      setUpdateError(true);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Memories
        </button>
        <div className="py-20 text-center text-slate-500" aria-busy="true">
          Loading memory…
        </div>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Memories
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p className="font-medium">Could not load this memory.</p>
          <p className="mt-1 text-sm">Please try again later.</p>
        </div>
      </div>
    );
  }

  const typeName = TYPE_LABEL[memory.type] ?? memory.type;
  const isActionable = memory.type === 'BORROWED' || memory.type === 'PROMISED';
  const occurredAtFormatted = formatHumanDate(memory.occurredAt);
  const dueAtFormatted = formatHumanDate(memory.dueAt);
  const completedAtFormatted = formatHumanDate(memory.completedAt);
  const createdAtFormatted = formatHumanDate(memory.createdAt);
  const updatedAtFormatted = formatHumanDate(memory.updatedAt);

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Memories
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {typeName}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {memory.title?.trim() || memory.summary?.trim() || 'Untitled memory'}
          </h1>
          {memory.summary && (
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              {memory.summary}
            </p>
          )}
        </div>

        {isActionable && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {memory.completedAt ? 'Completed' : 'Status: Active'}
              </p>
              {memory.completedAt && completedAtFormatted && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Completed on {completedAtFormatted}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleComplete}
              disabled={updating}
              aria-busy={updating}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                memory.completedAt
                  ? 'bg-slate-600 hover:bg-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {updating
                ? 'Updating…'
                : memory.completedAt
                ? 'Mark as incomplete'
                : 'Mark as completed'}
            </button>
          </div>
        )}

        {updateError && (
          <p className="text-sm text-red-600">
            Failed to update completion status. Please try again.
          </p>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Original Content
          </h3>
          <p className="mt-2 text-sm italic text-slate-800">
            &ldquo;{memory.content}&rdquo;
          </p>
        </div>

        <MetadataView metadata={memory.metadata} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
          {occurredAtFormatted && (
            <div>
              <span className="font-medium text-slate-700 block">Occurred At</span>
              <span>{occurredAtFormatted}</span>
            </div>
          )}
          {dueAtFormatted && (
            <div>
              <span className="font-medium text-slate-700 block">Due At</span>
              <span>{dueAtFormatted}</span>
            </div>
          )}
          {completedAtFormatted && (
            <div>
              <span className="font-medium text-slate-700 block">Completed At</span>
              <span>{completedAtFormatted}</span>
            </div>
          )}
          <div>
            <span className="font-medium text-slate-700 block">Created At</span>
            <span>{createdAtFormatted}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700 block">Updated At</span>
            <span>{updatedAtFormatted}</span>
          </div>
        </div>
      </article>
    </div>
  );
}

