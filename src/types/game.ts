export type ElementType = 'physical' | 'fire' | 'ice' | 'electric' | 'explosive' | 'sonic';

export type MaterialType = 'wood' | 'stone' | 'metal' | 'ice' | 'explosive_barrel' | 'glass';

export type RegionalBiome = 'glacial' | 'desert' | 'volcanic' | 'verdant' | 'tempest' | 'citadel';

export type ObstacleType =
  | 'standard'
  | 'ice_spire'
  | 'glacial_arch'
  | 'cryo_keg'
  | 'sandstone_pillar'
  | 'sandstone_arch'
  | 'dust_keg'
  | 'obsidian_monolith'
  | 'basalt_bridge'
  | 'magma_pot'
  | 'redwood_trunk'
  | 'bramble_gate'
  | 'pitch_keg'
  | 'tesla_pylon'
  | 'storm_deck'
  | 'plasma_capacitor'
  | 'titanium_blastdoor'
  | 'iron_girder'
  | 'gunpowder_magazine';

export type TowerTypeId =
  | 'cardinal'
  | 'owl'
  | 'falcon'
  | 'woodpecker'
  | 'penguin'
  | 'phoenix'
  | 'bomb_bird';

export type DifficultyPreset =
  | 'super_easy'
  | 'easy'
  | 'normal'
  | 'hard'
  | 'very_hard'
  | 'nightmare';

export type TargetPriority = 'first' | 'last' | 'strongest' | 'structures' | 'flying';

export interface UpgradeTier {
  tier: number;
  name: string;
  description: string;
  cost: number;
  damageBonus: number;
  fireRateBonus: number; // multiplier, e.g. 1.25
  rangeBonus: number;
  pierceBonus: number;
  structuralBonus: number; // multiplier against fortifications
  elementBonus?: ElementType;
  specialAbility?: string;
}

export interface UpgradePath {
  id: 'path_a' | 'path_b' | 'path_c';
  name: string;
  category: 'Offense' | 'Elemental' | 'Engineering';
  description: string;
  tiers: UpgradeTier[];
}

export interface TowerDefinition {
  id: TowerTypeId;
  name: string;
  title: string;
  role: string;
  element: ElementType;
  baseCost: number;
  baseRange: number;
  baseDamage: number;
  baseFireRate: number; // shots per sec
  basePierce: number;
  baseStructuralDamage: number; // bonus damage against walls/supports
  projectileSpeed: number;
  projectileRadius: number;
  silhouetteColor: string;
  accentColor: string;
  paths: {
    path_a: UpgradePath;
    path_b: UpgradePath;
    path_c: UpgradePath;
  };
}

export interface PlacedTower {
  id: string;
  typeId: TowerTypeId;
  x: number;
  y: number;
  level: number;
  // Upgrade tiers chosen (0-5)
  tiers: {
    path_a: number;
    path_b: number;
    path_c: number;
  };
  // Locked path (when two paths have tiers > 0, the third is locked)
  lockedPath: 'path_a' | 'path_b' | 'path_c' | null;
  targetPriority: TargetPriority;
  lastFired: number;
  rotation: number;
  kills: number;
  damageDealt: number;
  selectedSkin?: string;
  health: number;
  maxHealth: number;
  lastDamagedTime: number;
  isDestroyed?: boolean;
  lastAbilityTriggered?: number;
}

export interface Projectile {
  id: string;
  sourceTowerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  structuralDamage: number;
  element: ElementType;
  pierceRemaining: number;
  radius: number;
  maxDistance: number;
  traveledDistance: number;
  color: string;
  homingTargetEnemyId?: string;
  gravity?: number;
  bouncesRemaining?: number;
  aoeRadius?: number;
  isComboProjectile?: boolean;
  comboVisual?: 'volcanic' | 'thermal' | 'plasma' | 'supersonic';
  trail: { x: number; y: number; alpha: number }[];
}

export interface StructureBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  material: MaterialType;
  obstacleType?: ObstacleType;
  health: number;
  maxHealth: number;
  mass: number;
  isSupport: boolean; // if true, destroying this causes connected overhead blocks to lose support
  supportIds: string[]; // blocks holding this block up
  isCollapsing: boolean; // falling as debris
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
  connectedEnemyIds?: string[]; // enemies standing on it
  crushPower: number; // damage dealt if falls on enemies
}

