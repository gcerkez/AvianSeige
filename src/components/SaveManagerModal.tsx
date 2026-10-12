import React, { useState } from 'react';
import { SaveSlotData } from '../types/game';
import {
  X,
  FolderOpen,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Calendar,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface SaveManagerModalProps {
  slots: SaveSlotData[];
  activeSlotId: string;
  onSelectSlot: (slotId: string) => void;
  onOverwriteSlot: (slotId: string, customName?: string) => void;
  onRenameSlot: (slotId: string, newName: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onClose: () => void;
}

export const SaveManagerModal: React.FC<SaveManagerModalProps> = ({
  slots,
  activeSlotId,
  onSelectSlot,
  onOverwriteSlot,
  onRenameSlot,
  onDeleteSlot,
  onClose,
}) => {
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    type: 'overwrite' | 'delete';
    slotId: string;
    slotName: string;
  } | null>(null);

  const handleStartRename = (slot: SaveSlotData) => {
    soundManager.playClick();
    setEditingSlotId(slot.id);
    setEditingName(slot.name);
  };

  const handleSaveRename = (slotId: string) => {
    if (editingName.trim()) {
      onRenameSlot(slotId, editingName.trim());
    }
    setEditingSlotId(null);
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    soundManager.playClick();
    if (confirmModal.type === 'overwrite') {
      onOverwriteSlot(confirmModal.slotId);
    } else if (confirmModal.type === 'delete') {
      onDeleteSlot(confirmModal.slotId);
    }
    setConfirmModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-amber-400">Save Game Archives</h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {slots.map((slot) => {
            const isActive = slot.id === activeSlotId;
            const completedCount = Object.keys(slot.progression.completedLevels || {}).length;
            const rewardedCount = slot.progression.rewardedTowers?.length || 0;
            const researchCount = slot.progression.researchPurchased?.length || 0;
            const isEditing = editingSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Slot Title & Editing */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(slot.id)}
                          autoFocus
                          className="bg-stone-900 border border-amber-500/80 rounded px-2.5 py-1 text-sm font-semibold text-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveRename(slot.id)}
                          className="p-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-stone-100">{slot.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-stone-950">
                            ACTIVE
                          </span>
                        )}
                        <button
                          onClick={() => handleStartRename(slot)}
                          title="Rename Save Slot"
                          className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Stats & Metadata Preview */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 mt-2 font-mono">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Campaign: {completedCount} / 6 Cleared</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-400">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>Rewards: {rewardedCount} Pre-Upgrades</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Flame className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Research: {researchCount} Techs</span>
                      </div>
                      <div className="flex items-center gap-1 text-stone-500 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Last Played: {new Date(slot.lastPlayed).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive ? (
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          onSelectSlot(slot.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Load</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-mono font-semibold px-2 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded">
                        Currently Loaded
                      </span>
                    )}

                    {/* Overwrite New Game */}
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setConfirmModal({
                          type: 'overwrite',
                          slotId: slot.id,
                          slotName: slot.name,
                        });
                      }}
                      title="Reset or Overwrite Slot with New Game"
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setConfirmModal({
                          type: 'delete',
                          slotId: slot.id,
                          slotName: slot.name,
                        });
                      }}
                      title="Clear and Delete Save Slot"
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-400 border border-stone-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-400">
          <span>All campaign progress, rewarded towers & research automatically saved to active slot.</span>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-stone-900 border border-rose-800/80 rounded-xl p-5 max-w-sm w-full shadow-2xl text-stone-100">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Confirm {confirmModal.type === 'overwrite' ? 'New Game' : 'Delete'}</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              Are you sure you want to {confirmModal.type === 'overwrite' ? 'restart with a new game in' : 'delete'}{' '}
              <strong className="text-white font-semibold">"{confirmModal.slotName}"</strong>? This will permanently erase progress in this slot.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white shadow"
              >
                Confirm {confirmModal.type === 'overwrite' ? 'New Game' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
