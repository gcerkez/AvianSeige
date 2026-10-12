import React from 'react';
import { PlacedTower, TargetPriority } from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { BIRD_SPECIAL_ABILITIES } from '../data/towerAbilities';
import {
  Feather,
  X,
  Lock,
  Flame,
  Shield,
  Crosshair,
  DollarSign,
  Zap,
  Bomb,
  Wind,
  Sun,
  Snowflake,
  Hammer,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TowerUpgradePanelProps {
  tower: PlacedTower;
  feathers: number;
  onUpgradePath: (towerId: string, pathKey: 'path_a' | 'path_b' | 'path_c') => void;
  onSetPriority: (towerId: string, priority: TargetPriority) => void;
  onSellTower: (towerId: string) => void;
  onTriggerAbility: (towerId: string) => void;
  onClose: () => void;
}

export const TowerUpgradePanel: React.FC<TowerUpgradePanelProps> = ({
  tower,
  feathers,
  onUpgradePath,
  onSetPriority,
  onSellTower,
  onTriggerAbility,
  onClose,
}) => {
  const def = TOWERS_DATA[tower.typeId];
  if (!def) return null;

  const ability = BIRD_SPECIAL_ABILITIES[tower.typeId];

  // Ability Cooldown Calculation
  const now = performance.now();
  const timeSinceAbility = (now - (tower.lastAbilityTriggered || 0)) / 1000;
  const abilityCooldown = ability ? ability.cooldown : 10;
  const isAbilityReady = timeSinceAbility >= abilityCooldown;
  const cooldownRemaining = Math.max(0, abilityCooldown - timeSinceAbility);
  const cooldownPct = Math.min(1, timeSinceAbility / abilityCooldown);
  const canAffordAbility = ability ? feathers >= ability.featherCost : false;

  // Compute sell value (~70% of base + invested upgrades)
  let invested = def.baseCost;
  (['path_a', 'path_b', 'path_c'] as const).forEach((pKey) => {
    const tierCount = tower.tiers[pKey];
    for (let i = 0; i < tierCount; i++) {
      invested += def.paths[pKey].tiers[i]?.cost || 0;
    }
  });
  const sellValue = Math.round(invested * 0.7);

  // Active dual paths
  const activePaths = (['path_a', 'path_b', 'path_c'] as const).filter(
    (pKey) => tower.tiers[pKey] > 0
  );

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-stone-200 select-none shadow-xl max-w-xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-stone-950 shadow-md"
            style={{ backgroundColor: def.accentColor }}
          >
            {def.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-amber-400">{def.name}</span>
              <span className="text-xs text-stone-400 font-mono">
                Tiers {tower.tiers.path_a}-{tower.tiers.path_b}-{tower.tiers.path_c}
              </span>
            </div>
            <div className="text-xs text-stone-400">{def.title}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Special Ability Card (Cost-Based Manual Trigger) */}
      {ability && (
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-amber-500/40 shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border shadow-sm"
                  style={{
                    backgroundColor: `${ability.accentColor}25`,
                    borderColor: ability.accentColor,
                    color: ability.accentColor,
                  }}
                >
                  {ability.badgeLabel}
                </span>
                <span className="text-xs font-bold text-stone-100">{ability.name}</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-snug">{ability.description}</p>
            </div>

            {/* Trigger Button */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                disabled={!isAbilityReady || !canAffordAbility}
                onClick={() => {
                  if (isAbilityReady && canAffordAbility) {
                    onTriggerAbility(tower.id);
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isAbilityReady && canAffordAbility
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:scale-105 active:scale-95 animate-pulse'
                    : isAbilityReady && !canAffordAbility
                    ? 'bg-stone-800 text-stone-400 border border-amber-900/60 cursor-not-allowed'
                    : 'bg-stone-800/90 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
              >
                {ability.iconName === 'bomb' && <Bomb className="w-3.5 h-3.5" />}
                {ability.iconName === 'zap' && <Zap className="w-3.5 h-3.5" />}
                {ability.iconName === 'wind' && <Wind className="w-3.5 h-3.5" />}
                {ability.iconName === 'sun' && <Sun className="w-3.5 h-3.5" />}
                {ability.iconName === 'snowflake' && <Snowflake className="w-3.5 h-3.5" />}
                {ability.iconName === 'hammer' && <Hammer className="w-3.5 h-3.5" />}
                <span>
                  {isAbilityReady
                    ? `Trigger (${ability.featherCost})`
                    : `${cooldownRemaining.toFixed(1)}s`}
                </span>
                <Feather className="w-3 h-3 text-amber-950 fill-amber-950" />
              </button>

              {/* Cooldown Bar */}
              {!isAbilityReady && (
                <div className="w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className="h-full bg-amber-500 transition-all duration-100"
                    style={{ width: `${cooldownPct * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hybrid Specialization notice if 2 paths active */}
      {activePaths.length === 2 && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2">
          <span className="font-semibold">Dual-Path Synergy Active:</span>
          <span>
            {def.paths[activePaths[0]].category} + {def.paths[activePaths[1]].category} Hybrid
          </span>
        </div>
      )}

      {/* Target Priority & Sell Controls */}
      <div className="flex items-center justify-between gap-3 mt-3 py-2 border-b border-stone-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-stone-400">Targeting:</span>
          <select
            value={tower.targetPriority}
            onChange={(e) => onSetPriority(tower.id, e.target.value as TargetPriority)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="first">First</option>
            <option value="last">Last</option>
            <option value="strongest">Strongest</option>
            <option value="structures">Structures</option>
            <option value="flying">Flying / Gliders</option>
          </select>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onSellTower(tower.id);
          }}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded hover:bg-rose-900/40 transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Sell (+{sellValue})</span>
        </button>
      </div>

      {/* 3 Upgrade Paths */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {(['path_a', 'path_b', 'path_c'] as const).map((pathKey) => {
          const path = def.paths[pathKey];
          const currentTier = tower.tiers[pathKey];
          const nextTierData = path.tiers[currentTier]; // tier index 0-4
          const isMaxed = currentTier >= 5;
          const isLocked = tower.lockedPath === pathKey;

          const canAfford = nextTierData && feathers >= nextTierData.cost;

          return (
            <div
              key={pathKey}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                isLocked
                  ? 'bg-stone-950/60 border-stone-800/60 opacity-60'
                  : 'bg-stone-800/50 border-stone-700/80 hover:border-stone-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <div className="flex items-center gap-1 text-stone-200">
                    {path.category === 'Offense' && <Shield className="w-3.5 h-3.5 text-rose-400" />}
                    {path.category === 'Elemental' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                    {path.category === 'Engineering' && <Crosshair className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{path.name}</span>
                  </div>
                  <span className="font-mono text-amber-400">T{currentTier}/5</span>
                </div>

                {/* Tier pips */}
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((tNum) => (
                    <div
                      key={tNum}
                      className={`h-1 flex-1 rounded-full ${
                        tNum <= currentTier
                          ? 'bg-amber-400'
                          : isLocked
                          ? 'bg-stone-800'
                          : 'bg-stone-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Next Upgrade Description */}
                {!isMaxed && !isLocked && nextTierData && (
                  <div className="text-[11px] text-stone-400 leading-snug mb-3 min-h-[36px]">
                    <div className="font-semibold text-stone-300">{nextTierData.name}</div>
                    <div>{nextTierData.description}</div>
                  </div>
                )}

                {isMaxed && (
                  <div className="text-[11px] text-amber-400 font-semibold mb-3">
                    Maximum Tier Reached
                  </div>
                )}

                {isLocked && (
                  <div className="text-[11px] text-stone-500 flex items-center gap-1 mb-3">
                    <Lock className="w-3 h-3" />
                    <span>Locked (2 other paths active)</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!isMaxed && !isLocked && nextTierData && (
                <button
                  disabled={!canAfford}
                  onClick={() => {
                    soundManager.playUpgrade();
                    onUpgradePath(tower.id, pathKey);
                  }}
                  className={`w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  <Feather className="w-3 h-3" />
                  <span>Upgrade ({nextTierData.cost})</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
