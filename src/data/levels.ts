import { LevelDefinition, StructureBlock, MaterialType, EnemyArchetype } from '../types/game';
import { generateProgressiveWaves } from './waves';

export interface CampaignRegionMeta {
  id: string;
  name: string;
  subtitle: string;
  themeColor: string;
  description: string;
  featuredBird: string;
  featuredBirdName: string;
  featuredBirdBonus: string;
}

export const CAMPAIGN_REGIONS: CampaignRegionMeta[] = [
  {
    id: 'region_greencrest',
    name: 'Greencrest Meadows',
    subtitle: 'Timber bastions & scout raiding parties',
    themeColor: '#16A34A',
    description: 'Learn the fundamentals of physical destruction against wooden fortifications across winding riverbanks.',
    featuredBird: 'cardinal',
    featuredBirdName: 'Cardinal & Woodpecker',
    featuredBirdBonus: '+25% Dart Velocity & Wood Demolition',
  },
  {
    id: 'region_copperwood',
    name: 'Copperwood Canyon',
    subtitle: 'Stone arches & heavy demolition',
    themeColor: '#D97706',
    description: 'Long hairpin canyon roads and the legendary confrontation against The Iron Boar.',
    featuredBird: 'owl',
    featuredBirdName: 'Owl Mortar & Bomb Finch',
    featuredBirdBonus: '+30% Artillery Splash & Stone Shatter',
  },
  {
    id: 'region_frozen',
    name: 'Frozen Feather Peaks',
    subtitle: 'Glaciers, ice structures & aerial gliders',
    themeColor: '#0284C7',
    description: 'Slippery switchbacks, cryogenic frost towers, and airborne pig gliders.',
    featuredBird: 'penguin',
    featuredBirdName: 'Penguin Cryomancer',
    featuredBirdBonus: '+40% Cryo Freeze Duration & Ice Shatter',
  },
  {
    id: 'region_emberfall',
    name: 'Emberfall Foundry',
    subtitle: 'Metal frameworks, molten conduits & fire',
    themeColor: '#EA580C',
    description: 'Conduct electricity through steel and ignite oil reserves with Phoenix fire.',
    featuredBird: 'phoenix',
    featuredBirdName: 'Phoenix Pyromancer',
    featuredBirdBonus: '+35% Thermite Ignition & Metal Melt',
  },
  {
    id: 'region_thunderclap',
    name: 'Thunderclap Isles',
    subtitle: 'Floating platforms & elemental storm circuits',
    themeColor: '#7C3AED',
    description: 'Create multi-tower elemental circuits across winding aerial paths to defend the sacred high nests.',
    featuredBird: 'falcon',
    featuredBirdName: 'Falcon Interceptor',
    featuredBirdBonus: '+30% Supersonic Pierce & Circuit Chain',
  },
  {
    id: 'region_citadel',
    name: 'The Iron Hog Citadel',
    subtitle: 'Endgame siege of the pig stronghold',
    themeColor: '#DC2626',
    description: 'Full-scale siege combining every elemental synergy, free placement combos, and demolition strategy.',
    featuredBird: 'bomb_bird',
    featuredBirdName: 'Bomb Finch & Grand Legion',
    featuredBirdBonus: '+50% Megaton Demolition & Wall Breaching',
  },
];

// Helper to proceduralize winding curvy road waypoints per level number
function generateWaypoints(levelNum: number, regionId: string) {
  const seed = (levelNum * 17) % 100;
  const isHighCurvature = levelNum % 2 === 0;

  // Alternate between S-Curve, Double-Hairpin, and Central Loop
  if (levelNum % 3 === 0) {
    // Double-hairpin gorge
    return [
      { x: 30, y: 70 + (seed % 30) },
      { x: 220, y: 80 + (seed % 20) },
      { x: 320, y: 160 },
      { x: 260, y: 280 },
      { x: 120, y: 320 },
      { x: 80, y: 440 },
      { x: 260, y: 490 },
      { x: 440, y: 440 },
      { x: 490, y: 300 }, // Chokepoint under structures
      { x: 620, y: 180 },
      { x: 740, y: 200 },
      { x: 820, y: 340 },
      { x: 860, y: 480 },
    ];
  } else if (levelNum % 3 === 1) {
    // Serpentine River Loop
    return [
      { x: 20, y: 120 },
      { x: 180, y: 140 },
      { x: 260, y: 220 },
      { x: 200, y: 340 },
      { x: 120, y: 440 },
      { x: 280, y: 470 },
      { x: 420, y: 410 },
      { x: 460, y: 290 }, // Chokepoint under structures
      { x: 560, y: 200 },
      { x: 700, y: 220 },
      { x: 760, y: 350 },
      { x: 860, y: 420 },
    ];
  } else {
    // Grand Courtyard Loop
    return [
      { x: 20, y: 380 },
      { x: 120, y: 220 },
      { x: 160, y: 100 },
      { x: 340, y: 80 },
      { x: 440, y: 160 },
      { x: 450, y: 280 }, // Central Chokepoint under Fortress
      { x: 380, y: 420 },
      { x: 520, y: 480 },
      { x: 660, y: 440 },
      { x: 740, y: 300 },
      { x: 680, y: 160 },
      { x: 800, y: 110 },
      { x: 860, y: 220 },
    ];
  }
}

