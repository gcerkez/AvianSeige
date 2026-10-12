import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllSaveSlots,
  getActiveSaveSlot,
  setActiveSlotId,
  saveSlot,
  renameSaveSlot,
  overwriteSaveSlot,
  deleteSaveSlot,
  migrateLegacySave,
} from '../utils/saveManager';

describe('Multi-Slot Save Management & Legacy Migration', () => {
  // In-memory localStorage mock for node test runner
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      length: 0,
      key: (index: number) => Object.keys(storage)[index] || null,
    };
  });

  it('initializes 3 distinct save slots by default', () => {
    const slots = getAllSaveSlots();
    expect(slots.length).toBe(3);
    expect(slots[0].id).toBe('slot_1');
    expect(slots[1].id).toBe('slot_2');
    expect(slots[2].id).toBe('slot_3');
  });

  it('persists and retrieves active save slot', () => {
    setActiveSlotId('slot_2');
    const active = getActiveSaveSlot();
    expect(active.id).toBe('slot_2');
  });

  it('renames a save slot without losing progression', () => {
    const original = getActiveSaveSlot();
    original.progression.feathers = 500;
    saveSlot(original);

    const updated = renameSaveSlot('slot_1', 'Grand Master Nest');
    expect(updated.name).toBe('Grand Master Nest');

    const retrieved = getAllSaveSlots().find((s) => s.id === 'slot_1');
    expect(retrieved?.name).toBe('Grand Master Nest');
    expect(retrieved?.progression.feathers).toBe(500);
  });

  it('resets / overwrites a save slot with fresh state', () => {
    const slot = getActiveSaveSlot();
    slot.progression.feathers = 9999;
    saveSlot(slot);

    const overwritten = overwriteSaveSlot('slot_1', 'Fresh Start');
    expect(overwritten.name).toBe('Fresh Start');
    expect(overwritten.progression.feathers).toBe(800);
  });

  it('deletes a save slot by resetting to empty', () => {
    deleteSaveSlot('slot_2');
    const slot2 = getAllSaveSlots().find((s) => s.id === 'slot_2');
    expect(slot2?.name).toBe('Empty Slot 2');
    expect(slot2?.progression.feathers).toBe(800);
  });

  it('migrates legacy v1 save data into slot 1 seamlessly', () => {
    // Seed v1 legacy keys
    storage['avian_siege_save_v1'] = JSON.stringify({
      feathers: 1250,
      acorns: 45,
      shards: 12,
      unlockedTowers: ['cardinal', 'owl', 'falcon'],
    });
    storage['avian_siege_settings'] = JSON.stringify({
      sfxVolume: 0.8,
      musicVolume: 0.5,
    });

    const migrated = migrateLegacySave();
    expect(migrated).not.toBeNull();
    if (migrated) {
      expect(migrated[0].id).toBe('slot_1');
      expect(migrated[0].progression.feathers).toBe(1250);
      expect(migrated[0].progression.acorns).toBe(45);
      expect(migrated[0].settings.sfxVolume).toBe(0.8);
    }
  });
});
