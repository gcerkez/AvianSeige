import React from 'react';
import { Shield, Feather, Sparkles, Nut, Award, Calendar, FolderOpen, Settings } from 'lucide-react';

interface TopNavProps {
  currentTab: 'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings';
  setCurrentTab: (tab: 'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings') => void;
  feathers: number;
  acorns: number;
  shards: number;
  advancedTokens?: number;
  hasUnclaimedDailyMissions?: boolean;
  onOpenDailyMissions: () => void;
  onOpenSaveManager: () => void;
  onOpenSettings: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  setCurrentTab,
  feathers,
  acorns,
  shards,
  advancedTokens = 0,
  hasUnclaimedDailyMissions = false,
  onOpenDailyMissions,
  onOpenSaveManager,
  onOpenSettings,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-3 sm:px-6 py-2.5 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md sticky top-0 z-40 text-stone-100 select-none">
      {/* Wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <Shield className="w-5 h-5 text-amber-500" />
        <button
          onClick={() => setCurrentTab('battle')}
          className="text-lg font-bold tracking-tight text-amber-400 whitespace-nowrap hover:text-amber-300 transition-colors"
        >
          Avian Siege
        </button>
      </div>

      {/* Navigation links */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-stone-400">
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

      {/* Resources & Modals Bar */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs font-mono shrink-0">
        <div className="flex items-center gap-1 text-amber-300" title="Feathers">
          <Feather className="w-3.5 h-3.5 text-amber-400" />
          <span className="tabular-nums font-semibold">{feathers}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400" title="Acorns">
          <Nut className="w-3.5 h-3.5 text-emerald-500" />
          <span className="tabular-nums font-semibold">{acorns}</span>
        </div>
        <div className="flex items-center gap-1 text-sky-400" title="Elemental Shards">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="tabular-nums font-semibold">{shards}</span>
        </div>
        <div className="flex items-center gap-1 text-purple-300 font-bold" title="Astral Tokens">
          <Award className="w-3.5 h-3.5 text-purple-400" />
          <span className="tabular-nums">{advancedTokens}</span>
        </div>

        {/* Daily Directives button */}
        <button
          onClick={onOpenDailyMissions}
          title="Daily Directives & Astral Token Missions"
          className="relative px-2 py-1 text-xs font-sans text-stone-300 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors flex items-center gap-1"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Daily</span>
          {hasUnclaimedDailyMissions && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        {/* Save Slots button */}
        <button
          onClick={onOpenSaveManager}
          title="Save Slot Archives & New Game Management"
          className="px-2 py-1 text-xs font-sans text-stone-300 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors flex items-center gap-1"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Saves</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
