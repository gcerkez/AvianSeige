import { SaveSlotData, PlayerProgression, GameSettings } from '../types/game';

const SLOTS_STORAGE_KEY = 'avian_siege_slots_v2';
const ACTIVE_SLOT_KEY = 'avian_siege_active_slot_id';
const LEGACY_V1_KEY = 'avian_siege_save_v1';

export function createDefaultProgression(): PlayerProgression {
  return {
    feathers: 800,
    acorns: 60,
    shards: 15,
    tokens: 30,
    advancedTokens: 10,
    unlockedTowers: ['cardinal', 'owl', 'falcon', 'woodpecker', 'penguin', 'phoenix', 'bomb_bird', 'harrier'],
    completedLevels: {},
    researchPurchased: [],
    ownedSkins: ['skin_cardinal_classic', 'skin_owl_classic', 'skin_falcon_classic', 'skin_harrier_classic'],
    equippedSkins: {
      cardinal: 'skin_cardinal_classic',
      owl: 'skin_owl_classic',
      falcon: 'skin_falcon_classic',
      woodpecker: 'skin_woodpecker_classic',
      penguin: 'skin_penguin_classic',
      phoenix: 'skin_phoenix_classic',
      bomb_bird: 'skin_bomb_bird_classic',
      harrier: 'skin_harrier_classic',
    },
    rewardedTowers: [],
    claimedMilestones: {},
    dailyMissionsDate: undefined,
    dailyMissions: [],
  };
}

export function createDefaultSettings(): GameSettings {
  return {
    masterVolume: 0.8,
    sfxVolume: 0.9,
    musicVolume: 0.7,
    screenShake: true,
    shakeIntensity: 0.8,
    showDamageNumbers: true,
    gameSpeed: 1,
    difficulty: 'normal',
    autoStartNextWave: true,
    reducedMotion: false,
  };
}

/**
 * Migrates legacy v1 save to modern slot 1 if present
 */
export function migrateLegacySave(): SaveSlotData[] | null {
  try {
    const rawLegacy = localStorage.getItem(LEGACY_V1_KEY);
    if (!rawLegacy) return null;

    const parsed = JSON.parse(rawLegacy);
    const progression: PlayerProgression = {
      ...createDefaultProgression(),
      ...parsed,
      unlockedTowers: Array.from(
        new Set([...(parsed.unlockedTowers || []), 'cardinal', 'owl', 'falcon', 'woodpecker', 'penguin', 'phoenix', 'bomb_bird', 'harrier'])
      ),
      advancedTokens: parsed.advancedTokens ?? 10,
      rewardedTowers: parsed.rewardedTowers ?? [],
      claimedMilestones: parsed.claimedMilestones ?? {},
    };

    let settings = createDefaultSettings();
    try {
      const rawSettings = localStorage.getItem('avian_siege_settings');
      if (rawSettings) {
        settings = { ...settings, ...JSON.parse(rawSettings) };
      }
    } catch {
      // ignore
    }

    const slot1: SaveSlotData = {
      id: 'slot_1',
      name: 'Legacy Commander',
      version: 2,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      highestWaveReached: 40,
      progression,
      settings,
    };

    const slots = [
      slot1,
      {
        id: 'slot_2',
        name: 'Cadet Nest',
        version: 2,
        lastPlayed: Date.now(),
        createdAt: Date.now(),
        highestWaveReached: 0,
        progression: createDefaultProgression(),
        settings: createDefaultSettings(),
      },
      {
        id: 'slot_3',
        name: 'Apex Talon',
        version: 2,
        lastPlayed: Date.now(),
        createdAt: Date.now(),
        highestWaveReached: 0,
        progression: createDefaultProgression(),
        settings: createDefaultSettings(),
      },
    ];

    localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(slots));
    if (!localStorage.getItem(ACTIVE_SLOT_KEY)) {
      localStorage.setItem(ACTIVE_SLOT_KEY, 'slot_1');
    }
    return slots;
  } catch {
    return null;
  }
}

