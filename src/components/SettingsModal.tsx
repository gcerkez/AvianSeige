import React from 'react';
import { GameSettings, DifficultyPreset } from '../types/game';
import { Volume2, VolumeX, X, Sliders, Shield } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const difficulties: { id: DifficultyPreset; label: string; desc: string }[] = [
    { id: 'super_easy', label: 'Featherlight (Super Easy)', desc: 'Generous resources, slower waves, beginner friendly.' },
    { id: 'easy', label: 'Nest Defender (Easy)', desc: 'Gentle pacing and forgiving structural damage.' },
    { id: 'normal', label: 'Avian Commander (Normal)', desc: 'The baseline balanced strategic experience.' },
    { id: 'hard', label: 'Iron Talons (Hard)', desc: 'Faster pig columns, heavier armor, and stricter budgets.' },
    { id: 'very_hard', label: 'Stormbreak (Very Hard)', desc: 'Requires coordinated elemental synergies and formations.' },
    { id: 'nightmare', label: 'No Safe Nest (Nightmare)', desc: 'Relentless pig horde. Zero margin for strategic error.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-lg w-full p-6 text-stone-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-stone-100">Battlefield Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Section */}
        <div className="mt-5 space-y-4">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Audio Synthesizer
          </h3>

          <div className="space-y-3 bg-stone-950/60 p-3.5 rounded-lg border border-stone-800">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-stone-400" />
                <span>Master Volume</span>
              </span>
              <span className="font-mono">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ masterVolume: val });
                soundManager.setMasterVolume(val);
              }}
              className="w-full accent-amber-500"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-stone-400" />
                <span>SFX Volume</span>
              </span>
              <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ sfxVolume: val });
                soundManager.setSfxVolume(val);
              }}
              className="w-full accent-amber-500"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span>Mute All Audio</span>
              <button
                onClick={() => {
                  const newMute = settings.masterVolume > 0 ? 0 : 0.8;
                  onUpdateSettings({ masterVolume: newMute });
                  soundManager.setMute(newMute === 0);
                }}
                className="px-2.5 py-1 rounded bg-stone-800 border border-stone-700 text-stone-300 hover:text-white"
              >
                {settings.masterVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Difficulty Preset */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Difficulty Preset</span>
          </h3>

          <div className="space-y-2">
            {difficulties.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  soundManager.playClick();
                  onUpdateSettings({ difficulty: d.id });
                }}
                className={`w-full p-2.5 rounded-lg border text-left transition-all text-xs ${
                  settings.difficulty === d.id
                    ? 'bg-amber-950/60 border-amber-500 text-stone-100 ring-1 ring-amber-500'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-semibold text-stone-200">{d.label}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Graphics & Feedback Toggles */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Visual Feedback & Accessibility
          </h3>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between p-2.5 bg-stone-950/60 rounded-lg border border-stone-800 cursor-pointer">
              <span>Dynamic Screen Shake</span>
              <input
                type="checkbox"
                checked={settings.screenShake}
                onChange={(e) => onUpdateSettings({ screenShake: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-stone-950/60 rounded-lg border border-stone-800 cursor-pointer">
              <span>Show Floating Damage Numbers</span>
              <input
                type="checkbox"
                checked={settings.showDamageNumbers}
                onChange={(e) => onUpdateSettings({ showDamageNumbers: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-stone-950/60 rounded-lg border border-stone-800 cursor-pointer">
              <span>Auto-Start Next Wave</span>
              <input
                type="checkbox"
                checked={settings.autoStartNextWave}
                onChange={(e) => onUpdateSettings({ autoStartNextWave: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors"
        >
          Save & Return
        </button>
      </div>
    </div>
  );
};
