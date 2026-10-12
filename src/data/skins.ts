import { TowerTypeId } from '../types/game';

export interface TowerSkin {
  id: string;
  towerId: TowerTypeId;
  name: string;
  description: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  tokenCost: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export const SKINS_DATA: TowerSkin[] = [
  {
    id: 'skin_cardinal_classic',
    towerId: 'cardinal',
    name: 'Wildwood Crimson',
    description: 'The traditional plumage of the meadow scout.',
    colorScheme: { primary: '#DC2626', secondary: '#B91C1C', accent: '#FEF08A' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_cardinal_cyber',
    towerId: 'cardinal',
    name: 'Mach Apex',
    description: 'Aerodynamic carbon fiber plating with neon red targeting visor.',
    colorScheme: { primary: '#E11D48', secondary: '#881337', accent: '#38BDF8' },
    tokenCost: 15,
    rarity: 'Epic',
  },
  {
    id: 'skin_owl_classic',
    towerId: 'owl',
    name: 'Ancient Oak',
    description: 'Carved elder bark and hardened granite launcher.',
    colorScheme: { primary: '#92400E', secondary: '#78350F', accent: '#F59E0B' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_owl_steampunk',
    towerId: 'owl',
    name: 'Clockwork Dreadnought',
    description: 'Brass gears, pressure gauges, and steam-powered trebuchet arms.',
    colorScheme: { primary: '#B45309', secondary: '#451A03', accent: '#FDE047' },
    tokenCost: 20,
    rarity: 'Epic',
  },
  {
    id: 'skin_falcon_classic',
    towerId: 'falcon',
    name: 'Storm Azure',
    description: 'High-altitude aerodynamic royal blue plumage.',
    colorScheme: { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#60A5FA' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_falcon_thunder',
    towerId: 'falcon',
    name: 'Lightning Interceptor',
    description: 'Energized plasma plating with crackling high-voltage wingtips.',
    colorScheme: { primary: '#4338CA', secondary: '#312E81', accent: '#FACC15' },
    tokenCost: 25,
    rarity: 'Legendary',
  },
  {
    id: 'skin_woodpecker_classic',
    towerId: 'woodpecker',
    name: 'Verdant Forest',
    description: 'Hardened beak with emerald forest feathers.',
    colorScheme: { primary: '#059669', secondary: '#065F46', accent: '#34D399' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_woodpecker_mecha',
    towerId: 'woodpecker',
    name: 'Hydraulic Titan',
    description: 'Industrial diamond-tipped jackhammer with hazard stripes.',
    colorScheme: { primary: '#D97706', secondary: '#1E293B', accent: '#EF4444' },
    tokenCost: 20,
    rarity: 'Rare',
  },
  {
    id: 'skin_penguin_classic',
    towerId: 'penguin',
    name: 'Arctic Frost',
    description: 'Tuxedo feathers coated in crystalline rime.',
    colorScheme: { primary: '#0284C7', secondary: '#075985', accent: '#BAE6FD' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_penguin_emperor',
    towerId: 'penguin',
    name: 'Glacial Sovereign',
    description: 'Crown of solid permafrost and royal icy cape.',
    colorScheme: { primary: '#0369A1', secondary: '#082F49', accent: '#E0F2FE' },
    tokenCost: 30,
    rarity: 'Legendary',
  },
  {
    id: 'skin_phoenix_classic',
    towerId: 'phoenix',
    name: 'Eternal Ember',
    description: 'Radiant orange plumage that never cools.',
    colorScheme: { primary: '#EA580C', secondary: '#C2410C', accent: '#FDE047' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_phoenix_supernova',
    towerId: 'phoenix',
    name: 'Cosmic Supernova',
    description: 'Starlight flare plumage burning hotter than the sun.',
    colorScheme: { primary: '#BE123C', secondary: '#881337', accent: '#F59E0B' },
    tokenCost: 35,
    rarity: 'Legendary',
  },
  {
    id: 'skin_bomb_bird_classic',
    towerId: 'bomb_bird',
    name: 'Obsidian Blast',
    description: 'Charcoal volcanic plumage with sparking crown fuse.',
    colorScheme: { primary: '#1C1917', secondary: '#292524', accent: '#F97316' },
    tokenCost: 0,
    rarity: 'Common',
  },
  {
    id: 'skin_bomb_bird_atomic',
    towerId: 'bomb_bird',
    name: 'Thermonuclear Dread',
    description: 'Hazard yellow warnings and uranium-infused detonator core.',
    colorScheme: { primary: '#EAB308', secondary: '#713F12', accent: '#EF4444' },
    tokenCost: 30,
    rarity: 'Legendary',
  },
];
