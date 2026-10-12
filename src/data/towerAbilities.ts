import { TowerTypeId } from '../types/game';

export interface BirdSpecialAbilityDef {
  id: string;
  name: string;
  birdTypeId: TowerTypeId;
  description: string;
  featherCost: number;
  cooldown: number; // in seconds
  radius: number;
  badgeLabel: string;
  accentColor: string;
  iconName: 'bomb' | 'zap' | 'feather' | 'wind' | 'hammer' | 'snowflake' | 'sun';
}

export const BIRD_SPECIAL_ABILITIES: Record<TowerTypeId, BirdSpecialAbilityDef> = {
  bomb_bird: {
    id: 'bomb_cataclysm',
    name: 'Cataclysmic AOE Detonation',
    birdTypeId: 'bomb_bird',
    description:
      'Overloads thermal core to trigger a devastating 360° cataclysmic explosion (150px radius). Pulverizes ground/air boars, demolishes nearby pig structures, and sets survivors ablaze.',
    featherCost: 55,
    cooldown: 12,
    radius: 150,
    badgeLabel: '💥 AOE DETONATION',
    accentColor: '#EA580C',
    iconName: 'bomb',
  },
  falcon: {
    id: 'falcon_pierce',
    name: 'Apex Piercing Strike',
    birdTypeId: 'falcon',
    description:
      'Locks onto the highest-threat enemy and unleashes a hypersonic piercing rail-spear that slices through all enemies along its path, ignoring armor barriers and shattering pig shields.',
    featherCost: 45,
    cooldown: 10,
    radius: 280,
    badgeLabel: '⚡ PIERCING STRIKE',
    accentColor: '#06B6D4',
    iconName: 'zap',
  },
  cardinal: {
    id: 'cardinal_gale',
    name: 'Crimson Razor Gale',
    birdTypeId: 'cardinal',
    description:
      'Unleashes an omni-directional spiral tempest of 16 razor-feather darts, shredding advancing infantry, piercing multiple marching targets, and stripping armor by 50%.',
    featherCost: 35,
    cooldown: 8,
    radius: 135,
    badgeLabel: '🌪️ RAZOR GALE',
    accentColor: '#EF4444',
    iconName: 'wind',
  },
  owl: {
    id: 'owl_vortex',
    name: 'Cosmic Gravity Vortex',
    birdTypeId: 'owl',
    description:
      'Launches a dark-matter mortar shell that implodes into a gravitational singularity, dragging all nearby pigs toward the center, crushing them, and slowing them by 75% for 4.5 seconds.',
    featherCost: 60,
    cooldown: 14,
    radius: 160,
    badgeLabel: '🌌 GRAVITY VORTEX',
    accentColor: '#A855F7',
    iconName: 'zap',
  },
  woodpecker: {
    id: 'woodpecker_drill',
    name: 'Seismic Bedrock Drill',
    birdTypeId: 'woodpecker',
    description:
      'Overdrives a high-torque diamond drill bit into the earth, causing violent shockwaves across 140px that stuns all marching ground boars for 3 seconds and causes severe structural fractures.',
    featherCost: 40,
    cooldown: 10,
    radius: 140,
    badgeLabel: '⛏️ SEISMIC QUAKE',
    accentColor: '#F59E0B',
    iconName: 'hammer',
  },
  penguin: {
    id: 'penguin_blizzard',
    name: 'Absolute Zero Blizzard',
    birdTypeId: 'penguin',
    description:
      'Emits a flash-freeze cryo shockwave over 170px radius that instantly encases marching pigs in solid ice blocks for 3.5 seconds, nullifying shields and creating brittle frost vulnerability.',
    featherCost: 50,
    cooldown: 13,
    radius: 170,
    badgeLabel: '❄️ ABSOLUTE ZERO',
    accentColor: '#38BDF8',
    iconName: 'snowflake',
  },
  phoenix: {
    id: 'phoenix_supernova',
    name: 'Supernova Rebirth Flare',
    birdTypeId: 'phoenix',
    description:
      'Channels cosmic solar fury, erupting in a 200px ring of holy fire that incinerates pig invaders, melts metal barriers, and restores this tower and all nearby towers back to 100% health!',
    featherCost: 75,
    cooldown: 16,
    radius: 200,
    badgeLabel: '🔥 SUPERNOVA REBIRTH',
    accentColor: '#F97316',
    iconName: 'sun',
  },
};
