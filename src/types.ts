export type LinkStatus = string;

export interface LinkItem {
  id: string;
  name?: string;
  link: string;
  status: LinkStatus;
  output: string;
  region: string;
  counta: number;
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
  counta: number;
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
}

export type SortField =
  | 'link'
  | 'name'
  | 'status'
  | 'output'
  | 'region'
  | 'counta'
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
