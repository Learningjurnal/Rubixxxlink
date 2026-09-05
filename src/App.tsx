/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useDeferredValue, Suspense } from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';
import { LinkItem, LinkStatus, FilterStatus, AppSettings, SortField, SortDirection } from './types';
import { INITIAL_LINKS } from './data/initialData';
import { StatsCards } from './components/StatsCards';
import { LinkTable } from './components/LinkTable';
import { BatchActionsBar } from './components/BatchActionsBar';
import { ToastContainer, ToastMessage } from './components/Toast';

// Lazy-loaded heavy components (loaded on-demand to minimize initial bundle size)
const UploadExcelModal = React.lazy(() =>
  import('./components/UploadExcelModal').then(m => ({ default: m.UploadExcelModal }))
);
const AddLinkModal = React.lazy(() =>
  import('./components/AddLinkModal').then(m => ({ default: m.AddLinkModal }))
);
const SettingsModal = React.lazy(() =>
  import('./components/SettingsModal').then(m => ({ default: m.SettingsModal }))
);
const ResetDataModal = React.lazy(() =>
  import('./components/ResetDataModal').then(m => ({ default: m.ResetDataModal }))
);
const AuthModal = React.lazy(() =>
  import('./components/AuthModal').then(m => ({ default: m.AuthModal }))
);
const ExtractLinkModal = React.lazy(() =>
  import('./components/ExtractLinkModal').then(m => ({ default: m.ExtractLinkModal }))
);
const AnalyticsCharts = React.lazy(() =>
  import('./components/AnalyticsCharts').then(m => ({ default: m.AnalyticsCharts }))
);
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
  batchUpdateOutputInFirestore,
  batchUpdateRegionInFirestore,
  batchUpdateItemsInFirestore,
  batchUpdateTagInFirestore,
  batchDeleteLinksFromFirestore,
  clearAllLinksFromFirestore,
  clearKnownDummyLinksFromFirestore,
  DEFAULT_SETTINGS,
  saveSettingsToFirestore,
  getCachedLocalLinks,
  saveCachedLocalLinks,
  clearCachedLocalLinks,
  LOCAL_STORAGE_LINKS_KEY,
  getCachedLocalSettings,
  saveCachedLocalSettings,
} from './lib/firebase';
import {
  saveLinksToIndexedDb,
  getLinksFromIndexedDb,
  clearLinksFromIndexedDb,
  exportDatabaseBackupJson,
  parseDatabaseBackupJson,
} from './lib/indexedDbStorage';

