import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Copy,
  Trash2,
  Tag,
  Check,
  X,
  SearchCheck,
  Loader2,
} from 'lucide-react';
import { LinkStatus } from '../types';

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onUpdateStatus: (status: LinkStatus) => void;
  onApplyTag: (tag: string) => void;
  onOpenSelected: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  onCheckStatusSelected?: () => void;
  isCheckingStatus?: boolean;
  checkingProgress?: { current: number; total: number } | null;
  availableTags?: string[];
}

const DEFAULT_PRESET_TAGS = ['Penting', 'Prioritas', 'Video', 'Dokumen', 'Arsip', 'Review'];

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onUpdateStatus,
  onApplyTag,
  onOpenSelected,
  onCopySelected,
  onDeleteSelected,
  onCheckStatusSelected,
  isCheckingStatus = false,
  checkingProgress = null,
  availableTags = [],
}) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close tag popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTagPopoverOpen(false);
      }
    }
    if (isTagPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagPopoverOpen]);

  if (selectedCount === 0) return null;

  const handleApply = (tagToApply: string) => {
    onApplyTag(tagToApply.trim());
    setCustomTagInput('');
    setIsTagPopoverOpen(false);
  };

  // Combine default presets with existing tags without duplicates
  const combinedTags = Array.from(
    new Set([...availableTags.filter(Boolean), ...DEFAULT_PRESET_TAGS])
  ).slice(0, 10);

  return (
    <div
      id="batch-actions-floating-bar"
      className="sticky top-20 z-30 mb-5 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2">
        <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">
          {selectedCount}
        </span>
        <span className="text-xs text-slate-200 font-medium">Link Terpilih</span>
        <button
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white text-xs underline ml-2 cursor-pointer"
        >
          Batal Pilih
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 relative">
        {/* Check Status (Ping 404) Button */}
        {onCheckStatusSelected && (
          <button
            type="button"
            id="btn-batch-check-status"
            onClick={onCheckStatusSelected}
            disabled={isCheckingStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white transition shadow-xs cursor-pointer ${
              isCheckingStatus
                ? 'bg-amber-600/80 cursor-wait'
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
            title="Ping URL terpilih di latar belakang dan tandai tautan yang 404 Not Found"
          >
            {isCheckingStatus ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-100" />
            ) : (
              <SearchCheck className="w-3.5 h-3.5 text-amber-200" />
            )}
            <span>
              {isCheckingStatus && checkingProgress
                ? `Mengecek (${checkingProgress.current}/${checkingProgress.total})...`
                : 'Cek Status (Ping 404)'}
            </span>
          </button>
        )}

        {/* Tandai Sudah Terunduh */}
        <button
          type="button"
          id="btn-batch-mark-downloaded"
          onClick={() => onUpdateStatus('Sudah Terunduh')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tandai Sudah Terunduh</span>
        </button>

        {/* Tandai Blank / Belum */}
        <button
          type="button"
          id="btn-batch-mark-blank"
          onClick={() => onUpdateStatus('Blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Tandai Blank</span>
        </button>

        {/* Custom Tag / Category Popover Button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            id="btn-batch-tag-toggle"
            onClick={() => setIsTagPopoverOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer ${
              isTagPopoverOpen
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Terapkan Tag</span>
          </button>

          {/* Tag Popover Dropdown */}
          {isTagPopoverOpen && (
            <div
              id="batch-tag-popover"
              className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Terapkan Tag ({selectedCount} Link)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagPopoverOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Custom Input */}
              <div className="space-y-2 mb-3">
                <label className="text-[11px] font-medium text-slate-400">Nama Tag Kustom:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="batch-custom-tag-input"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customTagInput.trim()) {
                        handleApply(customTagInput);
                      }
                    }}
                    placeholder="Misal: Video, Dokumen, Top..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    id="btn-apply-custom-tag-submit"
                    onClick={() => customTagInput.trim() && handleApply(customTagInput)}
                    disabled={!customTagInput.trim()}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
                    title="Terapkan Tag ke link terpilih"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Tags */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[11px] text-slate-400 block">Pilih Cepat Tag:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {combinedTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApply(tag)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/80 transition cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option to clear tag */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  id="btn-batch-clear-tag"
                  onClick={() => handleApply('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                >
                  Hapus Tag dari Terpilih
                </button>
                <span className="text-[10px] text-slate-500">1-Klik Terapkan</span>
              </div>
            </div>
          )}
        </div>

        {/* Buka Tautan */}
        <button
          type="button"
          id="btn-batch-open-links"
          onClick={onOpenSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Buka di Tab</span>
        </button>

        {/* Salin Tautan */}
        <button
          type="button"
          id="btn-batch-copy-links"
          onClick={onCopySelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Link</span>
        </button>

        {/* Hapus */}
        <button
          type="button"
          id="btn-batch-delete-links"
          onClick={onDeleteSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/60 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
};
