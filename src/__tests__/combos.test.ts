import { describe, it, expect } from 'vitest';
import {
  COMBO_RECIPES,
  findCompatibleCombos,
  getComboRecipe,
  canLinkTowers,
} from '../data/combos';
import { PlacedTower } from '../types/game';

describe('Deliberate Tower Combos System', () => {
  const createMockTower = (id: string, typeId: PlacedTower['typeId'], x: number, y: number): PlacedTower => ({
    id,
    typeId,
    x,
    y,
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
  });

  it('defines 7 distinct deliberate combos with rich tactical effects', () => {
    expect(COMBO_RECIPES.length).toBe(7);
    COMBO_RECIPES.forEach((recipe) => {
      expect(recipe.name).toBeTruthy();
      expect(recipe.tacticalEffect).toBeTruthy();
      expect(recipe.abilityName).toBeTruthy();
      expect(recipe.cooldown).toBeGreaterThan(0);
      expect(recipe.maxDistance).toBeGreaterThan(100);
    });
  });

  it('finds compatible combos for Cardinal', () => {
    const cardinalCombos = findCompatibleCombos('cardinal');
    expect(cardinalCombos.length).toBeGreaterThanOrEqual(2);
    const names = cardinalCombos.map((c) => c.name);
    expect(names).toContain('Supersonic Crossfire');
    expect(names).toContain('Air-Ground Rapid Intercept');
  });

  it('finds combo recipe regardless of tower type order', () => {
    const forward = getComboRecipe('penguin', 'phoenix');
    const reversed = getComboRecipe('phoenix', 'penguin');

    expect(forward).not.toBeNull();
    expect(reversed).not.toBeNull();
    expect(forward?.id).toBe(reversed?.id);
    expect(forward?.id).toBe('combo_thermal_shock');
  });

  it('returns null recipe for incompatible tower types', () => {
    const recipe = getComboRecipe('owl', 'phoenix');
    expect(recipe).toBeNull();
  });

  it('validates linking between eligible nearby towers', () => {
    const cardinal = createMockTower('t1', 'cardinal', 100, 100);
    const falcon = createMockTower('t2', 'falcon', 150, 120); // ~53px distance <= 190px max

    const result = canLinkTowers(cardinal, falcon);
    expect(result.eligible).toBe(true);
    expect(result.recipe?.id).toBe('combo_supersonic_crossfire');
  });

  it('rejects linking when towers are too far apart', () => {
    const cardinal = createMockTower('t1', 'cardinal', 100, 100);
    const falcon = createMockTower('t2', 'falcon', 400, 400); // ~424px distance > 190px max

    const result = canLinkTowers(cardinal, falcon);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('too far apart');
  });

  it('rejects linking a tower to itself', () => {
    const cardinal = createMockTower('t1', 'cardinal', 100, 100);
    const result = canLinkTowers(cardinal, cardinal);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Cannot link tower to itself');
  });
});
