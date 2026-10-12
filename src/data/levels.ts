import {
  LevelDefinition,
  StructureBlock,
  MaterialType,
  ObstacleType,
  EnemyArchetype,
  RegionalBiome,
} from '../types/game';
import { generateProgressiveWaves } from './waves';

export interface CampaignRegionMeta {
  id: string;
  name: string;
  subtitle: string;
  themeColor: string;
  biome: RegionalBiome;
  description: string;
  featuredBird: string;
  featuredBirdName: string;
  featuredBirdBonus: string;
  regionalObstacleName: string;
  regionalObstacleTip: string;
  primaryBossVariant: EnemyArchetype;
  primaryBossName: string;
  apexBossVariant: EnemyArchetype;
  apexBossName: string;
}

export const CAMPAIGN_REGIONS: CampaignRegionMeta[] = [
  {
    id: 'region_glacial_peaks',
    name: 'Glacial Peaks',
    subtitle: 'Crystalline Ice Spires & Cryogenic Glaciers',
    themeColor: '#0284C7',
    biome: 'glacial',
    description:
      'Frigid sub-zero alpine summits racked by biting blizzard gales. Bring down crystalline ice spires to shatter freezing shrapnel into advancing swine columns.',
    featuredBird: 'penguin',
    featuredBirdName: 'Penguin Cryomancer & Snowy Owl',
    featuredBirdBonus: '+40% Cryo Freeze Duration & Permafrost Shatter',
    regionalObstacleName: 'Crystalline Ice Spires & Cryo-Nitrogen Kegs',
    regionalObstacleTip:
      'Crystalline Ice Spires shatter into slowing ice shards; Cryo-Nitrogen Kegs freeze enemy troops solid for 5 seconds.',
    primaryBossVariant: 'frost_hog',
    primaryBossName: 'The Frost Hog',
    apexBossVariant: 'blizzard_goliath',
    apexBossName: 'Blizzard Swine Dreadnought',
  },
  {
    id: 'region_desert_canyons',
    name: 'Desert Canyons',
    subtitle: 'Sun-Baked Sandstone Arches & Dust Ravines',
    themeColor: '#D97706',
    biome: 'desert',
    description:
      'Towering wind-carved sandstone gorges with treacherous hairpin switchbacks. Demolish massive sandstone natural arches to crush heavily armored desert raiders beneath rock slabs.',
    featuredBird: 'falcon',
    featuredBirdName: 'Falcon Interceptor & Desert Harrier',
    featuredBirdBonus: '+35% Supersonic Pierce & Canyon Whirlwind Velocity',
    regionalObstacleName: 'Sandstone Natural Arches & Sun-Baked Powder Kegs',
    regionalObstacleTip:
      'Sandstone natural arches drop blinding dust clouds that blind and slow pigs; Sun-baked kegs detonate in violent shockwaves.',
    primaryBossVariant: 'iron_boar',
    primaryBossName: 'The Iron Boar (Canyon Warlord)',
    apexBossVariant: 'sand_titan',
    apexBossName: 'Duststorm Colossus (Sand Titan)',
  },
  {
    id: 'region_volcanic_isles',
    name: 'Volcanic Isles',
    subtitle: 'Molten Basalt Pillars & Boiling Magma Vents',
    themeColor: '#EA580C',
    biome: 'volcanic',
    description:
      'Scorched caldera archipelago active with glowing molten lava conduits. Bring down ultra-dense obsidian monoliths and ignite pressurized volcanic magma pots.',
    featuredBird: 'phoenix',
    featuredBirdName: 'Phoenix Pyromancer & Ash Magpie',
    featuredBirdBonus: '+40% Thermite Burn DPS & Volcanic Ignition',
    regionalObstacleName: 'Obsidian Monoliths & Volatile Magma Pots',
    regionalObstacleTip:
      'Obsidian monoliths inflict catastrophic 1200+ crush damage; Volatile Magma Pots ignite all nearby enemies with massive burning ticks.',
    primaryBossVariant: 'magma_behemoth',
    primaryBossName: 'Volcanic Pyrotank Boar (Magma Behemoth)',
    apexBossVariant: 'cinder_tyrant',
    apexBossName: 'Cinder Tyrant of the Caldera',
  },
  {
    id: 'region_verdant_canopy',
    name: 'Verdant Canopy',
    subtitle: 'Ancient Hollow Redwoods & Bramble Ramparts',
    themeColor: '#16A34A',
    biome: 'verdant',
    description:
      'Primeval redwood forest canopy filled with moss-covered logs and suspended vine platforms. Collapse ancient hollow trunks and splinter thorny bramble gates directly over enemy columns.',
    featuredBird: 'cardinal',
    featuredBirdName: 'Cardinal Dart & Woodpecker Drill',
    featuredBirdBonus: '+30% Timber Demolition & Flutter Fire Cadence',
    regionalObstacleName: 'Ancient Hollow Redwoods & Bramble Gates',
    regionalObstacleTip:
      'Ancient redwood pillars split into tumbling rolling logs; Pine pitch kegs combust in a massive splash of flame.',
    primaryBossVariant: 'bramble_crusher',
    primaryBossName: 'Ancient Timber Goliath (Bramble Crusher)',
    apexBossVariant: 'iron_boar',
    apexBossName: 'Iron Boar Clearcutter',
  },
  {
    id: 'region_tempest_spires',
    name: 'Tempest Spires',
    subtitle: 'Charged Storm Gates & Electrified Pylons',
    themeColor: '#7C3AED',
    biome: 'tempest',
    description:
      'High-altitude cloud peaks crackling with ambient ionized electricity. Connect high-voltage circuits through copper Tesla pylons to electrocute the entire enemy vanguard.',
    featuredBird: 'owl',
    featuredBirdName: 'Owl Storm Mortar & Thunder Swallow',
    featuredBirdBonus: '+35% Circuit Chain Voltage & Static EMP Shock',
    regionalObstacleName: 'Electrified Tesla Pylons & Plasma Capacitors',
    regionalObstacleTip:
      'Tesla Pylons conduct lightning synergy arcs and zap passing pigs; Plasma Capacitors discharge chained electrical EMP shocks.',
    primaryBossVariant: 'storm_king',
    primaryBossName: 'The Storm King',
    apexBossVariant: 'volt_ram',
    apexBossName: 'Megavolt Siege Juggernaut (Volt Ram)',
  },
  {
    id: 'region_iron_citadel',
    name: 'The Iron Hog Citadel',
    subtitle: 'Imperial Swine Stronghold & Blast Bastions',
    themeColor: '#DC2626',
    biome: 'citadel',
    description:
      'The industrial nerve center of the Pig Empire, fortified with riveted titanium blastdoors and steam-powered war bastions. Demolish imperial foundations with megaton explosives.',
    featuredBird: 'bomb_bird',
    featuredBirdName: 'Bomb Finch Legion & Grand Aviary Armada',
    featuredBirdBonus: '+50% Megaton Demolition & Wall Breaching',
    regionalObstacleName: 'Titanium Bastion Blastdoors & Gunpowder Magazines',
    regionalObstacleTip:
      'Heavy industrial blastdoors require concentrated firepower; Gunpowder magazines trigger devastating multi-barrel domino collapses.',
    primaryBossVariant: 'mecha_boar',
    primaryBossName: 'Mecha Swine Colossus',
    apexBossVariant: 'emperor_pork',
    apexBossName: 'Emperor Swine Prime (Apex Warlord)',
  },
];

