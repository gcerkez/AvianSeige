import React from 'react';
import { RewardedTowerLoadout } from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { Trophy, Sparkles, Feather, Crosshair, ArrowRight, Shield, Award } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface RewardClaimModalProps {
  reward: RewardedTowerLoadout;
  onClaim: () => void;
  onDeployNow?: () => void;
}

export const RewardClaimModal: React.FC<RewardClaimModalProps> = ({ reward, onClaim, onDeployNow }) => {
  const def = TOWERS_DATA[reward.typeId];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/80 rounded-2xl w-full max-w-md text-stone-100 shadow-2xl p-6 relative overflow-hidden flex flex-col items-center text-center ring-1 ring-amber-500/40">
        {/* Glow decoration */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: def?.accentColor || '#F59E0B' }}
        />

        {/* Milestone badge */}
        <div className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 mb-3 shadow">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{reward.earnedFrom.toUpperCase()}</span>
        </div>

        <h2 className="text-xl font-extrabold text-white mb-1">New Pre-Upgraded Defender Earned!</h2>
        <p className="text-xs text-stone-400 mb-5">
          This specialized loadout has been added to your deployable collection.
        </p>

        {/* Reward card presentation */}
        <div className="w-full bg-stone-950/80 border border-stone-800 rounded-xl p-4 mb-5 text-left shadow-inner">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-stone-950 shadow-md shrink-0"
              style={{ backgroundColor: def?.accentColor || '#F59E0B' }}
            >
              {def?.name.charAt(0) || 'A'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-amber-400">{reward.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 border border-purple-800 text-purple-300">
                  {reward.tierLabel}
                </span>
              </div>
              <p className="text-xs text-stone-300">{def?.title}</p>
            </div>
          </div>

          {/* Tier allocation display */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono mb-3">
            <div className="bg-stone-900 border border-stone-800 rounded p-1.5">
              <div className="text-[10px] text-stone-500">Path A</div>
              <div className="font-bold text-stone-200">Tier {reward.tiers.path_a}</div>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded p-1.5">
              <div className="text-[10px] text-stone-500">Path B</div>
              <div className="font-bold text-stone-200">Tier {reward.tiers.path_b}</div>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded p-1.5">
              <div className="text-[10px] text-stone-500">Path C</div>
              <div className="font-bold text-stone-200">Tier {reward.tiers.path_c}</div>
            </div>
          </div>

          {/* Bonus stats */}
          {reward.bonusStatsDescription && (
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/60 rounded px-2.5 py-1.5">
              {reward.bonusStatsDescription}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onClaim();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 shadow flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            Claim Loadout
          </button>
          {onDeployNow && (
            <button
              onClick={() => {
                soundManager.playClick();
                onDeployNow();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
            >
              <span>Deploy Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
