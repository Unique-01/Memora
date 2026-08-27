/**
 * Renders a memory's due date as friendly human text ("Due tomorrow").
 * Returns null when there is no due date or it cannot be parsed.
 */
export function formatDueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  const startOfToday = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDiff = Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);

  if (dayDiff === 0) return 'Due today';
  if (dayDiff === 1) return 'Due tomorrow';
  if (dayDiff === -1) return 'Was due yesterday';

  const formatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return `Due ${formatted}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
