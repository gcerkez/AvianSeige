import { PlacedTower, TowerDefinition, ElementType, RewardedTowerLoadout } from '../types/game';
import { TOWERS_DATA } from '../data/towers';

export interface EffectiveTowerStats {
  damage: number;
  fireRate: number; // shots per second
  range: number;
  projectileSpeed: number;
  pierce: number;
  structuralDamage: number;
  element: ElementType;
  dps: number;
}

/**
 * Calculates effective stats for a placed tower, taking into account
 * all purchased tier upgrades, research bonuses, and balancing caps.
 */
export function getEffectiveTowerStats(
  tower: PlacedTower | { typeId: PlacedTower['typeId']; tiers: PlacedTower['tiers'] },
  researchPurchased: string[] = []
): EffectiveTowerStats {
  const def = TOWERS_DATA[tower.typeId];
  if (!def) {
    return {
      damage: 10,
      fireRate: 1,
      range: 100,
      projectileSpeed: 300,
      pierce: 1,
      structuralDamage: 10,
      element: 'physical',
      dps: 10,
    };
  }

  let damage = def.baseDamage;
  let range = def.baseRange;
  let structuralDamage = def.baseStructuralDamage;
  let element = def.element;
  let pierce = def.basePierce;
  let projectileSpeed = def.projectileSpeed;

  // Additive attack speed bonus accumulator to prevent exponential runaway
  let fireRateBonusSum = 0;
  let structuralMultiplierSum = 0;

  // Process Path A
  for (let i = 0; i < tower.tiers.path_a; i++) {
    const t = def.paths.path_a.tiers[i];
    if (t) {
      damage += t.damageBonus;
      range += t.rangeBonus;
      pierce += t.pierceBonus;
      if (t.fireRateBonus > 1) {
        fireRateBonusSum += t.fireRateBonus - 1;
      }
      if (t.structuralBonus > 1) {
        structuralMultiplierSum += t.structuralBonus - 1;
      }
      if (t.elementBonus) element = t.elementBonus;
    }
  }

  // Process Path B
  for (let i = 0; i < tower.tiers.path_b; i++) {
    const t = def.paths.path_b.tiers[i];
    if (t) {
      damage += t.damageBonus;
      range += t.rangeBonus;
      pierce += t.pierceBonus;
      if (t.fireRateBonus > 1) {
        fireRateBonusSum += t.fireRateBonus - 1;
      }
      if (t.structuralBonus > 1) {
        structuralMultiplierSum += t.structuralBonus - 1;
      }
      if (t.elementBonus) element = t.elementBonus;
    }
  }

  // Process Path C
  for (let i = 0; i < tower.tiers.path_c; i++) {
    const t = def.paths.path_c.tiers[i];
    if (t) {
      damage += t.damageBonus;
      range += t.rangeBonus;
      pierce += t.pierceBonus;
      if (t.fireRateBonus > 1) {
        fireRateBonusSum += t.fireRateBonus - 1;
      }
      if (t.structuralBonus > 1) {
        structuralMultiplierSum += t.structuralBonus - 1;
      }
      if (t.elementBonus) element = t.elementBonus;
    }
  }

  // Apply permanent research upgrades
  if (researchPurchased.includes('res_aerodynamics')) {
    projectileSpeed *= 1.15;
  }
  if (researchPurchased.includes('res_rapid_reload')) {
    fireRateBonusSum += 0.12;
  }
  if (researchPurchased.includes('res_calibrated_optics')) {
    range *= 1.18;
  }
  if (researchPurchased.includes('res_dual_launchers')) {
    pierce += 1;
  }

  const fireRate = Math.min(15, def.baseFireRate * (1 + fireRateBonusSum));
  const finalStructuralDmg = structuralDamage * (1 + structuralMultiplierSum);
  const dps = Math.round(damage * fireRate);

  return {
    damage: Math.round(damage),
    fireRate: Number(fireRate.toFixed(2)),
    range: Math.round(range),
    projectileSpeed: Math.round(projectileSpeed),
    pierce,
    structuralDamage: Math.round(finalStructuralDmg),
    element,
    dps,
  };
}

/**
 * Returns the effective attack range of a tower.
 * Used for both combat targeting and canvas visualization to guarantee 100% consistency.
 */
export function getEffectiveTowerRange(
  tower: PlacedTower | { typeId: PlacedTower['typeId']; tiers: PlacedTower['tiers'] },
  researchPurchased: string[] = []
): number {
  return getEffectiveTowerStats(tower, researchPurchased).range;
}

/**
 * Calculate stat preview delta when previewing an upgrade tier
 */
export function getUpgradePreviewDelta(
  tower: PlacedTower,
  pathKey: 'path_a' | 'path_b' | 'path_c',
  researchPurchased: string[] = []
): { current: EffectiveTowerStats; next: EffectiveTowerStats } | null {
  const def = TOWERS_DATA[tower.typeId];
  if (!def) return null;
  const currentTierIndex = tower.tiers[pathKey];
  const nextTier = def.paths[pathKey].tiers[currentTierIndex];
  if (!nextTier) return null;

  const currentStats = getEffectiveTowerStats(tower, researchPurchased);
  const nextTiers = { ...tower.tiers, [pathKey]: currentTierIndex + 1 };
  const nextStats = getEffectiveTowerStats({ typeId: tower.typeId, tiers: nextTiers }, researchPurchased);

  return {
    current: currentStats,
    next: nextStats,
  };
}

export const computeEffectiveTowerStats = getEffectiveTowerStats;