/**
 * Retrieves all save slots
 */
export function getAllSaveSlots(): SaveSlotData[] {
  try {
    const raw = localStorage.getItem(SLOTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveSlotData[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  // Check legacy migration
  const migrated = migrateLegacySave();
  if (migrated) return migrated;

  // Otherwise initialize default 3 slots
  const defaultSlots: SaveSlotData[] = [
    {
      id: 'slot_1',
      name: 'Commander Slot 1',
      version: 2,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      highestWaveReached: 0,
      progression: createDefaultProgression(),
      settings: createDefaultSettings(),
    },
    {
      id: 'slot_2',
      name: 'Commander Slot 2',
      version: 2,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      highestWaveReached: 0,
      progression: createDefaultProgression(),
      settings: createDefaultSettings(),
    },
    {
      id: 'slot_3',
      name: 'Commander Slot 3',
      version: 2,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      highestWaveReached: 0,
      progression: createDefaultProgression(),
      settings: createDefaultSettings(),
    },
  ];

  try {
    localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(defaultSlots));
    if (!localStorage.getItem(ACTIVE_SLOT_KEY)) {
      localStorage.setItem(ACTIVE_SLOT_KEY, 'slot_1');
    }
  } catch {
    // ignore
  }

  return defaultSlots;
}

/**
 * Returns currently active slot id
 */
export function getActiveSlotId(): string {
  try {
    return localStorage.getItem(ACTIVE_SLOT_KEY) || 'slot_1';
  } catch {
    return 'slot_1';
  }
}

/**
 * Sets active slot id
 */
export function setActiveSlotId(slotId: string): void {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId);
  } catch {
    // ignore
  }
}

export const setActiveSaveSlotId = setActiveSlotId;

/**
 * Returns currently active save slot data
 */
export function getActiveSaveSlot(): SaveSlotData {
  const slots = getAllSaveSlots();
  const activeId = getActiveSlotId();
  return slots.find((s) => s.id === activeId) || slots[0];
}

/**
 * Saves slot data and commits to local storage
 */
export function saveSlot(slotData: SaveSlotData): void {
  try {
    const slots = getAllSaveSlots();
    const index = slots.findIndex((s) => s.id === slotData.id);
    const updated = { ...slotData, lastPlayed: Date.now() };

    if (index >= 0) {
      slots[index] = updated;
    } else {
      slots.push(updated);
    }

    localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(slots));
    // Also keep active slot ID synced
    localStorage.setItem(ACTIVE_SLOT_KEY, slotData.id);
  } catch {
    // storage error handling
  }
}

/**
 * Renames a save slot
 */
export function renameSaveSlot(slotId: string, newName: string): SaveSlotData {
  const slots = getAllSaveSlots();
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`Slot ${slotId} not found`);

  slot.name = newName.trim() || `Slot ${slotId}`;
  slot.lastPlayed = Date.now();
  saveSlot(slot);
  return slot;
}

/**
 * Overwrites / resets a save slot
 */
export function overwriteSaveSlot(slotId: string, customName?: string): SaveSlotData {
  const slots = getAllSaveSlots();
  const existing = slots.find((s) => s.id === slotId);
  const name = customName || existing?.name || `Slot ${slotId}`;

  const resetSlot: SaveSlotData = {
    id: slotId,
    name,
    version: 2,
    lastPlayed: Date.now(),
    createdAt: Date.now(),
    highestWaveReached: 0,
    progression: createDefaultProgression(),
    settings: createDefaultSettings(),
  };

  saveSlot(resetSlot);
  return resetSlot;
}

/**
 * Deletes / resets slot
 */
export function deleteSaveSlot(slotId: string): void {
  overwriteSaveSlot(slotId, `Empty Slot ${slotId.replace('slot_', '')}`);
}
