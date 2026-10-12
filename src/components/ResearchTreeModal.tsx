import React from 'react';
import { RESEARCH_NODES } from '../data/research';
import { Nut, Sparkles, Check, Lock, Wind, Flame, Hammer, Coins, Shield, Award } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface ResearchTreeModalProps {
  acorns: number;
  shards: number;
  advancedTokens?: number;
  purchasedResearch: string[];
  onUnlockResearch: (nodeId: string, acornCost: number, shardCost: number, advancedTokenCost?: number) => void;
}

export const ResearchTreeModal: React.FC<ResearchTreeModalProps> = ({
  acorns,
  shards,
  advancedTokens = 0,
  purchasedResearch,
  onUnlockResearch,
}) => {
  const categories = [
    { name: 'Avian Engineering', icon: <Wind className="w-4 h-4 text-sky-400" /> },
    { name: 'Elemental Mastery', icon: <Flame className="w-4 h-4 text-amber-400" /> },
    { name: 'Structural Physics', icon: <Hammer className="w-4 h-4 text-rose-400" /> },
    { name: 'Tactical Command', icon: <Coins className="w-4 h-4 text-emerald-400" /> },
    { name: 'Nest Fortification', icon: <Shield className="w-4 h-4 text-indigo-400" /> },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-stone-200 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-400">Research & Technology</h1>
          <p className="text-sm text-stone-400 mt-1">
            Invest Acorns, Elemental Shards, and Daily Mission Astral Tokens into permanent strategic advantages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-emerald-400">
            <Nut className="w-4 h-4 text-emerald-500" />
            <span>Acorns: {acorns}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-sky-400">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Shards: {shards}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 border border-purple-800/80 rounded-lg text-purple-300">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Astral Tokens: {advancedTokens}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const nodes = RESEARCH_NODES.filter((n) => n.category === cat.name);

          return (
            <div
              key={cat.name}
              className="bg-stone-900/80 border border-stone-800 rounded-xl p-5"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-800">
                {cat.icon}
                <h2 className="text-base font-bold text-stone-100">{cat.name}</h2>
              </div>

              <div className="space-y-3">
                {nodes.map((node) => {
                  const isUnlocked = purchasedResearch.includes(node.id);
                  const prereqsMet = node.prerequisites.every((p) => purchasedResearch.includes(p));
                  const advCost = node.advancedTokenCost || 0;
                  const canAfford =
                    acorns >= node.acornCost &&
                    shards >= node.shardCost &&
                    advancedTokens >= advCost;

                  return (
                    <div
                      key={node.id}
                      className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isUnlocked
                          ? 'bg-emerald-950/20 border-emerald-800/60 text-stone-200'
                          : prereqsMet
                          ? 'bg-stone-850 bg-stone-800/60 border-stone-700 hover:border-stone-500'
                          : 'bg-stone-950/60 border-stone-900 opacity-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-100">{node.name}</span>
                          {node.advancedTokenCost ? (
                            <span className="text-[10px] bg-purple-950 border border-purple-800 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                              ADVANCED
                            </span>
                          ) : null}
                          {isUnlocked && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                              <Check className="w-3 h-3" /> Unlocked
                            </span>
                          )}
                          {!prereqsMet && (
                            <span className="text-[10px] text-stone-500 flex items-center gap-1 font-semibold">
                              <Lock className="w-3 h-3" /> Prerequisite Required
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-1 leading-snug">
                          {node.description}
                        </div>
                      </div>

                      {/* Unlock Action */}
                      {!isUnlocked && (
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            disabled={!prereqsMet || !canAfford}
                            onClick={() => {
                              soundManager.playUpgrade();
                              onUnlockResearch(node.id, node.acornCost, node.shardCost, node.advancedTokenCost);
                            }}
                            className={`py-1.5 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              prereqsMet && canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                            }`}
                          >
                            <span>Research</span>
                            <span className="font-mono text-[11px]">
                              ({node.acornCost}A{node.shardCost > 0 ? ` + ${node.shardCost}S` : ''}{node.advancedTokenCost ? ` + ${node.advancedTokenCost}T` : ''})
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
