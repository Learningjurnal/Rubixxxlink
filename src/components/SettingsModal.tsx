import React, { useState } from 'react';
import { X, Sliders, Plus, Trash2, RotateCcw, Check, Tag } from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS, saveSettingsToFirestore } from '../lib/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData?: () => void;
  totalLinksCount?: number;
}

type ActiveTab = 'status' | 'output' | 'region' | 'note';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
  totalLinksCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [statusList, setStatusList] = useState<string[]>(settings.statusOptions);
  const [outputList, setOutputList] = useState<string[]>(settings.outputOptions);
  const [regionList, setRegionList] = useState<string[]>(settings.regionOptions);
  const [noteList, setNoteList] = useState<string[]>(settings.notePresets);

  const [newStatus, setNewStatus] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if settings prop changes
  React.useEffect(() => {
    setStatusList(settings.statusOptions);
    setOutputList(settings.outputOptions);
    setRegionList(settings.regionOptions);
    setNoteList(settings.notePresets);
  }, [settings]);

  if (!isOpen) return null;

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.trim() || statusList.includes(newStatus.trim())) return;
    setStatusList([...statusList, newStatus.trim()]);
    setNewStatus('');
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutput.trim() || outputList.includes(newOutput.trim())) return;
    setOutputList([...outputList, newOutput.trim()]);
    setNewOutput('');
  };

  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegion.trim() || regionList.includes(newRegion.trim())) return;
    setRegionList([...regionList, newRegion.trim().toUpperCase()]);
    setNewRegion('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || noteList.includes(newNote.trim())) return;
    setNoteList([...noteList, newNote.trim()]);
    setNewNote('');
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua pilihan opsi ke pengaturan standar bawaan?')) {
      setStatusList(DEFAULT_SETTINGS.statusOptions);
      setOutputList(DEFAULT_SETTINGS.outputOptions);
      setRegionList(DEFAULT_SETTINGS.regionOptions);
      setNoteList(DEFAULT_SETTINGS.notePresets);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const newConfig: AppSettings = {
      statusOptions: statusList.length > 0 ? statusList : DEFAULT_SETTINGS.statusOptions,
      outputOptions: outputList.length > 0 ? outputList : DEFAULT_SETTINGS.outputOptions,
      regionOptions: regionList.length > 0 ? regionList : DEFAULT_SETTINGS.regionOptions,
      notePresets: noteList.length > 0 ? noteList : DEFAULT_SETTINGS.notePresets,
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
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pengaturan Pilihan Dropdown & Opsi
              </h3>
              <p className="text-xs text-slate-300">
                Atur pilihan Status, Output, Region, dan Note di seluruh aplikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'status'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Status ({statusList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'output'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Output ({outputList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('region')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'region'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Region ({regionList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'note'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Note ({noteList.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Kustomisasi Pilihan Status
                </h4>
                <p className="text-xs text-slate-500">
                  Status ini akan tampil di menu dropdown pada setiap baris tabel link dan modal tambah link.
                </p>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddStatus} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah status baru (contoh: Menunggu Antrean)..."
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newStatus.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Item List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {statusList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-slate-800">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusList(statusList.filter((_, i) => i !== idx))}
                      title="Hapus opsi status ini"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output Tab */}
          {activeTab === 'output' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Kustomisasi Pilihan Output
                </h4>
                <p className="text-xs text-slate-500">
                  Tipe output pengunduhan (Single, Batch, Folder, Mirror, dll.)
                </p>
              </div>

              <form onSubmit={handleAddOutput} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah output baru (contoh: Multi-Part)..."
                  value={newOutput}
                  onChange={e => setNewOutput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newOutput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {outputList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{item}</span>
                    <button
                      type="button"
                      onClick={() => setOutputList(outputList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Region Tab */}
          {activeTab === 'region' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Kustomisasi Pilihan Region
                </h4>
                <p className="text-xs text-slate-500">
                  Label wilayah server (LIVE, ASIA, US, EU, ID, GLOBAL, dll.)
                </p>
              </div>

              <form onSubmit={handleAddRegion} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah kode region (contoh: SG, JPN, LIVE)..."
                  value={newRegion}
                  onChange={e => setNewRegion(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition uppercase"
                />
                <button
                  type="submit"
                  disabled={!newRegion.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {regionList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <span className="font-bold text-slate-800">{item}</span>
                    <button
                      type="button"
                      onClick={() => setRegionList(regionList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Tab */}
          {activeTab === 'note' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Kustomisasi Pilihan Note (Preset Catatan Cepat)
                </h4>
                <p className="text-xs text-slate-500">
                  Preset catatan cepat yang dapat dipilih pengguna saat mengisi kolom Note.
                </p>
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah preset catatan (contoh: Link Kadaluarsa)..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {noteList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <span className="font-semibold text-slate-700">{item}</span>
                    <button
                      type="button"
                      onClick={() => setNoteList(noteList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone: Clear all database records */}
          {onClearAllData && (
            <div className="pt-4 border-t border-slate-200">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rose-900">Kosongkan Semua Data Link</p>
                  <p className="text-[11px] text-rose-700">
                    Menghapus seluruh tautan yang tersimpan di Firestore ({totalLinksCount} data aktif).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearAllData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-2 disabled:opacity-60"
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
