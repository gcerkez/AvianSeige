import { describe, it, expect } from 'vitest';
import {
  getOrGenerateDailyMissions,
  updateDailyMissionProgress,
  claimDailyMissionReward,
  getTodayDateString,
} from '../utils/dailyMissions';
import { DailyMission } from '../types/game';

describe('Daily Directives & Astral Token Missions', () => {
  it('generates 3 deterministic daily missions for today', () => {
    const today = getTodayDateString();
    const result1 = getOrGenerateDailyMissions();
    const result2 = getOrGenerateDailyMissions();

    expect(result1.date).toBe(today);
    expect(result1.missions.length).toBe(3);
    // Deterministic selection:
    expect(result1.missions.map((m) => m.id)).toEqual(result2.missions.map((m) => m.id));
  });

  it('preserves existing missions for today without overwriting progress', () => {
    const today = getTodayDateString();
    const existingMissions: DailyMission[] = [
      {
        id: `dm_test_${today}`,
        title: 'Test Directive',
        description: 'Test description',
        targetType: 'survive_waves',
        targetCount: 10,
        currentCount: 5,
        completed: false,
        claimed: false,
        rewardAcorns: 20,
        rewardAdvancedTokens: 3,
      },
      {
        id: `dm_test2_${today}`,
        title: 'Test 2',
        description: 'Test description 2',
        targetType: 'trigger_combos',
        targetCount: 5,
        currentCount: 2,
        completed: false,
        claimed: false,
        rewardAcorns: 20,
        rewardAdvancedTokens: 3,
      },
      {
        id: `dm_test3_${today}`,
        title: 'Test 3',
        description: 'Test description 3',
        targetType: 'defeat_enemies',
        targetCount: 15,
        currentCount: 15,
        completed: true,
        claimed: false,
        rewardAcorns: 20,
        rewardAdvancedTokens: 3,
      },
    ];

    const result = getOrGenerateDailyMissions(today, existingMissions);
    expect(result.missions).toEqual(existingMissions);
    expect(result.missions[0].currentCount).toBe(5);
  });

  it('updates daily mission progress and flags completion', () => {
    const missions: DailyMission[] = [
      {
        id: 'dm_1',
        title: 'Survive Waves',
        description: 'Survive 5 waves',
        targetType: 'survive_waves',
        targetCount: 5,
        currentCount: 4,
        completed: false,
        claimed: false,
        rewardAcorns: 30,
        rewardAdvancedTokens: 5,
      },
    ];

    const { missions: updated, newlyCompleted } = updateDailyMissionProgress(missions, 'survive_waves', 1);
    expect(newlyCompleted).toBe(true);
    expect(updated[0].currentCount).toBe(5);
    expect(updated[0].completed).toBe(true);
  });

  it('filters progress by enemy archetype when specified', () => {
    const missions: DailyMission[] = [
      {
        id: 'dm_armored',
        title: 'Defeat Armored',
        description: 'Defeat armored pigs',
        targetType: 'defeat_enemies',
        enemyArchetype: 'armored',
        targetCount: 10,
        currentCount: 0,
        completed: false,
        claimed: false,
        rewardAcorns: 30,
        rewardAdvancedTokens: 5,
      },
    ];

    // Kill a scout pig -> should NOT increment armored mission
    const result1 = updateDailyMissionProgress(missions, 'defeat_enemies', 1, 'scout');
    expect(result1.missions[0].currentCount).toBe(0);

    // Kill an armored pig -> should increment
    const result2 = updateDailyMissionProgress(missions, 'defeat_enemies', 1, 'armored');
    expect(result2.missions[0].currentCount).toBe(1);
  });

  it('claims mission reward exactly once and prevents duplicate claims', () => {
    const completedMission: DailyMission = {
      id: 'dm_claim_test',
      title: 'Claim Test',
      description: 'Completed mission',
      targetType: 'survive_waves',
      targetCount: 10,
      currentCount: 10,
      completed: true,
      claimed: false,
      rewardAcorns: 50,
      rewardAdvancedTokens: 8,
    };

    const firstClaim = claimDailyMissionReward([completedMission], 'dm_claim_test');
    expect(firstClaim).not.toBeNull();
    if (firstClaim) {
      expect(firstClaim.awardedAcorns).toBe(50);
      expect(firstClaim.awardedAdvancedTokens).toBe(8);
      expect(firstClaim.missions[0].claimed).toBe(true);

      // Attempt second claim
      const secondClaim = claimDailyMissionReward(firstClaim.missions, 'dm_claim_test');
      expect(secondClaim).toBeNull();
    }
  });

  it('rejects claiming an incomplete mission', () => {
    const incompleteMission: DailyMission = {
      id: 'dm_incomplete',
      title: 'Incomplete',
      description: 'Incomplete mission',
      targetType: 'survive_waves',
      targetCount: 10,
      currentCount: 4,
      completed: false,
      claimed: false,
      rewardAcorns: 50,
      rewardAdvancedTokens: 8,
    };

    const claim = claimDailyMissionReward([incompleteMission], 'dm_incomplete');
    expect(claim).toBeNull();
  });
});
