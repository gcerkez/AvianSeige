import { DailyMission, DailyMissionType, EnemyArchetype } from '../types/game';

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Simple deterministic hash from date string to select daily missions
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  targetType: DailyMissionType;
  enemyArchetype?: EnemyArchetype;
  targetCount: number;
  rewardAcorns: number;
  rewardAdvancedTokens: number;
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'dm_survive_15',
    title: 'Hold the Perimeter',
    description: 'Survive 15 enemy waves without nest collapse.',
    targetType: 'survive_waves',
    targetCount: 15,
    rewardAcorns: 35,
    rewardAdvancedTokens: 5,
  },
  {
    id: 'dm_defeat_armored',
    title: 'Bucket Breakers',
    description: 'Defeat 35 Armored Pigs using piercing or explosive attacks.',
    targetType: 'defeat_enemies',
    enemyArchetype: 'armored',
    targetCount: 35,
    rewardAcorns: 30,
    rewardAdvancedTokens: 5,
  },
  {
    id: 'dm_trigger_combos',
    title: 'Tactical Synchronicity',
    description: 'Trigger 6 deliberate tower combo active abilities.',
    targetType: 'trigger_combos',
    targetCount: 6,
    rewardAcorns: 40,
    rewardAdvancedTokens: 6,
  },
  {
    id: 'dm_destroy_structures',
    title: 'Structural Demolition',
    description: 'Demolish 8 enemy barricades, towers, or support arches.',
    targetType: 'destroy_structures',
    targetCount: 8,
    rewardAcorns: 35,
    rewardAdvancedTokens: 5,
  },
  {
    id: 'dm_deploy_flying',
    title: 'Airspace Superiority',
    description: 'Deploy an aerial Harrier and configure its flight route.',
    targetType: 'deploy_flying',
    targetCount: 1,
    rewardAcorns: 25,
    rewardAdvancedTokens: 4,
  },
  {
    id: 'dm_complete_level',
    title: 'Campaign Triumph',
    description: 'Achieve victory in any campaign level.',
    targetType: 'complete_level',
    targetCount: 1,
    rewardAcorns: 50,
    rewardAdvancedTokens: 8,
  },
  {
    id: 'dm_defeat_gliders',
    title: 'Anti-Air Flak',
    description: 'Shoot down 20 airborne Glider Pigs before they reach the nest.',
    targetType: 'defeat_enemies',
    enemyArchetype: 'glider',
    targetCount: 20,
    rewardAcorns: 35,
    rewardAdvancedTokens: 5,
  },
];

/**
 * Returns today's daily missions, regenerating only when the date has changed
 */
export function getOrGenerateDailyMissions(
  savedDate?: string,
  savedMissions?: DailyMission[]
): { date: string; missions: DailyMission[] } {
  const today = getTodayDateString();

  if (savedDate === today && savedMissions && savedMissions.length === 3) {
    return { date: today, missions: savedMissions };
  }

  // Deterministically select 3 distinct missions for today
  const seed = hashString(today);
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    return (hashString(today + a.id) % 100) - (hashString(today + b.id) % 100);
  });

  const selectedTemplates = shuffled.slice(0, 3);
  const newMissions: DailyMission[] = selectedTemplates.map((t) => ({
    id: `${t.id}_${today}`,
    title: t.title,
    description: t.description,
    targetType: t.targetType,
    enemyArchetype: t.enemyArchetype,
    targetCount: t.targetCount,
    currentCount: 0,
    completed: false,
    claimed: false,
    rewardAcorns: t.rewardAcorns,
    rewardAdvancedTokens: t.rewardAdvancedTokens,
  }));

  return { date: today, missions: newMissions };
}

/**
 * Updates progress for active daily missions
 */
export function updateDailyMissionProgress(
  missions: DailyMission[],
  type: DailyMissionType,
  amount = 1,
  enemyType?: EnemyArchetype
): { missions: DailyMission[]; newlyCompleted: boolean } {
  let newlyCompleted = false;

  const updated = missions.map((m) => {
    if (m.completed) return m;
    if (m.targetType !== type) return m;

    if (m.enemyArchetype && enemyType && m.enemyArchetype !== enemyType) {
      return m;
    }

    const nextCount = Math.min(m.targetCount, m.currentCount + amount);
    const completed = nextCount >= m.targetCount;
    if (completed && !m.completed) {
      newlyCompleted = true;
    }

    return {
      ...m,
      currentCount: nextCount,
      completed,
    };
  });

  return { missions: updated, newlyCompleted };
}

/**
 * Claims a completed daily mission's reward exactly once
 */
export function claimDailyMissionReward(
  missions: DailyMission[],
  missionId: string
): { missions: DailyMission[]; awardedAcorns: number; awardedAdvancedTokens: number } | null {
  const mission = missions.find((m) => m.id === missionId);
  if (!mission || !mission.completed || mission.claimed) {
    return null;
  }

  const updated = missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m));

  return {
    missions: updated,
    awardedAcorns: mission.rewardAcorns,
    awardedAdvancedTokens: mission.rewardAdvancedTokens,
  };
}
