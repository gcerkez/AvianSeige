import React from 'react';
import { ShieldAlert, Play, Flame, Award } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface ChallengeModalProps {
  onStartChallenge: (challengeType: 'endless' | 'boss_rush' | 'demolition' | 'chaos') => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ onStartChallenge }) => {
  const challenges = [
    {
      id: 'endless' as const,
      name: 'Endless Siege',
      badge: 'ENDLESS',
      description: 'Face infinite scaling waves of mixed pig legions. Test the ultimate limits of your dual-path tower builds.',
      reward: '50 Feathers / Wave',
      icon: <Award className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'boss_rush' as const,
      name: 'Boss Rush: Colossus Gauntlet',
      badge: 'BOSSES',
      description: 'Consecutive back-to-back showdowns with The Iron Boar, Frost Hog, and Storm King. Use physics collapses to crack their defenses!',
      reward: '500 Feathers + 50 Acorns',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 'demolition' as const,
      name: 'Demolition Master',
      badge: 'PHYSICS',
      description: 'Structural collapse damage is multiplied by 3.5x. Direct tower damage is reduced by 50%. You MUST engineer collapses to win!',
      reward: '250 Feathers + 25 Shards',
      icon: <Flame className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'chaos' as const,
      name: 'Chaos Physics',
      badge: 'MODIFIER',
      description: 'Unpredictable kinetic recoil! Collapsing stones bounce wildly, and projectiles ricochet off walls.',
      reward: '200 Feathers + 15 Acorns',
      icon: <Flame className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-stone-200 select-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-amber-400">Special Encounters & Challenges</h1>
        <p className="text-sm text-stone-400 mt-1">
          Test specialized tactical setups under unique physics modifiers and extreme wave compositions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {challenges.map((c) => (
          <div
            key={c.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col justify-between hover:border-stone-700 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {c.icon}
                  <h2 className="text-base font-bold text-stone-100">{c.name}</h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 border border-amber-900 text-amber-400 font-bold">
                  {c.badge}
                </span>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                {c.description}
              </p>

              <div className="text-xs font-mono text-emerald-400 bg-stone-950/60 border border-stone-800 px-3 py-1.5 rounded-lg mb-4">
                Reward: {c.reward}
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onStartChallenge(c.id);
              }}
              className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-stone-950" />
              <span>Launch Encounter</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
