import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Table as TableIcon,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  DownloadCloud,
  FileText,
  Calendar,
  Sparkles,
  Tag,
  SlidersHorizontal,
  Loader2,
  MousePointerClick,
} from 'lucide-react';
import { LinkItem, LinkStatus, AppSettings, SortField, SortDirection } from '../types';
import { UrlHoverCard } from './UrlHoverCard';

export type ColumnKey = 'status' | 'output' | 'region' | 'counta' | 'note' | 'diperbarui' | 'actions';

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  status: true,
  output: false,
  region: false,
  counta: false,
  note: true,
  diperbarui: true,
  actions: true,
};

const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'output', label: 'Output' },
  { key: 'region', label: 'Region' },
  { key: 'counta', label: 'Counta' },
  { key: 'note', label: 'Catatan (Note)' },
  { key: 'diperbarui', label: 'Diperbarui' },
  { key: 'actions', label: 'Aksi Download' },
];

interface LinkTableProps {
  items: LinkItem[];
  totalAllItemsCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectSpecificIds?: (ids: string[], append?: boolean) => void;
  onUpdateStatus: (id: string, newStatus: LinkStatus) => void;
  onUpdateOutput?: (id: string, newOutput: string) => void;
  onUpdateRegion?: (id: string, newRegion: string) => void;
  onUpdateNote: (id: string, newNote: string) => void;
  onDownloadAndMark: (item: LinkItem) => void;
  onCopyLink: (link: string) => void;
  onDeleteLink: (id: string) => void;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  settings: AppSettings;
  // Period filter props
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onResetPeriod: () => void;
  onSetQuickPeriod: (days: number | 'today' | 'thisMonth') => void;
  // Loading visualization
  isLoading?: boolean;
}

