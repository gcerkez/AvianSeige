import React, { useRef, useEffect } from 'react';
import {
  Enemy,
  PlacedTower,
  Projectile,
  EnemyProjectile,
  StructureBlock,
  FormationAbility,
  ProximitySynergy,
  TowerTypeId,
  CollapseCrater,
  RegionalBiome,
} from '../types/game';
import { TOWERS_DATA } from '../data/towers';
import { physicsEngine, Particle } from '../physics/engine';
import { getEffectiveTowerRange } from '../utils/towerStats';

interface GameCanvasProps {
  towers: PlacedTower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  enemyProjectiles?: EnemyProjectile[];
  structures: StructureBlock[];
  craters?: CollapseCrater[];
  pathWaypoints: { x: number; y: number }[];
  regionalBiome?: RegionalBiome;
  formations: FormationAbility[];
  synergies: ProximitySynergy[];
  selectedTowerId: string | null;
  onSelectTower: (tower: PlacedTower | null) => void;
  onPlaceTowerLocation: (x: number, y: number, typeId: TowerTypeId) => void;
  targetingPowerUp: string | null;
  onTriggerPowerUpLocation: (x: number, y: number) => void;
  previewTowerType: TowerTypeId | null;
  showDamageNumbers: boolean;
  researchPurchased?: string[];
  isEditingFlightPath?: boolean;
  onUpdateFlightPath?: (towerId: string, waypoints: { x: number; y: number }[]) => void;
}

