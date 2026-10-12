import React from 'react';
import { TowerTypeId } from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { Feather, Crosshair } from 'lucide-react';

interface TowerPlaceBarProps {
  unlockedTowers: TowerTypeId[];
  selectedType: TowerTypeId | null;
  onSelectType: (type: TowerTypeId | null) => void;
  feathers: number;
}

export const TowerPlaceBar: React.FC<TowerPlaceBarProps> = ({
  unlockedTowers,
  selectedType,
  onSelectType,
  feathers,
}) => {
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-stone-900/90 border border-stone-800 rounded-xl select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-stone-400">
          Deploy Avian Defender:
        </span>
        {selectedType ? (
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 animate-pulse">
            <Crosshair className="w-3 h-3" />
            <span>Click/tap anywhere on terrain to place</span>
          </span>
        ) : (
          <span className="text-[11px] text-stone-500">
            Free placement anywhere · Cluster for combos
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {unlockedTowers.map((id) => {
          const def = TOWERS_DATA[id];
          if (!def) return null;
          const isSelected = selectedType === id;
          const canAfford = feathers >= def.baseCost;

          return (
            <button
              key={id}
              onClick={() => onSelectType(isSelected ? null : id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all shrink-0 ${
                isSelected
                  ? 'bg-amber-950/80 border-amber-500 shadow-md ring-1 ring-amber-500'
                  : canAfford
                  ? 'bg-stone-800/80 border-stone-700 hover:border-stone-500'
                  : 'bg-stone-900 border-stone-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-stone-900 shrink-0"
                style={{ backgroundColor: def.accentColor }}
              >
                {def.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-semibold text-stone-200 leading-tight">
                  {def.name}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                  <Feather className="w-3 h-3 text-amber-400" />
                  <span>{def.baseCost}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
