import React from 'react';
import { Shield, Feather, Sparkles, Nut } from 'lucide-react';

interface TopNavProps {
  currentTab: 'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings';
  setCurrentTab: (tab: 'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings') => void;
  feathers: number;
  acorns: number;
  shards: number;
  onOpenSettings: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  setCurrentTab,
  feathers,
  acorns,
  shards,
  onOpenSettings,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md sticky top-0 z-40 text-stone-100 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <Shield className="w-5 h-5 text-amber-500" />
        <button
          onClick={() => setCurrentTab('battle')}
          className="text-lg font-bold tracking-tight text-amber-400 whitespace-nowrap hover:text-amber-300 transition-colors"
        >
          Avian Siege
        </button>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-400">
        <button
          onClick={() => setCurrentTab('battle')}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'battle' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Battle
        </button>
        <button
          onClick={() => setCurrentTab('map')}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'map' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Campaign Map
        </button>
        <button
          onClick={() => setCurrentTab('roster')}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'roster' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Avian Roster
        </button>
        <button
          onClick={() => setCurrentTab('research')}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'research' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Research
        </button>
        <button
          onClick={() => setCurrentTab('challenges')}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'challenges' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Encounters
        </button>
      </nav>

      {/* Zone 3: 1 primary action or resource display */}
      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
        <div className="flex items-center gap-1.5 text-amber-300" title="Feathers">
          <Feather className="w-3.5 h-3.5 text-amber-400" />
          <span className="tabular-nums font-semibold">{feathers}</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400" title="Acorns">
          <Nut className="w-3.5 h-3.5 text-emerald-500" />
          <span className="tabular-nums font-semibold">{acorns}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-400" title="Elemental Shards">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="tabular-nums font-semibold">{shards}</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="px-2.5 py-1 text-xs font-sans text-stone-300 bg-stone-900 border border-stone-700 rounded hover:bg-stone-800 hover:text-white transition-colors"
        >
          Settings
        </button>
      </div>
    </header>
  );
};
