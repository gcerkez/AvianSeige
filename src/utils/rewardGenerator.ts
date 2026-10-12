import { TowerTypeId, RewardedTowerLoadout } from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { getEffectiveTowerStats } from './towerStats';

export type RewardTierType = 'campaign_clear' | 'boss_clear' | 'round_100' | 'round_200';

interface RewardConfig {
  budgetMin: number;
  budgetMax: number;
  primaryMax: number;
  secondaryMax: number;
  label: 'Common Loadout' | 'Veteran Loadout' | 'Elite Loadout' | 'Apex Loadout';
}

const REWARD_CONFIGS: Record<RewardTierType, RewardConfig> = {
  campaign_clear: {
    budgetMin: 2,
    budgetMax: 3,
    primaryMax: 2,
    secondaryMax: 1,
    label: 'Common Loadout',
  },
  boss_clear: {
    budgetMin: 3,
    budgetMax: 5,
    primaryMax: 3,
    secondaryMax: 2,
    label: 'Veteran Loadout',
  },
  round_100: {
    budgetMin: 6,
    budgetMax: 7,
    primaryMax: 4,
    secondaryMax: 3,
    label: 'Elite Loadout',
  },
  round_200: {
    budgetMin: 8,
    budgetMax: 9,
    primaryMax: 5,
    secondaryMax: 4,
    label: 'Apex Loadout',
  },
};

const ALL_TOWER_TYPES: TowerTypeId[] = [
  'cardinal',
  'owl',
  'falcon',
  'woodpecker',
  'penguin',
  'phoenix',
  'bomb_bird',
  'harrier',
];

/**
 * Generates a balanced, valid pre-upgraded tower loadout.
 * Strictly enforces valid paths:
 * - Max 5 tiers per path
 * - At most 2 paths active (third path is locked)
 * - Valid prerequisite progression
 */
export function generateTowerReward(
  tier: RewardTierType,
  sourceName: string,
  unlockedTowers: TowerTypeId[] = ALL_TOWER_TYPES,
  preferredTypeId?: TowerTypeId
): RewardedTowerLoadout {
  const eligibleTypes = unlockedTowers.length > 0 ? unlockedTowers : ALL_TOWER_TYPES;
  const typeId =
    preferredTypeId && eligibleTypes.includes(preferredTypeId)
      ? preferredTypeId
      : eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];

  const config = REWARD_CONFIGS[tier];
  const targetBudget = Math.floor(
    Math.random() * (config.budgetMax - config.budgetMin + 1) + config.budgetMin
  );

  // Pick primary and secondary paths (3rd is locked to obey 2-path restriction)
  const paths = ['path_a', 'path_b', 'path_c'] as const;
  const shuffledPaths = [...paths].sort(() => Math.random() - 0.5);
  const primaryPath = shuffledPaths[0];
  const secondaryPath = shuffledPaths[1];
  const lockedPath = shuffledPaths[2];

  // Distribute budget between primary and secondary
  const primaryPoints = Math.min(
    config.primaryMax,
    Math.max(1, Math.ceil(targetBudget * 0.65))
  );
  const remainingBudget = targetBudget - primaryPoints;
  const secondaryPoints = Math.min(config.secondaryMax, Math.max(0, remainingBudget));

  const tiers = {
    path_a: 0,
    path_b: 0,
    path_c: 0,
  };
  tiers[primaryPath] = primaryPoints;
  tiers[secondaryPath] = secondaryPoints;

  const def = TOWERS_DATA[typeId];
  const primaryTierName = def?.paths[primaryPath]?.tiers[primaryPoints - 1]?.name || 'Specialized';
  const name = `${def?.name || 'Avian'} · ${primaryTierName}`;
  const title = `${config.label} (${tiers.path_a}-${tiers.path_b}-${tiers.path_c})`;

  // Calculate stats summary
  const stats = getEffectiveTowerStats({ typeId, tiers });
  const bonusStatsDescription = `Base Dmg: ${stats.damage} | Range: ${stats.range}px | Fire Rate: ${stats.fireRate}/s | Pierce: ${stats.pierce}`;

  return {
    id: `reward-tower-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    typeId,
    name,
    title,
    tierLabel: config.label,
    tiers,
    lockedPath: secondaryPoints > 0 ? lockedPath : null,
    earnedFrom: sourceName,
    earnedAt: Date.now(),
    isNew: true,
    bonusStatsDescription,
  };
}
