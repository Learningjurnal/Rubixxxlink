import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Tag,
  ChevronDown,
  Database,
  Download,
  Upload,
  Layers,
  MapPin,
  FileText,
} from 'lucide-react';
import { AppSettings, PresetColor } from '../types';
import { DEFAULT_SETTINGS, saveSettingsToFirestore } from '../lib/firebase';
import {
  PRESET_COLORS,
  COLOR_KEYS,
  DEFAULT_STATUS_COLORS,
  DEFAULT_OUTPUT_COLORS,
  DEFAULT_REGION_COLORS,
  getOptionColor,
} from '../utils/colorHelper';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData?: () => void;
  totalLinksCount?: number;
  onExportBackup?: () => void;
  onRestoreBackup?: (file: File) => Promise<void>;
}

type ActiveTab = 'status' | 'output' | 'region' | 'note' | 'database';

/**
 * Dropdown selector for picking one of the 10 preset colors
 */
const ColorPickerDropdown: React.FC<{
  currentColor: PresetColor;
  onChangeColor: (color: PresetColor) => void;
  title?: string;
}> = ({ currentColor, onChangeColor, title = 'Pilih Warna' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [isOpen]);

  const currentDef = PRESET_COLORS[currentColor] || PRESET_COLORS.slate;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title={title}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition"
      >
        <span className={`w-3 h-3 rounded-full ${currentDef.dot} ring-1 ring-black/10 shrink-0`} />
        <span className="text-[11px] font-medium hidden sm:inline">{currentDef.name.split(' ')[0]}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 py-1 uppercase tracking-wider">
            Pilih Warna
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {COLOR_KEYS.map(key => {
              const def = PRESET_COLORS[key];
              const isSelected = key === currentColor;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChangeColor(key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${def.dot} shrink-0`} />
                    <span className="text-[11px]">{def.name}</span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
  totalLinksCount = 0,
  onExportBackup,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [statusList, setStatusList] = useState<string[]>(settings.statusOptions);
  const [outputList, setOutputList] = useState<string[]>(settings.outputOptions);
  const [regionList, setRegionList] = useState<string[]>(settings.regionOptions);
  const [noteList, setNoteList] = useState<string[]>(settings.notePresets);

  // Color mapping state
  const [statusColors, setStatusColors] = useState<Record<string, PresetColor>>(
    settings.statusColors || DEFAULT_STATUS_COLORS
  );
  const [outputColors, setOutputColors] = useState<Record<string, PresetColor>>(
    settings.outputColors || DEFAULT_OUTPUT_COLORS
  );
  const [regionColors, setRegionColors] = useState<Record<string, PresetColor>>(
    settings.regionColors || DEFAULT_REGION_COLORS
  );

  // New item inputs with selected colors
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<PresetColor>('indigo');

  const [newOutput, setNewOutput] = useState('');
  const [newOutputColor, setNewOutputColor] = useState<PresetColor>('blue');

  const [newRegion, setNewRegion] = useState('');
  const [newRegionColor, setNewRegionColor] = useState<PresetColor>('emerald');

  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if settings prop changes
  useEffect(() => {
    setStatusList(settings.statusOptions);
    setOutputList(settings.outputOptions);
    setRegionList(settings.regionOptions);
    setNoteList(settings.notePresets);
    setStatusColors(settings.statusColors || DEFAULT_STATUS_COLORS);
    setOutputColors(settings.outputColors || DEFAULT_OUTPUT_COLORS);
    setRegionColors(settings.regionColors || DEFAULT_REGION_COLORS);
  }, [settings]);

  if (!isOpen) return null;

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStatus.trim();
    if (!trimmed || statusList.includes(trimmed)) return;
    setStatusList([...statusList, trimmed]);
    setStatusColors(prev => ({ ...prev, [trimmed]: newStatusColor }));
    setNewStatus('');
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOutput.trim();
    if (!trimmed || outputList.includes(trimmed)) return;
    setOutputList([...outputList, trimmed]);
    setOutputColors(prev => ({ ...prev, [trimmed]: newOutputColor }));
    setNewOutput('');
  };

  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRegion.trim().toUpperCase();
    if (!trimmed || regionList.includes(trimmed)) return;
    setRegionList([...regionList, trimmed]);
    setRegionColors(prev => ({ ...prev, [trimmed]: newRegionColor }));
    setNewRegion('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (!trimmed || noteList.includes(trimmed)) return;
    setNoteList([...noteList, trimmed]);
    setNewNote('');
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua pilihan opsi dan warna ke pengaturan standar bawaan?')) {
      setStatusList(DEFAULT_SETTINGS.statusOptions);
      setOutputList(DEFAULT_SETTINGS.outputOptions);
      setRegionList(DEFAULT_SETTINGS.regionOptions);
      setNoteList(DEFAULT_SETTINGS.notePresets);
      setStatusColors(DEFAULT_STATUS_COLORS);
      setOutputColors(DEFAULT_OUTPUT_COLORS);
      setRegionColors(DEFAULT_REGION_COLORS);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const newConfig: AppSettings = {
      statusOptions: statusList.length > 0 ? statusList : DEFAULT_SETTINGS.statusOptions,
      outputOptions: outputList.length > 0 ? outputList : DEFAULT_SETTINGS.outputOptions,
      regionOptions: regionList.length > 0 ? regionList : DEFAULT_SETTINGS.regionOptions,
      notePresets: noteList.length > 0 ? noteList : DEFAULT_SETTINGS.notePresets,
      statusColors,
      outputColors,
      regionColors,
    };

    try {
      await saveSettingsToFirestore(newConfig);
      onSaveSettings(newConfig);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Gagal menyimpan pengaturan ke database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="settings-modal-card"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
      >
        {/* Adaptive Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pengaturan Pilihan Opsi & Warna
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur warna & pilihan Status, Output, Region, serta Backup Database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 px-4 pt-2 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Status ({statusList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'output'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Output ({outputList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('region')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'region'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Region ({regionList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'note'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note ({noteList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database & Backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan & Warna Status
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atur teks status dan warna pill pada dropdown tabel tautan dan modal.
                </p>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddStatus} className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah status baru (contoh: Menunggu Antrean)..."
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <ColorPickerDropdown
                  currentColor={newStatusColor}
                  onChangeColor={setNewStatusColor}
                  title="Warna untuk status baru"
                />
                <button
                  type="submit"
                  disabled={!newStatus.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Item List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {statusList.map((item, idx) => {
                  const assignedColor = getOptionColor(item, statusColors, DEFAULT_STATUS_COLORS);
                  const colorDef = PRESET_COLORS[assignedColor] || PRESET_COLORS.slate;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${colorDef.dot} shrink-0 ring-1 ring-black/10`} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerDropdown
                          currentColor={assignedColor}
                          onChangeColor={col => {
                            setStatusColors(prev => ({ ...prev, [item]: col }));
                          }}
                          title={`Ubah warna ${item}`}
                        />
                        <button
                          type="button"
                          onClick={() => setStatusList(statusList.filter((_, i) => i !== idx))}
                          title="Hapus opsi status ini"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Output Tab */}
          {activeTab === 'output' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan & Warna Output
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tipe output pengunduhan (Single, Batch, Folder, Mirror, dll.) beserta badge warnanya.
                </p>
              </div>

              <form onSubmit={handleAddOutput} className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah output baru (contoh: Multi-Part)..."
                  value={newOutput}
                  onChange={e => setNewOutput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <ColorPickerDropdown
                  currentColor={newOutputColor}
                  onChangeColor={setNewOutputColor}
                  title="Warna untuk output baru"
                />
                <button
                  type="submit"
                  disabled={!newOutput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {outputList.map((item, idx) => {
                  const assignedColor = getOptionColor(item, outputColors, DEFAULT_OUTPUT_COLORS);
                  const colorDef = PRESET_COLORS[assignedColor] || PRESET_COLORS.indigo;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${colorDef.dot} shrink-0 ring-1 ring-black/10`} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerDropdown
                          currentColor={assignedColor}
                          onChangeColor={col => {
                            setOutputColors(prev => ({ ...prev, [item]: col }));
                          }}
                          title={`Ubah warna ${item}`}
                        />
                        <button
                          type="button"
                          onClick={() => setOutputList(outputList.filter((_, i) => i !== idx))}
                          title="Hapus opsi output ini"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Region Tab */}
          {activeTab === 'region' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan & Warna Region
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Label wilayah server (LIVE, ASIA, US, EU, ID, GLOBAL, dll.) beserta badge warnanya.
                </p>
              </div>

              <form onSubmit={handleAddRegion} className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah kode region (contoh: SG, JPN, LIVE)..."
                  value={newRegion}
                  onChange={e => setNewRegion(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition uppercase"
                />
                <ColorPickerDropdown
                  currentColor={newRegionColor}
                  onChangeColor={setNewRegionColor}
                  title="Warna untuk region baru"
                />
                <button
                  type="submit"
                  disabled={!newRegion.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {regionList.map((item, idx) => {
                  const assignedColor = getOptionColor(item, regionColors, DEFAULT_REGION_COLORS);
                  const colorDef = PRESET_COLORS[assignedColor] || PRESET_COLORS.emerald;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${colorDef.dot} shrink-0 ring-1 ring-black/10`} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerDropdown
                          currentColor={assignedColor}
                          onChangeColor={col => {
                            setRegionColors(prev => ({ ...prev, [item]: col }));
                          }}
                          title={`Ubah warna ${item}`}
                        />
                        <button
                          type="button"
                          onClick={() => setRegionList(regionList.filter((_, i) => i !== idx))}
                          title="Hapus opsi region ini"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Tab */}
          {activeTab === 'note' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan Note (Preset Catatan Cepat)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preset catatan cepat yang dapat dipilih pengguna saat mengisi kolom Note.
                </p>
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah preset catatan (contoh: Link Kadaluarsa)..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {noteList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                    <button
                      type="button"
                      onClick={() => setNoteList(noteList.filter((_, i) => i !== idx))}
                      title="Hapus preset ini"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database & Optimization Tab */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Pengelolaan & Optimasi Database
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rubixxxlink menggunakan sistem multi-layer (IndexedDB Local Storage berkecepatan tinggi + Cloud Firestore) yang mampu menampung puluhan ribu link tanpa lag dan tanpa batas kuota.
                </p>
              </div>

              {/* Status Info Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Tautan Aktif:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                    {totalLinksCount.toLocaleString('id-ID')} link
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Penyimpanan IndexedDB:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif (High Capacity Storage)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Sinkronisasi Cloud:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Google Cloud Firestore Realtime
                  </span>
                </div>
              </div>

              {/* Backup & Restore Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Download Backup */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/40 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs mb-1">
                      <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Cadangkan Data (JSON)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Unduh snapshot cadangan seluruh data link ({totalLinksCount.toLocaleString('id-ID')} tautan) beserta seluruh opsi warna dan pengaturan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup JSON</span>
                  </button>
                </div>

                {/* Restore Backup */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/40 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs mb-1">
                      <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Pulihkan Data (JSON)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Impor kembali tautan dan konfigurasi dari berkas backup JSON yang telah dicadangkan sebelumnya.
                    </p>
                  </div>
                  <label className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Berkas JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file && onRestoreBackup) {
                          onRestoreBackup(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone: Clear all database records */}
              {onClearAllData && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Kosongkan Semua Data Link</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300">
                        Menghapus seluruh tautan yang tersimpan di IndexedDB & Cloud Firestore ({totalLinksCount} data aktif).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearAllData}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan di Cloud</span>
                </>
              ) : saving ? (
                <span>Menyimpan...</span>
              ) : (
                <span>Simpan Pengaturan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
