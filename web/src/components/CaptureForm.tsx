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
    <form onSubmit={handleSubmit} className="mt-6">
      <label
        htmlFor="capture-input"
        className="block text-lg font-medium text-slate-800"
      >
        What do you want to remember?
      </label>
      <textarea
        id="capture-input"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="e.g. I gave David my charger and he said he'll return it tomorrow."
        rows={4}
        autoFocus
        className="mt-3 w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button
        type="submit"
        disabled={submitting || isBlank}
        aria-busy={submitting}
        className="mt-4 w-full rounded-2xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Remembering…' : 'Remember'}
      </button>
    </form>
  );
}
