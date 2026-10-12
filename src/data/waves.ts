import { Wave, EnemyArchetype } from '../types/game';

/**
 * Generates progressive 40+ waves matching BTD6-style scaling,
 * plus procedural infinite scaling for endless mode.
 */
export function generateProgressiveWaves(
  bossType?: EnemyArchetype,
  totalWaves: number = 40
): Wave[] {
  const waves: Wave[] = [];

  for (let w = 1; w <= totalWaves; w++) {
    let description = '';
    const groups: { type: EnemyArchetype; count: number; spawnInterval: number; delay: number }[] = [];

    if (w <= 3) {
      // Early scouts
      const count = 8 + w * 4;
      description = `Scout Reconnaissance (${count} pigs)`;
      groups.push({
        type: 'scout',
        count,
        spawnInterval: Math.max(0.5, 1.2 - w * 0.12),
        delay: 0,
      });
    } else if (w <= 7) {
      // Armored pigs introduced
      const scouts = 12 + w * 2;
      const armored = Math.floor(w * 1.6);
      description = `Armored Vanguard (${armored} Armored, ${scouts} Scouts)`;
      groups.push({ type: 'scout', count: scouts, spawnInterval: 0.7, delay: 0 });
      groups.push({ type: 'armored', count: armored, spawnInterval: 1.6, delay: 2.0 });
    } else if (w <= 12) {
      // Shield Phalanx and Bombers
      const shields = 5 + Math.floor(w * 0.9);
      const bombers = 4 + Math.floor(w * 0.7);
      const armored = 6 + Math.floor(w * 0.6);
      description = `Shield Phalanx with Bomber Rush (${shields} Shields, ${bombers} Bombers)`;
      groups.push({ type: 'shield', count: shields, spawnInterval: 1.4, delay: 0 });
      groups.push({ type: 'bomber', count: bombers, spawnInterval: 1.1, delay: 2.0 });
      groups.push({ type: 'armored', count: armored, spawnInterval: 1.3, delay: 3.5 });
    } else if (w <= 18) {
      // Gliders appear (Aerial threat)
      const gliders = 8 + Math.floor(w * 0.9);
      const scouts = 20;
      const builders = 4 + Math.floor(w * 0.5);
      description = `Aerial Glider Incursion (${gliders} Gliders)`;
      groups.push({ type: 'glider', count: gliders, spawnInterval: 1.1, delay: 0 });
      groups.push({ type: 'scout', count: scouts, spawnInterval: 0.45, delay: 1.5 });
      groups.push({ type: 'builder', count: builders, spawnInterval: 1.8, delay: 3.0 });
    } else if (w === 20 || w === 40 || w === 60 || w === 80) {
      // Major Milestone Boss Waves
      const milestoneBoss: EnemyArchetype =
        bossType ||
        (w === totalWaves
          ? 'iron_boar'
          : w === 20
          ? 'iron_boar'
          : w === 40
          ? 'frost_hog'
          : w === 60
          ? 'storm_king'
          : 'mecha_boar');

      description = `MILESTONE CLIMAX: Wave ${w} Boss Assault!`;
      groups.push({ type: 'shield', count: 14 + Math.floor(w / 4), spawnInterval: 1.0, delay: 0 });
      groups.push({ type: 'armored', count: 18 + Math.floor(w / 4), spawnInterval: 0.9, delay: 1.5 });
      groups.push({ type: milestoneBoss, count: 1, spawnInterval: 1.0, delay: 4.5 });
      groups.push({ type: 'glider', count: 16 + Math.floor(w / 4), spawnInterval: 0.8, delay: 6.5 });
      groups.push({ type: 'bomber', count: 12 + Math.floor(w / 5), spawnInterval: 0.7, delay: 8.5 });
    } else if (w <= 30) {
      // Dense mixed swarms
      const scouts = 25 + (w - 20) * 2;
      const armored = 12 + (w - 20);
      const shields = 10 + (w - 20);
      const bombers = 8 + Math.floor((w - 20) * 0.8);
      description = `Heavy Combined Legion (Wave ${w})`;
      groups.push({ type: 'scout', count: scouts, spawnInterval: 0.35, delay: 0 });
      groups.push({ type: 'armored', count: armored, spawnInterval: 0.9, delay: 1.5 });
      groups.push({ type: 'shield', count: shields, spawnInterval: 1.0, delay: 2.8 });
      groups.push({ type: 'bomber', count: bombers, spawnInterval: 0.75, delay: 4.2 });
    } else if (w <= 39) {
      // High-intensity aerial & armored coordination
      const gliders = 18 + (w - 30);
      const armored = 18 + (w - 30);
      const shields = 14 + (w - 30);
      const builders = 8;
      description = `Siege Force with Aerial Swarm (Wave ${w})`;
      groups.push({ type: 'glider', count: gliders, spawnInterval: 0.8, delay: 0 });
      groups.push({ type: 'shield', count: shields, spawnInterval: 0.85, delay: 1.0 });
      groups.push({ type: 'armored', count: armored, spawnInterval: 0.8, delay: 2.2 });
      groups.push({ type: 'builder', count: builders, spawnInterval: 1.4, delay: 4.0 });
    } else {
      // High waves (41-100)
      const scale = 1 + (w - 40) * 0.04;
      description = `Endgame Pig Army (Wave ${w})`;
      groups.push({ type: 'scout', count: Math.round(35 * scale), spawnInterval: 0.25, delay: 0 });
      groups.push({ type: 'shield', count: Math.round(18 * scale), spawnInterval: 0.7, delay: 1.5 });
      groups.push({ type: 'armored', count: Math.round(22 * scale), spawnInterval: 0.7, delay: 3.0 });
      groups.push({ type: 'glider', count: Math.round(20 * scale), spawnInterval: 0.65, delay: 4.5 });
      groups.push({ type: 'bomber', count: Math.round(16 * scale), spawnInterval: 0.55, delay: 6.0 });
    }

    waves.push({
      waveNumber: w,
      groups,
      description,
      isBossWave: w === totalWaves || w % 20 === 0,
    });
  }

  return waves;
}

