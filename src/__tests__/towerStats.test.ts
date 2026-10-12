import { describe, it, expect } from 'vitest';
import {
  getEffectiveTowerStats,
  computeEffectiveTowerStats,
  getEffectiveTowerRange,
  getUpgradePreviewDelta,
} from '../utils/towerStats';
import { PlacedTower } from '../types/game';

describe('Tower Stats & Scaling System', () => {
  const baseCardinal: PlacedTower = {
    id: 'test_cardinal_1',
    typeId: 'cardinal',
    x: 100,
    y: 100,
    level: 1,
    tiers: { path_a: 0, path_b: 0, path_c: 0 },
    lockedPath: null,
    targetPriority: 'first',
    rotation: 0,
    kills: 0,
    damageDealt: 0,
    lastFired: 0,
    health: 600,
    maxHealth: 600,
    lastDamagedTime: 0,
    comboPartnerIds: [],
  };

  it('computes correct base stats without upgrades', () => {
    const stats = getEffectiveTowerStats(baseCardinal);
    expect(stats.damage).toBe(16);
    expect(stats.range).toBe(140);
    expect(stats.fireRate).toBe(2.8);
    expect(stats.pierce).toBe(1);
    expect(stats.element).toBe('physical');
    expect(stats.dps).toBe(Math.round(16 * 2.8));
  });

  it('computeEffectiveTowerStats is an alias for getEffectiveTowerStats', () => {
    expect(computeEffectiveTowerStats(baseCardinal)).toEqual(getEffectiveTowerStats(baseCardinal));
  });

  it('calculates additive fire rate bonus without exponential compounding', () => {
    const upgradedCardinal: PlacedTower = {
      ...baseCardinal,
      tiers: { path_a: 2, path_b: 0, path_c: 0 },
    };
    const stats = getEffectiveTowerStats(upgradedCardinal);
    // Base 16, tier 1 gives +12 dmg (+0.15 fire rate), tier 2 gives +28 dmg (+0.5 fire rate)
    expect(stats.damage).toBe(16 + 12 + 28);
    // Additive fire rate bonus: 2.8 * (1 + 0.15 + 0.5) = 2.8 * 1.65 = 4.62
    expect(stats.fireRate).toBeCloseTo(2.8 * (1 + 0.15 + 0.5), 2);
  });

  it('applies research bonuses correctly', () => {
    const statsWithResearch = getEffectiveTowerStats(baseCardinal, [
      'res_calibrated_optics', // range * 1.18
      'res_rapid_reload', // +12% attack speed
    ]);

    expect(statsWithResearch.range).toBe(Math.round(140 * 1.18));
    expect(statsWithResearch.fireRate).toBeCloseTo(2.8 * (1 + 0.12), 2);
  });

  it('calculates effective tower range helper', () => {
    const range = getEffectiveTowerRange(baseCardinal);
    expect(range).toBe(140);

    const boostedRange = getEffectiveTowerRange(baseCardinal, ['res_calibrated_optics']);
    expect(boostedRange).toBe(Math.round(140 * 1.18));
  });

  it('generates upgrade preview delta accurately', () => {
    const delta = getUpgradePreviewDelta(baseCardinal, 'path_a');
    expect(delta).not.toBeNull();
    if (delta) {
      expect(delta.current.damage).toBe(16);
      expect(delta.next.damage).toBe(16 + 12);
      expect(delta.next.dps).toBeGreaterThan(delta.current.dps);
    }
  });

  it('returns null delta when at max tier', () => {
    const maxCardinal: PlacedTower = {
      ...baseCardinal,
      tiers: { path_a: 5, path_b: 0, path_c: 0 },
    };
    const delta = getUpgradePreviewDelta(maxCardinal, 'path_a');
    expect(delta).toBeNull();
  });
});
