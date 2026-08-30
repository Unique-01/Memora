import { MemoryQueryResult, MemoryQueryIntent } from './memory-query.types';
import { MemoryType } from '../../generated/prisma/enums';

const VALID_INTENTS: readonly MemoryQueryIntent[] = [
  'FIND',
  'WHO',
  'WHERE',
  'WHEN',
  'RECENT',
];

export function validateMemoryQuery(raw: unknown): MemoryQueryResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Query interpretation result must be an object.');
  }

  const record = raw as Record<string, unknown>;
  const status = record.status;

  if (status === 'unsupported') {
    if (typeof record.reason !== 'string') {
      throw new Error('Unsupported query result requires a string reason.');
    }
    return {
      status: 'unsupported',
      reason: record.reason,
    };
  }

  if (status === 'ambiguous') {
    if (typeof record.reason !== 'string') {
      throw new Error('Ambiguous query result requires a string reason.');
    }
    return {
      status: 'ambiguous',
      reason: record.reason,
    };
  }

  if (status === 'query') {
    const query = record.query;
    if (!query || typeof query !== 'object') {
      throw new Error('Successful query result requires a query object.');
    }

    const qRec = query as Record<string, unknown>;
    const intent = qRec.intent;
    if (
      typeof intent !== 'string' ||
      !VALID_INTENTS.includes(intent as MemoryQueryIntent)
    ) {
      throw new Error(`Invalid or missing query intent: ${String(intent)}`);
    }

    const searchTerm =
      typeof qRec.searchTerm === 'string'
        ? qRec.searchTerm
        : qRec.searchTerm === null
          ? null
          : undefined;
    const type =
      typeof qRec.type === 'string'
        ? (qRec.type as MemoryType)
        : qRec.type === null
          ? null
          : undefined;

    if (searchTerm === undefined || type === undefined) {
      throw new Error('Query object must specify searchTerm and type.');
    }

    return {
      status: 'query',
      reason: null,
      query: {
        intent: intent as MemoryQueryIntent,
        searchTerm,
        type,
      },
    };
  }

  throw new Error(`Unknown query interpretation status: ${String(status)}`);
}
