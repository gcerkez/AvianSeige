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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle canvas click / touch
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.x) * scaleX;
    const y = (e.clientY - rect.y) * scaleY;

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
      if (Math.hypot(t.x - x, t.y - y) <= 24) {
        onSelectTower(t);
        return;
      }
    }

    // Deselect if clicked empty ground
    onSelectTower(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePosRef.current = {
      x: (e.clientX - rect.x) * scaleX,
      y: (e.clientY - rect.y) * scaleY,
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

      // 1.5 Temporary Structural Collapse Craters & Rubble Obstacles
      drawCollapseCraters(ctx, craters);

      // 2. Combo Resonance Fields & Synergy Arcs
      drawSynergyLinks(ctx, synergies, formations, towers);

      // 3. Destructible Structures (Pillars, Beams, Arches, Barrels)
      drawStructures(ctx, structures);

      // 4. Marching Pigs (Enemies & Bosses)
      drawEnemies(ctx, enemies);

      // 5. Placed Avian Towers
      drawTowers(ctx, towers, selectedTowerId, synergies, formations);

      // 6. Projectiles & Particle Trails
      drawProjectiles(ctx, projectiles);

      // 6.5 Enemy Projectiles targeting towers
      drawEnemyProjectiles(ctx, enemyProjectiles);

      // 7. Physics Particles (falling debris, masonry blocks, smoke puffs, sparks) & Floating Text
      drawParticles(ctx, physicsEngine.particles);
      if (showDamageNumbers) {
        drawFloatingTexts(ctx, physicsEngine.floatingTexts);
      }

      // 8. Dynamic Placement Cursor Ghost
      if (previewTowerType) {
        drawPlacementGhost(
          ctx,
          mousePosRef.current.x,
          mousePosRef.current.y,
          previewTowerType,
          pathWaypoints,
          structures,
          towers,
          craters
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
  ]);

  return (
    <div className="relative w-full aspect-[16/10] max-h-[640px] bg-stone-950 rounded-xl overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={900}
        height={560}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="w-full h-full object-contain cursor-crosshair"
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

  // Draw Proximity & Combo links between adjacent towers
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
  craters: CollapseCrater[] = []
) {
  const def = TOWERS_DATA[towerType];
  if (!def) return;

  const { valid, reason } = isPlacementValid(x, y, waypoints, structures, towers, craters);

  ctx.save();

  // Attack range preview circle
  ctx.strokeStyle = valid ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
  ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, def.baseRange, 0, Math.PI * 2);
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
  formations: FormationAbility[]
) {
  const linkedTowerIds = new Set<string>();
  synergies.forEach((s) => s.towerIds.forEach((id) => linkedTowerIds.add(id)));
  formations.forEach((f) => f.towerIds.forEach((id) => linkedTowerIds.add(id)));

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
      const range = def.baseRange + (tower.tiers.path_c > 0 ? tower.tiers.path_c * 20 : 0);
      ctx.arc(0, 0, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Perch stone base
    ctx.fillStyle = '#292524';
    ctx.strokeStyle = isSelected ? '#F59E0B' : isLinked ? '#EAB308' : '#78716C';
    ctx.lineWidth = isLinked ? 2.5 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(tower.rotation);

    if (tower.typeId === 'bomb_bird') {
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
