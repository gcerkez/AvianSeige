import React, { useState } from 'react';
import { TowerTypeId } from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { SKINS_DATA } from '../data/skins';
import { Feather, Shield, Flame, Crosshair, Palette, Check } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TowerCollectionProps {
  unlockedTowers: TowerTypeId[];
  ownedSkins: string[];
  equippedSkins: Record<TowerTypeId, string>;
  tokens: number;
  onBuySkin: (skinId: string, cost: number) => void;
  onEquipSkin: (towerId: TowerTypeId, skinId: string) => void;
}

export const TowerCollection: React.FC<TowerCollectionProps> = ({
  unlockedTowers,
  ownedSkins,
  equippedSkins,
  tokens,
  onBuySkin,
  onEquipSkin,
}) => {
  const [selectedTowerId, setSelectedTowerId] = useState<TowerTypeId>('cardinal');
  const [activeTab, setActiveTab] = useState<'paths' | 'skins'>('paths');

  const def = TOWERS_DATA[selectedTowerId];
  const towerSkins = SKINS_DATA.filter((s) => s.towerId === selectedTowerId);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-stone-200 select-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-400">Avian Defenders Roster</h1>
          <p className="text-sm text-stone-400 mt-1">
            Review 3-path upgrade branches, tactical specializations, and cosmetic plumages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg text-amber-300">
          <Palette className="w-4 h-4 text-amber-400" />
          <span>Cosmetic Tokens: {tokens}</span>
        </div>
      </div>

      {/* Bird Selectors Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
        {(Object.keys(TOWERS_DATA) as TowerTypeId[]).map((tid) => {
          const tDef = TOWERS_DATA[tid];
          const isUnlocked = unlockedTowers.includes(tid);
          const isSelected = selectedTowerId === tid;

          return (
            <button
              key={tid}
              onClick={() => {
                soundManager.playClick();
                setSelectedTowerId(tid);
              }}
              className={`p-3 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                  : isUnlocked
                  ? 'bg-stone-900 border-stone-800 hover:border-stone-600'
                  : 'bg-stone-950 border-stone-900 opacity-50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold text-base text-stone-950 mb-2"
                style={{ backgroundColor: tDef.accentColor }}
              >
                {tDef.name.charAt(0)}
              </div>
              <div className="text-xs font-bold text-stone-200">{tDef.name}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">{tDef.role.split(' ')[0]}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Defender Detail Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl text-stone-950"
              style={{ backgroundColor: def.accentColor }}
            >
              {def.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-100">{def.name}</h2>
                <span className="text-xs font-mono text-amber-400 px-2 py-0.5 bg-amber-950/60 border border-amber-900 rounded">
                  {def.element.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-stone-400">{def.title} · {def.role}</div>
            </div>
          </div>

          {/* Sub-tab toggle */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
            <button
              onClick={() => setActiveTab('paths')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'paths' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              3-Path Upgrade Tree
            </button>
            <button
              onClick={() => setActiveTab('skins')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'skins' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Plumage Skins ({towerSkins.length})
            </button>
          </div>
        </div>

        {/* Base Combat Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 border-b border-stone-800 text-xs">
          <div>
            <div className="text-stone-500">Deploy Cost</div>
            <div className="font-mono font-bold text-amber-400 flex items-center gap-1 mt-0.5">
              <Feather className="w-3.5 h-3.5" />
              <span>{def.baseCost}</span>
            </div>
          </div>
          <div>
            <div className="text-stone-500">Base Damage</div>
            <div className="font-mono font-bold text-stone-200 mt-0.5">{def.baseDamage}</div>
          </div>
          <div>
            <div className="text-stone-500">Attack Cadence</div>
            <div className="font-mono font-bold text-stone-200 mt-0.5">{def.baseFireRate}/s</div>
          </div>
          <div>
            <div className="text-stone-500">Target Range</div>
            <div className="font-mono font-bold text-stone-200 mt-0.5">{def.baseRange}px</div>
          </div>
          <div>
            <div className="text-stone-500">Structural Damage</div>
            <div className="font-mono font-bold text-amber-300 mt-0.5">{def.baseStructuralDamage}</div>
          </div>
        </div>

        {/* Tab 1: 3-Path Upgrade Tree */}
        {activeTab === 'paths' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {(['path_a', 'path_b', 'path_c'] as const).map((pKey) => {
              const path = def.paths[pKey];

              return (
                <div key={pKey} className="bg-stone-950/70 border border-stone-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {path.category === 'Offense' && <Shield className="w-4 h-4 text-rose-400" />}
                    {path.category === 'Elemental' && <Flame className="w-4 h-4 text-amber-400" />}
                    {path.category === 'Engineering' && <Crosshair className="w-4 h-4 text-sky-400" />}
                    <h3 className="text-sm font-bold text-stone-100">{path.name}</h3>
                  </div>
                  <div className="text-xs text-stone-400 mb-4">{path.description}</div>

                  {/* 5 Tiers */}
                  <div className="space-y-3">
                    {path.tiers.map((t) => (
                      <div
                        key={t.tier}
                        className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-stone-200 mb-1">
                          <span>
                            Tier {t.tier}: {t.name}
                          </span>
                          <span className="font-mono text-amber-400">{t.cost}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 leading-snug">
                          {t.description}
                        </div>
                        {t.specialAbility && (
                          <div className="mt-1 text-[10px] text-amber-300 font-semibold">
                            Ability: {t.specialAbility}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Cosmetics / Skins */}
        {activeTab === 'skins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {towerSkins.map((skin) => {
              const isOwned = ownedSkins.includes(skin.id) || skin.tokenCost === 0;
              const isEquipped = equippedSkins[selectedTowerId] === skin.id;
              const canAfford = tokens >= skin.tokenCost;

              return (
                <div
                  key={skin.id}
                  className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-stone-100">{skin.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                        {skin.rarity}
                      </span>
                    </div>

                    <div className="text-xs text-stone-400 mb-4">{skin.description}</div>

                    {/* Color Swatch Preview */}
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="w-5 h-5 rounded-full border border-stone-700"
                        style={{ backgroundColor: skin.colorScheme.primary }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-stone-700"
                        style={{ backgroundColor: skin.colorScheme.secondary }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-stone-700"
                        style={{ backgroundColor: skin.colorScheme.accent }}
                      />
                    </div>
                  </div>

                  {/* Buy / Equip Button */}
                  {isEquipped ? (
                    <div className="w-full py-1.5 px-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded text-xs font-semibold flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Equipped</span>
                    </div>
                  ) : isOwned ? (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onEquipSkin(selectedTowerId, skin.id);
                      }}
                      className="w-full py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded text-xs font-semibold transition-colors"
                    >
                      Equip Plumage
                    </button>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        soundManager.playUpgrade();
                        onBuySkin(skin.id, skin.tokenCost);
                      }}
                      className={`w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                          : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                      }`}
                    >
                      <span>Unlock ({skin.tokenCost} Tokens)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
