import React, { useState } from 'react';
import {
  TowerTypeId,
  PlacedTower,
  RewardedTowerLoadout,
  TargetPriority,
} from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { BIRD_SPECIAL_ABILITIES } from '../data/towerAbilities';
import { findCompatibleCombos, canLinkTowers, getComboRecipe } from '../data/combos';
import { getEffectiveTowerStats, getUpgradePreviewDelta } from '../utils/towerStats';
import {
  Feather,
  Crosshair,
  Sparkles,
  Shield,
  Flame,
  Zap,
  Lock,
  DollarSign,
  Bomb,
  Wind,
  Sun,
  Snowflake,
  Hammer,
  X,
  Compass,
  Link2,
  Unlink,
  Check,
  ChevronRight,
  Info,
  Layers,
  Award,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface ModernTowerDrawerProps {
  unlockedTowers: TowerTypeId[];
  rewardedTowers: RewardedTowerLoadout[];
  selectedDeployType: TowerTypeId | null;
  selectedPreUpgradedLoadout: RewardedTowerLoadout | null;
  onSelectDeployType: (type: TowerTypeId | null) => void;
  onSelectPreUpgradedLoadout: (loadout: RewardedTowerLoadout | null) => void;
  selectedTower: PlacedTower | null;
  placedTowers: PlacedTower[];
  feathers: number;
  researchPurchased: string[];
  onUpgradePath: (towerId: string, pathKey: 'path_a' | 'path_b' | 'path_c') => void;
  onSetPriority: (towerId: string, priority: TargetPriority) => void;
  onSellTower: (towerId: string) => void;
  onTriggerAbility: (towerId: string) => void;
  onToggleComboLink: (towerId1: string, towerId2: string) => void;
  isEditingFlightPath: boolean;
  onToggleFlightPathEdit: (towerId: string) => void;
  onResetFlightPath: (towerId: string) => void;
  onCloseSelectedTower: () => void;
}

export const ModernTowerDrawer: React.FC<ModernTowerDrawerProps> = ({
  unlockedTowers,
  rewardedTowers,
  selectedDeployType,
  selectedPreUpgradedLoadout,
  onSelectDeployType,
  onSelectPreUpgradedLoadout,
  selectedTower,
  placedTowers,
  feathers,
  researchPurchased,
  onUpgradePath,
  onSetPriority,
  onSellTower,
  onTriggerAbility,
  onToggleComboLink,
  isEditingFlightPath,
  onToggleFlightPathEdit,
  onResetFlightPath,
  onCloseSelectedTower,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'loadouts' | 'selected'>('available');

  // Auto-switch to selected tab when a tower is selected
  React.useEffect(() => {
    if (selectedTower) {
      setActiveTab('selected');
    }
  }, [selectedTower?.id]);

  // Selected tower def & stats
  const def = selectedTower ? TOWERS_DATA[selectedTower.typeId] : null;
  const currentStats = selectedTower
    ? getEffectiveTowerStats(selectedTower, researchPurchased)
    : null;
  const ability = selectedTower ? BIRD_SPECIAL_ABILITIES[selectedTower.typeId] : null;

  // Ability Cooldown Calculation
  const now = performance.now();
  const timeSinceAbility = selectedTower
    ? (now - (selectedTower.lastAbilityTriggered || 0)) / 1000
    : 0;
  const abilityCooldown = ability ? ability.cooldown : 10;
  const isAbilityReady = timeSinceAbility >= abilityCooldown;
  const cooldownRemaining = Math.max(0, abilityCooldown - timeSinceAbility);
  const cooldownPct = Math.min(1, timeSinceAbility / abilityCooldown);
  const canAffordAbility = ability ? feathers >= ability.featherCost : false;

  // Sell value
  let sellValue = 0;
  if (selectedTower && def) {
    let invested = def.baseCost;
    (['path_a', 'path_b', 'path_c'] as const).forEach((pKey) => {
      const tierCount = selectedTower.tiers[pKey];
      for (let i = 0; i < tierCount; i++) {
        invested += def.paths[pKey].tiers[i]?.cost || 0;
      }
    });
    sellValue = Math.round(invested * 0.7);
  }

  // Compatible partner towers for deliberate combo links
  const compatiblePartners = selectedTower
    ? placedTowers
        .filter((t) => t.id !== selectedTower.id)
        .map((partner) => {
          const check = canLinkTowers(selectedTower, partner);
          return {
            partner,
            ...check,
          };
        })
        .filter((item) => item.recipe !== undefined)
    : [];

  return (
    <div className="bg-stone-900/95 border border-stone-800 rounded-2xl shadow-xl flex flex-col overflow-hidden select-none">
      {/* Navigation Tabs Header (Bloons TD 6 Style) */}
      <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950/80 px-2 py-1.5 gap-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('available');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'available'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Available ({unlockedTowers.length})</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('loadouts');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'loadouts'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>My Towers</span>
            {rewardedTowers.some((r) => r.isNew) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">
              {rewardedTowers.length}
            </span>
          </button>

          {selectedTower && (
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('selected');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'selected'
                  ? 'bg-emerald-500 text-stone-950 shadow-md'
                  : 'text-emerald-400 hover:bg-stone-800/60'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Upgrades: {def?.name}</span>
            </button>
          )}
        </div>

        {selectedTower && (
          <button
            onClick={onCloseSelectedTower}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="Deselect Tower"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab 1: Available Base Towers */}
      {activeTab === 'available' && (
        <div className="p-3">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-2 px-1">
            <span>Select defender to place on map:</span>
            {selectedDeployType ? (
              <span className="text-emerald-400 font-mono flex items-center gap-1 animate-pulse">
                <Crosshair className="w-3.5 h-3.5" />
                <span>Click terrain to place ({TOWERS_DATA[selectedDeployType]?.name})</span>
              </span>
            ) : (
              <span className="text-stone-500 text-[11px]">Tap to deploy · Free placement</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {unlockedTowers.map((id) => {
              const tDef = TOWERS_DATA[id];
              if (!tDef) return null;
              const isSelected = selectedDeployType === id;
              const canAfford = feathers >= tDef.baseCost;

              return (
                <button
                  key={id}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectPreUpgradedLoadout(null);
                    onSelectDeployType(isSelected ? null : id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500 shadow-lg'
                      : canAfford
                      ? 'bg-stone-950/70 border-stone-800 hover:border-stone-600 active:scale-95'
                      : 'bg-stone-950/40 border-stone-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-stone-950 shadow"
                      style={{ backgroundColor: tDef.accentColor }}
                    >
                      {tDef.name.charAt(0)}
                    </div>
                    {tDef.isFlying && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-950 border border-sky-800 text-sky-300">
                        FLYING
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-stone-100 truncate">{tDef.name}</div>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 mt-0.5">
                      <Feather className="w-3 h-3 text-amber-400" />
                      <span>{tDef.baseCost}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: My Pre-Upgraded Towers & Rewarded Loadouts */}
      {activeTab === 'loadouts' && (
        <div className="p-3">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-2.5 px-1">
            <span>Earned Campaign & Milestone Loadouts:</span>
            <span className="text-[11px] text-stone-500 font-mono">
              Preserves specific upgrade tiers when placed!
            </span>
          </div>

          {rewardedTowers.length === 0 ? (
            <div className="p-8 text-center bg-stone-950/40 border border-dashed border-stone-800 rounded-xl">
              <Sparkles className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
              <div className="text-xs font-semibold text-stone-300">No Pre-Upgraded Loadouts Earned Yet</div>
              <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                Complete campaign levels or achieve Wave 100/200 milestone rounds to earn powerful pre-upgraded avian defenders!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {rewardedTowers.map((loadout) => {
                const tDef = TOWERS_DATA[loadout.typeId];
                if (!tDef) return null;
                const isSelected = selectedPreUpgradedLoadout?.id === loadout.id;
                const canAfford = feathers >= tDef.baseCost;

                return (
                  <div
                    key={loadout.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500 shadow-lg'
                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-stone-950 shrink-0"
                            style={{ backgroundColor: tDef.accentColor }}
                          >
                            {tDef.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-100 leading-none">
                              {loadout.name}
                            </span>
                            <div className="text-[10px] text-stone-400 font-mono">
                              Tiers {loadout.tiers.path_a}-{loadout.tiers.path_b}-{loadout.tiers.path_c}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {loadout.isNew && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                              NEW
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 border border-purple-800 text-purple-300">
                            {loadout.tierLabel}
                          </span>
                        </div>
                      </div>

                      {loadout.bonusStatsDescription && (
                        <p className="text-[10px] text-emerald-400 font-mono bg-stone-900/80 rounded px-2 py-1 mb-2">
                          {loadout.bonusStatsDescription}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 mt-1">
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                        <Feather className="w-3.5 h-3.5" />
                        <span>{tDef.baseCost}</span>
                      </div>

                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          soundManager.playClick();
                          onSelectDeployType(null);
                          onSelectPreUpgradedLoadout(isSelected ? null : loadout);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 ring-1 ring-amber-400'
                            : canAfford
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-100'
                            : 'bg-stone-900 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isSelected ? 'Ready to Place' : 'Deploy'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Selected Tower Controls & 3-Path Upgrades */}
      {activeTab === 'selected' && selectedTower && def && currentStats && (
        <div className="p-3.5 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Header Info & Targeting / Sell Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-stone-950 shadow-md shrink-0"
                style={{ backgroundColor: def.accentColor }}
              >
                {def.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-amber-400">{def.name}</span>
                  <span className="text-xs text-stone-400 font-mono">
                    Tiers {selectedTower.tiers.path_a}-{selectedTower.tiers.path_b}-{selectedTower.tiers.path_c}
                  </span>
                  {selectedTower.isFlying && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 border border-sky-800 text-sky-300">
                      AIR PATROL
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-400 font-mono mt-0.5">
                  <span>Dmg: {currentStats.damage}</span>
                  <span>·</span>
                  <span>Range: {currentStats.range}px</span>
                  <span>·</span>
                  <span>Rate: {currentStats.fireRate}/s</span>
                  <span>·</span>
                  <span>DPS: {currentStats.dps}</span>
                </div>
              </div>
            </div>

            {/* Target Priority & Sell */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800 text-xs">
                <Crosshair className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedTower.targetPriority}
                  onChange={(e) => onSetPriority(selectedTower.id, e.target.value as TargetPriority)}
                  className="bg-transparent text-xs text-stone-200 focus:outline-none"
                >
                  <option value="first" className="bg-stone-900">First</option>
                  <option value="last" className="bg-stone-900">Last</option>
                  <option value="strongest" className="bg-stone-900">Strongest</option>
                  <option value="structures" className="bg-stone-900">Structures</option>
                  <option value="flying" className="bg-stone-900">Flying</option>
                </select>
              </div>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onSellTower(selectedTower.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg hover:bg-rose-900/60 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Sell (+{sellValue})</span>
              </button>
            </div>
          </div>

          {/* Aerial Flight Path Controls (if flying tower) */}
          {selectedTower.isFlying && (
            <div className="p-3 bg-sky-950/30 border border-sky-800/60 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <div>
                  <span className="text-xs font-bold text-sky-200">Flight Patrol Route</span>
                  <p className="text-[11px] text-stone-400 leading-none mt-0.5">
                    Click anywhere on the map to add/move patrol waypoints.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleFlightPathEdit(selectedTower.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isEditingFlightPath
                      ? 'bg-sky-500 text-stone-950 animate-pulse'
                      : 'bg-stone-800 hover:bg-stone-700 text-sky-300'
                  }`}
                >
                  {isEditingFlightPath ? 'Finish Route' : 'Edit Flight Path'}
                </button>
                <button
                  onClick={() => onResetFlightPath(selectedTower.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-400"
                >
                  Reset Loop
                </button>
              </div>
            </div>
          )}

          {/* Bird Special Ability (Cost-based trigger) */}
          {ability && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-stone-950 to-stone-900 border border-amber-500/40 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border"
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
                <p className="text-[11px] text-stone-300 line-clamp-1">{ability.description}</p>
              </div>

              <button
                disabled={!isAbilityReady || !canAffordAbility}
                onClick={() => {
                  if (isAbilityReady && canAffordAbility) {
                    onTriggerAbility(selectedTower.id);
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 ${
                  isAbilityReady && canAffordAbility
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 animate-pulse'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
              >
                <span>
                  {isAbilityReady ? `Trigger (${ability.featherCost}F)` : `${cooldownRemaining.toFixed(1)}s`}
                </span>
              </button>
            </div>
          )}

          {/* Deliberate Tower Combos Configuration */}
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-200">Deliberate Tower Combo Partner</span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">
                Direct player choice · No random auto-linking
              </span>
            </div>

            {compatiblePartners.length === 0 ? (
              <div className="text-[11px] text-stone-500 py-1">
                No compatible partner towers placed within synergy range. Place compatible birds nearby to link combos!
              </div>
            ) : (
              <div className="space-y-2">
                {compatiblePartners.map(({ partner, eligible, reason, recipe }) => {
                  if (!recipe) return null;
                  const partnerDef = TOWERS_DATA[partner.typeId];
                  const isLinked = selectedTower.linkedComboTowerId === partner.id;

                  return (
                    <div
                      key={partner.id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLinked
                          ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : eligible
                          ? 'bg-stone-900 border-stone-800'
                          : 'bg-stone-950/40 border-stone-900 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-200">{recipe.name}</span>
                          <span className="text-[10px] font-mono text-stone-400">
                            with {partnerDef?.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{recipe.tacticalEffect}</p>
                        {!eligible && reason && (
                          <span className="text-[10px] text-rose-400 font-mono">{reason}</span>
                        )}
                      </div>

                      <button
                        disabled={!eligible && !isLinked}
                        onClick={() => {
                          soundManager.playClick();
                          onToggleComboLink(selectedTower.id, partner.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                          isLinked
                            ? 'bg-emerald-500 hover:bg-rose-600 text-stone-950 hover:text-white'
                            : eligible
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        {isLinked ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Linked (Active)</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link Partner</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3-Path Upgrades */}
          <div>
            <div className="text-xs font-bold text-stone-300 mb-2 px-1">Upgrade Paths:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(['path_a', 'path_b', 'path_c'] as const).map((pathKey) => {
                const path = def.paths[pathKey];
                const currentTier = selectedTower.tiers[pathKey];
                const nextTierData = path.tiers[currentTier];
                const isMaxed = currentTier >= 5;
                const isLocked = selectedTower.lockedPath === pathKey;
                const canAfford = nextTierData && feathers >= nextTierData.cost;

                // Preview stats delta
                const preview = !isMaxed && !isLocked
                  ? getUpgradePreviewDelta(selectedTower, pathKey, researchPurchased)
                  : null;

                return (
                  <div
                    key={pathKey}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isLocked
                        ? 'bg-stone-950/60 border-stone-800/60 opacity-60'
                        : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
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
                            className={`h-1.5 flex-1 rounded-full ${
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
                        <div className="text-[11px] text-stone-400 leading-snug mb-2">
                          <div className="font-semibold text-stone-200">{nextTierData.name}</div>
                          <div className="mt-0.5">{nextTierData.description}</div>

                          {preview && (
                            <div className="mt-2 pt-2 border-t border-stone-800/80 font-mono text-[10px] text-emerald-400 flex flex-wrap gap-2">
                              {preview.next.damage > preview.current.damage && (
                                <span>+{preview.next.damage - preview.current.damage} Dmg</span>
                              )}
                              {preview.next.range > preview.current.range && (
                                <span>+{preview.next.range - preview.current.range} Range</span>
                              )}
                              {preview.next.fireRate > preview.current.fireRate && (
                                <span>+{(preview.next.fireRate - preview.current.fireRate).toFixed(1)}/s</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {isMaxed && (
                        <div className="text-[11px] text-amber-400 font-semibold mb-2">
                          Max Tier Reached
                        </div>
                      )}

                      {isLocked && (
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mb-2">
                          <Lock className="w-3 h-3" />
                          <span>Locked (2 other paths active)</span>
                        </div>
                      )}
                    </div>

                    {!isMaxed && !isLocked && nextTierData && (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          soundManager.playUpgrade();
                          onUpgradePath(selectedTower.id, pathKey);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                        }`}
                      >
                        <Feather className="w-3.5 h-3.5" />
                        <span>Upgrade ({nextTierData.cost})</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
