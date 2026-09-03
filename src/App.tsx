/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Download,
  Search,
  RefreshCw,
  Sliders,
  Sparkles,
  BarChart3,
  User as UserIcon,
  LogIn,
  LogOut,
  Database,
  CloudCheck,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { LinkItem, LinkStatus, FilterStatus, AppSettings, SortField, SortDirection } from './types';
import { INITIAL_LINKS } from './data/initialData';
import { StatsCards } from './components/StatsCards';
import { LinkTable } from './components/LinkTable';
import { UploadExcelModal } from './components/UploadExcelModal';
import { AddLinkModal } from './components/AddLinkModal';
import { BatchActionsBar } from './components/BatchActionsBar';
import { SettingsModal } from './components/SettingsModal';
import { ResetDataModal } from './components/ResetDataModal';
import { AuthModal } from './components/AuthModal';
import { ExtractLinkModal } from './components/ExtractLinkModal';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { ToastContainer, ToastMessage } from './components/Toast';
import { exportToExcel, exportToCsv, downloadTemplateExcel, formatDateNow } from './utils/excelHelper';
import { isWithinPeriod, formatToISODate } from './utils/dateHelper';
import { checkSingleUrlStatus } from './utils/urlChecker';
import {
  auth,
  onAuthStateChanged,
  signOut,
  User,
  subscribeToLinks,
  subscribeToSettings,
  addLinkToFirestore,
  batchAddLinksToFirestore,
  updateLinkInFirestore,
  deleteLinkFromFirestore,
  batchUpdateStatusInFirestore,
  batchUpdateTagInFirestore,
  batchDeleteLinksFromFirestore,
  clearAllLinksFromFirestore,
  clearKnownDummyLinksFromFirestore,
  DEFAULT_SETTINGS,
  saveSettingsToFirestore,
  getCachedLocalLinks,
  LOCAL_STORAGE_LINKS_KEY,
} from './lib/firebase';

