import React from 'react';
import {
  Link2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { LinkItem } from '../types';

interface StatsCardsProps {
  items: LinkItem[];
  duplicatesPreventedCount: number;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  items,
  duplicatesPreventedCount,
  onFilterChange,
  activeFilter,
}) => {
  const total = items.length;
  const blankCount = items.filter(i => i.status === 'Blank').length;
  const downloadedCount = items.filter(i => i.status === 'Sudah Terunduh').length;
  const inactiveCount = items.filter(
    i => i.note.toLowerCase().includes('inactive') || i.status === 'Gagal'
  ).length;

  const downloadProgress = total > 0 ? Math.round((downloadedCount / total) * 100) : 0;

  // Domain breakdown for Bento source analysis
  const domainCounts: Record<string, number> = {};
  items.forEach(item => {
    try {
      const url = new URL(item.link);
      const host = url.hostname.replace('www.', '');
      domainCounts[host] = (domainCounts[host] || 0) + 1;
    } catch {
      domainCounts['other'] = (domainCounts['other'] || 0) + 1;
    }
  });

  const topDomains: Array<[string, number]> = Object.entries(domainCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
      {/* Bento Card 1: Total Links KPI (Lg: 3 cols) */}
      <div
        id="stat-total-links"
        onClick={() => onFilterChange('ALL')}
        className={`lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border shadow-xs cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
          activeFilter === 'ALL'
            ? 'ring-2 ring-indigo-600 border-indigo-600'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Database
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
            <TrendingUp className="w-3 h-3" />
            Aktif
          </span>
        </div>

        <div className="my-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {total}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">tautan tersimpan</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Klik untuk menampilkan seluruh koleksi link unduhan
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Terorganisir
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Lihat Semua →
          </span>
        </div>
      </div>

      {/* Bento Card 2: Dark Theme Queue Status (Lg: 3 cols) */}
      <div
        id="stat-queue-progress"
        className="lg:col-span-3 bg-slate-900 dark:bg-slate-900/90 dark:border dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Status Unduhan
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {downloadProgress}% Selesai
          </span>
        </div>

        <div className="my-3 space-y-2.5">
          {/* Belum Diunduh trigger */}
          <div
            id="stat-blank-links"
            onClick={() => onFilterChange('Blank')}
            className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
              activeFilter === 'Blank' ? 'bg-slate-800 ring-1 ring-amber-400' : 'hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">Belum (Blank)</span>
            </div>
            <span className="text-sm font-bold text-amber-400">{blankCount}</span>
          </div>

          {/* Sudah Terunduh trigger */}
          <div
            id="stat-downloaded-links"
            onClick={() => onFilterChange('Sudah Terunduh')}
            className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
              activeFilter === 'Sudah Terunduh' ? 'bg-slate-800 ring-1 ring-emerald-400' : 'hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">Sudah Terunduh</span>
            </div>
            <span className="text-sm font-bold text-emerald-400">{downloadedCount}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      </div>

      {/* Bento Card 3: Indigo Anti-Duplikasi Protection (Lg: 3 cols) */}
      <div
        id="stat-duplicates-prevented"
        className="lg:col-span-3 bg-indigo-600 dark:bg-indigo-900/80 dark:border dark:border-indigo-700/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            Anti Duplikasi
          </span>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {duplicatesPreventedCount}
            </span>
            <span className="text-xs text-indigo-100 font-medium">duplikat dicegah</span>
          </div>
          <p className="text-xs text-indigo-100/90 mt-1 leading-relaxed">
            Sistem otomatis memblokir file ganda saat Anda mengimpor file Excel baru.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-2 text-[11px] font-semibold text-indigo-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Proteksi Hash URL Aktif</span>
        </div>
      </div>

      {/* Bento Card 4: Source Breakdown & Inactive Alert (Lg: 3 cols) */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Analisis Domain Host
          </span>
          <Globe2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="my-3 space-y-2">
          {topDomains.length > 0 ? (
            topDomains.map(([host, count]) => (
              <div key={host} className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={host}>
                  {host}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{count}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({total > 0 ? Math.round((Number(count) / total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada data domain</p>
          )}
        </div>

        {/* Web Inactive quick check link */}
        <div
          id="stat-inactive-links"
          onClick={() => onFilterChange('Web Inactive')}
          className={`pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs cursor-pointer ${
            activeFilter === 'Web Inactive' ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400'
          }`}
        >
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Web Inactive / Gagal</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] border border-amber-200/60 dark:border-amber-800/50">
            {inactiveCount}
          </span>
        </div>
      </div>
    </div>
  );
};