// Helper to proceduralize winding curvy road waypoints per level number & region topology
function generateWaypoints(levelNum: number, regionId: string) {
  const seed = (levelNum * 23 + (regionId.length * 11)) % 100;
  const topology = (levelNum + Math.floor(seed / 10)) % 6;

  if (topology === 0) {
    // 1. Double-hairpin Gorge
    return [
      { x: 30, y: 70 + (seed % 25) },
      { x: 220, y: 80 + (seed % 20) },
      { x: 320, y: 160 },
      { x: 260, y: 280 },
      { x: 120, y: 320 },
      { x: 80, y: 440 },
      { x: 260, y: 490 },
      { x: 440, y: 440 },
      { x: 490, y: 300 }, // Central chokepoint under fortification
      { x: 620, y: 180 },
      { x: 740, y: 200 },
      { x: 820, y: 340 },
      { x: 860, y: 480 },
    ];
  } else if (topology === 1) {
    // 2. Serpentine River Loop
    return [
      { x: 20, y: 120 },
      { x: 180, y: 140 },
      { x: 260, y: 220 },
      { x: 200, y: 340 },
      { x: 120, y: 440 },
      { x: 280, y: 470 },
      { x: 420, y: 410 },
      { x: 460, y: 290 }, // Central chokepoint
      { x: 560, y: 200 },
      { x: 700, y: 220 },
      { x: 760, y: 350 },
      { x: 860, y: 420 },
    ];
  } else if (topology === 2) {
    // 3. Grand Courtyard Perimeter Funnel
    return [
      { x: 20, y: 380 },
      { x: 120, y: 220 },
      { x: 160, y: 100 },
      { x: 340, y: 80 },
      { x: 440, y: 160 },
      { x: 450, y: 280 }, // Central chokepoint under Fortress
      { x: 380, y: 420 },
      { x: 520, y: 480 },
      { x: 660, y: 440 },
      { x: 740, y: 300 },
      { x: 680, y: 160 },
      { x: 800, y: 110 },
      { x: 860, y: 220 },
    ];
  } else if (topology === 3) {
    // 4. Horseshoe Canyon Pass
    return [
      { x: 30, y: 200 },
      { x: 140, y: 130 },
      { x: 280, y: 110 },
      { x: 380, y: 220 },
      { x: 310, y: 380 },
      { x: 470, y: 460 },
      { x: 480, y: 300 }, // Central chokepoint
      { x: 590, y: 140 },
      { x: 720, y: 120 },
      { x: 810, y: 240 },
      { x: 860, y: 400 },
    ];
  } else if (topology === 4) {
    // 5. Switchback Mountain Zigzag
    return [
      { x: 30, y: 440 },
      { x: 160, y: 420 },
      { x: 240, y: 290 },
      { x: 150, y: 160 },
      { x: 320, y: 120 },
      { x: 470, y: 280 }, // Chokepoint
      { x: 550, y: 430 },
      { x: 680, y: 390 },
      { x: 720, y: 240 },
      { x: 800, y: 140 },
      { x: 860, y: 280 },
    ];
  } else {
    // 6. Caldera Vortex Ring
    return [
      { x: 40, y: 80 },
      { x: 190, y: 90 },
      { x: 220, y: 240 },
      { x: 140, y: 380 },
      { x: 300, y: 470 },
      { x: 460, y: 290 }, // Chokepoint
      { x: 600, y: 460 },
      { x: 740, y: 360 },
      { x: 690, y: 180 },
      { x: 780, y: 90 },
      { x: 860, y: 160 },
    ];
  }
}