// Distance from point to line segment
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Validate free placement anywhere on the battlefield
export function isPlacementValid(
  x: number,
  y: number,
  waypoints: { x: number; y: number }[],
  structures: StructureBlock[],
  towers: PlacedTower[],
  craters: CollapseCrater[] = []
): { valid: boolean; reason?: string } {
  // Boundary check
  if (x < 30 || x > 870 || y < 30 || y > 530) {
    return { valid: false, reason: 'Out of bounds' };
  }

  // Road distance check: Road half-width is 22px, tower radius is 16px -> 38px buffer
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
    if (d < 38) {
      return { valid: false, reason: 'Cannot build on road' };
    }
  }

  // Existing towers check: cannot overlap
  for (const t of towers) {
    if (Math.hypot(x - t.x, y - t.y) < 32) {
      return { valid: false, reason: 'Too close to another tower' };
    }
  }

  // Active collapse craters & rubble obstacle check
  for (const c of craters) {
    if (Math.hypot(x - c.x, y - c.y) < c.radius + 18) {
      return {
        valid: false,
        reason: `Blocked by collapse rubble (${Math.ceil(c.remainingTime)}s)`,
      };
    }
  }

  // Structures check: cannot build inside standing structures/obstacles
  for (const s of structures) {
    if (s.health > 0 && !s.isCollapsing) {
      if (
        x + 16 > s.x &&
        x - 16 < s.x + s.width &&
        y + 16 > s.y &&
        y - 16 < s.y + s.height
      ) {
        return { valid: false, reason: 'Blocked by obstacle' };
      }
    }
  }

  return { valid: true };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  towers,
  enemies,
  projectiles,
  enemyProjectiles = [],
  structures,
  craters = [],
  pathWaypoints,
  regionalBiome = 'glacial',
  formations,
  synergies,
  selectedTowerId,
  onSelectTower,
  onPlaceTowerLocation,
  targetingPowerUp,
  onTriggerPowerUpLocation,
  previewTowerType,
  showDamageNumbers,
  researchPurchased = [],
  isEditingFlightPath = false,
  onUpdateFlightPath,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Unified Interaction Handler (handles both mouse clicks and touch taps)
  const handleInteractionAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Flight Path Waypoint Configuration mode
    if (isEditingFlightPath && selectedTowerId && onUpdateFlightPath) {
      const activeTower = towers.find((t) => t.id === selectedTowerId);
      if (activeTower && activeTower.isFlying) {
        const curPath = activeTower.flightPath || [];
        // Check if tapped near an existing waypoint to remove it (if more than 2)
        const nearIdx = curPath.findIndex((wp) => Math.hypot(wp.x - x, wp.y - y) <= 20);
        if (nearIdx >= 0 && curPath.length > 2) {
          const updated = curPath.filter((_, i) => i !== nearIdx);
          onUpdateFlightPath(activeTower.id, updated);
          return;
        } else if (curPath.length < 8) {
          // Append waypoint
          const updated = [...curPath, { x: Math.round(x), y: Math.round(y) }];
          onUpdateFlightPath(activeTower.id, updated);
          return;
        }
      }
    }

    // Tactical Power-Up Targeting (e.g. Egg Bombardment)
    if (targetingPowerUp) {
      onTriggerPowerUpLocation(x, y);
      return;
    }

    // Dynamic Placement anywhere on the map
    if (previewTowerType) {
      const { valid } = isPlacementValid(x, y, pathWaypoints, structures, towers, craters);
      if (valid) {
        onPlaceTowerLocation(x, y, previewTowerType);
        return;
      }
    }

    // Check if clicked an existing placed tower to inspect & upgrade
    for (const t of towers) {
      if (Math.hypot(t.x - x, t.y - y) <= 26) {
        onSelectTower(t);
        return;
      }
    }

    // Deselect if clicked empty ground
    onSelectTower(null);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePosRef.current = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Active screen shake displacement for structural collapses & heavy explosions
      const shake = physicsEngine.state.screenShake;
      let shakeX = 0;
      let shakeY = 0;
      if (shake > 0) {
        const intensity = shake * 12;
        shakeX = (Math.random() - 0.5) * 2 * intensity;
        shakeY = (Math.random() - 0.5) * 2 * intensity;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Terrain & Winding Curvy Road (Procedural Biome Aesthetic)
      drawCurvyTerrain(ctx, canvas.width, canvas.height, pathWaypoints, regionalBiome);

      // 1.2 Environmental Scenery (Farmland, crop rows, orchards, waterways, bridges, fences)
      drawEnvironmentalScenery(ctx, canvas.width, canvas.height, regionalBiome, pathWaypoints);

      // 1.5 Temporary Structural Collapse Craters & Rubble Obstacles
      drawCollapseCraters(ctx, craters);

      // 2. Combo Resonance Fields & Synergy Arcs
      drawSynergyLinks(ctx, synergies, formations, towers);

      // 2.2 Flight Patrol Paths & Waypoints (Aerial Units)
      drawFlightPaths(ctx, towers, selectedTowerId, isEditingFlightPath);

      // 3. Destructible Structures (Pillars, Beams, Arches, Barrels)
      drawStructures(ctx, structures);

      // 4. Marching Pigs (Enemies & Bosses)
      drawEnemies(ctx, enemies);

      // 5. Placed Avian Towers (Accurate Range & Aerial Sprites)
      drawTowers(ctx, towers, selectedTowerId, synergies, formations, researchPurchased);

      // 6. Projectiles & Particle Trails
      drawProjectiles(ctx, projectiles);

      // 6.5 Enemy Projectiles targeting towers
      drawEnemyProjectiles(ctx, enemyProjectiles);

      // 7. Physics Particles (falling debris, masonry blocks, smoke puffs, sparks) & Floating Text
      drawParticles(ctx, physicsEngine.particles);
      if (showDamageNumbers) {
        drawFloatingTexts(ctx, physicsEngine.floatingTexts);
      }

      // 8. Dynamic Placement Cursor Ghost (Accurate Range)
      if (previewTowerType) {
        drawPlacementGhost(
          ctx,
          mousePosRef.current.x,
          mousePosRef.current.y,
          previewTowerType,
          pathWaypoints,
          structures,
          towers,
          craters,
          researchPurchased
        );
      }

      // 9. Targeting reticle if power-up active
      if (targetingPowerUp) {
        drawTargetingReticle(ctx, mousePosRef.current, targetingPowerUp);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    towers,
    enemies,
    projectiles,
    enemyProjectiles,
    structures,
    craters,
    pathWaypoints,
    regionalBiome,
    formations,
    synergies,
    selectedTowerId,
    targetingPowerUp,
    previewTowerType,
    showDamageNumbers,
    researchPurchased,
    isEditingFlightPath,
  ]);

  return (
    <div className="relative w-full aspect-[16/10] max-h-[640px] bg-stone-950 rounded-xl overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={900}
        height={560}
        onClick={(e) => handleInteractionAt(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handleInteractionAt(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        className="w-full h-full object-contain cursor-crosshair touch-none"
      />
    </div>
  );
};

// --- RENDER HELPERS ---

function drawCurvyTerrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waypoints: { x: number; y: number }[],
  biome: RegionalBiome = 'glacial'
) {
  // Biome-specific color palettes
  let topSky = '#1c1917';
  let midSky = '#292524';
  let botSky = '#1c1917';
  let ridgeColor = '#141211';
  let ridgeAccent = '#292524';
  let knollColor = '#1f1c1a';
  let roadBorder = '#3e3a37';
  let roadInner = '#252220';
  let roadDash = '#57534e';
  let nestBase = '#78350F';
  let nestBorder = '#B45309';
  let nestText = '#F59E0B';

  if (biome === 'glacial') {
    topSky = '#081726';
    midSky = '#0f2942';
    botSky = '#0c1d2e';
    ridgeColor = '#061320';
    ridgeAccent = '#38bdf8';
    knollColor = '#102538';
    roadBorder = '#0284c7';
    roadInner = '#0a1928';
    roadDash = '#7dd3fc';
    nestBase = '#0369a1';
    nestBorder = '#38bdf8';
    nestText = '#e0f2fe';
  } else if (biome === 'desert') {
    topSky = '#261408';
    midSky = '#451a03';
    botSky = '#211005';
    ridgeColor = '#1c0c03';
    ridgeAccent = '#b45309';
    knollColor = '#3b1805';
    roadBorder = '#d97706';
    roadInner = '#281105';
    roadDash = '#fbbf24';
    nestBase = '#92400e';
    nestBorder = '#d97706';
    nestText = '#fef3c7';
  } else if (biome === 'volcanic') {
    topSky = '#1a0505';
    midSky = '#2b0909';
    botSky = '#170404';
    ridgeColor = '#120303';
    ridgeAccent = '#ea580c';
    knollColor = '#240808';
    roadBorder = '#ea580c';
    roadInner = '#140404';
    roadDash = '#f97316';
    nestBase = '#7c2d12';
    nestBorder = '#ea580c';
    nestText = '#fed7aa';
  } else if (biome === 'verdant') {
    topSky = '#05170b';
    midSky = '#0e2b15';
    botSky = '#071c0d';
    ridgeColor = '#031207';
    ridgeAccent = '#16a34a';
    knollColor = '#0b2412';
    roadBorder = '#16a34a';
    roadInner = '#081a0d';
    roadDash = '#4ade80';
    nestBase = '#14532d';
    nestBorder = '#22c55e';
    nestText = '#bbf7d0';
  } else if (biome === 'tempest') {
    topSky = '#130826';
    midSky = '#240f42';
    botSky = '#110724';
    ridgeColor = '#0c041c';
    ridgeAccent = '#9333ea';
    knollColor = '#1e0c38';
    roadBorder = '#7c3aed';
    roadInner = '#0f0621';
    roadDash = '#c084fc';
    nestBase = '#581c87';
    nestBorder = '#a855f7';
    nestText = '#f3e8ff';
  } else if (biome === 'citadel') {
    topSky = '#18181b';
    midSky = '#27272a';
    botSky = '#141416';
    ridgeColor = '#09090b';
    ridgeAccent = '#dc2626';
    knollColor = '#1f1f23';
    roadBorder = '#dc2626';
    roadInner = '#121214';
    roadDash = '#f87171';
    nestBase = '#7f1d1d';
    nestBorder = '#ef4444';
    nestText = '#fee2e2';
  }

  // 1. Terrain Backdrop Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, topSky);
  bgGrad.addColorStop(0.5, midSky);
  bgGrad.addColorStop(1, botSky);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Distant Mountain Ridge Silhouette
  ctx.fillStyle = ridgeColor;
  ctx.beginPath();
  ctx.moveTo(0, 160);
  ctx.lineTo(140, 80);
  ctx.lineTo(310, 150);
  ctx.lineTo(470, 70);
  ctx.lineTo(660, 140);
  ctx.lineTo(810, 60);
  ctx.lineTo(w, 130);
  ctx.lineTo(w, 0);
  ctx.lineTo(0, 0);
  ctx.fill();

  // Mountain snow / lava / ridge line highlight
  ctx.strokeStyle = ridgeAccent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, 160);
  ctx.lineTo(140, 80);
  ctx.lineTo(310, 150);
  ctx.lineTo(470, 70);
  ctx.lineTo(660, 140);
  ctx.lineTo(810, 60);
  ctx.lineTo(w, 130);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // 3. Biome Terrain Knolls / Mineral Patches
  ctx.fillStyle = knollColor;
  ctx.beginPath();
  ctx.arc(200, 240, 70, 0, Math.PI * 2);
  ctx.arc(600, 340, 80, 0, Math.PI * 2);
  ctx.arc(360, 480, 90, 0, Math.PI * 2);
  ctx.fill();

  if (waypoints.length > 1) {
    // Outer pathway border (Stone / Ice / Basalt embankment)
    ctx.lineWidth = 50;
    ctx.strokeStyle = roadBorder;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }
    ctx.stroke();

    // Inner road bed
    ctx.lineWidth = 40;
    ctx.strokeStyle = roadInner;
    ctx.stroke();

    // Road texture center dashed guide
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = roadDash;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Avian Nest destination at the terminal waypoint
  const endPt = waypoints[waypoints.length - 1];
  if (endPt) {
    ctx.save();
    ctx.fillStyle = nestBase;
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = nestBorder;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = nestText;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AVIAN NEST', endPt.x, endPt.y + 4);
    ctx.restore();
  }
}

