interface MetadataViewProps {
  metadata: Record<string, unknown> | null;
}

export function MetadataView({ metadata }: MetadataViewProps) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Metadata
      </h3>
      <dl className="mt-3 divide-y divide-slate-200">
        {entries.map(([key, value]) => {
          let displayValue: string;
          if (value === null || value === undefined) {
            displayValue = '—';
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value);
          } else {
            displayValue = String(value);
          }

          return (
            <div key={key} className="flex justify-between py-2 text-sm">
              <dt className="font-medium text-slate-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </dt>
              <dd className="text-slate-900">{displayValue}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