// Helper to generate rich Angry Birds-style destructible structures per level
function generateStructures(levelNum: number, regionId: string): StructureBlock[] {
  let primaryMat: MaterialType = 'wood';
  let secondaryMat: MaterialType = 'stone';

  if (regionId === 'region_copperwood') {
    primaryMat = 'stone';
    secondaryMat = 'wood';
  } else if (regionId === 'region_frozen') {
    primaryMat = 'ice';
    secondaryMat = 'stone';
  } else if (regionId === 'region_emberfall') {
    primaryMat = 'metal';
    secondaryMat = 'explosive_barrel';
  } else if (regionId === 'region_thunderclap') {
    primaryMat = 'metal';
    secondaryMat = 'stone';
  } else if (regionId === 'region_citadel') {
    primaryMat = 'metal';
    secondaryMat = 'stone';
  }

  const structures: StructureBlock[] = [];
  const colBaseHp = 120 + levelNum * 6;
  const beamHp = 220 + levelNum * 10;
  const roofHp = 350 + levelNum * 15;

  const col1Id = `col-1-${levelNum}`;
  const col2Id = `col-2-${levelNum}`;
  const beamId = `beam-deck-${levelNum}`;
  const roofId = `roof-super-${levelNum}`;
  const tntId = `tnt-mag-${levelNum}`;

  // Left Support Pillar directly flanking the road at (460, 290)
  structures.push({
    id: col1Id,
    x: 405,
    y: 240,
    width: 22,
    height: 70,
    material: primaryMat,
    health: colBaseHp,
    maxHealth: colBaseHp,
    mass: 80 + levelNum * 2,
    isSupport: true,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 160 + levelNum * 5,
  });

  // Right Support Pillar
  structures.push({
    id: col2Id,
    x: 505,
    y: 240,
    width: 22,
    height: 70,
    material: primaryMat,
    health: colBaseHp,
    maxHealth: colBaseHp,
    mass: 80 + levelNum * 2,
    isSupport: true,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 160 + levelNum * 5,
  });

  // Overhead Bridge Deck resting on both pillars
  structures.push({
    id: beamId,
    x: 385,
    y: 205,
    width: 160,
    height: 32,
    material: secondaryMat === 'explosive_barrel' ? 'metal' : secondaryMat,
    health: beamHp,
    maxHealth: beamHp,
    mass: 220 + levelNum * 5,
    isSupport: false,
    supportIds: [col1Id, col2Id],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 380 + levelNum * 10,
  });

  // Heavy Fortification Superstructure on top of beam
  structures.push({
    id: roofId,
    x: 420,
    y: 160,
    width: 90,
    height: 42,
    material: primaryMat === 'wood' ? 'stone' : primaryMat,
    health: roofHp,
    maxHealth: roofHp,
    mass: 450 + levelNum * 12,
    isSupport: false,
    supportIds: [beamId],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 850 + levelNum * 20, // Massive crush for boss shield & heavy pigs!
  });

  // Explosive TNT Barrel embedded next to pillar or on the bridge!
  structures.push({
    id: tntId,
    x: 535,
    y: 260,
    width: 26,
    height: 36,
    material: 'explosive_barrel',
    health: 45 + levelNum * 2,
    maxHealth: 45 + levelNum * 2,
    mass: 40,
    isSupport: false,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 450,
  });

  // Extra TNT barrel on higher levels
  if (levelNum >= 5) {
    structures.push({
      id: `${tntId}-2`,
      x: 370,
      y: 260,
      width: 26,
      height: 36,
      material: 'explosive_barrel',
      health: 45 + levelNum * 2,
      maxHealth: 45 + levelNum * 2,
      mass: 40,
      isSupport: false,
      supportIds: [],
      isCollapsing: false,
      vy: 0,
      vx: 0,
      rotation: 0,
      rotationSpeed: 0,
      crushPower: 450,
    });
  }

  // Secondary barricade obstacle at upper bend
  structures.push({
    id: `barricade-${levelNum}`,
    x: 215,
    y: 200,
    width: 32,
    height: 30,
    material: primaryMat,
    health: 90 + levelNum * 4,
    maxHealth: 90 + levelNum * 4,
    mass: 60,
    isSupport: false,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 120,
  });

  return structures;
}