function drawEnvironmentalScenery(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: RegionalBiome = 'glacial',
  waypoints: { x: number; y: number }[]
) {
  ctx.save();

  // 1. Farmland Plots / Tilled Crop Soil
  const plots = [
    { x: 45, y: 380, width: 110, height: 75, type: 'wheat' },
    { x: 740, y: 70, width: 120, height: 80, type: 'furrows' },
    { x: 720, y: 390, width: 130, height: 90, type: 'orchard' },
  ];

  for (const plot of plots) {
    ctx.fillStyle =
      biome === 'glacial'
        ? '#132338'
        : biome === 'desert'
        ? '#3d2314'
        : biome === 'volcanic'
        ? '#261212'
        : '#271d15';
    ctx.fillRect(plot.x, plot.y, plot.width, plot.height);
    ctx.strokeStyle = biome === 'glacial' ? '#1e3a5f' : '#452b1b';
    ctx.lineWidth = 2;
    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);

    // Split-rail fence posts
    ctx.fillStyle = '#78350f';
    const postStep = 25;
    for (let px = plot.x; px <= plot.x + plot.width; px += postStep) {
      ctx.fillRect(px - 2, plot.y - 3, 4, 6);
      ctx.fillRect(px - 2, plot.y + plot.height - 3, 4, 6);
    }

    if (plot.type === 'wheat') {
      ctx.strokeStyle = biome === 'glacial' ? '#38bdf8' : '#eab308';
      ctx.lineWidth = 2;
      for (let py = plot.y + 12; py < plot.y + plot.height - 6; py += 12) {
        ctx.beginPath();
        ctx.moveTo(plot.x + 8, py);
        ctx.lineTo(plot.x + plot.width - 8, py);
        ctx.stroke();
      }
    } else if (plot.type === 'furrows') {
      ctx.strokeStyle = biome === 'glacial' ? '#0284c7' : '#84cc16';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 6]);
      for (let py = plot.y + 10; py < plot.y + plot.height - 6; py += 10) {
        ctx.beginPath();
        ctx.moveTo(plot.x + 6, py);
        ctx.lineTo(plot.x + plot.width - 6, py);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (plot.type === 'orchard') {
      const trees = [
        { ox: 25, oy: 25 },
        { ox: 65, oy: 25 },
        { ox: 105, oy: 25 },
        { ox: 45, oy: 65 },
        { ox: 85, oy: 65 },
      ];
      for (const t of trees) {
        const tx = plot.x + t.ox;
        const ty = plot.y + t.oy;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(tx + 2, ty + 6, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.fillRect(tx - 2, ty, 4, 7);

        ctx.fillStyle =
          biome === 'glacial' ? '#0369a1' : biome === 'volcanic' ? '#7f1d1d' : '#15803d';
        ctx.beginPath();
        ctx.arc(tx, ty - 2, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle =
          biome === 'glacial' ? '#38bdf8' : biome === 'volcanic' ? '#ea580c' : '#22c55e';
        ctx.beginPath();
        ctx.arc(tx - 3, ty - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tx + 4, ty - 4, 2, 0, Math.PI * 2);
        ctx.arc(tx - 4, ty + 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Meandering Waterway / River with Water Ripples
  const riverColor =
    biome === 'glacial' ? '#0284c7' : biome === 'volcanic' ? '#ea580c' : '#0ea5e9';
  const riverBank =
    biome === 'glacial' ? '#0369a1' : biome === 'volcanic' ? '#9a3412' : '#0369a1';

  ctx.save();
  ctx.strokeStyle = riverBank;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(320, 0);
  ctx.bezierCurveTo(340, 150, 270, 260, 310, 420);
  ctx.bezierCurveTo(330, 480, 380, 520, 410, 560);
  ctx.stroke();

  ctx.strokeStyle = riverColor;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(320, 0);
  ctx.bezierCurveTo(340, 150, 270, 260, 310, 420);
  ctx.bezierCurveTo(330, 480, 380, 520, 410, 560);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 18]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 3. Wooden Bridge where road intersects river
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if ((p1.x <= 315 && p2.x >= 300) || (p1.x >= 300 && p2.x <= 315)) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.save();
      ctx.translate(midX, midY);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      ctx.rotate(angle);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-22, -26, 44, 52);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -26, 44, 52);

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      for (let bx = -18; bx <= 18; bx += 6) {
        ctx.beginPath();
        ctx.moveTo(bx, -25);
        ctx.lineTo(bx, 25);
        ctx.stroke();
      }

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-22, -25);
      ctx.lineTo(22, -25);
      ctx.moveTo(-22, 25);
      ctx.lineTo(22, 25);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Wild Trees scattered across the biome
  const wildTrees = [
    { x: 120, y: 130 },
    { x: 520, y: 80 },
    { x: 570, y: 120 },
    { x: 230, y: 460 },
    { x: 830, y: 490 },
  ];
  for (const wt of wildTrees) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(wt.x + 3, wt.y + 7, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(wt.x - 2, wt.y, 4, 8);

    ctx.fillStyle =
      biome === 'glacial'
        ? '#0284c7'
        : biome === 'volcanic'
        ? '#991b1b'
        : biome === 'desert'
        ? '#b45309'
        : '#166534';
    ctx.beginPath();
    ctx.arc(wt.x, wt.y - 4, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle =
      biome === 'glacial'
        ? '#38bdf8'
        : biome === 'volcanic'
        ? '#ea580c'
        : biome === 'desert'
        ? '#d97706'
        : '#22c55e';
    ctx.beginPath();
    ctx.arc(wt.x - 4, wt.y - 7, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFlightPaths(
  ctx: CanvasRenderingContext2D,
  towers: PlacedTower[],
  selectedTowerId: string | null,
  isEditingFlightPath: boolean
) {
  const animTime = performance.now() * 0.003;

  for (const tower of towers) {
    if (!tower.isFlying || !tower.flightPath || tower.flightPath.length < 2) continue;

    const isSelected = tower.id === selectedTowerId;
    const path = tower.flightPath;

    ctx.save();
    // Flight corridor loop
    ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -animTime * 30;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Waypoint handles
    if (isSelected || isEditingFlightPath) {
      for (let i = 0; i < path.length; i++) {
        const wp = path[i];
        ctx.fillStyle = isEditingFlightPath ? '#0284c7' : '#0369a1';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((i + 1).toString(), wp.x, wp.y + 3);
      }

      if (isEditingFlightPath && isSelected) {
        ctx.fillStyle = 'rgba(12, 10, 9, 0.88)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.fillRect(tower.x - 90, tower.y - 48, 180, 20);
        ctx.strokeRect(tower.x - 90, tower.y - 48, 180, 20);

        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO ADD/REMOVE WAYPOINT', tower.x, tower.y - 35);
      }
    }

    ctx.restore();
  }
}

function drawCollapseCraters(ctx: CanvasRenderingContext2D, craters: CollapseCrater[]) {
  const animTime = performance.now() * 0.003;

  for (const c of craters) {
    ctx.save();
    ctx.translate(c.x, c.y);

    const progressPct = Math.max(0, c.remainingTime / c.duration);
    const pulse = Math.sin(animTime * 6) * 0.5 + 0.5;

    // 1. Scorched crater depression shadow (charred pit)
    const craterGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, c.radius);
    craterGrad.addColorStop(0, '#0c0a09'); // deep charcoal pit
    craterGrad.addColorStop(0.55, '#1c1917');
    craterGrad.addColorStop(0.85, '#292524');
    craterGrad.addColorStop(1, 'rgba(41, 37, 36, 0)');
    ctx.fillStyle = craterGrad;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Radiating structural ground fissures / cracks
    ctx.save();
    for (const crack of c.cracks) {
      const crackLen = crack.length * (0.85 + 0.15 * progressPct);
      const endX = Math.cos(crack.angle) * crackLen;
      const endY = Math.sin(crack.angle) * crackLen;

      // Glowing ember fissure lines
      ctx.strokeStyle =
        progressPct > 0.25
          ? `rgba(234, 88, 12, ${0.4 + pulse * 0.3})`
          : 'rgba(120, 113, 108, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Branching fissures
      for (const branch of crack.branches) {
        const bAngle = crack.angle + branch.angleOffset;
        const bLen = branch.length;
        ctx.beginPath();
        ctx.moveTo(endX * 0.6, endY * 0.6);
        ctx.lineTo(
          endX * 0.6 + Math.cos(bAngle) * bLen,
          endY * 0.6 + Math.sin(bAngle) * bLen
        );
        ctx.stroke();
      }
    }
    ctx.restore();

    // 3. Jagged crater rim stones
    ctx.strokeStyle = '#44403C';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, c.radius * 0.76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Shattered rubble obstacle pile (fallen perch stones, timber crossbeams, iron fittings)
    for (const b of c.rubbleBlocks) {
      ctx.save();
      ctx.translate(b.offsetX, b.offsetY);
      ctx.rotate(b.rotation);

      // Rubble block shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(-b.w / 2 + 1.5, -b.h / 2 + 1.5, b.w, b.h);

      // Rubble material fill & outline
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);

      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);

      // Beam texture if timber
      if (b.color === '#B45309' || b.color === '#78350F') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-b.w / 2, 0);
        ctx.lineTo(b.w / 2, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Rising animated smoke wisps from crater
    const smokeWispY = -5 - Math.sin(animTime * 3) * 6;
    ctx.fillStyle = 'rgba(120, 113, 108, 0.32)';
    ctx.beginPath();
    ctx.arc(
      Math.cos(animTime * 2) * 5,
      smokeWispY,
      4.5 + Math.sin(animTime * 4) * 1.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 6. Tactical Clearance Timer & Rubble Obstacle Badge
    const badgeY = -c.radius - 8;
    // Circular timer gauge ring around crater
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = progressPct > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progressPct);
    ctx.stroke();

    // Obstacle text pill badge
    ctx.fillStyle = 'rgba(12, 10, 9, 0.88)';
    ctx.strokeStyle = progressPct > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 1;
    ctx.fillRect(-38, badgeY - 8, 76, 14);
    ctx.strokeRect(-38, badgeY - 8, 76, 14);

    ctx.fillStyle = progressPct > 0.25 ? '#FBBF24' : '#F87171';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CRATER (${Math.ceil(c.remainingTime)}s)`, 0, badgeY + 2.5);

    ctx.restore();
  }
}

function drawSynergyLinks(
  ctx: CanvasRenderingContext2D,
  synergies: ProximitySynergy[],
  formations: FormationAbility[],
  towers: PlacedTower[]
) {
  const towerMap = new Map(towers.map((t) => [t.id, t]));
  const animTime = performance.now() * 0.003;

  // 1. Draw Deliberate Player-Chosen Combo links
  const drawnDeliberatePairs = new Set<string>();
  for (const tower of towers) {
    const partnerIds = [
      ...(tower.comboPartnerIds || []),
      ...(tower.linkedComboTowerId ? [tower.linkedComboTowerId] : []),
    ];
    for (const pId of partnerIds) {
      const pairKey = [tower.id, pId].sort().join(':');
      if (drawnDeliberatePairs.has(pairKey)) continue;
      drawnDeliberatePairs.add(pairKey);

      const pTower = towerMap.get(pId);
      if (pTower) {
        const pulse = 0.5 + Math.sin(animTime * 4) * 0.5;
        ctx.save();
        // Golden resonating laser link
        ctx.strokeStyle = '#F59E0B';
        ctx.globalAlpha = 0.45 + pulse * 0.3;
        ctx.lineWidth = 3.5 + pulse * 1.5;
        ctx.beginPath();
        ctx.moveTo(tower.x, tower.y);
        ctx.lineTo(pTower.x, pTower.y);
        ctx.stroke();

        ctx.strokeStyle = '#FEF08A';
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Traveling energy spark
        const sparkPos = (animTime * 0.8) % 1;
        const sx = tower.x + (pTower.x - tower.x) * sparkPos;
        const sy = tower.y + (pTower.y - tower.y) * sparkPos;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 2. Draw Proximity & Combo links between adjacent towers
  for (const s of synergies) {
    const t1 = towerMap.get(s.towerIds[0]);
    const t2 = towerMap.get(s.towerIds[1]);
    if (t1 && t2) {
      const isReaction = s.type === 'reaction';
      const color = isReaction ? '#06B6D4' : '#F59E0B';
      const pulse = 0.5 + Math.sin(animTime * 3) * 0.5;

      ctx.save();
      // Outer glow beam
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.lineWidth = 4 + pulse * 2;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();

      // Sharp central energy core
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();

      // Animated traveling energy sparks along the line
      const sparkPos1 = (animTime * 0.7) % 1;
      const sparkPos2 = (animTime * 0.7 + 0.5) % 1;
      const sx1 = t1.x + (t2.x - t1.x) * sparkPos1;
      const sy1 = t1.y + (t2.y - t1.y) * sparkPos1;
      const sx2 = t1.x + (t2.x - t1.x) * sparkPos2;
      const sy2 = t1.y + (t2.y - t1.y) * sparkPos2;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sx1, sy1, 3, 0, Math.PI * 2);
      ctx.arc(sx2, sy2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing synergy halos under both towers
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(t1.x, t1.y, 20 + pulse * 4, 0, Math.PI * 2);
      ctx.arc(t2.x, t2.y, 20 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // Formations: Elemental Circuit and Demolition Triangle
  for (const form of formations) {
    if (form.type === 'circuit' && form.towerIds.length >= 2) {
      const t1 = towerMap.get(form.towerIds[0]);
      const t2 = towerMap.get(form.towerIds[1]);
      if (t1 && t2) {
        ctx.save();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#0284C7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // High-voltage lightning sparks
        const midX = (t1.x + t2.x) / 2 + (Math.random() - 0.5) * 8;
        const midY = (t1.y + t2.y) / 2 + (Math.random() - 0.5) * 8;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(midX, midY);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();

        ctx.restore();
      }
    } else if (form.type === 'triangle' && form.towerIds.length >= 3) {
      const t1 = towerMap.get(form.towerIds[0]);
      const t2 = towerMap.get(form.towerIds[1]);
      const t3 = towerMap.get(form.towerIds[2]);
      if (t1 && t2 && t3) {
        ctx.save();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#EA580C';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// Dynamic Placement Ghost showing real-time valid/invalid feedback anywhere on map
function drawPlacementGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  towerType: TowerTypeId,
  waypoints: { x: number; y: number }[],
  structures: StructureBlock[],
  towers: PlacedTower[],
  craters: CollapseCrater[] = [],
  researchPurchased: string[] = []
) {
  const def = TOWERS_DATA[towerType];
  if (!def) return;

  const { valid, reason } = isPlacementValid(x, y, waypoints, structures, towers, craters);

  const dummyTower: PlacedTower = {
    id: 'preview',
    typeId: towerType,
    x,
    y,
    level: 1,
    rotation: 0,
    tiers: { path_a: 0, path_b: 0, path_c: 0 },
    lockedPath: null,
    targetPriority: 'first',
    kills: 0,
    damageDealt: 0,
    lastFired: 0,
    health: 100,
    maxHealth: 100,
    lastDamagedTime: 0,
  };
  const previewRange = getEffectiveTowerRange(dummyTower, researchPurchased);

  ctx.save();

  // Attack range preview circle
  ctx.strokeStyle = valid ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
  ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, previewRange, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Placement base pad
  ctx.strokeStyle = valid ? '#22C55E' : '#EF4444';
  ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Avatar icon preview
  ctx.fillStyle = def.accentColor;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();

  // Tooltip tag if invalid
  if (!valid && reason) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x - 65, y - 36, 130, 20);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 65, y - 36, 130, 20);

    ctx.fillStyle = '#FCA5A5';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(reason, x, y - 23);
  } else if (valid) {
    ctx.fillStyle = '#86EFAC';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLICK TO PLACE', x, y - 24);
  }

  ctx.restore();
}

function drawStructures(ctx: CanvasRenderingContext2D, structures: StructureBlock[]) {
  const animTime = performance.now() * 0.003;

  for (const block of structures) {
    if (block.health <= 0 && !block.isCollapsing) continue;

    ctx.save();
    ctx.translate(block.x + block.width / 2, block.y + block.height / 2);
    ctx.rotate(block.rotation);

    const halfW = block.width / 2;
    const halfH = block.height / 2;
    const damageRatio = Math.max(0, 1 - block.health / block.maxHealth);

    // Regional Obstacle Visual Customizations
    if (block.obstacleType === 'sandstone_pillar' || block.obstacleType === 'sandstone_arch') {
      // Sun-baked terracotta sandstone
      ctx.fillStyle = '#B45309';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Horizontal sandstone sediment strata
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 3, -halfH / 2);
      ctx.lineTo(halfW - 3, -halfH / 2);
      ctx.moveTo(-halfW + 3, 0);
      ctx.lineTo(halfW - 3, 0);
      ctx.moveTo(-halfW + 3, halfH / 2);
      ctx.lineTo(halfW - 3, halfH / 2);
      ctx.stroke();
    } else if (block.obstacleType === 'obsidian_monolith' || block.obstacleType === 'basalt_bridge') {
      // Jet-black glossy obsidian with molten orange fissures
      ctx.fillStyle = '#18181B';
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Glowing magma cracks
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, -halfH + 4);
      ctx.lineTo(0, 0);
      ctx.lineTo(halfW - 4, halfH - 4);
      ctx.stroke();
    } else if (block.obstacleType === 'tesla_pylon' || block.obstacleType === 'storm_deck') {
      // Conductive copper Tesla pylon
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Electric spark coils
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-halfW + 3, -halfH + 3, block.width - 6, block.height - 6);

      // Dynamic electric sparks jumping across
      if (Math.random() < 0.25) {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-halfW, (Math.random() - 0.5) * halfH);
        ctx.lineTo(halfW, (Math.random() - 0.5) * halfH);
        ctx.stroke();
      }
    } else if (block.obstacleType === 'redwood_trunk') {
      // Ancient redwood tree trunk with moss
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Tree ring grain & moss
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 2, -halfH + 4);
      ctx.lineTo(-halfW + 6, -halfH + 4);
      ctx.moveTo(halfW - 6, halfH - 4);
      ctx.lineTo(halfW - 2, halfH - 4);
      ctx.stroke();
    } else if (block.material === 'wood') {
      // Wood plank timber texture
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Wood grain lines
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 3, -halfH / 3);
      ctx.lineTo(halfW - 3, -halfH / 3);
      ctx.moveTo(-halfW + 3, halfH / 3);
      ctx.lineTo(halfW - 3, halfH / 3);
      ctx.stroke();
    } else if (block.material === 'stone') {
      // Granite masonry stone texture
      ctx.fillStyle = '#57534E';
      ctx.strokeStyle = '#1C1917';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      ctx.fillStyle = '#78716C';
      ctx.fillRect(-halfW + 3, -halfH + 3, block.width - 6, block.height - 6);

      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -halfH + 2);
      ctx.lineTo(0, halfH - 2);
      ctx.stroke();
    } else if (block.material === 'metal') {
      // Steel I-beam girder / blastdoor texture
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Hazard chevrons if blastdoor
      if (block.obstacleType === 'titanium_blastdoor') {
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-halfW + 4, -halfH + 3, 4, block.height - 6);
        ctx.fillRect(halfW - 8, -halfH + 3, 4, block.height - 6);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.fillRect(-halfW + 2, -halfH + 2, block.width - 4, 3);
      }
    } else if (block.material === 'ice' || block.obstacleType === 'ice_spire' || block.obstacleType === 'glacial_arch') {
      // Translucent crystalline ice with faceted refraction
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2;
      ctx.fillRect(-halfW, -halfH, block.width, block.height);
      ctx.strokeRect(-halfW, -halfH, block.width, block.height);

      // Crystal facet diagonal highlight
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, -halfH + 4);
      ctx.lineTo(halfW - 4, halfH - 4);
      ctx.stroke();
    } else if (block.material === 'explosive_barrel') {
      // Regional Explosive Barrels
      let bBg = '#DC2626';
      let bBorder = '#7F1D1D';
      let bLabel = 'TNT';
      let bTextColor = '#FDE047';

      if (block.obstacleType === 'cryo_keg') {
        bBg = '#0284C7';
        bBorder = '#075985';
        bLabel = 'CRYO';
        bTextColor = '#E0F2FE';
      } else if (block.obstacleType === 'dust_keg') {
        bBg = '#D97706';
        bBorder = '#78350F';
        bLabel = 'DUST';
        bTextColor = '#FEF3C7';
      } else if (block.obstacleType === 'magma_pot') {
        bBg = '#EA580C';
        bBorder = '#431407';
        bLabel = 'LAVA';
        bTextColor = '#FFEDD5';
      } else if (block.obstacleType === 'pitch_keg') {
        bBg = '#78350F';
        bBorder = '#451A03';
        bLabel = 'PITCH';
        bTextColor = '#FDE68A';
      } else if (block.obstacleType === 'plasma_capacitor') {
        bBg = '#7C3AED';
        bBorder = '#4C1D95';
        bLabel = 'EMP';
        bTextColor = '#F3E8FF';
      }

      ctx.fillStyle = bBg;
      ctx.strokeStyle = bBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, block.width, block.height, 4);
      ctx.fill();
      ctx.stroke();

      // Hazard bands
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(-halfW + 2, -halfH + 4, block.width - 4, 3);
      ctx.fillRect(-halfW + 2, halfH - 7, block.width - 4, 3);

      // Glowing Label
      ctx.fillStyle = bTextColor;
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bLabel, 0, 3);
    }

    // Dynamic Angry Birds Cracks & Fissures when damaged
    if (damageRatio > 0.15) {
      ctx.save();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, -halfH + 6);
      ctx.lineTo(0, 0);
      ctx.lineTo(halfW - 6, -2);
      if (damageRatio > 0.5) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-2, halfH - 4);
        ctx.lineTo(halfW - 4, halfH - 6);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Comprehensive Destructible Obstacle Damage Meter & Health Bar
    const hpPct = Math.max(0, block.health / block.maxHealth);
    const barW = Math.max(block.width, 34);
    const barY = -halfH - 12;

    // Background gauge
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(-barW / 2, barY, barW, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-barW / 2, barY, barW, 6);

    // Health fill gradient (green -> amber -> red)
    ctx.fillStyle = hpPct > 0.6 ? '#22C55E' : hpPct > 0.3 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(-barW / 2, barY, barW * hpPct, 6);

    // Material & HP text indicator
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(block.health)}/${block.maxHealth}`, 0, barY - 2);

    ctx.restore();
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]) {
  const animTime = performance.now() * 0.003;

  for (const enemy of enemies) {
    if (enemy.health <= 0) continue;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.isBoss) {
      // Boss shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 16, enemy.radius + 10, enemy.radius / 2 + 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boss Variant Palette
      let bossColor = '#475569';
      let bossBorder = '#1E293B';
      let bossAccent = '#DC2626';

      if (enemy.type === 'frost_hog') {
        bossColor = '#0284C7';
        bossBorder = '#082F49';
        bossAccent = '#38BDF8';
      } else if (enemy.type === 'blizzard_goliath') {
        bossColor = '#0369A1';
        bossBorder = '#0C4A6E';
        bossAccent = '#7DD3FC';
      } else if (enemy.type === 'sand_titan') {
        bossColor = '#D97706';
        bossBorder = '#451A03';
        bossAccent = '#FBBF24';
      } else if (enemy.type === 'magma_behemoth') {
        bossColor = '#EA580C';
        bossBorder = '#431407';
        bossAccent = '#F97316';
      } else if (enemy.type === 'cinder_tyrant') {
        bossColor = '#DC2626';
        bossBorder = '#450A0A';
        bossAccent = '#EA580C';
      } else if (enemy.type === 'bramble_crusher') {
        bossColor = '#15803D';
        bossBorder = '#14532D';
        bossAccent = '#B45309';
      } else if (enemy.type === 'storm_king') {
        bossColor = '#7C3AED';
        bossBorder = '#2E1065';
        bossAccent = '#FACC15';
      } else if (enemy.type === 'volt_ram') {
        bossColor = '#9333EA';
        bossBorder = '#3B0764';
        bossAccent = '#38BDF8';
      } else if (enemy.type === 'mecha_boar') {
        bossColor = '#B91C1C';
        bossBorder = '#0F172A';
        bossAccent = '#F97316';
      } else if (enemy.type === 'emperor_pork') {
        bossColor = '#991B1B';
        bossBorder = '#450A0A';
        bossAccent = '#FBBF24';
      }

      // Boss Body
      ctx.fillStyle = bossColor;
      ctx.strokeStyle = bossBorder;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Snout
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.ellipse(8, 0, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(9, -3, 3, 3);
      ctx.fillRect(9, 1, 3, 3);

      // Tusks
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(12, 6);
      ctx.lineTo(21, 2);
      ctx.lineTo(15, 10);
      ctx.fill();

      // Boss Variant Custom Ornaments
      if (enemy.type === 'emperor_pork') {
        // Imperial Golden Crown
        ctx.fillStyle = '#FBBF24';
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -enemy.radius + 2);
        ctx.lineTo(-12, -enemy.radius - 12);
        ctx.lineTo(-5, -enemy.radius - 6);
        ctx.lineTo(0, -enemy.radius - 14);
        ctx.lineTo(5, -enemy.radius - 6);
        ctx.lineTo(12, -enemy.radius - 12);
        ctx.lineTo(12, -enemy.radius + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.type === 'storm_king' || enemy.type === 'volt_ram') {
        // Lightning horns
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, -enemy.radius + 4);
        ctx.lineTo(-14, -enemy.radius - 8);
        ctx.lineTo(-10, -enemy.radius - 12);
        ctx.moveTo(10, -enemy.radius + 4);
        ctx.lineTo(14, -enemy.radius - 8);
        ctx.lineTo(10, -enemy.radius - 12);
        ctx.stroke();
      } else if (enemy.type === 'blizzard_goliath' || enemy.type === 'frost_hog') {
        // Cryo horns
        ctx.fillStyle = '#E0F2FE';
        ctx.beginPath();
        ctx.moveTo(-12, -enemy.radius + 4);
        ctx.lineTo(-15, -enemy.radius - 10);
        ctx.lineTo(-8, -enemy.radius + 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, -enemy.radius + 4);
        ctx.lineTo(15, -enemy.radius - 10);
        ctx.lineTo(8, -enemy.radius + 2);
        ctx.fill();
      }

      // Frontal Boss Armor / Shield
      if (enemy.shieldFrontal > 0 && !enemy.bossShieldCracked) {
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 6, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }

      if (enemy.isStunned) {
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💫 STUNNED!', 0, -enemy.radius - 18);
      }

      // Boss Health Bar
      const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(-38, -enemy.radius - 12, 76, 8);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-38, -enemy.radius - 12, 76 * hpPct, 8);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(-38, -enemy.radius - 12, 76, 8);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, 0, -enemy.radius - 16);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, enemy.radius - 2, enemy.radius, enemy.radius / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = enemy.type === 'bomber' ? '#EF4444' : '#65A30D';
      ctx.strokeStyle = '#3F6212';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#84CC16';
      ctx.beginPath();
      ctx.ellipse(4, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-2, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-1, -4, 1.2, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.type === 'armored') {
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.arc(0, -3, enemy.radius, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-enemy.radius + 3, -4, enemy.radius * 2 - 6, 2);
      } else if (enemy.type === 'shield' && enemy.shieldFrontal > 0) {
        ctx.fillStyle = '#78350F';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.fillRect(enemy.radius - 2, -enemy.radius, 5, enemy.radius * 2);
      } else if (enemy.type === 'bomber') {
        ctx.fillStyle = '#B91C1C';
        ctx.fillRect(-enemy.radius - 4, -4, 6, 8);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(-enemy.radius - 2, -6, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'glider') {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-enemy.radius - 8, -6);
        ctx.lineTo(0, -enemy.radius - 3);
        ctx.lineTo(enemy.radius + 8, -6);
        ctx.stroke();
      }

      if (enemy.burningTimer > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small health bar
      const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
      if (hpPct < 1.0) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-12, -enemy.radius - 6, 24, 4);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(-12, -enemy.radius - 6, 24 * hpPct, 4);
      }
    }

    ctx.restore();
  }
}

