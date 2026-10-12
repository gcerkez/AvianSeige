import { DifficultyPreset, EnemyArchetype } from '../types/game';

export interface DifficultyConfig {
  multiplier: number;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyPreset, DifficultyConfig> = {
  super_easy: {
    multiplier: 0.6,
    label: 'Casual Nest',
    description: 'Generous resources, enemies have 40% reduced health. For relaxing play.',
  },
  easy: {
    multiplier: 0.8,
    label: 'Fledgling',
    description: 'Forgiving early waves, modest enemy health. Great for new commanders.',
  },
  normal: {
    multiplier: 1.0,
    label: 'Standard Siege',
    description: 'Balanced challenge, tactical combos and placements rewarded.',
  },
  hard: {
    multiplier: 1.3,
    label: 'Veteran Talon',
    description: 'Dense swine columns, higher armor, requiring solid strategy.',
  },
  very_hard: {
    multiplier: 1.6,
    label: 'Apex Predator',
    description: 'Punishing waves and aggressive boss health. Precision defense needed.',
  },
  nightmare: {
    multiplier: 2.0,
    label: 'Iron Swine Nightmare',
    description: 'Extreme endgame endurance challenge for master tacticians.',
  },
};

/**
 * Calculates progressive health scaling for enemy waves.
 * Redesigned with a gentle early curve (waves 1-10) to give new players
 * adequate time to learn, followed by healthy Bloons-style ramping.
 */
export function calculateWaveHealthMultiplier(waveNumber: number, difficulty: DifficultyPreset = 'normal'): number {
  const diffMultiplier = DIFFICULTY_CONFIGS[difficulty]?.multiplier ?? 1.0;

  let waveScale = 1.0;
  if (waveNumber <= 5) {
    // Wave 1-5: Gentle onboarding
    waveScale = 1.0 + (waveNumber - 1) * 0.04;
  } else if (waveNumber <= 15) {
    // Wave 6-15: Mild ramp
    waveScale = 1.16 + (waveNumber - 5) * 0.07;
  } else if (waveNumber <= 40) {
    // Wave 16-40: Standard tactical midgame ramping
    const midWave = waveNumber - 15;
    waveScale = 1.86 + midWave * 0.11 + Math.pow(midWave / 10, 1.4) * 0.18;
  } else {
    // Endless mode post-wave 40
    const endlessWave = waveNumber - 40;
    waveScale = 4.8 * (Math.pow(1.04, endlessWave) + endlessWave * 0.15);
  }

  return diffMultiplier * waveScale;
}

/**
 * Calculate scaled speed for waves (capped to prevent unreactable speed)
 */
export function calculateWaveSpeed(baseSpeed: number, waveNumber: number): number {
  const speedBonus = Math.min(0.28, Math.max(0, (waveNumber - 1) * 0.002));
  return Math.min(125, baseSpeed * (1 + speedBonus));
}

/**
 * Calculate scaled armor for waves
 */
export function calculateWaveArmor(baseArmor: number, waveNumber: number): number {
  if (baseArmor <= 0) return 0;
  return Math.round(baseArmor * (1 + Math.min(0.6, (waveNumber - 1) * 0.015)));
}

/**
 * Base health per tower type
 */
export const TOWER_BASE_HEALTH: Record<string, number> = {
  cardinal: 600,
  owl: 560,
  falcon: 520,
  woodpecker: 540,
  penguin: 580,
  phoenix: 700,
  bomb_bird: 800,
  harrier: 500,
};