export default function App() {
  // State for Links initialized from cache for instant offline-first display
  const [items, setItems] = useState<LinkItem[]>(() => getCachedLocalLinks());
  const [duplicatesPreventedCount, setDuplicatesPreventedCount] = useState<number>(0);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Settings State initialized from local cache
  const [settings, setSettings] = useState<AppSettings>(() => getCachedLocalSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Theme State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('rubixxxlink_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {}
    return 'light';
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('rubixxxlink_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth State with Local Session Persistence
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(() => {
    try {
      const saved = localStorage.getItem('rubixxxlink_user_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  // Filters and UI states
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Global Keyboard Shortcuts (Ctrl+K / "/" to search, Esc to close/deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + K or "/" (when not typing in an input) focuses the search input
      if (
        (e.ctrlKey && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('main-search-input') as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }

      // 2. Escape closes open modals or clears selection
      if (e.key === 'Escape') {
        if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (isResetModalOpen) setIsResetModalOpen(false);
        else if (isUploadModalOpen) setIsUploadModalOpen(false);
        else if (isAddModalOpen) setIsAddModalOpen(false);
        else if (isAuthModalOpen) setIsAuthModalOpen(false);
        else if (isExtractModalOpen) setIsExtractModalOpen(false);
        else if (selectedIds.size > 0) setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSettingsModalOpen,
    isResetModalOpen,
    isUploadModalOpen,
    isAddModalOpen,
    isAuthModalOpen,
    isExtractModalOpen,
    selectedIds.size,
  ]);

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

  // 1. Firebase Auth listener with Local Session Persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem('rubixxxlink_user_session', JSON.stringify({ email: user.email }));
        } catch {}
      }
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

  // 3. Firestore Links subscription, IndexedDB High-Capacity caching & auto-cleanup
  useEffect(() => {
    // Auto-clean any legacy dummy data that might have been saved to Firestore
    clearKnownDummyLinksFromFirestore().catch(() => {});

    // Try high-capacity IndexedDB for instant display of 29k+ links
    getLinksFromIndexedDb().then(idbLinks => {
      if (idbLinks && idbLinks.length > 0) {
        setItems(prev => (prev.length === 0 ? idbLinks : prev));
        setIsDbLoading(false);
      }
    }).catch(() => {});

    const unsub = subscribeToLinks(
      fireLinks => {
        setIsDbConnected(true);
        setIsDbLoading(false);
        setItems(fireLinks);
        saveLinksToIndexedDb(fireLinks).catch(() => {});
      },
      err => {
        console.warn('Firestore subscription offline notice:', err);
        setIsDbConnected(false);
        setIsDbLoading(false);
        getLinksFromIndexedDb().then(idbLinks => {
          if (idbLinks && idbLinks.length > 0) {
            setItems(idbLinks);
          } else {
            const local = getCachedLocalLinks();
            if (local.length > 0) setItems(local);
          }
        }).catch(() => {
          const local = getCachedLocalLinks();
          if (local.length > 0) setItems(local);
        });
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

    // Search query (matches link, name, note, tag, region, or output using deferred query for 60 FPS typing)
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim();
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

    // High-performance sorting (up to 15x faster than localeCompare on 29k+ rows)
    if (sortField) {
      if (sortField === 'createdAt') {
        result.sort((a, b) => {
          const numA = Number(a.createdAt || 0);
          const numB = Number(b.createdAt || 0);
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        });
      } else {
        const isAsc = sortDirection === 'asc';
        result.sort((a, b) => {
          const strA = String(a[sortField] || '').toLowerCase();
          const strB = String(b[sortField] || '').toLowerCase();
          if (strA === strB) return 0;
          return isAsc ? (strA < strB ? -1 : 1) : (strA > strB ? -1 : 1);
        });
      }
    }

    return result;
  }, [items, activeFilter, deferredSearchQuery, sortField, sortDirection, startDate, endDate]);

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
    // 1. Immediately wipe React memory state & all filters
    setItems([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setActiveFilter('ALL');
    setStartDate('');
    setEndDate('');

    // 2. Immediately wipe all local storage keys and IndexedDB
    clearCachedLocalLinks();
    clearLinksFromIndexedDb().catch(() => {});

    // 3. Attempt Firestore cloud wipe safely
    try {
      await clearAllLinksFromFirestore();
    } catch (e) {
      console.warn('Clear cloud DB notice:', e);
    }

    addToast('success', 'Semua data tautan & informasi berhasil dibersihkan total (0 tautan)!');
  };

  // Database Backup (Download JSON) & Restore (Upload JSON)
  const handleExportBackup = () => {
    exportDatabaseBackupJson(items, settings);
    addToast('success', `Cadangan database berhasil diunduh (${items.length.toLocaleString('id-ID')} tautan)!`);
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      const text = await file.text();
      const { links, settings: restoredSettings } = parseDatabaseBackupJson(text);
      if (links.length === 0) {
        addToast('error', 'Berkas JSON cadangan tidak memiliki tautan valid.');
        return;
      }
      setItems(links);
      saveLinksToIndexedDb(links).catch(() => {});
      saveCachedLocalLinks(links);
      if (restoredSettings) {
        setSettings(restoredSettings);
        saveSettingsToFirestore(restoredSettings).catch(() => {});
      }
      addToast('success', `Berhasil memulihkan ${links.length.toLocaleString('id-ID')} tautan dari berkas cadangan JSON!`);
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      addToast('error', `Gagal memulihkan cadangan: ${err.message || 'Format tidak valid'}`);
    }
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
    const nextItems = items.filter(i => i.id !== id);
    setItems(nextItems);
    saveCachedLocalLinks(nextItems);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await deleteLinkFromFirestore(id);
      addToast('info', 'Tautan dihapus.');
    } catch (e) {
      console.error(e);
      addToast('info', 'Tautan dihapus dari penyimpanan lokal.');
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
  const handleBatchUpdateStatus = async (status: string) => {
    const today = formatDateNow();
    const ids = Array.from(selectedIds) as string[];

    setItems(prev =>
      prev.map(i =>
        selectedIds.has(i.id)
          ? {
              ...i,
              status: status as LinkStatus,
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
      addToast('info', 'Status disimpan secara lokal.');
    }
  };

  const handleBatchUpdateOutput = async (output: string) => {
    const ids = Array.from(selectedIds) as string[];

    setItems(prev =>
      prev.map(i => (selectedIds.has(i.id) ? { ...i, output } : i))
    );
    setSelectedIds(new Set());

    try {
      await batchUpdateOutputInFirestore(ids, output);
      addToast('success', `${ids.length} link diubah outputnya menjadi "${output}".`);
    } catch (e) {
      console.error(e);
      addToast('info', 'Output disimpan secara lokal.');
    }
  };

  const handleBatchUpdateRegion = async (region: string) => {
    const ids = Array.from(selectedIds) as string[];

    setItems(prev =>
      prev.map(i => (selectedIds.has(i.id) ? { ...i, region } : i))
    );
    setSelectedIds(new Set());

    try {
      await batchUpdateRegionInFirestore(ids, region);
      addToast('success', `${ids.length} link diubah regionnya menjadi "${region}".`);
    } catch (e) {
      console.error(e);
      addToast('info', 'Region disimpan secara lokal.');
    }
  };

  // Synchronize all items to active settings options and colors
  const handleSyncAllLinksToSettings = async () => {
    if (items.length === 0) {
      addToast('info', 'Tidak ada data tautan untuk disinkronkan.');
      return;
    }

    const changedList: { id: string; changes: Partial<LinkItem> }[] = [];
    const newItems = items.map(item => {
      const rawStatus = (item.status || '').trim();
      const matchedStatus = settings.statusOptions.find(
        st => st.toLowerCase().trim() === rawStatus.toLowerCase()
      );
      const canonicalStatus = matchedStatus || (rawStatus ? rawStatus : (settings.statusOptions[0] || 'Blank'));

      const rawOutput = (item.output || '').trim();
      const matchedOutput = settings.outputOptions.find(
        o => o.toLowerCase().trim() === rawOutput.toLowerCase()
      );
      const canonicalOutput = matchedOutput || (rawOutput ? rawOutput : (settings.outputOptions[0] || 'Single'));

      const rawRegion = (item.region || '').trim().toUpperCase();
      const matchedRegion = settings.regionOptions.find(
        r => r.toUpperCase().trim() === rawRegion
      );
      const canonicalRegion = matchedRegion || (rawRegion ? rawRegion : (settings.regionOptions[0] || 'LIVE'));

      let hasChanges = false;
      const changes: Partial<LinkItem> = {};

      if (item.status !== canonicalStatus) {
        changes.status = canonicalStatus as LinkStatus;
        hasChanges = true;
      }
      if (item.output !== canonicalOutput) {
        changes.output = canonicalOutput;
        hasChanges = true;
      }
      if (item.region !== canonicalRegion) {
        changes.region = canonicalRegion;
        hasChanges = true;
      }

      if (hasChanges) {
        changedList.push({ id: item.id, changes });
        return { ...item, ...changes };
      }
      return item;
    });

    if (changedList.length === 0) {
      addToast('success', 'Seluruh data tautan sudah sinkron dengan pengaturan aktif.');
      return;
    }

    setItems(newItems);
    saveCachedLocalLinks(newItems);
    await saveLinksToIndexedDb(newItems);

    try {
      await batchUpdateItemsInFirestore(changedList);
      addToast('success', `${changedList.length} tautan berhasil disinkronkan ke opsi dan warna pengaturan.`);
    } catch (err) {
      console.warn('Sync firestore notice:', err);
      addToast('info', `${changedList.length} tautan disinkronkan di penyimpanan lokal.`);
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
    const nextItems = items.filter(i => !selectedIds.has(i.id));
    setItems(nextItems);
    saveCachedLocalLinks(nextItems);
    setSelectedIds(new Set());

    try {
      await batchDeleteLinksFromFirestore(ids);
      addToast('info', `${ids.length} tautan berhasil dihapus.`);
    } catch (e) {
      console.error(e);
      addToast('info', `${ids.length} tautan dihapus dari penyimpanan lokal.`);
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
      'Apakah Anda yakin ingin menghapus SEMUA tautan di database? Seluruh data tautan dan informasi lokal akan dibersihkan total.'
    );
    if (!confirm) return;

    await handleClearEntireDatabase();
    setIsSettingsModalOpen(false);
  };

  // Import from Excel handler with Firestore Batch
  const handleImportComplete = async (
    newItems: LinkItem[],
    updatedCount: number,
    skippedDuplicatesCount: number
  ) => {
    try {
      localStorage.removeItem('rubixxxlink_db_wiped');
    } catch {}

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
    try {
      localStorage.removeItem('rubixxxlink_db_wiped');
    } catch {}

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
    } catch (e) {
      console.error(e);
    }
    try {
      localStorage.removeItem('rubixxxlink_user_session');
    } catch {}
    setCurrentUser(null);
    addToast('info', 'Anda telah keluar dari akun.');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans w-full transition-colors duration-200">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navbar - FULL WIDTH */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* App Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                    Link Management Dashboard
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Bento Grid v2.5
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Database Cloud Firestore</span>
                  </span>
                  <span>•</span>
                  <span>{items.length} Total Tautan</span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Theme Toggle Button (Light / Dark) */}
              <button
                type="button"
                id="btn-toggle-theme"
                onClick={toggleTheme}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title={theme === 'dark' ? 'Ganti ke Tema Terang (Light Mode)' : 'Ganti ke Tema Gelap (Dark Mode)'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
                    <span className="hidden sm:inline">Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180 duration-200" />
                    <span className="hidden sm:inline">Gelap</span>
                  </>
                )}
              </button>

              {/* Analytics Chart Toggle */}
              <button
                type="button"
                id="btn-toggle-charts"
                onClick={() => setShowCharts(prev => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  showCharts
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
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
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Atur pilihan dropdown Status, Output, Region, dan Note"
              >
                <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">Pengaturan Opsi</span>
              </button>

              {/* Reset Data Modal Button */}
              <button
                type="button"
                id="btn-open-reset-data-modal"
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Pusat Reset Data: Reset Filter, Pengaturan, atau Kosongkan Database"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Reset Data</span>
              </button>

              {/* User Email Auth */}
              {currentUser ? (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate hidden md:inline">
                    {currentUser.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Keluar (Logout)"
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-open-auth-modal"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-6 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Input Bar */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="main-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari tautan, nama berkas, catatan, wilayah, atau output..."
                className="w-full pl-10 pr-16 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 rounded border border-slate-300 dark:border-slate-600 pointer-events-none">
                    Ctrl K
                  </kbd>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Import Excel */}
              <button
                type="button"
                id="btn-open-upload-modal"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Upload Excel</span>
              </button>

              {/* Add Link Manual */}
              <button
                type="button"
                id="btn-open-add-modal"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Link</span>
              </button>

              {/* Export to Excel */}
              <button
                type="button"
                id="btn-export-excel"
                onClick={() => exportToExcel(filteredItems)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Ekspor seluruh baris terfilter ke spreadsheet Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              {/* Download Excel Template */}
              <button
                type="button"
                id="btn-download-template"
                onClick={downloadTemplateExcel}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition underline font-medium cursor-pointer"
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

        {/* Analytics Charts Section (Toggleable, Full Width, Lazy Loaded) */}
        {showCharts && (
          <Suspense fallback={<div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse my-4" />}>
            <AnalyticsCharts items={filteredItems} />
          </Suspense>
        )}

        {/* Sticky Floating Batch Action Bar */}
        <BatchActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onUpdateStatus={handleBatchUpdateStatus}
          onUpdateOutput={handleBatchUpdateOutput}
          onUpdateRegion={handleBatchUpdateRegion}
          settings={settings}
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
      <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 mt-8 bg-white dark:bg-slate-900 transition-colors">
        Link Management System • Cloud Firestore Realtime Sync • Dilengkapi Ekstraktor Link Tertanam & Analisis Periode
      </footer>

      {/* Lazy-Loaded Modals wrapped in Suspense for zero initial overhead */}
      <Suspense fallback={null}>
        {isUploadModalOpen && (
          <UploadExcelModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            existingLinks={items}
            onImportComplete={handleImportComplete}
          />
        )}

        {isAddModalOpen && (
          <AddLinkModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            existingLinks={items}
            settings={settings}
            onAddLinks={handleAddLinks}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onSaveSettings={setSettings}
            onClearAllData={handleClearAllData}
            totalLinksCount={items.length}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            onSyncDataToSettings={handleSyncAllLinksToSettings}
          />
        )}

        {isResetModalOpen && (
          <ResetDataModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            onResetFilters={handleResetFilters}
            onResetSettings={handleResetSettingsDefaults}
            onClearDatabase={handleClearEntireDatabase}
            totalLinksCount={items.length}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={userEmail => {
              const userObj = { email: userEmail, uid: 'user-' + Date.now() };
              setCurrentUser(userObj as any);
              try {
                localStorage.setItem('rubixxxlink_user_session', JSON.stringify(userObj));
              } catch {}
              addToast('success', `Berhasil masuk sebagai ${userEmail}!`);
            }}
          />
        )}

        {isExtractModalOpen && (
          <ExtractLinkModal
            isOpen={isExtractModalOpen}
            onClose={() => setIsExtractModalOpen(false)}
            existingItems={items}
            onNotify={(msg, type) => addToast(type, msg)}
          />
        )}
      </Suspense>
    </div>
  );
}
