import React from 'react';
import { FormationAbility, ProximitySynergy } from '../types/game';
import { Sparkles, Flame, Zap, Activity } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface FormationSynergyBarProps {
  formations: FormationAbility[];
  synergies: ProximitySynergy[];
  onTriggerComboAbility: (abilityName: string) => void;
  comboCooldowns: Record<string, number>;
}

export const FormationSynergyBar: React.FC<FormationSynergyBarProps> = ({
  formations,
  synergies,
  onTriggerComboAbility,
  comboCooldowns,
}) => {
  const activeComboAbilities: {
    id: string;
    name: string;
    description: string;
    source: string;
    cooldown: number;
  }[] = [];

  // Collect active formation combo abilities
  formations.forEach((f) => {
    if (f.abilityName && f.abilityDescription) {
      activeComboAbilities.push({
        id: f.id,
        name: f.abilityName,
        description: f.abilityDescription,
        source: f.name,
        cooldown: f.cooldown || 15,
      });
    }
  });

  // Collect proximity combo abilities
  synergies.forEach((s) => {
    if (s.abilityName && s.abilityDescription) {
      activeComboAbilities.push({
        id: s.id,
        name: s.abilityName,
        description: s.abilityDescription,
        source: s.name,
        cooldown: s.cooldown || 15,
      });
    }
  });

  const totalActive = formations.length + synergies.length;
  if (totalActive === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-stone-900/90 border border-stone-800 rounded-xl text-xs select-none">
      {/* Left: Active Synergies Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-stone-400 font-semibold px-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Synergies ({totalActive}):</span>
        </div>

        {formations.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/60 border border-amber-600/70 rounded-lg text-amber-300 font-medium"
            title={f.description}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{f.name}</span>
          </div>
        ))}

        {synergies.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/50 border border-sky-600/60 rounded-lg text-sky-300"
            title={s.effectDescription}
          >
            <Flame className="w-3.5 h-3.5 text-sky-400" />
            <span>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Right: Unlocked Active Combo Powers */}
      {activeComboAbilities.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-800/80">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Combo Power:</span>
          </span>
          {activeComboAbilities.map((combo) => {
            const cd = comboCooldowns[combo.name] || 0;
            const ready = cd <= 0;

            return (
              <button
                key={combo.id}
                disabled={!ready}
                onClick={() => {
                  soundManager.playPowerUp();
                  onTriggerComboAbility(combo.name);
                }}
                title={combo.description}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all relative overflow-hidden shrink-0 ${
                  ready
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 hover:bg-emerald-900 shadow-md ring-1 ring-emerald-500 animate-pulse'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{combo.name}</span>
                {!ready && <span className="font-mono text-[10px]">({Math.ceil(cd)}s)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
