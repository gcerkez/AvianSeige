import { describe, it, expect } from 'vitest';
import {
  calculateWaveHealthMultiplier,
  calculateWaveSpeed,
  calculateWaveArmor,
  DIFFICULTY_CONFIGS,
  TOWER_BASE_HEALTH,
} from '../data/balance';

describe('Gameplay Balancing & Scaling', () => {
  it('provides gentle early onboarding curve for waves 1-5', () => {
    const wave1 = calculateWaveHealthMultiplier(1, 'normal');
    const wave2 = calculateWaveHealthMultiplier(2, 'normal');
    const wave5 = calculateWaveHealthMultiplier(5, 'normal');

    expect(wave1).toBe(1.0);
    expect(wave2).toBeCloseTo(1.04, 2);
    expect(wave5).toBeCloseTo(1.16, 2);
  });

  it('progresses smoothly through midgame waves 6-40', () => {
    const wave10 = calculateWaveHealthMultiplier(10, 'normal');
    const wave20 = calculateWaveHealthMultiplier(20, 'normal');
    const wave40 = calculateWaveHealthMultiplier(40, 'normal');

    expect(wave10).toBeGreaterThan(calculateWaveHealthMultiplier(5, 'normal'));
    expect(wave20).toBeGreaterThan(wave10);
    expect(wave40).toBeGreaterThan(wave20);
  });

  it('scales cleanly into endless waves 100 and 200 without NaN or infinity', () => {
    const wave100 = calculateWaveHealthMultiplier(100, 'normal');
    const wave200 = calculateWaveHealthMultiplier(200, 'normal');

    expect(Number.isFinite(wave100)).toBe(true);
    expect(Number.isFinite(wave200)).toBe(true);
    expect(wave200).toBeGreaterThan(wave100);
  });

  it('applies difficulty presets consistently', () => {
    const normalMultiplier = calculateWaveHealthMultiplier(15, 'normal');
    const easyMultiplier = calculateWaveHealthMultiplier(15, 'easy');
    const nightmareMultiplier = calculateWaveHealthMultiplier(15, 'nightmare');

    expect(easyMultiplier).toBeCloseTo(normalMultiplier * DIFFICULTY_CONFIGS.easy.multiplier, 4);
    expect(nightmareMultiplier).toBeCloseTo(normalMultiplier * DIFFICULTY_CONFIGS.nightmare.multiplier, 4);
  });

  it('caps enemy speed to prevent unreactable movement', () => {
    const baseSpeed = 80;
    const speedWave1 = calculateWaveSpeed(baseSpeed, 1);
    const speedWave100 = calculateWaveSpeed(baseSpeed, 100);

    expect(speedWave1).toBe(80);
    expect(speedWave100).toBeLessThanOrEqual(125);
  });

  it('caps enemy armor scaling within reasonable bounds', () => {
    const baseArmor = 10;
    const armorWave1 = calculateWaveArmor(baseArmor, 1);
    const armorWave100 = calculateWaveArmor(baseArmor, 100);

    expect(armorWave1).toBe(10);
    expect(armorWave100).toBeLessThanOrEqual(16);
  });

  it('defines tower base health for all standard tower types including harrier', () => {
    expect(TOWER_BASE_HEALTH.cardinal).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.owl).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.falcon).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.woodpecker).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.penguin).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.phoenix).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.bomb_bird).toBeGreaterThan(0);
    expect(TOWER_BASE_HEALTH.harrier).toBeGreaterThan(0);
  });
});
