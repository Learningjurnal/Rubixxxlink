export type LinkStatus = string;

export type PresetColor =
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'slate';

export interface LinkItem {
  id: string;
  name?: string;
  link: string;
  status: LinkStatus;
  output: string;
  region: string;
  note: string;
  tag?: string;
  diperbarui: string;
  createdAt: number;
  downloadedAt?: string;
  userEmail?: string;
}

export type FilterStatus = string;

export interface ImportPreviewItem {
  name?: string;
  link: string;
  status: LinkStatus;
  output: string;
  region: string;
  note: string;
  tag?: string;
  diperbarui: string;
  isDuplicate: boolean;
  duplicateMatchId?: string;
  hasExtractedLink?: boolean;
}

export interface AppSettings {
  statusOptions: string[];
  outputOptions: string[];
  regionOptions: string[];
  notePresets: string[];
  statusColors?: Record<string, PresetColor>;
  outputColors?: Record<string, PresetColor>;
  regionColors?: Record<string, PresetColor>;
}

export type SortField =
  | 'link'
  | 'name'
  | 'status'
  | 'output'
  | 'region'
  | 'note'
  | 'diperbarui'
  | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface DateRangeFilter {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export interface ExtractedLinkResult {
  originalText: string;
  extractedName: string;
  extractedUrl: string;
  status: 'valid' | 'invalid';
}
