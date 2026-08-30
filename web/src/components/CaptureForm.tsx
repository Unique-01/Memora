import type { FormEvent } from 'react';

interface CaptureFormProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function CaptureForm({
  input,
  onInputChange,
  onSubmit,
  submitting,
}: CaptureFormProps) {
  const isBlank = input.trim().length === 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isBlank && !submitting) {
      onSubmit();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            What do you want to remember?
          </h2>
          <p className="text-slate-500">
            Tell me something in plain English — I'll organize and keep track of it for you.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <textarea
            id="capture-input"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="e.g. I gave David my charger and he said he'll return it tomorrow."
            rows={4}
            autoFocus
            className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50/50 p-4 text-slate-900 shadow-inner outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            disabled={submitting || isBlank}
            aria-busy={submitting}
            className="w-full rounded-2xl bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Remembering…' : 'Remember'}
          </button>
        </form>
      </div>
    </div>
  );
}
