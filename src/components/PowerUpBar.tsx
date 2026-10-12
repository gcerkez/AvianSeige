import React from 'react';
import { Feather, Bomb, Zap, Clock, Activity } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

export interface PowerUpState {
  id: 'bombardment' | 'frenzy' | 'timewarp' | 'resonance';
  name: string;
  description: string;
  cost: number;
  cooldown: number; // in seconds
  currentCooldown: number;
}

interface PowerUpBarProps {
  feathers: number;
  powerUps: PowerUpState[];
  onTriggerPowerUp: (id: 'bombardment' | 'frenzy' | 'timewarp' | 'resonance') => void;
  activePowerUpId: string | null;
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  feathers,
  powerUps,
  onTriggerPowerUp,
  activePowerUpId,
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'bombardment':
        return <Bomb className="w-4 h-4 text-rose-400" />;
      case 'frenzy':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'timewarp':
        return <Clock className="w-4 h-4 text-sky-400" />;
      case 'resonance':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto p-2 bg-stone-900/90 border border-stone-800 rounded-xl select-none">
      <div className="text-xs font-semibold text-stone-400 px-2 shrink-0">
        Tactical Abilities:
      </div>
      {powerUps.map((p) => {
        const onCooldown = p.currentCooldown > 0;
        const canAfford = feathers >= p.cost;
        const isActive = activePowerUpId === p.id;

        return (
          <button
            key={p.id}
            disabled={onCooldown || !canAfford}
            onClick={() => {
              soundManager.playPowerUp();
              onTriggerPowerUp(p.id);
            }}
            title={p.description}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0 relative overflow-hidden ${
              isActive
                ? 'bg-amber-950 border-amber-400 text-amber-200 ring-2 ring-amber-400'
                : onCooldown
                ? 'bg-stone-900/70 border-stone-800 text-stone-500 cursor-not-allowed'
                : canAfford
                ? 'bg-stone-800/80 border-stone-700 hover:border-stone-500 text-stone-200'
                : 'bg-stone-900/70 border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {getIcon(p.id)}
            <div className="text-left">
              <div className="leading-tight font-semibold">{p.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                {onCooldown ? (
                  <span>{Math.ceil(p.currentCooldown)}s</span>
                ) : (
                  <>
                    <Feather className="w-3 h-3 text-amber-400" />
                    <span>{p.cost}</span>
                  </>
                )}
              </div>
            </div>

            {/* Cooldown overlay bar */}
            {onCooldown && (
              <div
                className="absolute inset-0 bg-stone-950/70 pointer-events-none"
                style={{ width: `${(p.currentCooldown / p.cooldown) * 100}%` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
