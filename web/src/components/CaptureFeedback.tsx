interface CaptureFeedbackProps {
  kind: 'unsupported' | 'ambiguous' | 'error';
  reason?: string;
}

/**
 * Friendly outcome messaging for non-capture results. Internal terminology
 * (providers, interpretation, validation) is intentionally never shown.
 */
export function CaptureFeedback({ kind, reason }: CaptureFeedbackProps) {
  if (kind === 'error') {
    return (
      <section
        aria-label="Something went wrong"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
      >
        <p className="font-medium">Something went wrong while trying to remember that.</p>
        <p className="mt-1 text-sm">Please try again.</p>
      </section>
    );
  }

  if (kind === 'unsupported') {
    return (
      <section
        aria-label="Nothing to remember"
        className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm"
      >
        <p className="font-medium">I don't think there's anything to remember here.</p>
        {reason && <p className="mt-1 text-sm text-slate-500">{reason}</p>}
      </section>
    );
  }

  return (
    <section
      aria-label="Need more detail"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
    >
      <p className="font-medium">I'm not quite sure what you want me to remember.</p>
      {reason ? (
        <p className="mt-1 text-sm">{reason}</p>
      ) : (
        <p className="mt-1 text-sm">Could you give me a little more detail?</p>
      )}
    </section>
  );
}