// Generate all 100 levels per region!
function generateAllRegionLevels(region: CampaignRegionMeta): LevelDefinition[] {
  const levels: LevelDefinition[] = [];

  for (let num = 1; num <= 100; num++) {
    const isBossLevel = num % 10 === 0;
    let bossType: EnemyArchetype | undefined = undefined;
    let bossName = '';
    let bossDesc = '';

    if (isBossLevel) {
      if (region.id === 'region_greencrest' || region.id === 'region_copperwood') {
        bossType = 'iron_boar';
        bossName = 'The Iron Boar';
        bossDesc =
          'Frontal armor deflects 80% damage. Collapse the overhead fortress to shatter his shield and stun him for 6 seconds!';
      } else if (region.id === 'region_frozen') {
        bossType = 'frost_hog';
        bossName = 'The Frost Hog';
        bossDesc =
          'Chills surrounding birds. Melt his glaciers with Phoenix fire to shatter him!';
      } else if (region.id === 'region_thunderclap' || region.id === 'region_emberfall') {
        bossType = 'storm_king';
        bossName = 'The Storm King';
        bossDesc =
          'Unleashes storm currents. Ground his energy with conductive metal pylons!';
      } else {
        bossType = 'mecha_boar';
        bossName = 'Mecha Swine Colossus';
        bossDesc =
          'Imperial fortress war machine. Demolish entire citadel bastions onto him to crack his titanium chassis!';
      }
    }

    // Wave count milestones matching BTD6:
    // 40 waves for early stages, 60 waves mid, 80 waves late, 100 waves endgame
    const waveCount = num <= 25 ? 40 : num <= 50 ? 60 : num <= 75 ? 80 : 100;

    const startingFeathers = 450 + Math.min(600, num * 8);

    const namePrefixes = [
      'Meadow Gate',
      'Watchtower Ridge',
      'River Crossing',
      'Timber Bastion',
      'Gorge Switchback',
      'Red Rock Chasm',
      'Granite Arch',
      'Frostbite Crevasse',
      'Glacier Pass',
      'Molten Trench',
      'Slag Foundry',
      'Thunder Peak',
      'Storm Spire',
      'Citadel Ramparts',
      'Imperial Courtyard',
    ];
    const prefix = namePrefixes[(num - 1) % namePrefixes.length];
    const levelName = isBossLevel
      ? `Boss Showdown: ${bossName} (Stage ${num})`
      : `${prefix} ${Math.floor((num - 1) / namePrefixes.length) + 1}`;

    const subtitle = isBossLevel
      ? `Major Regional Climax · Wave ${waveCount} Boss Encounter`
      : `Stage ${num} of 100 · ${waveCount} Waves of Escalating Assault`;

    const description = isBossLevel
      ? `A climactic showdown against ${bossName}! The beast marches with heavy escort. Time your demolition of the overhead fortification to drop crushing masonry right on top of him!`
      : `Defend the route against ${waveCount} waves of pigs. Utilize ${region.featuredBirdName} with ${region.featuredBirdBonus}. Collapse overhead structures to crush enemy columns at the central chokepoint!`;

    // Map backwards compatibility IDs for the first 4 levels
    let customId = `${region.id}_lvl_${num}`;
    if (region.id === 'region_greencrest' && num === 1) customId = 'level_1';
    else if (region.id === 'region_copperwood' && num === 2) customId = 'level_2';
    else if (region.id === 'region_copperwood' && num === 3) customId = 'level_3_boss';
    else if (region.id === 'region_frozen' && num === 4) customId = 'level_4';

    levels.push({
      id: customId,
      regionId: region.id,
      regionName: region.name,
      levelNumber: num,
      name: levelName,
      subtitle,
      description,
      difficultyRecommended: num <= 15 ? 'normal' : num <= 40 ? 'hard' : num <= 70 ? 'very_hard' : 'nightmare',
      startingFeathers,
      nestLives: 20,
      milestoneWaveCount: waveCount,
      waves: generateProgressiveWaves(bossType, waveCount),
      pathWaypoints: generateWaypoints(num, region.id),
      initialStructures: generateStructures(num, region.id),
      bossData: isBossLevel && bossType
        ? {
            type: bossType,
            name: bossName,
            specialMechanicNote: bossDesc,
          }
        : undefined,
      objectives: [
        {
          id: `obj-${customId}-survive`,
          description: `Survive all ${waveCount} Waves of Stage ${num}`,
          isCompleted: false,
          bonusFeathers: 200 + num * 5,
        },
        {
          id: `obj-${customId}-crush`,
          description: 'Crush at least 6 marching pigs with structural collapses',
          isCompleted: false,
          bonusFeathers: 150 + num * 3,
        },
        {
          id: `obj-${customId}-lives`,
          description: 'Finish with 15+ Nest Lives remaining',
          isCompleted: false,
          bonusFeathers: 100 + num * 2,
        },
      ],
    });
  }

  return levels;
}

// Assemble complete campaign catalog for all 6 biomes (600 levels total!)
export const CAMPAIGN_LEVELS: LevelDefinition[] = CAMPAIGN_REGIONS.flatMap((region) =>
  generateAllRegionLevels(region)
);

export function getLevelById(id: string): LevelDefinition | undefined {
  return CAMPAIGN_LEVELS.find((l) => l.id === id);
}

export function getLevelsByRegion(regionId: string): LevelDefinition[] {
  return CAMPAIGN_LEVELS.filter((l) => l.regionId === regionId);
}
