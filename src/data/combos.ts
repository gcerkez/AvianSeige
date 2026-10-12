import { TowerTypeId, PlacedTower } from '../types/game';

export interface ComboRecipe {
  id: string;
  name: string;
  towerTypes: [TowerTypeId, TowerTypeId];
  category: 'Elemental Reaction' | 'Tactical Synergy' | 'Acoustic / Seismic' | 'Air-Ground Support';
  description: string;
  tacticalEffect: string;
  visualEffect: 'volcanic' | 'thermal' | 'plasma' | 'supersonic' | 'seismic' | 'cluster';
  maxDistance: number;
  abilityName: string;
  abilityDescription: string;
  cooldown: number;
}

export const COMBO_RECIPES: ComboRecipe[] = [
  {
    id: 'combo_thermal_shock',
    name: 'Thermal Shock Reaction',
    towerTypes: ['penguin', 'phoenix'],
    category: 'Elemental Reaction',
    description: 'Alternating flash-freeze and scorching thermite weakens target armor.',
    tacticalEffect: 'Attacks shatter enemy armor, remove shields, and deal +45 frostfire burst damage.',
    visualEffect: 'thermal',
    maxDistance: 190,
    abilityName: 'Thermal Cataclysm',
    abilityDescription: 'Triggers an instant thermal shockwave, shattering frozen armor and dealing 320 damage to all marching pigs!',
    cooldown: 16,
  },
  {
    id: 'combo_supersonic_crossfire',
    name: 'Supersonic Crossfire',
    towerTypes: ['cardinal', 'falcon'],
    category: 'Tactical Synergy',
    description: 'Synchronizes rapid dart volleys with aerodynamic long-range sniping.',
    tacticalEffect: '+20% Projectile velocity, darts gain homing toward fast/flying pigs, and attacks inflict 1.2s slow.',
    visualEffect: 'supersonic',
    maxDistance: 190,
    abilityName: 'Supersonic Crossfire',
    abilityDescription: 'Launches a synchronized 360° flurry of 24 homing razor darts targeting every enemy on screen!',
    cooldown: 14,
  },
  {
    id: 'combo_seismic_demolition',
    name: 'Seismic Demolition Pair',
    towerTypes: ['owl', 'woodpecker'],
    category: 'Acoustic / Seismic',
    description: 'Acoustic reverberation combines with high-torque diamond drilling.',
    tacticalEffect: 'Destabilizes enemy structures (+60% collapse damage) and causes 1.5s tremors that stun ground boars.',
    visualEffect: 'seismic',
    maxDistance: 190,
    abilityName: 'Tectonic Quake',
    abilityDescription: 'Triggers a massive seismic shockwave that fractures standing supports and crushes ground enemies!',
    cooldown: 18,
  },
  {
    id: 'combo_precision_cluster',
    name: 'Precision Shrapnel Battery',
    towerTypes: ['bomb_bird', 'falcon'],
    category: 'Tactical Synergy',
    description: 'Heavy explosive mortar detonations burst into high-speed piercing flechettes.',
    tacticalEffect: 'Mortar explosions release 6 secondary piercing shrapnel shards that target flying and shielded enemies.',
    visualEffect: 'cluster',
    maxDistance: 190,
    abilityName: 'Cluster Barrage',
    abilityDescription: 'Deploys an airburst cluster detonation, showering the targeted lane in 30 high-velocity armor-piercing darts.',
    cooldown: 15,
  },
  {
    id: 'combo_volcanic_caldera',
    name: 'Volcanic Caldera Resonance',
    towerTypes: ['bomb_bird', 'phoenix'],
    category: 'Elemental Reaction',
    description: 'Infuses high-explosive ordnance with volcanic magma cores.',
    tacticalEffect: 'Impacts spawn lingering molten magma pools that burn passing pigs for 25 DPS over 4 seconds.',
    visualEffect: 'volcanic',
    maxDistance: 190,
    abilityName: 'Magma Eruption',
    abilityDescription: 'Spouts molten lava geysers under the front enemy column, dealing 300 damage and igniting all survivors.',
    cooldown: 16,
  },
  {
    id: 'combo_air_ground_intercept',
    name: 'Air-Ground Rapid Intercept',
    towerTypes: ['cardinal', 'harrier'],
    category: 'Air-Ground Support',
    description: 'Aerial patrol feeds forward telemetry to ground gunners.',
    tacticalEffect: 'Cardinal gains +25 Attack Range and +1 Pierce; Harrier flight speed increased by +25%.',
    visualEffect: 'supersonic',
    maxDistance: 220,
    abilityName: 'Coordinated Air Raid',
    abilityDescription: 'Harrier executes an immediate supersonic dive-bomb while Cardinal unleashes a double-cadence dart barrage!',
    cooldown: 14,
  },
  {
    id: 'combo_cryo_runway',
    name: 'Cryo Spray Patrol',
    towerTypes: ['harrier', 'penguin'],
    category: 'Elemental Reaction',
    description: 'Harrier distributes liquid nitrogen canisters across its patrol loop.',
    tacticalEffect: 'Flight path creates a continuous freezing mist trail that slows all ground pigs by 50%.',
    visualEffect: 'thermal',
    maxDistance: 220,
    abilityName: 'Blizzard Runway',
    abilityDescription: 'Flash-freezes the entire aerial flight corridor into solid permafrost, stunning all pigs along the route for 3.5s.',
    cooldown: 16,
  },
];

/**
 * Finds all combo recipes that a specific tower type can participate in
 */
export function findCompatibleCombos(towerTypeId: TowerTypeId): ComboRecipe[] {
  return COMBO_RECIPES.filter(
    (recipe) => recipe.towerTypes[0] === towerTypeId || recipe.towerTypes[1] === towerTypeId
  );
}

/**
 * Gets a combo recipe for a pair of tower types (regardless of order)
 */
export function getComboRecipe(typeA: TowerTypeId, typeB: TowerTypeId): ComboRecipe | null {
  return (
    COMBO_RECIPES.find(
      (r) =>
        (r.towerTypes[0] === typeA && r.towerTypes[1] === typeB) ||
        (r.towerTypes[0] === typeB && r.towerTypes[1] === typeA)
    ) || null
  );
}

/**
 * Tests if two placed towers can be linked in a deliberate combo
 */
export function canLinkTowers(
  t1: PlacedTower,
  t2: PlacedTower
): { eligible: boolean; reason?: string; recipe?: ComboRecipe } {
  if (t1.id === t2.id) {
    return { eligible: false, reason: 'Cannot link tower to itself' };
  }

  const recipe = getComboRecipe(t1.typeId, t2.typeId);
  if (!recipe) {
    return { eligible: false, reason: `No compatible combo between ${t1.typeId} and ${t2.typeId}` };
  }

  const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
  if (dist > recipe.maxDistance) {
    return {
      eligible: false,
      reason: `Towers are too far apart (${Math.round(dist)}px > max ${recipe.maxDistance}px)`,
      recipe,
    };
  }

  return { eligible: true, recipe };
}
