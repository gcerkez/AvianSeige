import React from 'react';
import { DailyMission } from '../types/game';
import {
  X,
  Calendar,
  CheckCircle2,
  Award,
  Nut,
  Sparkles,
  Target,
  Clock,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface DailyMissionsModalProps {
  missions: DailyMission[];
  todayDate: string;
  advancedTokens: number;
  onClaimReward: (missionId: string) => void;
  onClose: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  missions,
  todayDate,
  advancedTokens,
  onClaimReward,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl text-stone-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold text-amber-400">Daily Flight Directives</h2>
              <p className="text-xs text-stone-400 font-mono">Date: {todayDate} · Resets Daily</p>
            </div>
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

        {/* Currency summary */}
        <div className="px-6 py-3 bg-stone-950/40 border-b border-stone-800 flex items-center justify-between text-xs font-mono">
          <span className="text-stone-400">Earn Astral Tokens for permanent advanced research:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/70 border border-purple-800/80 rounded-lg text-purple-300 font-bold">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Astral Tokens: {advancedTokens}</span>
          </div>
        </div>

        {/* Missions list */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {missions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));

            return (
              <div
                key={mission.id}
                className={`p-4 rounded-xl border transition-all ${
                  mission.claimed
                    ? 'bg-stone-950/40 border-stone-800/60 opacity-60'
                    : mission.completed
                    ? 'bg-emerald-950/30 border-emerald-500/70 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-stone-950/70 border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm text-stone-100">{mission.title}</span>
                      {mission.claimed && (
                        <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                          CLAIMED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">{mission.description}</p>
                  </div>

                  {/* Reward badges */}
                  <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-stone-900 border border-stone-700 rounded text-emerald-400">
                      <Nut className="w-3.5 h-3.5 text-emerald-500" />
                      <span>+{mission.rewardAcorns}</span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-950 border border-purple-800 rounded text-purple-300 font-bold">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      <span>+{mission.rewardAdvancedTokens}</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar and claim button */}
                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {mission.currentCount} / {mission.targetCount} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          mission.completed ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim button */}
                  {mission.completed && !mission.claimed && (
                    <button
                      onClick={() => {
                        soundManager.playVictory();
                        onClaimReward(mission.id);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md animate-pulse shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-stone-950" />
                      <span>Claim Reward</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>New objectives generated each calendar day.</span>
          </div>
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
    </div>
  );
};
