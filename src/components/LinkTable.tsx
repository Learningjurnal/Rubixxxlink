import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  ChevronDown,
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
} from 'lucide-react';
import { LinkItem, LinkStatus, AppSettings, SortField, SortDirection } from '../types';

interface LinkTableProps {
  items: LinkItem[];
  totalAllItemsCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
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
}

export const LinkTable: React.FC<LinkTableProps> = ({
  items,
  totalAllItemsCount,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
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
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const allSelected = items.length > 0 && selectedIds.size === items.length;

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

  const hasActivePeriod = Boolean(startDate || endDate);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden w-full">
      {/* Table Tab Header (Bento Registry Header + Period Filter Bar) */}
      <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        {/* Top Controls: Table Tab + Sort By Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-semibold text-xs shadow-xs tracking-wide border border-slate-800 dark:border-slate-700">
              <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Table1 (Database Link Cloud)</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan {items.length} dari total {totalAllItemsCount} tautan
            </span>
          </div>

          {/* Sort By Dropdown Controller */}
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
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-1"
            >
              <span>{sortDirection === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}</span>
            </button>
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

            {/* Start Date */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Dari:</span>
              <input
                type="date"
                id="period-start-date"
                value={startDate}
                onChange={e => onStartDateChange(e.target.value)}
                className="text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer bg-transparent"
              />
            </div>

            <span className="text-slate-400 dark:text-slate-500 font-bold">ke</span>

            {/* End Date */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Sampai:</span>
              <input
                type="date"
                id="period-end-date"
                value={endDate}
                onChange={e => onEndDateChange(e.target.value)}
                className="text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer bg-transparent"
              />
            </div>

            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => onSetQuickPeriod('today')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => onSetQuickPeriod(7)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => onSetQuickPeriod('thisMonth')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
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
          {/* Header row with modern dark slate styling */}
          <thead>
            <tr className="bg-slate-900 dark:bg-slate-950 text-white select-none text-[12px] font-semibold tracking-wider">
              <th className="py-3.5 px-3.5 w-10 text-center border-r border-slate-800 dark:border-slate-900">
                <input
                  type="checkbox"
                  id="select-all-checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
              </th>

              {/* Link Column */}
              <th
                className="py-3.5 px-4 min-w-[320px] max-w-[460px] border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition"
                onClick={() => onSort('link')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="underline decoration-1 underline-offset-4">
                      Nama & Link Unduhan
                    </span>
                    {sortField === 'link' && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {sortField === 'link' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </span>
                </div>
              </th>

              {/* Status Column */}
              <th
                className="py-3.5 px-3 w-44 border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition text-center"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>Status</span>
                  </div>
                  {sortField === 'status' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Output Column */}
              <th
                className="py-3.5 px-3 w-28 border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition text-center"
                onClick={() => onSort('output')}
              >
                <div className="flex items-center justify-between">
                  <span>Output</span>
                  {sortField === 'output' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Region Column */}
              <th
                className="py-3.5 px-3 w-24 border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition text-center"
                onClick={() => onSort('region')}
              >
                <div className="flex items-center justify-between">
                  <span>Region</span>
                  {sortField === 'region' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Counta Column */}
              <th
                className="py-3.5 px-3 w-24 border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition text-center"
                onClick={() => onSort('counta')}
              >
                <div className="flex items-center justify-between">
                  <span>Counta</span>
                  {sortField === 'counta' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Note Column */}
              <th
                className="py-3.5 px-4 min-w-[160px] border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition"
                onClick={() => onSort('note')}
              >
                <div className="flex items-center justify-between">
                  <span>Note</span>
                  {sortField === 'note' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Diperbarui Column */}
              <th
                className="py-3.5 px-3 w-36 border-r border-slate-800 dark:border-slate-900 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-900 transition text-center"
                onClick={() => onSort('diperbarui')}
              >
                <div className="flex items-center justify-between">
                  <span>Diperbarui</span>
                  {sortField === 'diperbarui' && (
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Actions Column */}
              <th className="py-3.5 px-3 w-40 text-center">
                <span>Aksi Download</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-slate-400 dark:text-slate-500">
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
              items.map((item, index) => {
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
                    {/* Checkbox */}
                    <td className="py-2.5 px-3.5 text-center border-r border-slate-100 dark:border-slate-800/80">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Link & Name Column */}
                    <td className="py-2 px-4 border-r border-slate-100 dark:border-slate-800/80 max-w-[460px]">
                      <div className="flex items-center justify-between gap-2 group">
                        <div className="truncate flex-1">
                          {item.name && (
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 mb-0.5">
                              <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                              <span className="truncate">{item.name}</span>
                              {item.tag && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-bold tracking-tight shrink-0">
                                  <Tag className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                                  <span>{item.tag}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {!item.name && item.tag && (
                            <div className="mb-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-bold tracking-tight">
                                <Tag className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                                <span>{item.tag}</span>
                              </span>
                            </div>
                          )}
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={item.link}
                            className={`truncate block underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-indigo-600 transition text-[12px] ${
                              isDownloaded
                                ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-normal'
                                : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium'
                            }`}
                          >
                            {item.link}
                          </a>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => onCopyLink(item.link)}
                            title="Salin Link"
                            className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="Buka Link di Tab Baru"
                            className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown (populated from settings) */}
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

                    {/* Output Dropdown / Pill (populated from settings) */}
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

                    {/* Region Dropdown / Tag (populated from settings) */}
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

                    {/* Counta */}
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                      {item.counta}
                    </td>

                    {/* Note (Editable with quick presets from settings) */}
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

                    {/* Diperbarui */}
                    <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80 text-[11px]">
                      {item.diperbarui}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isDownloaded ? (
                          <button
                            type="button"
                            id={`btn-revert-${item.id}`}
                            onClick={() => onUpdateStatus(item.id, 'Blank')}
                            title="Tandai belum diunduh (kembalikan ke Blank)"
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            <span>Batal</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`btn-download-mark-${item.id}`}
                            onClick={() => onDownloadAndMark(item)}
                            title="Buka link download dan otomatis tandai status 'Sudah Terunduh'"
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <DownloadCloud className="w-3.5 h-3.5 text-indigo-100" />
                            <span>Unduh & Tandai</span>
                          </button>
                        )}

                        <button
                          type="button"
                          id={`btn-delete-${item.id}`}
                          onClick={() => onDeleteLink(item.id)}
                          title="Hapus dari database"
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