export const LinkTable: React.FC<LinkTableProps> = ({
  items,
  totalAllItemsCount,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectSpecificIds,
  onUpdateStatus,
  onUpdateOutput,
  onUpdateRegion,
  onUpdateNote,
  onDownloadAndMark,
  onCopyLink,
  onDeleteLink,
  sortField,
  sortDirection,
  onSort,
  settings,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetPeriod,
  onSetQuickPeriod,
  isLoading = false,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Multi-selection with Shift-Click
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // High-performance pagination state
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Load / persist column visibility from localStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('rubixxxlink_column_visibility_v2');
      if (saved) {
        return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(items.length / (pageSize === 0 ? Math.max(1, items.length) : pageSize)));

  // Ensure current page is valid when items or pageSize changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setJumpPageInput(String(totalPages));
    }
  }, [totalPages, currentPage]);

  // Sliced items for current page (avoids rendering 29,000 DOM nodes at once)
  const paginatedItems = useMemo(() => {
    if (pageSize === 0) return items; // 0 represents "Semua"
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  // Close column menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    }
    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnMenuOpen]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('rubixxxlink_column_visibility_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const showAllColumns = () => {
    const allTrue: Record<ColumnKey, boolean> = {
      status: true,
      output: true,
      region: true,
      counta: true,
      note: true,
      diperbarui: true,
      actions: true,
    };
    setVisibleColumns(allTrue);
    try {
      localStorage.setItem('rubixxxlink_column_visibility', JSON.stringify(allTrue));
    } catch {}
  };

  const resetDefaultColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.setItem('rubixxxlink_column_visibility', JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
    } catch {}
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const pageAllSelected =
    paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id));

  // Shift-click range selection handler
  const handleCheckboxClick = (e: React.MouseEvent, item: LinkItem, indexOnPage: number) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedIndex !== null && onSelectSpecificIds) {
      // User held Shift key: select all rows in range
      const start = Math.min(lastSelectedIndex, indexOnPage);
      const end = Math.max(lastSelectedIndex, indexOnPage);
      const rangeIds = paginatedItems.slice(start, end + 1).map(it => it.id);
      onSelectSpecificIds(rangeIds, true);
    } else {
      // Normal click: toggle item and record index
      onToggleSelect(item.id);
      setLastSelectedIndex(indexOnPage);
    }
  };

  const handleSelectPageOnly = () => {
    if (!onSelectSpecificIds) return;
    const pageIds = paginatedItems.map(i => i.id);
    if (pageAllSelected) {
      // Deselect page items
      onSelectSpecificIds(
        Array.from(selectedIds).filter(id => !pageIds.includes(id)),
        false
      );
    } else {
      // Select page items
      onSelectSpecificIds(pageIds, true);
    }
  };

  const startEditNote = (item: LinkItem) => {
    setEditingNoteId(item.id);
    setTempNote(item.note);
  };

  const saveNote = (id: string) => {
    onUpdateNote(id, tempNote);
    setEditingNoteId(null);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  const hasActivePeriod = Boolean(startDate || endDate);
  const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

  const startRecordNum = items.length === 0 ? 0 : (currentPage - 1) * (pageSize || items.length) + 1;
  const endRecordNum =
    pageSize === 0 ? items.length : Math.min(currentPage * pageSize, items.length);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden w-full relative">
      {/* Animated Top Loading Bar */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 dark:bg-slate-800 overflow-hidden z-20">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-indigo-600 animate-pulse w-full" />
        </div>
      )}

      {/* Table Header Controls */}
      <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-slate-800 text-indigo-900 dark:text-white rounded-xl font-semibold text-xs shadow-xs tracking-wide border border-indigo-200/80 dark:border-slate-700">
              <TableIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Table1 (Database Link Cloud)</span>
              <ChevronDown className="w-3 h-3 text-indigo-400 dark:text-slate-400" />
            </div>

            {/* Live Data Count & Loading Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Menampilkan <strong className="text-slate-900 dark:text-slate-100 font-mono">{items.length.toLocaleString('id-ID')}</strong> dari total <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalAllItemsCount.toLocaleString('id-ID')}</strong> tautan
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-semibold animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Memuat Cloud...</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Sort By & Column Visibility */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift-click helper badge */}
            <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />
              <span>Shift+Klik untuk rentang</span>
            </div>

            {/* Sort By Controller */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Sort By:</span>
              </span>
              <select
                id="sort-by-select"
                value={sortField || 'diperbarui'}
                onChange={e => onSort(e.target.value as SortField)}
                className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
              >
                <option value="diperbarui" className="dark:bg-slate-800 dark:text-slate-200">Tanggal Diperbarui</option>
                <option value="createdAt" className="dark:bg-slate-800 dark:text-slate-200">Tanggal Dibuat</option>
                <option value="link" className="dark:bg-slate-800 dark:text-slate-200">Link URL</option>
                <option value="name" className="dark:bg-slate-800 dark:text-slate-200">Nama / Judul</option>
                <option value="status" className="dark:bg-slate-800 dark:text-slate-200">Status</option>
                <option value="output" className="dark:bg-slate-800 dark:text-slate-200">Output</option>
                <option value="region" className="dark:bg-slate-800 dark:text-slate-200">Region</option>
                <option value="counta" className="dark:bg-slate-800 dark:text-slate-200">Counta</option>
                <option value="note" className="dark:bg-slate-800 dark:text-slate-200">Note</option>
              </select>
              <button
                onClick={() => onSort((sortField || 'diperbarui') as SortField)}
                title="Balik urutan (Ascending / Descending)"
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>{sortDirection === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}</span>
              </button>
            </div>

            {/* Column Visibility Toggle Menu */}
            <div className="relative" ref={columnMenuRef}>
              <button
                type="button"
                id="btn-toggle-columns-menu"
                onClick={() => setIsColumnMenuOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs cursor-pointer ${
                  isColumnMenuOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="Atur kolom yang ingin ditampilkan atau disembunyikan"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Kolom</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isColumnMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Column Visibility Dropdown */}
              {isColumnMenuOpen && (
                <div
                  id="columns-visibility-dropdown"
                  className="absolute right-0 top-full mt-2 w-56 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tampilan Kolom</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsColumnMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 py-1">
                    {COLUMN_DEFINITIONS.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-xs select-none"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={showAllColumns}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={resetDefaultColumns}
                      className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Range Period Filter (Periode XXX ke XXX) */}
        <div
          id="period-filter-bar"
          className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Filter Periode Tanggal:</span>
            </span>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium">Dari</span>
              <input
                type="date"
                id="filter-start-date"
                value={startDate}
                onChange={e => onStartDateChange(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-bold">-</span>
              <span className="text-[11px] text-slate-400 font-medium">Hingga</span>
              <input
                type="date"
                id="filter-end-date"
                value={endDate}
                onChange={e => onEndDateChange(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none cursor-pointer"
              />
            </div>

            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSetQuickPeriod('today')}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                onClick={() => onSetQuickPeriod(7)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                7 Hari
              </button>
              <button
                onClick={() => onSetQuickPeriod(30)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                30 Hari
              </button>
              <button
                onClick={() => onSetQuickPeriod('thisMonth')}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {hasActivePeriod && (
            <button
              onClick={onResetPeriod}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold flex items-center gap-1 underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter Periode</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header row with modern adaptive light and dark styling */}
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-white select-none text-[12px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="py-3.5 px-3.5 w-10 text-center border-r border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="select-all-checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  title="Pilih seluruh tautan terfilter"
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </th>

              {/* Link Column */}
              <th
                className="py-3.5 px-4 min-w-[400px] border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition"
                onClick={() => onSort('link')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="underline decoration-1 underline-offset-4">
                      Nama & Link Unduhan
                    </span>
                    {sortField === 'link' && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {sortField === 'link' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </span>
                </div>
              </th>

              {/* Status Column */}
              {visibleColumns.status && (
                <th
                  className="py-3.5 px-3 w-44 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition text-center"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                      <span>Status</span>
                    </div>
                    {sortField === 'status' && (
                      <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Output Column */}
              {visibleColumns.output && (
                <th
                  className="py-3.5 px-3 w-28 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition text-center"
                  onClick={() => onSort('output')}
                >
                  <div className="flex items-center justify-between">
                    <span>Output</span>
                    {sortField === 'output' && (
                      <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Region Column */}
              {visibleColumns.region && (
                <th
                  className="py-3.5 px-3 w-24 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition text-center"
                  onClick={() => onSort('region')}
                >
                  <div className="flex items-center justify-between">
                    <span>Region</span>
                    {sortField === 'region' && (
                      <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Counta Column */}
              {visibleColumns.counta && (
                <th
                  className="py-3.5 px-3 w-24 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition text-center"
                  onClick={() => onSort('counta')}
                >
                  <div className="flex items-center justify-between">
                    <span>Counta</span>
                    {sortField === 'counta' && (
                      <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Note Column */}
              {visibleColumns.note && (
                <th
                  className="py-3.5 px-4 min-w-[160px] border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition"
                  onClick={() => onSort('note')}
                >
                  <div className="flex items-center justify-between">
                    <span>Note</span>
                    {sortField === 'note' && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Diperbarui Column */}
              {visibleColumns.diperbarui && (
                <th
                  className="py-3.5 px-3 w-36 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900 transition text-center"
                  onClick={() => onSort('diperbarui')}
                >
                  <div className="flex items-center justify-between">
                    <span>Diperbarui</span>
                    {sortField === 'diperbarui' && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Actions Column */}
              {visibleColumns.actions && (
                <th className="py-3.5 px-3 w-40 text-center">
                  <span>Aksi Download</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* Loading Skeleton Rows Visualization */}
            {isLoading ? (
              Array.from({ length: 8 }).map((_, sIdx) => (
                <tr key={`skeleton-${sIdx}`} className="animate-pulse bg-slate-50/40 dark:bg-slate-800/20">
                  <td className="py-3 px-3.5 text-center border-r border-slate-100 dark:border-slate-800/80">
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 mx-auto" />
                  </td>
                  <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/80">
                    <div className="space-y-1.5">
                      <div className="w-36 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-64 h-3 bg-slate-200/70 dark:bg-slate-700/70 rounded" />
                    </div>
                  </td>
                  {visibleColumns.status && (
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center">
                      <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                    </td>
                  )}
                  {visibleColumns.output && (
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center">
                      <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                    </td>
                  )}
                  {visibleColumns.region && (
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center">
                      <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </td>
                  )}
                  {visibleColumns.counta && (
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center">
                      <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </td>
                  )}
                  {visibleColumns.note && (
                    <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/80">
                      <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    </td>
                  )}
                  {visibleColumns.diperbarui && (
                    <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center">
                      <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="py-3 px-3 text-center">
                      <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="py-14 text-center text-slate-400 dark:text-slate-500">
                  <div className="max-w-md mx-auto space-y-2">
                    <TableIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada tautan yang sesuai</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Coba sesuaikan kata kunci pencarian, filter status, atau rentang periode tanggal.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isDownloaded = item.status === 'Sudah Terunduh';

                return (
                  <tr
                    key={item.id}
                    id={`row-${item.id}`}
                    className={`transition-colors text-[13px] ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                        : isDownloaded
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                        : index % 2 === 1
                        ? 'bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/60'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Checkbox with Shift-Click Range Selection */}
                    <td className="py-2.5 px-3.5 text-center border-r border-slate-100 dark:border-slate-800/80">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        onClick={e => handleCheckboxClick(e, item, index)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        title="Klik untuk memilih (Tahan Shift + Klik untuk memilih rentang)"
                      />
                    </td>

                    {/* Link Column: 1 Single Clean Link (No double link underneath) */}
                    <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800/80 min-w-[360px]">
                      <div className="flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />

                          {/* Single link with hover card integration */}
                          <UrlHoverCard
                            item={item}
                            onCopyLink={onCopyLink}
                            onDownloadAndMark={() => onDownloadAndMark(item)}
                            isDownloaded={isDownloaded}
                          />

                          {item.tag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-bold tracking-tight shrink-0">
                              <Tag className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                              <span>{item.tag}</span>
                            </span>
                          )}
                        </div>

                        {/* Fast Copy & External Open Buttons */}
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={() => onCopyLink(item.link)}
                            title="Salin Link"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer shadow-2xs transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="Buka Link di Tab Baru"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer shadow-2xs transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    {visibleColumns.status && (
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800/80">
                        <div className="relative inline-block">
                          <select
                            value={item.status}
                            onChange={e => onUpdateStatus(item.id, e.target.value)}
                            className={`appearance-none font-bold text-[11px] px-3 py-1 rounded-full cursor-pointer pr-6 shadow-2xs border transition outline-none ${
                              item.status === 'Blank'
                                ? 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                                : item.status === 'Sudah Terunduh'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                : item.status === 'Proses'
                                ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : item.status === 'Web Inactive'
                                ? 'bg-red-100 dark:bg-red-950 hover:bg-red-200 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {settings.statusOptions.map((st, sIdx) => (
                              <option key={sIdx} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {st}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />
                        </div>
                      </td>
                    )}

                    {/* Output Dropdown / Pill */}
                    {visibleColumns.output && (
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800/80">
                        {onUpdateOutput ? (
                          <div className="relative inline-block">
                            <select
                              value={item.output}
                              onChange={e => onUpdateOutput(item.id, e.target.value)}
                              className="appearance-none inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 pr-5 cursor-pointer outline-none"
                            >
                              {settings.outputOptions.map((out, oIdx) => (
                                <option key={oIdx} value={out} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                  {out}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            {item.output}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Region Dropdown / Tag */}
                    {visibleColumns.region && (
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/80">
                        {onUpdateRegion ? (
                          <select
                            value={item.region}
                            onChange={e => onUpdateRegion(item.id, e.target.value)}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer outline-none"
                          >
                            {settings.regionOptions.map((reg, rIdx) => (
                              <option key={rIdx} value={reg} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {reg}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                            {item.region}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Counta */}
                    {visibleColumns.counta && (
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                        {item.counta}
                      </td>
                    )}

                    {/* Note (Editable) */}
                    {visibleColumns.note && (
                      <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800/80">
                        {editingNoteId === item.id ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={tempNote}
                                onChange={e => setTempNote(e.target.value)}
                                className="text-xs p-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveNote(item.id);
                                  if (e.key === 'Escape') cancelEditNote();
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => saveNote(item.id)}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditNote}
                                className="p-1 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-400 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Quick preset chips */}
                            <div className="flex flex-wrap gap-1">
                              {settings.notePresets.map((preset, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => setTempNote(preset)}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-between group cursor-pointer"
                            onClick={() => startEditNote(item)}
                            title="Klik untuk mengubah catatan"
                          >
                            <span
                              className={`truncate max-w-[140px] ${
                                item.note === 'Web Inactive'
                                  ? 'text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.note || '-'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition ml-1" />
                          </div>
                        )}
                      </td>
                    )}

                    {/* Diperbarui */}
                    {visibleColumns.diperbarui && (
                      <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80 text-[11px]">
                        {item.diperbarui}
                      </td>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.actions && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {isDownloaded ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                id={`btn-download-again-${item.id}`}
                                onClick={() => onDownloadAndMark(item)}
                                title="Buka kembali link unduhan"
                                className="px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Terunduh</span>
                              </button>
                              <button
                                type="button"
                                id={`btn-revert-${item.id}`}
                                onClick={() => onUpdateStatus(item.id, 'Blank')}
                                title="Kembalikan status menjadi belum diunduh (Blank)"
                                className="p-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`btn-download-mark-${item.id}`}
                              onClick={() => onDownloadAndMark(item)}
                              title="Klik untuk langsung membuka dan mengunduh berkas (Otomatis ditandai 'Sudah Terunduh')"
                              className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl transition shadow-sm hover:shadow-md hover:ring-2 hover:ring-indigo-300 flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <DownloadCloud className="w-4 h-4 text-indigo-100" />
                              <span>UNDUH</span>
                            </button>
                          )}

                          <button
                            type="button"
                            id={`btn-delete-${item.id}`}
                            onClick={() => onDeleteLink(item.id)}
                            title="Hapus dari database"
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* High-Performance Pagination Bar (Handles 29k+ links smoothly) */}
      {items.length > 0 && (
        <div
          id="table-pagination-footer"
          className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          {/* Left: Summary & Quick Page selection */}
          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
            <span>
              Menampilkan <strong className="text-slate-900 dark:text-slate-100 font-mono">{startRecordNum}</strong> -{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">{endRecordNum}</strong> dari{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">{items.length.toLocaleString('id-ID')}</strong> data
            </span>

            {/* Select All on Page Button */}
            {onSelectSpecificIds && paginatedItems.length > 0 && (
              <button
                type="button"
                onClick={handleSelectPageOnly}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition cursor-pointer"
              >
                {pageAllSelected ? 'Batalkan Pilih Halaman Ini' : `Pilih ${paginatedItems.length} di Halaman Ini`}
              </button>
            )}

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Per Halaman:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                  setJumpPageInput('1');
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1.000</option>
                <option value={0}>Semua (Tampil Penuh)</option>
              </select>
            </div>
          </div>

          {/* Right: Navigation Buttons & Jump to Page */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setJumpPageInput('1');
                }}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => {
                  const p = Math.max(1, currentPage - 1);
                  setCurrentPage(p);
                  setJumpPageInput(String(p));
                }}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Active Page Indicator */}
              <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300 text-xs">
                Hal <strong className="font-mono text-indigo-600 dark:text-indigo-400">{currentPage}</strong> dari{' '}
                <strong className="font-mono">{totalPages}</strong>
              </span>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => {
                  const p = Math.min(totalPages, currentPage + 1);
                  setCurrentPage(p);
                  setJumpPageInput(String(p));
                }}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(totalPages);
                  setJumpPageInput(String(totalPages));
                }}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>

              {/* Jump to Page Form */}
              <form onSubmit={handleJumpPage} className="flex items-center gap-1 ml-2">
                <span className="text-slate-400 text-[11px]">Lompat ke:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={e => setJumpPageInput(e.target.value)}
                  className="w-14 px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Go
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
