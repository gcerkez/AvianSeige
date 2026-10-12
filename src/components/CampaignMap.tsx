import React, { useState } from 'react';
import { CAMPAIGN_REGIONS, CAMPAIGN_LEVELS } from '../data/levels';
import { LevelDefinition, DifficultyPreset } from '../types/game';
import { Star, ShieldAlert, Play, CheckCircle, Feather, Nut, Layers, Flame, Award } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface CampaignMapProps {
  completedLevels: Record<string, { stars: number; highestDifficulty: DifficultyPreset }>;
  onSelectLevel: (level: LevelDefinition) => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  completedLevels,
  onSelectLevel,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(CAMPAIGN_REGIONS[0].id);
  const [stageBracket, setStageBracket] = useState<number>(0); // 0: 1-20, 1: 21-40, 2: 41-60, 3: 61-80, 4: 81-100

  const currentRegion =
    CAMPAIGN_REGIONS.find((r) => r.id === selectedRegionId) || CAMPAIGN_REGIONS[0];
  const regionLevels = CAMPAIGN_LEVELS.filter((l) => l.regionId === currentRegion.id);

  const [selectedLevelId, setSelectedLevelId] = useState<string>(
    regionLevels[0]?.id || CAMPAIGN_LEVELS[0].id
  );

  const selectedLevel =
    CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || regionLevels[0] || CAMPAIGN_LEVELS[0];
  const levelProgress = completedLevels[selectedLevel.id];

  const bracketStart = stageBracket * 20 + 1;
  const bracketEnd = bracketStart + 19;
  const displayedLevels = regionLevels.slice(stageBracket * 20, stageBracket * 20 + 20);

  const completedInRegion = regionLevels.filter((l) => completedLevels[l.id]).length;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 text-stone-200 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-400">Campaign War Map</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            100 progressively challenging siege maps per region across 6 biomes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono bg-stone-900 border border-stone-800 px-3.5 py-1.5 rounded-lg">
          <span className="text-stone-400">Total Campaign Cleared:</span>
          <span className="text-amber-400 font-bold">
            {Object.keys(completedLevels).length} / 600
          </span>
        </div>
      </div>

      {/* Region Selector Tabs (All 6 Biomes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {CAMPAIGN_REGIONS.map((region) => {
          const isSelected = region.id === currentRegion.id;
          const regLevels = CAMPAIGN_LEVELS.filter((l) => l.regionId === region.id);
          const clearedCount = regLevels.filter((l) => completedLevels[l.id]).length;

          return (
            <button
              key={region.id}
              onClick={() => {
                soundManager.playClick();
                setSelectedRegionId(region.id);
                setStageBracket(0);
                const firstInRegion = regLevels[0];
                if (firstInRegion) setSelectedLevelId(firstInRegion.id);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-stone-900 border-amber-500 shadow-lg ring-1 ring-amber-500'
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-850'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: region.themeColor }}
                />
                <span className="text-[10px] font-mono text-stone-400">
                  {clearedCount}/100
                </span>
              </div>
              <div className="text-xs font-bold text-stone-200 line-clamp-1">{region.name}</div>
              <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                {region.featuredBirdName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left Stage Browser, Right Selected Stage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stage Browser */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Region Banner */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentRegion.themeColor }}
                />
                <h2 className="text-base font-bold text-stone-100">{currentRegion.name}</h2>
                <span className="text-xs text-stone-400">({completedInRegion}/100 Completed)</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">{currentRegion.description}</p>
              <div className="text-xs text-amber-300 font-medium mt-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Regional Bird: {currentRegion.featuredBirdName} ({currentRegion.featuredBirdBonus})</span>
              </div>
            </div>

            {/* Stage Range Bracket Selector */}
            <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 shrink-0">
              {[0, 1, 2, 3, 4].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    soundManager.playClick();
                    setStageBracket(b);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    stageBracket === b
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {b * 20 + 1}-{b * 20 + 20}
                </button>
              ))}
            </div>
          </div>

          {/* 20 Levels Grid for the selected bracket */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {displayedLevels.map((lvl) => {
              const isSelected = lvl.id === selectedLevel.id;
              const completion = completedLevels[lvl.id];
              const stars = completion ? completion.stars : 0;
              const isBoss = !!lvl.bossData;

              return (
                <button
                  key={lvl.id}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedLevelId(lvl.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : completion
                      ? 'bg-stone-900 border-stone-700 hover:border-stone-500'
                      : isBoss
                      ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                      : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                        {isBoss ? (
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                            BOSS STAGE {lvl.levelNumber}
                          </span>
                        ) : (
                          <span>Stage {lvl.levelNumber}</span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">
                          · {lvl.milestoneWaveCount || 40} Waves
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-300 mt-0.5 line-clamp-1 font-medium">
                        {lvl.name}
                      </div>
                      <div className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">
                        {lvl.subtitle}
                      </div>
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= stars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Level Details Card */}
        <div className="lg:col-span-1">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 sticky top-20 text-stone-200">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-mono text-amber-400 uppercase font-semibold">
                {selectedLevel.regionName} · Stage {selectedLevel.levelNumber}
              </span>
              {selectedLevel.bossData ? (
                <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-[10px] text-rose-300 font-bold rounded flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  BOSS STAGE
                </span>
              ) : (
                <span className="text-[11px] font-mono text-stone-400">
                  {selectedLevel.milestoneWaveCount || 40} Waves
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-stone-100">{selectedLevel.name}</h3>
            <p className="text-xs text-stone-400 mt-0.5">{selectedLevel.subtitle}</p>

            <p className="text-xs text-stone-300 leading-relaxed mt-3.5 p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg">
              {selectedLevel.description}
            </p>

            {/* Boss mechanic callout if boss */}
            {selectedLevel.bossData && (
              <div className="mt-3 p-3 bg-rose-950/50 border border-rose-900/70 rounded-lg text-xs text-rose-200">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Boss Intel: {selectedLevel.bossData.name}</span>
                </div>
                <div className="mt-1 leading-relaxed text-[11px]">
                  {selectedLevel.bossData.specialMechanicNote}
                </div>
              </div>
            )}

            {/* Destructible Fortification Info */}
            <div className="mt-3.5 p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg text-xs space-y-1.5">
              <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Destructible Fortification Grid</span>
              </div>
              <div className="text-[11px] text-stone-300">
                {selectedLevel.initialStructures.length} structural blocks detected directly spanning the central road chokepoint. Includes support pillars, bridge deck, and explosive TNT barrels.
              </div>
            </div>

            {/* Tactical Mission Stats */}
            <div className="grid grid-cols-2 gap-2 mt-3.5 text-xs">
              <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-lg flex items-center gap-2">
                <Feather className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-stone-400">Starting Feathers</div>
                  <div className="font-mono font-bold text-stone-200">
                    {selectedLevel.startingFeathers}
                  </div>
                </div>
              </div>
              <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-lg flex items-center gap-2">
                <Nut className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-stone-400">Total Waves</div>
                  <div className="font-mono font-bold text-stone-200">
                    {selectedLevel.milestoneWaveCount || 40} Waves
                  </div>
                </div>
              </div>
            </div>

            {/* Objectives */}
            <div className="mt-4">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                Mission Objectives
              </div>
              <div className="space-y-1.5">
                {selectedLevel.objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between text-xs p-2 bg-stone-950/50 border border-stone-800/70 rounded-lg"
                  >
                    <span className="text-stone-300 text-[11px]">{obj.description}</span>
                    <span className="text-amber-400 font-mono font-bold text-[10px] shrink-0 ml-2">
                      +{obj.bonusFeathers}F
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deploy to Battle Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onSelectLevel(selectedLevel);
              }}
              className="mt-5 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 transition-all text-sm"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Deploy to Battle (Stage {selectedLevel.levelNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
