export interface FilterOption {
  id: string;
  label: string;
  typeValue?: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'borrowed', label: 'Borrowed', typeValue: 'BORROWED' },
  { id: 'stored', label: 'Stored', typeValue: 'STORED' },
  { id: 'last_done', label: 'Last Done', typeValue: 'LAST_DONE' },
  { id: 'promised', label: 'Promised', typeValue: 'PROMISED' },
];