// Procedural Regional Destructible Fortification & Obstacle Builder
function generateRegionalStructures(
  levelNum: number,
  region: CampaignRegionMeta
): StructureBlock[] {
  let primaryMat: MaterialType = 'wood';
  let secondaryMat: MaterialType = 'stone';
  let obstacleTypePillar: ObstacleType = 'standard';
  let obstacleTypeArch: ObstacleType = 'standard';
  let obstacleTypeBarrel: ObstacleType = 'standard';
  let obstacleTypeFlank: ObstacleType = 'standard';

  if (region.biome === 'glacial') {
    primaryMat = 'ice';
    secondaryMat = 'stone';
    obstacleTypePillar = 'ice_spire';
    obstacleTypeArch = 'glacial_arch';
    obstacleTypeBarrel = 'cryo_keg';
    obstacleTypeFlank = 'ice_spire';
  } else if (region.biome === 'desert') {
    primaryMat = 'stone';
    secondaryMat = 'wood';
    obstacleTypePillar = 'sandstone_pillar';
    obstacleTypeArch = 'sandstone_arch';
    obstacleTypeBarrel = 'dust_keg';
    obstacleTypeFlank = 'sandstone_pillar';
  } else if (region.biome === 'volcanic') {
    primaryMat = 'stone';
    secondaryMat = 'metal';
    obstacleTypePillar = 'obsidian_monolith';
    obstacleTypeArch = 'basalt_bridge';
    obstacleTypeBarrel = 'magma_pot';
    obstacleTypeFlank = 'obsidian_monolith';
  } else if (region.biome === 'verdant') {
    primaryMat = 'wood';
    secondaryMat = 'stone';
    obstacleTypePillar = 'redwood_trunk';
    obstacleTypeArch = 'standard';
    obstacleTypeBarrel = 'pitch_keg';
    obstacleTypeFlank = 'bramble_gate';
  } else if (region.biome === 'tempest') {
    primaryMat = 'metal';
    secondaryMat = 'stone';
    obstacleTypePillar = 'tesla_pylon';
    obstacleTypeArch = 'storm_deck';
    obstacleTypeBarrel = 'plasma_capacitor';
    obstacleTypeFlank = 'tesla_pylon';
  } else if (region.biome === 'citadel') {
    primaryMat = 'metal';
    secondaryMat = 'metal';
    obstacleTypePillar = 'titanium_blastdoor';
    obstacleTypeArch = 'iron_girder';
    obstacleTypeBarrel = 'gunpowder_magazine';
    obstacleTypeFlank = 'titanium_blastdoor';
  }

  const structures: StructureBlock[] = [];
  const colBaseHp = 130 + levelNum * 6;
  const beamHp = 230 + levelNum * 9;
  const roofHp = 360 + levelNum * 14;

  const col1Id = `col-1-${levelNum}`;
  const col2Id = `col-2-${levelNum}`;
  const beamId = `beam-deck-${levelNum}`;
  const roofId = `roof-super-${levelNum}`;
  const barrel1Id = `barrel-1-${levelNum}`;

  // Left Support Pillar directly flanking the road at (460, 290)
  structures.push({
    id: col1Id,
    x: 405,
    y: 240,
    width: 24,
    height: 72,
    material: primaryMat,
    obstacleType: obstacleTypePillar,
    health: colBaseHp,
    maxHealth: colBaseHp,
    mass: 85 + levelNum * 2,
    isSupport: true,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 180 + levelNum * 5,
  });

  // Right Support Pillar
  structures.push({
    id: col2Id,
    x: 505,
    y: 240,
    width: 24,
    height: 72,
    material: primaryMat,
    obstacleType: obstacleTypePillar,
    health: colBaseHp,
    maxHealth: colBaseHp,
    mass: 85 + levelNum * 2,
    isSupport: true,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 180 + levelNum * 5,
  });

  // Overhead Bridge Deck resting on both pillars
  structures.push({
    id: beamId,
    x: 385,
    y: 205,
    width: 160,
    height: 32,
    material: secondaryMat,
    obstacleType: obstacleTypeArch,
    health: beamHp,
    maxHealth: beamHp,
    mass: 230 + levelNum * 5,
    isSupport: false,
    supportIds: [col1Id, col2Id],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 400 + levelNum * 10,
  });

  // Heavy Fortification Superstructure on top of beam
  structures.push({
    id: roofId,
    x: 420,
    y: 160,
    width: 90,
    height: 42,
    material: primaryMat,
    obstacleType: obstacleTypePillar,
    health: roofHp,
    maxHealth: roofHp,
    mass: 480 + levelNum * 12,
    isSupport: false,
    supportIds: [beamId],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 900 + levelNum * 22,
  });

  // Primary Regional Explosive Barrel next to pillar
  structures.push({
    id: barrel1Id,
    x: 535,
    y: 260,
    width: 26,
    height: 36,
    material: 'explosive_barrel',
    obstacleType: obstacleTypeBarrel,
    health: 50 + levelNum * 2,
    maxHealth: 50 + levelNum * 2,
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

  // Secondary explosive barrel for level >= 15
  if (levelNum >= 15) {
    structures.push({
      id: `${barrel1Id}-b`,
      x: 370,
      y: 260,
      width: 26,
      height: 36,
      material: 'explosive_barrel',
      obstacleType: obstacleTypeBarrel,
      health: 50 + levelNum * 2,
      maxHealth: 50 + levelNum * 2,
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

  // Tertiary high-altitude barrel on bridge for level >= 45
  if (levelNum >= 45) {
    structures.push({
      id: `${barrel1Id}-c`,
      x: 450,
      y: 168,
      width: 24,
      height: 32,
      material: 'explosive_barrel',
      obstacleType: obstacleTypeBarrel,
      health: 55 + levelNum * 2,
      maxHealth: 55 + levelNum * 2,
      mass: 45,
      isSupport: false,
      supportIds: [beamId],
      isCollapsing: false,
      vy: 0,
      vx: 0,
      rotation: 0,
      rotationSpeed: 0,
      crushPower: 550,
    });
  }

  // Flanking Regional Obstacle near the bend
  structures.push({
    id: `flank-obs-${levelNum}`,
    x: 215,
    y: 200,
    width: 32,
    height: 32,
    material: primaryMat,
    obstacleType: obstacleTypeFlank,
    health: 95 + levelNum * 4,
    maxHealth: 95 + levelNum * 4,
    mass: 65,
    isSupport: false,
    supportIds: [],
    isCollapsing: false,
    vy: 0,
    vx: 0,
    rotation: 0,
    rotationSpeed: 0,
    crushPower: 140,
  });

  // Secondary barricade obstacle at lower bend for stage >= 30
  if (levelNum >= 30) {
    structures.push({
      id: `outpost-${levelNum}`,
      x: 650,
      y: 330,
      width: 36,
      height: 34,
      material: primaryMat,
      obstacleType: obstacleTypePillar,
      health: 120 + levelNum * 5,
      maxHealth: 120 + levelNum * 5,
      mass: 90,
      isSupport: false,
      supportIds: [],
      isCollapsing: false,
      vy: 0,
      vx: 0,
      rotation: 0,
      rotationSpeed: 0,
      crushPower: 220,
    });
  }

  return structures;
}

// Regional name pools for rich, varied stage titles
const REGIONAL_NAME_PATTERNS: Record<RegionalBiome, string[]> = {
  glacial: [
    'Frostbite Pass',
    'Crevasse Outpost',
    'Glacier Overlook',
    'Permafrost Bastion',
    'Icebound Chasm',
    'Avalanche Ridge',
    'Cryo Spire Defile',
    'Frozen Watch',
    'Hoarfrost Gateway',
    'Glacial Pinnacle',
    'Chillwind Bluffs',
    'Zero-Kelvin Gorge',
    'Snowdrift Redoubt',
    'Frost Arch Pass',
    'Icicle Palisade',
  ],
  desert: [
    'Dune Gate',
    'Red Rock Arch',
    'Sunstone Chasm',
    'Canyon Pass',
    'Dustbowl Outpost',
    'Copper Gulch',
    'Mesa Ridge',
    'Sandstorm Bluffs',
    'Badland Chokepoint',
    'Arroyo Crossing',
    'Terracotta Ravine',
    'Sun-Baked Defile',
    'Petrified Ridge',
    'Whirlwind Arch',
    'Slickrock Bastion',
  ],
  volcanic: [
    'Magma Trench',
    'Obsidian Spire',
    'Basalt Crag',
    'Cinder Gate',
    'Slag Foundry',
    'Lava Lake Pass',
    'Pyre Ridge',
    'Brimstone Defile',
    'Ash Caldera',
    'Volcanic Flank',
    'Molten Gateway',
    'Scorched Terrace',
    'Thermite Bluffs',
    'Obsidian Redoubt',
    'Boiling Basalt Gorge',
  ],
  verdant: [
    'Redwood Crossing',
    'Bramble Outpost',
    'Canopy Ridge',
    'Timber Gate',
    'Verdant Glen',
    'Pine Needle Pass',
    'Songbird Hollow',
    'Mossy Arch',
    'Old Growth Bastion',
    'Fern Valley Defile',
    'Thornbush Chokepoint',
    'Hollow Trunk Pass',
    'Emerald Ramparts',
    'Ancient Copse',
    'Vine-Wrapped Redoubt',
  ],
  tempest: [
    'Thunder Peak',
    'Storm Spire',
    'Lightning Crag',
    'Cloud Gap',
    'Static Ridge',
    'Ionized Pass',
    'Gale Chasm',
    'Volt Chokepoint',
    'Nimbus Bastion',
    'Fulminant Crest',
    'High-Voltage Defile',
    'Ozone Overlook',
    'Tesla Terrace',
    'Stormwind Causeway',
    'Electric Palisade',
  ],
  citadel: [
    'Iron Ramparts',
    'Imperial Bastion',
    'Citadel Courtyard',
    'Blastdoor Gate',
    'Foundry Chokepoint',
    'Steam Works Defile',
    'Swine Trench',
    'Armory Defile',
    'Titan Rampart',
    'Fortress Redoubt',
    'Imperial Catwalk',
    'Munitions Chasm',
    'Steelworks Gateway',
    'Throne Approach',
    'Colossus Bastion',
  ],
};

// Generate all 100 unique, procedurally generated levels per region!
function generateAllRegionLevels(region: CampaignRegionMeta): LevelDefinition[] {
  const levels: LevelDefinition[] = [];
  const namePool = REGIONAL_NAME_PATTERNS[region.biome];

  for (let num = 1; num <= 100; num++) {
    const isBossLevel = num % 10 === 0;
    let bossType: EnemyArchetype | undefined = undefined;
    let bossName = '';
    let bossDesc = '';

    if (isBossLevel) {
      if (num <= 50) {
        bossType = region.primaryBossVariant;
        bossName = region.primaryBossName;
        bossDesc = `Regional Climax Encounter! ${bossName} marches with vanguard shields. Time your demolition of overhead ${region.regionalObstacleName} to shatter his armor and stun him!`;
      } else {
        bossType = region.apexBossVariant;
        bossName = region.apexBossName;
        bossDesc = `APEX REGIONAL SHOWDOWN: ${bossName}! The apex titan boasts impenetrable defenses. Trigger cascading structural collapses to break his chassis!`;
      }
    }

    // Milestone wave count pacing matching BTD6:
    // 40 waves (Levels 1-25), 60 waves (Levels 26-50), 80 waves (Levels 51-75), 100 waves (Levels 76-100)
    const waveCount = num <= 25 ? 40 : num <= 50 ? 60 : num <= 75 ? 80 : 100;
    const startingFeathers = 450 + Math.min(650, num * 8);

    const namePrefix = namePool[(num - 1) % namePool.length];
    const iteration = Math.floor((num - 1) / namePool.length) + 1;
    const levelName = isBossLevel
      ? `Boss Showdown: ${bossName} (Stage ${num})`
      : `${namePrefix} ${iteration}`;

    const subtitle = isBossLevel
      ? `Major Regional Boss Encounter · Wave ${waveCount} Climax`
      : `Stage ${num} of 100 · ${waveCount} Escalating Waves · ${region.name}`;

    const description = isBossLevel
      ? `A major confrontation against ${bossName}! Defend the regional nest by coordinating ${region.featuredBirdName}. Demolish overhead ${region.regionalObstacleName} directly onto the boss column.`
      : `Defend ${levelName} across ${waveCount} waves of pig incursions. Take advantage of ${region.featuredBirdName} with ${region.featuredBirdBonus}. Exploit regional obstacle: ${region.regionalObstacleTip}`;

    // Deterministic unique ID per level
    const customId = `${region.id}_lvl_${num}`;

    levels.push({
      id: customId,
      regionId: region.id,
      regionName: region.name,
      regionalBiome: region.biome,
      levelNumber: num,
      name: levelName,
      subtitle,
      description,
      difficultyRecommended:
        num <= 15 ? 'normal' : num <= 40 ? 'hard' : num <= 70 ? 'very_hard' : 'nightmare',
      startingFeathers,
      nestLives: 20,
      milestoneWaveCount: waveCount,
      waves: generateProgressiveWaves(bossType, waveCount),
      pathWaypoints: generateWaypoints(num, region.id),
      initialStructures: generateRegionalStructures(num, region),
      regionalObstacleName: region.regionalObstacleName,
      regionalObstacleTip: region.regionalObstacleTip,
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
          description: `Crush at least ${isBossLevel ? 10 : 6} marching pigs with structural collapses`,
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

// Assemble complete campaign catalog for all 6 biomes (600 procedurally generated levels!)
export const CAMPAIGN_LEVELS: LevelDefinition[] = CAMPAIGN_REGIONS.flatMap((region) =>
  generateAllRegionLevels(region)
);

// Comprehensive level lookup supporting new regional IDs & legacy aliases
export function getLevelById(id: string): LevelDefinition | undefined {
  // Direct match
  const direct = CAMPAIGN_LEVELS.find((l) => l.id === id);
  if (direct) return direct;

  // Legacy aliases
  if (id === 'level_1' || id.startsWith('region_greencrest')) {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_verdant_canopy' && l.levelNumber === 1);
  }
  if (id === 'level_2' || id === 'region_copperwood_lvl_2') {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_desert_canyons' && l.levelNumber === 2);
  }
  if (id === 'level_3_boss' || id === 'region_copperwood_lvl_3') {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_desert_canyons' && l.levelNumber === 10);
  }
  if (id === 'level_4' || id.startsWith('region_frozen')) {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_glacial_peaks' && l.levelNumber === 1);
  }
  if (id.startsWith('region_emberfall')) {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_volcanic_isles' && l.levelNumber === 1);
  }
  if (id.startsWith('region_thunderclap')) {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_tempest_spires' && l.levelNumber === 1);
  }
  if (id.startsWith('region_citadel')) {
    return CAMPAIGN_LEVELS.find((l) => l.regionId === 'region_iron_citadel' && l.levelNumber === 1);
  }

  return CAMPAIGN_LEVELS[0];
}

export function getLevelsByRegion(regionId: string): LevelDefinition[] {
  return CAMPAIGN_LEVELS.filter((l) => l.regionId === regionId);
}