function drawTowers(
  ctx: CanvasRenderingContext2D,
  towers: PlacedTower[],
  selectedTowerId: string | null,
  synergies: ProximitySynergy[],
  formations: FormationAbility[],
  researchPurchased: string[] = []
) {
  const linkedTowerIds = new Set<string>();
  synergies.forEach((s) => s.towerIds.forEach((id) => linkedTowerIds.add(id)));
  formations.forEach((f) => f.towerIds.forEach((id) => linkedTowerIds.add(id)));
  towers.forEach((t) => {
    if (t.linkedComboTowerId) linkedTowerIds.add(t.id);
    if (t.comboPartnerIds && t.comboPartnerIds.length > 0) linkedTowerIds.add(t.id);
  });

  const now = performance.now();
  const animTime = now * 0.003;

  for (const tower of towers) {
    const def = TOWERS_DATA[tower.typeId];
    if (!def) continue;

    ctx.save();
    ctx.translate(tower.x, tower.y);

    const isSelected = tower.id === selectedTowerId;
    const isLinked = linkedTowerIds.has(tower.id);

    // Active combo rotating aura under the tower perch
    if (isLinked) {
      const pulse = 0.5 + Math.sin(animTime * 4) * 0.5;
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4 + pulse * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating elemental spark nodes
      for (let s = 0; s < 3; s++) {
        const ang = animTime * 2 + (s * Math.PI * 2) / 3;
        ctx.fillStyle = s % 2 === 0 ? '#38BDF8' : '#EA580C';
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 22, Math.sin(ang) * 22, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (isSelected) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const range = getEffectiveTowerRange(tower, researchPurchased);
      ctx.arc(0, 0, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Perch stone base or Aerial Shadow
    if (tower.isFlying) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(10, 16, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = isSelected ? '#F59E0B' : isLinked ? '#EAB308' : '#78716C';
      ctx.lineWidth = isLinked ? 2.5 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.rotate(tower.rotation);

    if (tower.typeId === 'harrier') {
      // Sleek Harrier supersonic raptor delta-wing interceptor
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(15, 0); // nose cone
      ctx.lineTo(-5, -15); // right wingtip
      ctx.lineTo(-2, -4); // right wing root
      ctx.lineTo(-12, -9); // right stabilizer
      ctx.lineTo(-10, 0); // engine exhaust
      ctx.lineTo(-12, 9); // left stabilizer
      ctx.lineTo(-2, 4); // left wing root
      ctx.lineTo(-5, 15); // left wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cyan jet engine afterburner trail
      ctx.fillStyle = Math.random() < 0.5 ? '#38bdf8' : '#0284c7';
      ctx.beginPath();
      ctx.arc(-11, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden cockpit canopy
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(3, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.typeId === 'bomb_bird') {
      // Custom Bomb Finch silhouette: Deep charcoal spherical body with sparking fuse
      ctx.fillStyle = '#1C1917';
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crown fuse crest on top of head
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-4, -18, -2, -22);
      ctx.stroke();

      // Sparking fuse flame
      ctx.fillStyle = Math.random() < 0.5 ? '#F97316' : '#FDE047';
      ctx.beginPath();
      ctx.arc(-2, -22, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Fierce glowing orange beak
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(10, -4);
      ctx.lineTo(21, 0);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();

      // Intense angry eyes
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(4, -6, 5, 2.5);
      ctx.fillRect(4, 3, 5, 2.5);
    } else {
      ctx.fillStyle = def.silhouetteColor;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(9, -4);
      ctx.lineTo(19, 0);
      ctx.lineTo(9, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (tower.tiers.path_a >= 2) {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(8, -8, 7, 3);
      ctx.fillRect(8, 5, 7, 3);
    }
    if (tower.tiers.path_b >= 2) {
      ctx.fillStyle = def.accentColor;
      ctx.beginPath();
      ctx.ellipse(-4, -10, 5, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(-4, 10, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (tower.tiers.path_c >= 2) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-2, -12, 3, 5);
      ctx.beginPath();
      ctx.arc(0, -12, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const totalTiers = tower.tiers.path_a + tower.tiers.path_b + tower.tiers.path_c;

    // Un-rotate for readable badges and health bars
    ctx.rotate(-tower.rotation);

    // Tier badge count indicator
    if (totalTiers > 0) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(11, -11, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(totalTiers.toString(), 11, -9);
    }

    // Active combo badge indicator
    if (isLinked) {
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡COMBO', 0, 24);
    }

    // Red flash ring if tower was recently hit by enemy projectile
    if (now - tower.lastDamagedTime < 350) {
      ctx.save();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Tower Health Bar if damaged or selected
    if (tower.health < tower.maxHealth || isSelected) {
      const hpPct = Math.max(0, tower.health / tower.maxHealth);
      const barW = 32;
      const barH = 5;
      const barX = -barW / 2;
      const barY = -23;

      // Dark background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // Current health fill
      ctx.fillStyle = hpPct > 0.5 ? '#22C55E' : hpPct > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // HP text when low or selected
      if (isSelected || hpPct < 0.6) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(tower.health)}/${tower.maxHealth}`, 0, barY - 3);
      }

      // Repair indicator (if no damage for 3 seconds)
      if (now - tower.lastDamagedTime >= 3000 && tower.health < tower.maxHealth) {
        ctx.fillStyle = '#4ADE80';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+REPAIRING', 0, barY - 3);
      }
    }

    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  const animTime = performance.now() * 0.005;

  for (const p of projectiles) {
    if (p.trail.length > 1) {
      ctx.save();
      for (let i = 0; i < p.trail.length - 1; i++) {
        const pt1 = p.trail[i];
        const pt2 = p.trail[i + 1];
        ctx.strokeStyle = p.isComboProjectile ? '#F59E0B' : p.color;
        ctx.globalAlpha = pt1.alpha * 0.5;
        ctx.lineWidth = (p.radius + (p.isComboProjectile ? 3 : 0)) * (1 - i / p.trail.length);
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (p.gravity) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 15, p.radius, p.radius / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    // Distinctive visual rendering for Combo Projectiles
    if (p.isComboProjectile) {
      if (p.comboVisual === 'volcanic') {
        // Volcanic fire meteor: enlarged glowing orb with flame sparks
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.comboVisual === 'thermal') {
        // Cyan and Orange dual-energy sphere
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(animTime) * 3, p.y + Math.cos(animTime) * 3, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.comboVisual === 'plasma') {
        // Electric supercharged plasma orb
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Supersonic laser dart
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.element === 'explosive') {
      // Heavy iron cast mortar bomb with smoking fuse
      ctx.fillStyle = '#1C1917';
      ctx.strokeStyle = '#44403C';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sparking fuse tip
      ctx.fillStyle = Math.random() < 0.5 ? '#F97316' : '#FDE047';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - p.radius - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawEnemyProjectiles(ctx: CanvasRenderingContext2D, enemyProjectiles: EnemyProjectile[]) {
  for (const p of enemyProjectiles) {
    // 1. Draw projectile particle trail
    if (p.trail && p.trail.length > 1) {
      ctx.save();
      for (let i = 0; i < p.trail.length - 1; i++) {
        const pt1 = p.trail[i];
        const pt2 = p.trail[i + 1];
        ctx.strokeStyle =
          p.enemyType === 'bomber'
            ? '#EF4444'
            : p.enemyType === 'frost_hog'
            ? '#38BDF8'
            : p.enemyType === 'storm_king'
            ? '#C084FC'
            : p.color;
        ctx.globalAlpha = pt1.alpha * 0.45 * (1 - i / p.trail.length);
        ctx.lineWidth = Math.max(1, p.radius * 0.8 * (1 - i / p.trail.length));
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Parabolic ground shadow projection
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    const shadowX = p.startX + (p.targetX - p.startX) * p.progress;
    const shadowY = p.startY + (p.targetY - p.startY) * p.progress;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, p.radius * 0.9, p.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Draw enemy projectile sprite
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    switch (p.enemyType) {
      case 'bomber': {
        // Ticking dynamite stick with sparking fuse
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-2, -3, 4, 6);
        // Fuse wire
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.quadraticCurveTo(10, -3, 12, -2);
        ctx.stroke();
        // Sparking fuse flame
        ctx.fillStyle = Math.random() < 0.5 ? '#F97316' : '#FDE047';
        ctx.beginPath();
        ctx.arc(12, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'builder': {
        // Spinning monkey wrench
        ctx.fillStyle = '#D97706';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.fillRect(-6, -2, 12, 4);
        ctx.strokeRect(-6, -2, 12, 4);
        ctx.beginPath();
        ctx.arc(6, 0, 4, -Math.PI / 2, Math.PI / 2, false);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'armored': {
        // Jagged heavy iron scrap bolt
        ctx.fillStyle = '#64748B';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(6, -2);
        ctx.lineTo(7, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'shield': {
        // Pig wooden javelin
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.stroke();
        // Spearhead
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(9, -2.5);
        ctx.lineTo(14, 0);
        ctx.lineTo(9, 2.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'glider': {
        // Dropped pinecone bomb
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#065F46';
        ctx.fillRect(-2, -5, 4, 2.5);
        break;
      }
      case 'iron_boar': {
        // Molten iron cannonball
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(2, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'frost_hog': {
        // Glacial spiked boulder
        ctx.fillStyle = '#0284C7';
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'storm_king': {
        // Crackling lightning orb
        ctx.fillStyle = '#7C3AED';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'mecha_boar': {
        // Rocket missile
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(-7, -3.5, 14, 7);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(7, -3.5);
        ctx.lineTo(12, 0);
        ctx.lineTo(7, 3.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        // Scout slingshot mud clod / stone
        ctx.fillStyle = '#854D0E';
        ctx.strokeStyle = '#543007';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));

    if (pt.isDebris && (pt.shape === 'square' || pt.shape === 'shard')) {
      ctx.translate(pt.x, pt.y);
      if (pt.rotation !== undefined) ctx.rotate(pt.rotation);

      if (pt.shape === 'square') {
        const w = pt.width || pt.radius * 2;
        const h = pt.height || pt.radius * 1.5;
        // Rubble block shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w, h);
        // Masonry face
        ctx.fillStyle = pt.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      } else {
        // Sharp splinter / triangular shard
        const r = pt.radius;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.9, r);
        ctx.lineTo(-r * 0.9, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    } else if (pt.shape === 'smoke') {
      // Soft expanding dust/smoke puff
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.radius);
      grad.addColorStop(0, pt.color);
      grad.addColorStop(1, 'rgba(41, 37, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  floatingTexts: { x: number; y: number; text: string; color: string; scale: number; alpha?: number }[]
) {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.font = `bold ${Math.round(11 * ft.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawTargetingReticle(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  type: string
) {
  ctx.save();
  ctx.strokeStyle = type === 'bombardment' ? '#EF4444' : '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  const radius = type === 'bombardment' ? 65 : 45;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pos.x - radius - 10, pos.y);
  ctx.lineTo(pos.x + radius + 10, pos.y);
  ctx.moveTo(pos.x, pos.y - radius - 10);
  ctx.lineTo(pos.x + radius + 10, pos.y);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLICK TO STRIKE', pos.x, pos.y - radius - 8);

  ctx.restore();
}
