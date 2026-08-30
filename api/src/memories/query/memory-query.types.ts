import { MemoryType } from '../../generated/prisma/enums';

export interface QueryInterpretationContext {
  referenceTime: string;
}

export type MemoryQueryType = MemoryType;

export type MemoryQueryIntent = 'FIND' | 'WHO' | 'WHERE' | 'WHEN' | 'RECENT';

export interface SuccessfulMemoryQuery {
  status: 'query';
  reason: null;
  query: {
    intent: MemoryQueryIntent;
    searchTerm: string | null;
    type: MemoryQueryType | null;
  };
}

export interface UnsupportedMemoryQuery {
  status: 'unsupported';
  reason: string;
}

export interface AmbiguousMemoryQuery {
  status: 'ambiguous';
  reason: string;
}

export type MemoryQueryResult =
  SuccessfulMemoryQuery | UnsupportedMemoryQuery | AmbiguousMemoryQuery;