export default function App() {
  // State for Links initialized from cache for instant offline-first display
  const [items, setItems] = useState<LinkItem[]>(() => getCachedLocalLinks());
  const [duplicatesPreventedCount, setDuplicatesPreventedCount] = useState<number>(0);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  // Filters and UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // URL Status Check background process state
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState<{ current: number; total: number } | null>(null);

  // Date Range Period Filter (Periode XXX ke XXX)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('diperbarui');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Settings subscription
  useEffect(() => {
    const unsub = subscribeToSettings(newSettings => {
      setSettings(newSettings);
    });
    return () => unsub();
  }, []);

  // 3. Firestore Links subscription & auto-cleanup dummy links
  useEffect(() => {
    // Auto-clean any legacy dummy data that might have been saved to Firestore
    clearKnownDummyLinksFromFirestore().catch(() => {});

    const unsub = subscribeToLinks(
      fireLinks => {
        setIsDbConnected(true);
        setIsDbLoading(false);
        setItems(fireLinks);
      },
      err => {
        console.warn('Firestore subscription offline notice:', err);
        setIsDbConnected(false);
        setIsDbLoading(false);
        const local = getCachedLocalLinks();
        if (local.length > 0) {
          setItems(local);
        }
      }
    );

    return () => unsub();
  }, []);

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Quick Period Setter
  const handleSetQuickPeriod = (days: number | 'today' | 'thisMonth') => {
    const now = new Date();
    if (days === 'today') {
      const todayStr = formatToISODate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (days === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatToISODate(firstDay));
      setEndDate(formatToISODate(now));
    } else if (typeof days === 'number') {
      const past = new Date();
      past.setDate(past.getDate() - days);
      setStartDate(formatToISODate(past));
      setEndDate(formatToISODate(now));
    }
  };

  const handleResetPeriod = () => {
    setStartDate('');
    setEndDate('');
  };

  // Filter and Sort Items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (activeFilter === 'Blank') {
      result = result.filter(i => i.status === 'Blank');
    } else if (activeFilter === 'Sudah Terunduh') {
      result = result.filter(i => i.status === 'Sudah Terunduh');
    } else if (activeFilter === 'Web Inactive') {
      result = result.filter(
        i => i.note.toLowerCase().includes('inactive') || i.status === 'Gagal' || i.status === 'Web Inactive'
      );
    } else if (activeFilter !== 'ALL') {
      result = result.filter(i => i.status === activeFilter);
    }

    // Date Range Period filter (Periode XXX ke XXX)
    if (startDate || endDate) {
      result = result.filter(item =>
        isWithinPeriod(item.diperbarui, item.createdAt, startDate, endDate)
      );
    }

    // Search query (matches link, name, note, tag, region, or output)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        i =>
          i.link.toLowerCase().includes(q) ||
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.tag && i.tag.toLowerCase().includes(q)) ||
          i.note.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q) ||
          i.output.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'counta' || sortField === 'createdAt') {
          const numA = Number(valA || 0);
          const numB = Number(valB || 0);
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [items, activeFilter, searchQuery, sortField, sortDirection, startDate, endDate]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleSelectSpecificIds = (ids: string[], append = true) => {
    setSelectedIds(prev => {
      const next = append ? new Set(prev) : new Set<string>();
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedIds(new Set());
    addToast('info', 'Filter pencarian, status, periode tanggal, dan seleksi berhasil direset.');
  };

  const handleResetSettingsDefaults = async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await saveSettingsToFirestore(DEFAULT_SETTINGS);
      addToast('success', 'Pengaturan opsi berhasil dikembalikan ke standar awal.');
    } catch (e) {
      console.error(e);
      addToast('error', 'Gagal mereset pengaturan opsi.');
    }
  };

  const handleClearEntireDatabase = async () => {
    const count = await clearAllLinksFromFirestore();
    setItems([]);
    setSelectedIds(new Set());
    try {
      localStorage.removeItem(LOCAL_STORAGE_LINKS_KEY);
    } catch {}
    addToast('warning', `Database berhasil dikosongkan (${count} tautan dibersihkan).`);
  };

  // Status and data update handlers with Firestore sync
  const handleUpdateStatus = async (id: string, newStatus: LinkStatus) => {
    const today = formatDateNow();
    const updates: Partial<LinkItem> = {
      status: newStatus,
      diperbarui: today,
      ...(newStatus === 'Sudah Terunduh' ? { downloadedAt: today } : {}),
    };

    // Optimistic UI update
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );

    try {
      await updateLinkInFirestore(id, updates);
      addToast('success', `Status tautan diperbarui menjadi "${newStatus}".`);
    } catch (e) {
      console.error('Firestore update error:', e);
      addToast('info', `Status disimpan secara lokal.`);
    }
  };

  const handleUpdateOutput = async (id: string, newOutput: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, output: newOutput } : item))
    );
    try {
      await updateLinkInFirestore(id, { output: newOutput });
      addToast('info', `Output diubah menjadi "${newOutput}".`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRegion = async (id: string, newRegion: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, region: newRegion } : item))
    );
    try {
      await updateLinkInFirestore(id, { region: newRegion });
      addToast('info', `Region diubah menjadi "${newRegion}".`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNote = async (id: string, newNote: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, note: newNote } : item))
    );
    try {
      await updateLinkInFirestore(id, { note: newNote });
      addToast('info', 'Catatan diperbarui.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await deleteLinkFromFirestore(id);
      addToast('info', 'Tautan dihapus dari database.');
    } catch (e) {
      console.error(e);
    }
  };

  // One-click Download & Mark as Downloaded
  const handleDownloadAndMark = (item: LinkItem) => {
    window.open(item.link, '_blank', 'noopener,noreferrer');
    handleUpdateStatus(item.id, 'Sudah Terunduh');
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    addToast('info', 'Tautan disalin ke papan klip.');
  };

  // Batch Operations with Firestore
  const handleBatchUpdateStatus = async (status: LinkStatus) => {
    const today = formatDateNow();
    const ids = Array.from(selectedIds) as string[];

    setItems(prev =>
      prev.map(i =>
        selectedIds.has(i.id)
          ? {
              ...i,
              status,
              diperbarui: today,
              downloadedAt: status === 'Sudah Terunduh' ? today : i.downloadedAt,
            }
          : i
      )
    );
    setSelectedIds(new Set());

    try {
      await batchUpdateStatusInFirestore(ids, status, today);
      addToast('success', `${ids.length} link diubah statusnya menjadi "${status}".`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchApplyTag = async (tag: string) => {
    const ids = Array.from(selectedIds) as string[];
    const trimmedTag = tag.trim();

    setItems(prev =>
      prev.map(i =>
        selectedIds.has(i.id)
          ? {
              ...i,
              tag: trimmedTag,
            }
          : i
      )
    );

    try {
      await batchUpdateTagInFirestore(ids, trimmedTag);
      if (trimmedTag) {
        addToast('success', `Tag "${trimmedTag}" berhasil diterapkan ke ${ids.length} tautan.`);
      } else {
        addToast('info', `Tag berhasil dihapus dari ${ids.length} tautan.`);
      }
    } catch (e) {
      console.error(e);
      addToast('info', 'Tag disimpan secara lokal.');
    }
  };

  const handleBatchOpenSelected = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    if (selectedItems.length > 15) {
      const confirmed = window.confirm(
        `Anda akan membuka ${selectedItems.length} tautan sekaligus di tab baru!\n\nTips Browser: Jika hanya sebagian tab yang terbuka, pastikan Anda telah Mengizinkan 'Pop-up and redirects' untuk situs ini pada pengaturan browser Anda.\n\nLanjutkan membuka ${selectedItems.length} tab?`
      );
      if (!confirmed) return;
    }

    // Open links in fast stagger (50ms) to avoid browser popup suppression
    selectedItems.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.link, '_blank', 'noopener,noreferrer');
      }, index * 50);
    });

    addToast('info', `${selectedItems.length} tautan sedang dibuka sekaligus di tab baru.`);
  };

  // Keyboard shortcut: Ctrl + Shift + O to open all selected links
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        if (selectedIds.size > 0) {
          handleBatchOpenSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, items]);

  const handleBatchCopySelected = () => {
    const selectedUrls = items
      .filter(i => selectedIds.has(i.id))
      .map(i => i.link)
      .join('\n');
    navigator.clipboard.writeText(selectedUrls);
    addToast('info', `${selectedIds.size} link berhasil disalin ke clipboard.`);
  };

  const handleBatchExportCsv = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    exportToCsv(selectedItems, `Selected_Links_${selectedItems.length}_Export.csv`);
    addToast('success', `${selectedItems.length} tautan terpilih berhasil diekspor ke file CSV.`);
  };

  const handleBatchDeleteSelected = async () => {
    const ids = Array.from(selectedIds) as string[];
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    setSelectedIds(new Set());

    try {
      await batchDeleteLinksFromFirestore(ids);
      addToast('info', `${ids.length} tautan dihapus dari database.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Background Process: Ping selected URLs and flag 404 errors
  const handleBatchCheckStatus = async () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    setIsCheckingStatus(true);
    setCheckingProgress({ current: 0, total: selectedItems.length });
    addToast('info', `Mengecek status ${selectedItems.length} tautan di latar belakang...`);

    const flagged404Ids: string[] = [];
    const today = formatDateNow();

    for (let index = 0; index < selectedItems.length; index++) {
      const item = selectedItems[index];
      setCheckingProgress({ current: index + 1, total: selectedItems.length });

      const checkResult = await checkSingleUrlStatus(item.link);

      if (checkResult.is404) {
        flagged404Ids.push(item.id);
        const updatedNote = item.note ? `${item.note} | 404 Not Found` : '404 Not Found (Web Inactive)';

        // Update local state immediately
        setItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'Blank',
                  note: updatedNote,
                  diperbarui: today,
                }
              : i
          )
        );

        // Sync with Firestore
        try {
          await updateLinkInFirestore(item.id, {
            status: 'Blank',
            note: updatedNote,
            diperbarui: today,
          });
        } catch (err) {
          console.error(`Failed to update Firestore for item ${item.id}:`, err);
        }
      }
    }

    setIsCheckingStatus(false);
    setCheckingProgress(null);

    if (flagged404Ids.length > 0) {
      addToast(
        'warning',
        `Pemeriksaan Selesai! ${flagged404Ids.length} dari ${selectedItems.length} link mengembalikan Error 404 dan telah ditandai sebagai 'Blank' / '404 Not Found'.`
      );
    } else {
      addToast(
        'success',
        `Pemeriksaan Selesai! Seluruh ${selectedItems.length} link terpilih dalam keadaan aktif (bebas 404).`
      );
    }
  };

  const handleClearAllData = async () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin menghapus SEMUA tautan di database? Seluruh data tautan dan dummy akan dibersihkan.'
    );
    if (!confirm) return;

    try {
      const count = await clearAllLinksFromFirestore();
      setItems([]);
      setSelectedIds(new Set());
      setIsSettingsModalOpen(false);
      addToast('success', `${count} tautan berhasil dihapus. Database kini bersih tanpa data dummy.`);
    } catch (e) {
      console.error(e);
      addToast('error', 'Gagal membersihkan database.');
    }
  };

  // Import from Excel handler with Firestore Batch
  const handleImportComplete = async (
    newItems: LinkItem[],
    updatedCount: number,
    skippedDuplicatesCount: number
  ) => {
    if (skippedDuplicatesCount > 0) {
      setDuplicatesPreventedCount(prev => prev + skippedDuplicatesCount);
    }

    try {
      await batchAddLinksToFirestore(
        newItems.map(item => ({
          name: item.name || '',
          link: item.link,
          status: item.status,
          output: item.output,
          region: item.region,
          counta: item.counta,
          note: item.note,
          diperbarui: item.diperbarui,
          createdAt: item.createdAt,
        })),
        currentUser?.email || undefined
      );

      let msg = `Berhasil menyimpan ${newItems.length} link baru ke database Cloud.`;
      if (skippedDuplicatesCount > 0) {
        msg += ` (${skippedDuplicatesCount} duplikat dicegah)`;
      }
      addToast('success', msg);
    } catch (e) {
      console.error(e);
      setItems(prev => [...newItems, ...prev]);
      addToast('warning', `Disimpan secara lokal (${newItems.length} link).`);
    }
  };

  // Add Manual Links handler with Firestore
  const handleAddLinks = async (newLinks: Omit<LinkItem, 'id'>[], skippedCount: number) => {
    if (skippedCount > 0) {
      setDuplicatesPreventedCount(prev => prev + skippedCount);
    }

    try {
      await batchAddLinksToFirestore(newLinks, currentUser?.email || undefined);
      if (skippedCount > 0) {
        addToast(
          'warning',
          `${newLinks.length} tautan disimpan ke database. ${skippedCount} duplikat diabaikan!`
        );
      } else {
        addToast('success', `${newLinks.length} tautan berhasil disimpan ke database Cloud.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addToast('info', 'Anda telah keluar dari akun.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans w-full">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navbar - FULL WIDTH */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* App Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                    Link Management Dashboard
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Bento Grid v2.5
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <Database className="w-3 h-3 text-emerald-600" />
                    <span>Database Cloud Firestore</span>
                  </span>
                  <span>•</span>
                  <span>{items.length} Total Tautan</span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Analytics Chart Toggle */}
              <button
                type="button"
                id="btn-toggle-charts"
                onClick={() => setShowCharts(prev => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-2xs ${
                  showCharts
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Tampilkan / Sembunyikan Grafik Analitik"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:inline">Grafik Analitik</span>
              </button>

              {/* Extract Embedded Link Button */}
              <button
                type="button"
                id="btn-open-extract-modal"
                onClick={() => setIsExtractModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                title="Ekstrak Link yang tertanam di nama atau teks"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">Ekstrak Link</span>
              </button>

              {/* Dropdown Options Settings */}
              <button
                type="button"
                id="btn-open-settings-modal"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Atur pilihan dropdown Status, Output, Region, dan Note"
              >
                <Sliders className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Pengaturan Opsi</span>
              </button>

              {/* Reset Data Modal Button */}
              <button
                type="button"
                id="btn-open-reset-data-modal"
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Pusat Reset Data: Reset Filter, Pengaturan, atau Kosongkan Database"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Reset Data</span>
              </button>

              {/* User Email Auth */}
              {currentUser ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 max-w-[140px] truncate hidden md:inline">
                    {currentUser.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Keluar (Logout)"
                    className="p-1 text-slate-400 hover:text-red-600 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-open-auth-modal"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Email</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - FULL WIDTH EXPANDED */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Bento Top Grid: Action Bar & Search Filter Panel */}
        <div className="bg-white rounded-3xl p-5 mb-6 shadow-xs border border-slate-200/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Input Bar */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-input-field"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari tautan, nama berkas, catatan, wilayah, atau output..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Import Excel */}
              <button
                type="button"
                id="btn-open-upload-modal"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Upload Excel</span>
              </button>

              {/* Add Link Manual */}
              <button
                type="button"
                id="btn-open-add-modal"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Link</span>
              </button>

              {/* Export to Excel */}
              <button
                type="button"
                id="btn-export-excel"
                onClick={() => exportToExcel(filteredItems)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition shadow-2xs"
                title="Ekspor seluruh baris terfilter ke spreadsheet Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              {/* Download Excel Template */}
              <button
                type="button"
                id="btn-download-template"
                onClick={downloadTemplateExcel}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 transition underline font-medium"
                title="Download template file excel resmi"
              >
                <span>Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bento KPI Stats Section (Full screen width) */}
        <StatsCards
          items={items}
          duplicatesPreventedCount={duplicatesPreventedCount}
          onFilterChange={setActiveFilter}
          activeFilter={activeFilter}
        />

        {/* Analytics Charts Section (Toggleable, Full Width) */}
        {showCharts && <AnalyticsCharts items={filteredItems} />}

        {/* Sticky Floating Batch Action Bar */}
        <BatchActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onUpdateStatus={handleBatchUpdateStatus}
          onApplyTag={handleBatchApplyTag}
          onOpenSelected={handleBatchOpenSelected}
          onCopySelected={handleBatchCopySelected}
          onDeleteSelected={handleBatchDeleteSelected}
          onExportSelectedCsv={handleBatchExportCsv}
          onCheckStatusSelected={handleBatchCheckStatus}
          isCheckingStatus={isCheckingStatus}
          checkingProgress={checkingProgress}
          availableTags={Array.from(new Set(items.map(i => i.tag).filter(Boolean))) as string[]}
        />

        {/* Main Spreadsheet Table - FULL WIDTH CARD */}
        <LinkTable
          items={filteredItems}
          totalAllItemsCount={items.length}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onUpdateStatus={handleUpdateStatus}
          onUpdateOutput={handleUpdateOutput}
          onUpdateRegion={handleUpdateRegion}
          onUpdateNote={handleUpdateNote}
          onDownloadAndMark={handleDownloadAndMark}
          onCopyLink={handleCopyLink}
          onDeleteLink={handleDeleteLink}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          settings={settings}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onResetPeriod={handleResetPeriod}
          onSetQuickPeriod={handleSetQuickPeriod}
          onSelectSpecificIds={handleSelectSpecificIds}
          isLoading={isDbLoading}
        />
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 mt-8 bg-white">
        Link Management System • Cloud Firestore Realtime Sync • Dilengkapi Ekstraktor Link Tertanam & Analisis Periode
      </footer>

      {/* Upload Excel Modal */}
      <UploadExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        existingLinks={items}
        onImportComplete={handleImportComplete}
      />

      {/* Add Manual Link Modal */}
      <AddLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingLinks={items}
        settings={settings}
        onAddLinks={handleAddLinks}
      />

      {/* Dropdown Options Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onClearAllData={handleClearAllData}
        totalLinksCount={items.length}
      />

      {/* Reset Data Modal (Pusat Reset Filter, Opsi, & Database) */}
      <ResetDataModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetFilters={handleResetFilters}
        onResetSettings={handleResetSettingsDefaults}
        onClearDatabase={handleClearEntireDatabase}
        totalLinksCount={items.length}
      />

      {/* Auth Modal (Email Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={userEmail => {
          addToast('success', `Berhasil masuk sebagai ${userEmail}!`);
        }}
      />

      {/* Extract Embedded Link Modal */}
      <ExtractLinkModal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        existingItems={items}
        onNotify={(msg, type) => addToast(type, msg)}
      />
    </div>
  );
}
