export type ViewMode = 'magnets' | 'selection' | 'manual' | 'attract';

export const DEFAULT_VIEW_MODE: ViewMode = 'magnets';

export const VIEW_MODE_OPTIONS: { id: string; value: ViewMode }[] = [
  { id: 'Magnets', value: 'magnets' },
  { id: 'Selection', value: 'selection' },
  { id: 'Manual', value: 'manual' },
  { id: 'Attract', value: 'attract' },
];


