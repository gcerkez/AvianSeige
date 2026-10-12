import { describe, it, expect } from 'vitest';
import { generateTowerReward, RewardTierType } from '../utils/rewardGenerator';
import { TOWERS_DATA } from '../data/towers';

describe('Tower Reward & Pre-Upgraded Loadout Generator', () => {
  const tiers: RewardTierType[] = ['campaign_clear', 'boss_clear', 'round_100', 'round_200'];

  tiers.forEach((tier) => {
    it(`generates valid loadouts for tier: ${tier}`, () => {
      for (let i = 0; i < 15; i++) {
        const reward = generateTowerReward(tier, `Test Source ${i}`);

        expect(reward.id).toBeTruthy();
        expect(reward.name).toBeTruthy();
        expect(TOWERS_DATA[reward.typeId]).toBeDefined();

        // Enforce valid tier bounds (0 to 5)
        expect(reward.tiers.path_a).toBeGreaterThanOrEqual(0);
        expect(reward.tiers.path_a).toBeLessThanOrEqual(5);
        expect(reward.tiers.path_b).toBeGreaterThanOrEqual(0);
        expect(reward.tiers.path_b).toBeLessThanOrEqual(5);
        expect(reward.tiers.path_c).toBeGreaterThanOrEqual(0);
        expect(reward.tiers.path_c).toBeLessThanOrEqual(5);

        // Bloons TD 6 rule: At most 2 paths invested; 3rd path strictly 0
        const activePaths = [
          reward.tiers.path_a > 0,
          reward.tiers.path_b > 0,
          reward.tiers.path_c > 0,
        ].filter(Boolean).length;
        expect(activePaths).toBeLessThanOrEqual(2);

        // Total tiers invested should be > 0
        const totalTiers = reward.tiers.path_a + reward.tiers.path_b + reward.tiers.path_c;
        expect(totalTiers).toBeGreaterThan(0);
      }
    });
  });

  it('respects preferred tower type when specified', () => {
    const reward = generateTowerReward('round_100', 'Centurion Test', ['cardinal', 'harrier'], 'harrier');
    expect(reward.typeId).toBe('harrier');
  });

  it('enforces tier progression budget limits', () => {
    const campaignReward = generateTowerReward('campaign_clear', 'Campaign Lvl 1');
    const campaignTotal =
      campaignReward.tiers.path_a + campaignReward.tiers.path_b + campaignReward.tiers.path_c;
    expect(campaignTotal).toBeLessThanOrEqual(3);

    const round200Reward = generateTowerReward('round_200', 'Apex Round 200');
    const round200Total =
      round200Reward.tiers.path_a + round200Reward.tiers.path_b + round200Reward.tiers.path_c;
    expect(round200Total).toBeGreaterThanOrEqual(5);
  });
});
