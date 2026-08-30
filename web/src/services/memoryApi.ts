export interface MemoryView {
  id: string;
  type: string;
  title: string | null;
  summary: string | null;
  dueAt: string | null;
  completedAt: string | null;
}

export interface MemoryDetail {
  id: string;
  type: string;
  title: string | null;
  summary: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CaptureOutcome =
  | { kind: 'captured'; memory: MemoryView }
  | { kind: 'unsupported'; reason?: string }
  | { kind: 'ambiguous'; reason?: string };

/** API base URL, configurable via VITE_API_BASE_URL (defaults to the dev proxy). */
const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Sends natural-language input to the capture endpoint and maps the possible
 * API outcomes into a small union the UI can render. Network failures and
 * unexpected statuses are surfaced as a thrown error so the UI can show a
 * generic failure state without exposing provider/server internals.
 */
export async function captureMemory(input: string): Promise<CaptureOutcome> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/memories/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
  } catch {
    throw new Error('capture-request-failed');
  }

  if (response.status === 201) {
    const memory = (await response.json()) as MemoryView;
    return { kind: 'captured', memory };
  }

  if (response.status === 422) {
    const body = (await response.json().catch(() => null)) as {
      status?: string;
      reason?: string | null;
    } | null;
    if (body?.status === 'unsupported' || body?.status === 'ambiguous') {
      return { kind: body.status, reason: body.reason ?? undefined };
    }
  }

  throw new Error('capture-request-failed');
}

/**
 * Fetches all memories or memories filtered by an optional MemoryType and/or search term.
 * Throws on network or server errors.
 */
export async function getMemories(
  type?: string,
  search?: string,
): Promise<MemoryView[]> {
  const url = new URL(`${apiBaseUrl}/memories`, window.location.origin);
  if (type) {
    url.searchParams.set('type', type);
  }
  if (search && search.trim().length > 0) {
    url.searchParams.set('search', search.trim());
  }

  let response: Response;
  try {
    response = await fetch(url.pathname + url.search);
  } catch {
    throw new Error('fetch-memories-failed');
  }

  if (!response.ok) {
    throw new Error('fetch-memories-failed');
  }

  return (await response.json()) as MemoryView[];
}

/**
 * Fetches an individual memory by ID.
 * Throws on network or server errors.
 */
export async function getMemoryById(id: string): Promise<MemoryDetail> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/memories/${id}`);
  } catch {
    throw new Error('fetch-memory-failed');
  }

  if (!response.ok) {
    throw new Error('fetch-memory-failed');
  }

  return (await response.json()) as MemoryDetail;
}

/**
 * Updates a memory by ID with partial fields.
 * Throws on network or server errors.
 */
export async function updateMemory(
  id: string,
  data: { completedAt?: string | null; [key: string]: unknown },
): Promise<MemoryDetail> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error('update-memory-failed');
  }

  if (!response.ok) {
    throw new Error('update-memory-failed');
  }

  return (await response.json()) as MemoryDetail;
}

export type QueryOutcome =
  | { kind: 'found'; answer: string; memories: MemoryView[] }
  | { kind: 'unsupported'; reason?: string }
  | { kind: 'ambiguous'; reason?: string };

/**
 * Sends a natural-language question to the query endpoint and maps outcomes.
 */
export async function queryMemories(input: string): Promise<QueryOutcome> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/memories/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
  } catch {
    throw new Error('query-request-failed');
  }

  if (response.status === 201 || response.status === 200) {
    const body = (await response.json()) as {
      status?: string;
      answer?: string;
      memories?: MemoryView[];
    };
    return {
      kind: 'found',
      answer: body.answer ?? '',
      memories: body.memories ?? [],
    };
  }

  if (response.status === 422) {
    const body = (await response.json().catch(() => null)) as {
      status?: string;
      reason?: string | null;
    } | null;
    if (body?.status === 'unsupported' || body?.status === 'ambiguous') {
      return { kind: body.status, reason: body.reason ?? undefined };
    }
  }

  throw new Error('query-request-failed');
}

