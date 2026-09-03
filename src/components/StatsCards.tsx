import React, { useMemo } from 'react';
import {
  Link2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Sparkles,
  Database,
  HardDrive,
  Cpu,
  RefreshCw,
  Layers,
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
  const {
    total,
    blankCount,
    downloadedCount,
    inactiveCount,
    downloadProgress,
    topDomains,
    estimatedSizeMb,
    milestoneTarget,
    capacityPercent,
  } = useMemo(() => {
    const total = items.length;
    let blankCount = 0;
    let downloadedCount = 0;
    let inactiveCount = 0;
    const domainCounts: Record<string, number> = {};

    for (let i = 0; i < total; i++) {
      const item = items[i];
      if (item.status === 'Blank') blankCount++;
      if (item.status === 'Sudah Terunduh') downloadedCount++;
      if ((item.note && item.note.toLowerCase().includes('inactive')) || item.status === 'Gagal') {
        inactiveCount++;
      }

      // Fast hostname extraction without expensive new URL() constructor
      const link = item.link || '';
      let host = 'other';
      const slashIndex = link.indexOf('://');
      if (slashIndex !== -1) {
        const afterProto = link.substring(slashIndex + 3);
        const nextSlash = afterProto.indexOf('/');
        host = (nextSlash !== -1 ? afterProto.substring(0, nextSlash) : afterProto)
          .replace('www.', '')
          .toLowerCase();
      }
      domainCounts[host] = (domainCounts[host] || 0) + 1;
    }

    const downloadProgress = total > 0 ? Math.round((downloadedCount / total) * 100) : 0;
    const topDomains: Array<[string, number]> = Object.entries(domainCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3);

    const estimatedSizeBytes = total * 320;
    const estimatedSizeMb = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);
    const milestoneTarget =
      total > 50000 ? 100000 : total > 25000 ? 50000 : total > 10000 ? 30000 : 10000;
    const capacityPercent = Math.min(100, Math.round((total / milestoneTarget) * 100));

    return {
      total,
      blankCount,
      downloadedCount,
      inactiveCount,
      downloadProgress,
      topDomains,
      estimatedSizeMb,
      milestoneTarget,
      capacityPercent,
    };
  }, [items]);

  return (
    <div className="space-y-4 mb-6">
      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
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
                {total.toLocaleString('id-ID')}
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
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300 font-medium">Belum Diunduh (Blank)</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{blankCount.toLocaleString('id-ID')}</span>
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
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">Sudah Terunduh</span>
              </div>
              <span className="text-sm font-bold text-emerald-400">{downloadedCount.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Antrean Unduhan</span>
            <span className="text-indigo-400 font-semibold">{blankCount.toLocaleString('id-ID')} tersisa</span>
          </div>
        </div>

        {/* Bento Card 3: Duplicates Prevented KPI (Lg: 3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pencegahan Duplikat
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Auto Clean
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {duplicatesPreventedCount.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">duplikat dicegah</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Menjaga basis data tetap bersih tanpa link ganda saat import
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span>Proteksi Hash URL Aktif</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
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

      {/* Visualisasi Penyimpanan & Kapasitas Big Data (29 Ribu Link & Terus Update) */}
      <div
        id="stat-big-data-storage"
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-indigo-900/60 shadow-lg relative overflow-hidden"
      >
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Visualisasi Penyimpanan & Skala Big Data
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Realtime Cloud Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Optimasi kapasitas tinggi untuk mendukung unggahan skala besar (29.000+ tautan) dan pembaruan data berkelanjutan
              </p>
            </div>
          </div>

          {/* Quick Storage Stats Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/70 px-3.5 py-1.5 rounded-xl text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Estimasi Database</span>
              <span className="text-xs font-mono font-bold text-indigo-300">~{estimatedSizeMb} MB</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/70 px-3.5 py-1.5 rounded-xl text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Target Skala</span>
              <span className="text-xs font-mono font-bold text-teal-300">{milestoneTarget.toLocaleString('id-ID')} Link</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/70 px-3.5 py-1.5 rounded-xl text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Status Sync</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-center">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Siap Update</span>
              </span>
            </div>
          </div>
        </div>

        {/* Visual Capacity Meter Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Volume Saat Ini: <strong className="text-white font-mono">{total.toLocaleString('id-ID')}</strong> dari <strong className="text-white font-mono">{milestoneTarget.toLocaleString('id-ID')}</strong> link milestone</span>
            </span>
            <span className="font-mono font-bold text-teal-400">{capacityPercent}% Tercapai</span>
          </div>

          {/* Glowing Multi-color Progress Bar */}
          <div className="w-full h-3.5 bg-slate-950/80 border border-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 transition-all duration-700 shadow-sm"
              style={{ width: `${Math.max(5, capacityPercent)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Tersimpan di Cloud Firestore & Terindeks Lokal untuk Akses Instan</span>
            <span>Didukung Paginasi Cepat (50 - 1.000 data per halaman) Tanpa Lemot</span>
          </div>
        </div>
      </div>
    </div>
  );
};
