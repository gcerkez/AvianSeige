import React, { useState } from 'react';
import { CAMPAIGN_REGIONS, CAMPAIGN_LEVELS, CampaignRegionMeta } from '../data/levels';
import { LevelDefinition, DifficultyPreset } from '../types/game';
import {
  Star,
  ShieldAlert,
  Play,
  CheckCircle2,
  Feather,
  Layers,
  Award,
  Snowflake,
  Mountain,
  Flame,
  Zap,
  Shield,
  Compass,
  Skull,
  Info,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface CampaignMapProps {
  completedLevels: Record<string, { stars: number; highestDifficulty: DifficultyPreset }>;
  onSelectLevel: (level: LevelDefinition) => void;
}

// Region Biome Icon Helper
function getRegionIcon(biome: string) {
  switch (biome) {
    case 'glacial':
      return <Snowflake className="w-4 h-4 text-sky-400" />;
    case 'desert':
      return <Mountain className="w-4 h-4 text-amber-500" />;
    case 'volcanic':
      return <Flame className="w-4 h-4 text-orange-500" />;
    case 'verdant':
      return <Compass className="w-4 h-4 text-emerald-400" />;
    case 'tempest':
      return <Zap className="w-4 h-4 text-purple-400" />;
    case 'citadel':
      return <Shield className="w-4 h-4 text-rose-500" />;
    default:
      return <Compass className="w-4 h-4 text-amber-400" />;
  }
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  completedLevels,
  onSelectLevel,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(CAMPAIGN_REGIONS[0].id);
  const [stageBracket, setStageBracket] = useState<number>(0); // 0: 1-20, 1: 21-40, 2: 41-60, 3: 61-80, 4: 81-100
  const [bossOnlyFilter, setBossOnlyFilter] = useState<boolean>(false);

  const currentRegion =
    CAMPAIGN_REGIONS.find((r) => r.id === selectedRegionId) || CAMPAIGN_REGIONS[0];
  const regionLevels = CAMPAIGN_LEVELS.filter((l) => l.regionId === currentRegion.id);

  const [selectedLevelId, setSelectedLevelId] = useState<string>(
    regionLevels[0]?.id || CAMPAIGN_LEVELS[0].id
  );

  const selectedLevel =
    CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || regionLevels[0] || CAMPAIGN_LEVELS[0];
  const levelProgress = completedLevels[selectedLevel.id];

  const bracketLevels = regionLevels.slice(stageBracket * 20, stageBracket * 20 + 20);
  const displayedLevels = bossOnlyFilter
    ? regionLevels.filter((l) => !!l.bossData)
    : bracketLevels;

  const completedInRegion = regionLevels.filter((l) => completedLevels[l.id]).length;
  const totalCampaignCleared = Object.keys(completedLevels).length;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 text-stone-200 select-none space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black tracking-tight text-stone-100">
              Avian Campaign World
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl">
            6 avian biomes, each featuring 100 unique procedurally generated stages with regional obstacles and distinct boss variants.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-stone-950 border border-stone-800 px-4 py-2.5 rounded-xl shrink-0">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-stone-500">
              Total World Cleared
            </div>
            <div className="text-base font-black font-mono text-amber-400">
              {totalCampaignCleared} <span className="text-xs text-stone-500">/ 600</span>
            </div>
          </div>
          <div className="w-12 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalCampaignCleared / 600) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Avian Region Selector Tabs (All 6 Biomes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {CAMPAIGN_REGIONS.map((region) => {
          const isSelected = region.id === currentRegion.id;
          const regLevels = CAMPAIGN_LEVELS.filter((l) => l.regionId === region.id);
          const clearedCount = regLevels.filter((l) => completedLevels[l.id]).length;
          const isComplete = clearedCount === 100;

          return (
            <button
              key={region.id}
              onClick={() => {
                soundManager.playClick();
                setSelectedRegionId(region.id);
                setStageBracket(0);
                setBossOnlyFilter(false);
                const firstInRegion = regLevels[0];
                if (firstInRegion) setSelectedLevelId(firstInRegion.id);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                isSelected
                  ? 'bg-stone-900 border-amber-500 shadow-xl ring-2 ring-amber-500/60'
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-850'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5">
                  {getRegionIcon(region.biome)}
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: region.themeColor }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-stone-400">
                  {clearedCount}/100
                </span>
              </div>

              <div>
                <div
                  className={`text-xs font-black transition-colors ${
                    isSelected ? 'text-amber-400' : 'text-stone-200 group-hover:text-stone-100'
                  }`}
                >
                  {region.name}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                  {region.featuredBirdName}
                </div>
              </div>

              {/* Mini region progress bar */}
              <div className="w-full h-1 bg-stone-950 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${clearedCount}%`,
                    backgroundColor: isComplete ? '#22C55E' : region.themeColor,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left Stage Browser (2 Cols), Right Selected Stage Intel Dossier (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Region Stage Browser */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Region Header Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner"
                  style={{ backgroundColor: `${currentRegion.themeColor}22` }}
                >
                  {getRegionIcon(currentRegion.biome)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-stone-100">{currentRegion.name}</h2>
                    <span className="px-2 py-0.5 bg-stone-800 text-[10px] font-mono text-stone-400 rounded-full">
                      {completedInRegion}/100 Completed
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{currentRegion.subtitle}</p>
                </div>
              </div>

              {/* Filter Controls: Stage Brackets or Bosses Only */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setBossOnlyFilter(!bossOnlyFilter);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    bossOnlyFilter
                      ? 'bg-rose-950/80 border-rose-600 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  <span>Bosses Only (10)</span>
                </button>

                {!bossOnlyFilter && (
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
                    {[0, 1, 2, 3, 4].map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          soundManager.playClick();
                          setStageBracket(b);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                          stageBracket === b
                            ? 'bg-amber-500 text-stone-950 font-bold shadow'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {b * 20 + 1}-{b * 20 + 20}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Region Lore & Specialty Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-xl flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="line-clamp-1">
                  <span className="text-stone-400 text-[10px] block">Avian Specialists</span>
                  <span className="text-stone-200 font-semibold">{currentRegion.featuredBirdName}</span>
                </div>
              </div>
              <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-xl flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="line-clamp-1">
                  <span className="text-stone-400 text-[10px] block">Regional Obstacle</span>
                  <span className="text-stone-200 font-semibold">{currentRegion.regionalObstacleName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 20 Levels Grid for the selected bracket */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[620px] overflow-y-auto pr-1">
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
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-amber-950/50 border-amber-500 shadow-lg ring-2 ring-amber-500/60'
                      : completion
                      ? 'bg-stone-900 border-stone-700/80 hover:border-stone-500'
                      : isBoss
                      ? 'bg-rose-950/25 border-rose-900/60 hover:border-rose-700'
                      : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-stone-200 flex items-center gap-2">
                        {isBoss ? (
                          <span className="flex items-center gap-1 text-rose-400 font-black">
                            <Skull className="w-3.5 h-3.5 text-rose-500" />
                            BOSS STAGE {lvl.levelNumber}
                          </span>
                        ) : (
                          <span className="text-stone-300">Stage {lvl.levelNumber}</span>
                        )}
                        <span className="text-[10px] text-stone-500 font-mono">
                          · {lvl.milestoneWaveCount || 40}W
                        </span>
                        {completion && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                        )}
                      </div>
                      <div className="text-[11px] text-stone-200 font-semibold line-clamp-1">
                        {lvl.name}
                      </div>
                      <div className="text-[10px] text-stone-400 line-clamp-1">
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

        {/* Right 1 Col: Selected Stage Tactical Dossier */}
        <div className="lg:col-span-1">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sticky top-20 text-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                {getRegionIcon(selectedLevel.regionalBiome || 'glacial')}
                <span>{selectedLevel.regionName} · Stage {selectedLevel.levelNumber}</span>
              </span>
              {selectedLevel.bossData ? (
                <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-[10px] text-rose-300 font-black rounded-md flex items-center gap-1 animate-pulse">
                  <Skull className="w-3 h-3 text-rose-400" />
                  BOSS ENCOUNTER
                </span>
              ) : (
                <span className="text-[11px] font-mono text-stone-400">
                  {selectedLevel.milestoneWaveCount || 40} Waves
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-stone-100">{selectedLevel.name}</h3>
              <p className="text-xs text-stone-400 mt-0.5">{selectedLevel.subtitle}</p>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed p-3 bg-stone-950/80 border border-stone-800/80 rounded-xl">
              {selectedLevel.description}
            </p>

            {/* Boss intel card if boss stage */}
            {selectedLevel.bossData && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <Skull className="w-4 h-4 text-rose-400" />
                  <span>Boss Variant Dossier: {selectedLevel.bossData.name}</span>
                </div>
                <div className="text-[11px] text-rose-200/90 leading-relaxed">
                  {selectedLevel.bossData.specialMechanicNote}
                </div>
              </div>
            )}

            {/* Regional Obstacles Dossier */}
            <div className="p-3 bg-stone-950/80 border border-stone-800/80 rounded-xl text-xs space-y-1.5">
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Regional Obstacle Field</span>
              </div>
              <div className="text-[11px] text-stone-300 leading-relaxed">
                {selectedLevel.regionalObstacleTip ||
                  'Destructible natural structures span the road chokepoint. Demolish support pillars to drop massive debris onto marching enemies.'}
              </div>
            </div>

            {/* Tactical Mission Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl flex items-center gap-2">
                <Feather className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-stone-500 font-mono">Starting Feathers</div>
                  <div className="font-mono font-bold text-stone-200">
                    {selectedLevel.startingFeathers}
                  </div>
                </div>
              </div>
              <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-stone-500 font-mono">Nest Lives</div>
                  <div className="font-mono font-bold text-stone-200">
                    {selectedLevel.nestLives}
                  </div>
                </div>
              </div>
            </div>

            {/* Mission Objectives */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">
                Mission Objectives
              </div>
              {selectedLevel.objectives.map((obj) => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between text-xs p-2 bg-stone-950/50 border border-stone-800/60 rounded-lg"
                >
                  <span className="text-stone-300 text-[11px]">{obj.description}</span>
                  <span className="text-amber-400 font-mono font-bold text-[10px] shrink-0 ml-2">
                    +{obj.bonusFeathers}F
                  </span>
                </div>
              ))}
            </div>

            {/* Deploy to Battle Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onSelectLevel(selectedLevel);
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all text-sm active:scale-[0.99]"
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