/**
 * Generates dynamic endless waves past wave 40 (e.g. Wave 41, 60, 80, 100...)
 */
export function generateEndlessWave(waveNum: number): Wave {
  const scale = 1 + (waveNum - 40) * 0.08;
  const isMilestone = waveNum % 20 === 0;

  const groups: { type: EnemyArchetype; count: number; spawnInterval: number; delay: number }[] = [
    {
      type: 'scout',
      count: Math.round(30 * scale),
      spawnInterval: Math.max(0.15, 0.4 / scale),
      delay: 0,
    },
    {
      type: 'armored',
      count: Math.round(18 * scale),
      spawnInterval: Math.max(0.4, 0.9 / scale),
      delay: 1.5,
    },
    {
      type: 'shield',
      count: Math.round(15 * scale),
      spawnInterval: Math.max(0.5, 1.0 / scale),
      delay: 3.0,
    },
    {
      type: 'glider',
      count: Math.round(16 * scale),
      spawnInterval: Math.max(0.4, 0.8 / scale),
      delay: 4.5,
    },
    {
      type: 'bomber',
      count: Math.round(14 * scale),
      spawnInterval: Math.max(0.4, 0.7 / scale),
      delay: 6.0,
    },
  ];

  if (isMilestone) {
    const bossType: EnemyArchetype =
      waveNum % 60 === 0 ? 'storm_king' : waveNum % 40 === 0 ? 'frost_hog' : 'iron_boar';
    groups.push({
      type: bossType,
      count: 1 + Math.floor((waveNum - 40) / 40),
      spawnInterval: 4.0,
      delay: 8.0,
    });
  }

  return {
    waveNumber: waveNum,
    groups,
    description: `Endless Wave ${waveNum}: Overclocked Horde (x${scale.toFixed(1)} Density)`,
    isBossWave: isMilestone,
  };
}
