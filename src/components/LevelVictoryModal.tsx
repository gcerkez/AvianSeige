import React from 'react';
import { Star, Feather, Nut, Sparkles, RotateCcw, Map, ArrowRight, Flame } from 'lucide-react';
import { LevelDefinition } from '../types/game';

interface LevelVictoryModalProps {
  isVictory: boolean;
  level: LevelDefinition;
  livesRemaining: number;
  initialLives: number;
  pigsCrushed: number;
  structuresDestroyed: number;
  combosTriggered: number;
  totalPigsDefeated: number;
  feathersEarned: number;
  acornsEarned: number;
  shardsEarned: number;
  onReplay: () => void;
  onNextLevel?: () => void;
  onReturnToMap: () => void;
  onEnterEndless?: () => void;
}

export const LevelVictoryModal: React.FC<LevelVictoryModalProps> = ({
  isVictory,
  level,
  livesRemaining,
  initialLives: _initialLives,
  pigsCrushed,
  structuresDestroyed,
  combosTriggered,
  totalPigsDefeated,
  feathersEarned,
  acornsEarned,
  shardsEarned,
  onReplay,
  onNextLevel,
  onReturnToMap,
  onEnterEndless,
}) => {
  // Stars calculation
  let stars = 0;
  if (isVictory) {
    stars = 1;
    if (livesRemaining >= 15) stars++;
    if (pigsCrushed >= 3 || structuresDestroyed >= 2) stars++;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 text-stone-200 shadow-2xl text-center">
        {/* Title */}
        <div className="mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
            {level.name} · {level.milestoneWaveCount || 40} Waves Cleared
          </span>
          <h2
            className={`text-2xl font-black tracking-tight mt-1 ${
              isVictory ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {isVictory ? 'VICTORY: BASTION DEFENDED' : 'NEST BREACHED'}
          </h2>
        </div>

        {/* Stars */}
        {isVictory && (
          <div className="flex items-center justify-center gap-2 my-4">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-8 h-8 ${
                  starIdx <= stars
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                    : 'text-stone-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Rewards earned */}
        {isVictory && (
          <div className="flex items-center justify-center gap-4 my-4 p-3 bg-stone-950/70 border border-stone-800 rounded-xl text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Feather className="w-4 h-4" />
              <span className="font-bold">+{feathersEarned}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Nut className="w-4 h-4" />
              <span className="font-bold">+{acornsEarned}</span>
            </div>
            {shardsEarned > 0 && (
              <div className="flex items-center gap-1.5 text-sky-400">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold">+{shardsEarned}</span>
              </div>
            )}
          </div>
        )}

        {/* Combat & Destruction Statistics */}
        <div className="my-4 p-3 bg-stone-950/50 rounded-xl border border-stone-800/80 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span>Pigs Defeated</span>
            <span className="font-mono text-stone-200">{totalPigsDefeated}</span>
          </div>
          <div className="flex items-center justify-between text-stone-400">
            <span>Pigs Crushed by Debris</span>
            <span className="font-mono text-amber-400 font-bold">{pigsCrushed}</span>
          </div>
          <div className="flex items-center justify-between text-stone-400">
            <span>Structures Collapsed</span>
            <span className="font-mono text-stone-200">{structuresDestroyed}</span>
          </div>
          <div className="flex items-center justify-between text-stone-400">
            <span>Elemental Combos Triggered</span>
            <span className="font-mono text-sky-400">{combosTriggered}</span>
          </div>
          <div className="flex items-center justify-between text-stone-400">
            <span>Nest Lives Remaining</span>
            <span className="font-mono text-emerald-400">{livesRemaining}</span>
          </div>
        </div>

        {/* Endless Mode Banner if Victory */}
        {isVictory && onEnterEndless && (
          <div className="my-3 p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-center justify-between text-left text-xs">
            <div>
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Continue in Endless Siege?</span>
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                Survive infinite scaling waves 41, 42, 60, 100+!
              </div>
            </div>
            <button
              onClick={onEnterEndless}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              Play Endless
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onReplay}
            className="flex-1 py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
          <button
            onClick={onReturnToMap}
            className="flex-1 py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          {isVictory && onNextLevel && (
            <button
              onClick={onNextLevel}
              className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