export type EnemyArchetype =
  | 'scout'
  | 'armored'
  | 'shield'
  | 'builder'
  | 'bomber'
  | 'glider'
  // Regional Boss Variants:
  | 'iron_boar' // Desert Canyons / General Boss
  | 'frost_hog' // Glacial Peaks Boss 1 (The Frost Hog)
  | 'blizzard_goliath' // Glacial Peaks Boss 2 (Blizzard Swine Dreadnought)
  | 'sand_titan' // Desert Canyons Boss 2 (Duststorm Colossus)
  | 'magma_behemoth' // Volcanic Isles Boss 1 (Volcanic Pyrotank Boar)
  | 'cinder_tyrant' // Volcanic Isles Boss 2 (Lord of Obsidian Caldera)
  | 'bramble_crusher' // Verdant Canopy Boss (Ancient Timber Goliath)
  | 'storm_king' // Tempest Spires Boss 1 (The Storm King)
  | 'volt_ram' // Tempest Spires Boss 2 (Megavolt Siege Juggernaut)
  | 'mecha_boar' // Iron Hog Citadel Boss 1 (Mecha Swine Colossus)
  | 'emperor_pork'; // Iron Hog Citadel Boss 2 (Emperor Swine Prime)

export interface Enemy {
  id: string;
  type: EnemyArchetype;
  name: string;
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  health: number;
  maxHealth: number;
  armor: number; // reduces physical damage
  shieldFrontal: number; // absorbs frontal shots
  pathIndex: number;
  isFlying: boolean;
  isStunned: boolean;
  stunTimer: number;
  slowTimer: number;
  slowMultiplier: number;
  burningTimer: number;
  burningDps: number;
  conductiveTimer: number;
  radius: number;
  rewardFeathers: number;
  rewardAcorns: number;
  isBoss: boolean;
  bossPhase?: number;
  bossMaxPhases?: number;
  bossShieldCracked?: boolean;
  lastAttackTime?: number;
}

export interface EnemyProjectile {
  id: string;
  sourceEnemyId: string;
  targetTowerId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  flightDuration: number; // in seconds
  arcHeight: number; // visual upward arc height
  damage: number;
  enemyType: EnemyArchetype;
  color: string;
  secondaryColor?: string;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  trail: { x: number; y: number; alpha: number }[];
}

export interface WaveGroup {
  type: EnemyArchetype;
  count: number;
  spawnInterval: number; // in seconds
  delay: number; // delay before this group starts
}

export interface Wave {
  waveNumber: number;
  groups: WaveGroup[];
  description: string;
  isBossWave?: boolean;
}

export interface LevelObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  bonusFeathers: number;
}

export interface LevelDefinition {
  id: string;
  regionId: string;
  regionName: string;
  regionalBiome?: RegionalBiome;
  levelNumber: number;
  name: string;
  subtitle: string;
  description: string;
  difficultyRecommended: DifficultyPreset;
  startingFeathers: number;
  nestLives: number;
  waves: Wave[];
  milestoneWaveCount?: number;
  pathWaypoints: { x: number; y: number }[];
  alternateWaypoints?: { x: number; y: number }[];
  towerSlots?: { x: number; y: number; id: string; label?: string }[];
  initialStructures: StructureBlock[];
  regionalObstacleName?: string;
  regionalObstacleTip?: string;
  objectives: LevelObjective[];
  bossData?: {
    type: EnemyArchetype;
    name: string;
    specialMechanicNote: string;
  };
}

export interface ProximitySynergy {
  id: string;
  name: string;
  towerIds: [string, string];
  type: 'passive' | 'reaction' | 'active_combo';
  effectDescription: string;
  active: boolean;
  abilityName?: string;
  abilityDescription?: string;
  cooldown?: number;
  currentCooldown?: number;
}

export interface FormationAbility {
  id: string;
  name: string;
  type: 'circuit' | 'triangle' | 'aegis';
  towerIds: string[];
  description: string;
  active: boolean;
  abilityName?: string;
  abilityDescription?: string;
  cooldown?: number;
  currentCooldown?: number;
}

export interface TacticalPowerUp {
  id: 'bombardment' | 'frenzy' | 'timewarp' | 'resonance';
  name: string;
  description: string;
  cooldown: number; // seconds
  currentCooldown: number;
  featherCost: number;
  iconName: string;
}

export interface PlayerProgression {
  feathers: number;
  acorns: number;
  shards: number;
  tokens: number;
  unlockedTowers: TowerTypeId[];
  completedLevels: Record<string, { stars: number; highestDifficulty: DifficultyPreset }>;
  researchPurchased: string[];
  ownedSkins: string[];
  equippedSkins: Record<TowerTypeId, string>;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  shakeIntensity: number; // 0 to 1
  showDamageNumbers: boolean;
  gameSpeed: number; // 1, 2, 3
  difficulty: DifficultyPreset;
  autoStartNextWave: boolean;
  reducedMotion: boolean;
}

export interface CollapseCrater {
  id: string;
  x: number;
  y: number;
  radius: number;
  towerTypeId: TowerTypeId;
  towerName: string;
  duration: number; // in seconds
  remainingTime: number; // in seconds
  smokeTimer: number;
  cracks: {
    angle: number;
    length: number;
    branches: { angleOffset: number; length: number }[];
  }[];
  rubbleBlocks: {
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
    rotation: number;
    color: string;
  }[];
}
