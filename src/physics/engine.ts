import {
  Enemy,
  PlacedTower,
  Projectile,
  StructureBlock,
  ProximitySynergy,
  FormationAbility,
  ElementType,
} from '../types/game';
import { soundManager } from '../audio/soundManager';

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  isDebris?: boolean;
  shape?: 'circle' | 'square' | 'shard' | 'smoke';
  rotation?: number;
  rotationSpeed?: number;
  width?: number;
  height?: number;
  bounceGroundY?: number;
  bouncesRemaining?: number;
}

export interface PhysicsEngineState {
  screenShake: number;
  pigsCrushedCount: number;
  structuresDestroyedCount: number;
  combosTriggeredCount: number;
  elementalReactionsCount: number;
}

export class PhysicsEngine {
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public state: PhysicsEngineState = {
    screenShake: 0,
    pigsCrushedCount: 0,
    structuresDestroyedCount: 0,
    combosTriggeredCount: 0,
    elementalReactionsCount: 0,
  };

  public resetStats() {
    this.particles = [];
    this.floatingTexts = [];
    this.state = {
      screenShake: 0,
      pigsCrushedCount: 0,
      structuresDestroyedCount: 0,
      combosTriggeredCount: 0,
      elementalReactionsCount: 0,
    };
  }

  public addFloatingText(x: number, y: number, text: string, color = '#FACC15', scale = 1) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      life: 1.0,
      maxLife: 1.0,
      vy: -35,
      scale,
    });
  }

  public spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    speed = 120,
    gravity = 150
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 3 + 2,
        color,
        alpha: 1,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        gravity,
      });
    }
  }

  // Structural collapse sequence debris: tumbling stones, splintered timber, mortar chunks & smoke
  public spawnStructuralCollapseDebris(
    x: number,
    y: number,
    colorScheme?: { primary?: string; secondary?: string }
  ) {
    const debrisColors = [
      '#78716C', // Stone gray masonry
      '#57534E', // Heavy dark stone
      '#A8A29E', // Mortar dust
      '#B45309', // Timber wood fragment
      '#78350F', // Dark beam
      '#44403C', // Charcoal
      colorScheme?.primary || '#DC2626',
    ];

    // 1. Heavy tumbling structural debris (masonry blocks & splintered timber)
    for (let i = 0; i < 36; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5; // upward eruption
      const speed = Math.random() * 200 + 70;
      const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
      const w = Math.random() * 7 + 4;
      const h = Math.random() * 5 + 3;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.max(w, h) / 2,
        color,
        alpha: 1,
        life: 1.6 + Math.random() * 0.8,
        maxLife: 2.4,
        gravity: 420, // heavy falling acceleration
        isDebris: true,
        shape: Math.random() < 0.6 ? 'square' : 'shard',
        width: w,
        height: h,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 16,
        bounceGroundY: y + 8 + Math.random() * 14,
        bouncesRemaining: 2,
      });
    }

    // 2. Thick billowing dust and smoke plumes
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 15;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: -Math.random() * 40 - 15,
        radius: Math.random() * 9 + 6,
        color: Math.random() < 0.5 ? '#78716C' : '#57534E',
        alpha: 0.8,
        life: 1.4 + Math.random() * 0.7,
        maxLife: 2.1,
        isDebris: true,
        shape: 'smoke',
      });
    }

    // 3. Hot ember sparks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        radius: Math.random() * 2.5 + 1.5,
        color: Math.random() < 0.5 ? '#F59E0B' : '#EF4444',
        alpha: 1,
        life: 0.9 + Math.random() * 0.5,
        maxLife: 1.4,
        gravity: 140,
      });
    }
  }

  // Check structural stability & propagate collapse
  public updateStructures(
    structures: StructureBlock[],
    enemies: Enemy[],
    dt: number,
    onBossCollapseCrush?: (boss: Enemy) => void
  ) {
    // 1. Identify which blocks still have solid support
    const blockMap = new Map<string, StructureBlock>();
    for (const b of structures) {
      blockMap.set(b.id, b);
    }

    for (const block of structures) {
      if (block.isCollapsing) {
        // Apply gravity and fall
        block.vy += 450 * dt;
        block.y += block.vy * dt;
        block.x += block.vx * dt;
        block.rotation += block.rotationSpeed * dt;

        // Check collision of falling block with marching pigs
        for (const enemy of enemies) {
          const enemyBox = {
            x: enemy.x - enemy.radius,
            y: enemy.y - enemy.radius,
            w: enemy.radius * 2,
            h: enemy.radius * 2,
          };
          const blockBox = {
            x: block.x,
            y: block.y,
            w: block.width,
            h: block.height,
          };

          if (this.boxesIntersect(blockBox, enemyBox)) {
            // Crush damage!
            const crushDmg = block.crushPower * (1 + block.vy / 200);
            enemy.health -= crushDmg;
            this.state.pigsCrushedCount++;
            this.addFloatingText(enemy.x, enemy.y - 20, `CRUSHED! -${Math.round(crushDmg)}`, '#F97316', 1.3);

            this.spawnParticles(enemy.x, enemy.y, 16, '#EA580C', 160, 200);
            soundManager.playCollapse();

            // Special Boss Interaction: Collapse on The Iron Boar shatters frontal shield!
            if (enemy.isBoss && enemy.type === 'iron_boar') {
              enemy.shieldFrontal = 0;
              enemy.bossShieldCracked = true;
              enemy.isStunned = true;
              enemy.stunTimer = 6.0; // 6s stun
              this.addFloatingText(
                enemy.x,
                enemy.y - 45,
                'SHIELD SHATTERED & STUNNED!',
                '#EF4444',
                1.6
              );
              this.state.screenShake = 1.0;
              if (onBossCollapseCrush) onBossCollapseCrush(enemy);
            } else {
              enemy.isStunned = true;
              enemy.stunTimer = Math.max(enemy.stunTimer, 1.5);
            }
          }
        }

        // Spawn dust while falling
        if (Math.random() < 0.3) {
          this.spawnParticles(block.x + block.width / 2, block.y + block.height, 2, '#78716C', 40, 80);
        }

        continue;
      }

      // Check if support dependencies are destroyed
      if (block.supportIds && block.supportIds.length > 0) {
        let hasActiveSupport = false;
        for (const supId of block.supportIds) {
          const sup = blockMap.get(supId);
          if (sup && sup.health > 0 && !sup.isCollapsing) {
            hasActiveSupport = true;
            break;
          }
        }

        if (!hasActiveSupport && block.health > 0) {
          // Trigger collapse!
          block.isCollapsing = true;
          block.vy = 40;
          block.vx = (Math.random() - 0.5) * 60;
          block.rotationSpeed = (Math.random() - 0.5) * 3;
          soundManager.playCollapse();
          this.state.screenShake = Math.min(1.0, this.state.screenShake + 0.35);
          this.addFloatingText(block.x + block.width / 2, block.y, 'COLLAPSING!', '#F59E0B', 1.2);
          this.spawnParticles(block.x + block.width / 2, block.y + block.height / 2, 20, '#A8A29E', 120, 220);
        }
      }
    }
  }

  // Handle Projectile movement & impact
  public updateProjectiles(
    projectiles: Projectile[],
    enemies: Enemy[],
    structures: StructureBlock[],
    dt: number
  ): Projectile[] {
    const remainingProjectiles: Projectile[] = [];

    for (const p of projectiles) {
      // Homing for falcon missiles
      if (p.homingTargetEnemyId) {
        const target = enemies.find((e) => e.id === p.homingTargetEnemyId);
        if (target && target.health > 0) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            const currentSpeed = Math.hypot(p.vx, p.vy);
            const targetVx = (dx / dist) * currentSpeed;
            const targetVy = (dy / dist) * currentSpeed;
            p.vx += (targetVx - p.vx) * 8 * dt;
            p.vy += (targetVy - p.vy) * 8 * dt;
          }
        }
      }

      // Ballistic gravity for mortar/heavy stones
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }

      // Move
      const stepX = p.vx * dt;
      const stepY = p.vy * dt;
      p.x += stepX;
      p.y += stepY;
      const stepDist = Math.hypot(stepX, stepY);
      p.traveledDistance += stepDist;

      // Add to trail
      p.trail.unshift({ x: p.x, y: p.y, alpha: 0.9 });
      if (p.trail.length > 7) {
        p.trail.pop();
      }
      p.trail.forEach((pt) => (pt.alpha *= 0.85));

      // Range expiration
      if (p.traveledDistance >= p.maxDistance || p.y > 600 || p.x < -50 || p.x > 950) {
        continue;
      }

      let destroyed = false;

      // 1. Check collision with structures
      for (const block of structures) {
        if (block.health <= 0) continue;
        const box = { x: block.x, y: block.y, w: block.width, h: block.height };
        if (this.circleBoxIntersect(p.x, p.y, p.radius, box)) {
          // Calculate damage with material modifiers
          let damage = p.structuralDamage;
          if (block.material === 'wood' && p.element === 'fire') {
            damage *= 2.5; // Fire destroys wood rapidly
            this.addFloatingText(block.x + block.width / 2, block.y, 'IGNITED!', '#EF4444');
          } else if (block.material === 'stone' && p.element === 'physical') {
            damage *= 1.8; // Boulders break stone
          } else if (block.material === 'ice' && (p.element === 'fire' || p.element === 'explosive')) {
            damage *= 2.2;
          } else if (block.material === 'metal' && p.element === 'electric') {
            // Electricity conducts through metal and zaps nearby enemies!
            damage *= 1.4;
            this.conductThroughMetal(block, structures, enemies);
          }

          block.health -= damage;
          soundManager.playImpact(block.material);
          this.addFloatingText(
            block.x + block.width / 2 + (Math.random() - 0.5) * 16,
            block.y - 12,
            `-${Math.round(damage)} [${block.material.toUpperCase()}]`,
            this.getMaterialColor(block.material)
          );
          this.spawnParticles(p.x, p.y, 12, this.getMaterialColor(block.material), 90);

          // Explosive AOE blast against surrounding obstacles & enemies
          if (p.element === 'explosive' || p.aoeRadius) {
            const aoe = p.aoeRadius || 80;
            soundManager.playExplosion();
            this.state.screenShake = Math.min(1.0, this.state.screenShake + 0.4);
            this.spawnParticles(p.x, p.y, 25, '#F97316', 180, 220);
            this.spawnParticles(p.x, p.y, 15, '#EF4444', 140, 180);

            for (const otherBlock of structures) {
              if (otherBlock.id === block.id || otherBlock.health <= 0) continue;
              const bDist = Math.hypot(otherBlock.x + otherBlock.width / 2 - p.x, otherBlock.y + otherBlock.height / 2 - p.y);
              if (bDist <= aoe) {
                const splashDmg = damage * 0.7 * (1 - bDist / aoe);
                otherBlock.health -= splashDmg;
                if (otherBlock.health <= 0) this.destroyStructure(otherBlock, structures, enemies);
              }
            }

            for (const enemy of enemies) {
              const eDist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
              if (eDist <= aoe && enemy.health > 0) {
                const splashDmg = p.damage * (1 - eDist / aoe);
                enemy.health -= splashDmg;
                this.addFloatingText(enemy.x, enemy.y - 15, `AOE -${Math.round(splashDmg)}`, '#EA580C');
              }
            }
          }

          if (block.health <= 0) {
            this.destroyStructure(block, structures, enemies);
          }

          p.pierceRemaining--;
          if (p.pierceRemaining <= 0 || p.element === 'explosive') {
            destroyed = true;
            break;
          }
        }
      }

      if (destroyed) continue;

      // 2. Check collision with enemies
      for (const enemy of enemies) {
        if (enemy.health <= 0) continue;
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist <= p.radius + enemy.radius) {
          // Frontal Shield mechanic
          let actualDmg = p.damage;
          if (enemy.shieldFrontal > 0 && !enemy.bossShieldCracked) {
            if (p.vx > 0) {
              // Coming from behind or above
              enemy.shieldFrontal = Math.max(0, enemy.shieldFrontal - actualDmg);
              actualDmg *= 0.35; // absorbed partially
              this.addFloatingText(enemy.x, enemy.y - 25, 'SHIELD BLOCKED', '#94A3B8');
            } else {
              enemy.shieldFrontal = Math.max(0, enemy.shieldFrontal - actualDmg);
              actualDmg *= 0.2;
              this.addFloatingText(enemy.x, enemy.y - 25, 'DEFLECTED', '#CBD5E1');
            }
          } else {
            // Apply armor reduction
            if (p.element === 'physical') {
              actualDmg = Math.max(1, actualDmg - enemy.armor * 0.4);
            }
          }

          // Distinctive Combo Burst effects when fired by linked combo towers
          if (p.isComboProjectile) {
            if (p.comboVisual === 'volcanic') {
              actualDmg *= 1.4;
              this.addFloatingText(enemy.x, enemy.y - 35, '💥 VOLCANIC BURST!', '#EA580C', 1.4);
              this.spawnParticles(p.x, p.y, 20, '#F97316', 180);
              enemy.burningTimer = 5.0;
              enemy.burningDps = Math.max(enemy.burningDps, actualDmg * 0.5);
            } else if (p.comboVisual === 'thermal') {
              actualDmg *= 1.5;
              this.addFloatingText(enemy.x, enemy.y - 35, '❄️🔥 THERMAL SHOCK!', '#06B6D4', 1.4);
              this.spawnParticles(p.x, p.y, 22, '#38BDF8', 190);
              enemy.slowTimer = 4.0;
              enemy.slowMultiplier = 0.4;
            } else if (p.comboVisual === 'plasma') {
              actualDmg *= 1.35;
              this.addFloatingText(enemy.x, enemy.y - 35, '⚡ PLASMA ARC!', '#38BDF8', 1.4);
              this.chainLightning(enemy, enemies, actualDmg * 0.6);
            } else if (p.comboVisual === 'supersonic') {
              actualDmg *= 1.3;
              this.addFloatingText(enemy.x, enemy.y - 35, '🎯 SUPERSONIC!', '#E11D48', 1.4);
              this.spawnParticles(p.x, p.y, 16, '#F43F5E', 210);
            }
          }

          // Elemental effects
          if (p.element === 'fire') {
            enemy.burningTimer = 3.5;
            enemy.burningDps = Math.max(enemy.burningDps, actualDmg * 0.35);
          } else if (p.element === 'ice') {
            enemy.slowTimer = 3.0;
            enemy.slowMultiplier = 0.55;
            // Thermal shock reaction check if enemy was also burning
            if (enemy.burningTimer > 0) {
              const reactionDmg = actualDmg * 1.8;
              enemy.health -= reactionDmg;
              this.state.elementalReactionsCount++;
              this.addFloatingText(enemy.x, enemy.y - 35, `THERMAL SHOCK! -${Math.round(reactionDmg)}`, '#06B6D4', 1.4);
              this.spawnParticles(enemy.x, enemy.y, 22, '#38BDF8', 160);
            }
          } else if (p.element === 'electric') {
            enemy.conductiveTimer = 2.5;
            this.chainLightning(enemy, enemies, actualDmg * 0.5);
          } else if (p.element === 'explosive' || p.aoeRadius) {
            // Area explosion against all surrounding enemies and structures
            const aoe = p.aoeRadius || 80;
            soundManager.playExplosion();
            this.state.screenShake = Math.min(1.0, this.state.screenShake + 0.4);
            this.spawnParticles(p.x, p.y, 24, '#EA580C', 180);

            for (const otherEnemy of enemies) {
              if (otherEnemy.id === enemy.id || otherEnemy.health <= 0) continue;
              const eDist = Math.hypot(otherEnemy.x - p.x, otherEnemy.y - p.y);
              if (eDist <= aoe) {
                const splashDmg = actualDmg * (1 - eDist / aoe);
                otherEnemy.health -= splashDmg;
                this.addFloatingText(otherEnemy.x, otherEnemy.y - 15, `AOE -${Math.round(splashDmg)}`, '#F97316');
              }
            }

            for (const b of structures) {
              if (b.health <= 0) continue;
              const bDist = Math.hypot(b.x + b.width / 2 - p.x, b.y + b.height / 2 - p.y);
              if (bDist <= aoe) {
                const sDmg = p.structuralDamage * (1 - bDist / aoe);
                b.health -= sDmg;
                if (b.health <= 0) this.destroyStructure(b, structures, enemies);
              }
            }
          }

          enemy.health -= actualDmg;
          this.addFloatingText(
            enemy.x + (Math.random() - 0.5) * 15,
            enemy.y - 15,
            `-${Math.round(actualDmg)}`,
            this.getElementColor(p.element)
          );

          this.spawnParticles(enemy.x, enemy.y, 8, p.color, 110);
          soundManager.playImpact('pig');

          p.pierceRemaining--;
          if (p.pierceRemaining <= 0 || p.element === 'explosive') {
            destroyed = true;
            break;
          }
        }
      }

      if (!destroyed) {
        remainingProjectiles.push(p);
      }
    }

    return remainingProjectiles;
  }

  private destroyStructure(
    block: StructureBlock,
    structures: StructureBlock[],
    enemies: Enemy[]
  ) {
    this.state.structuresDestroyedCount++;
    this.spawnParticles(block.x + block.width / 2, block.y + block.height / 2, 28, this.getMaterialColor(block.material), 180, 240);

    // Explosive barrel explodes and damages surrounding blocks & enemies
    if (block.material === 'explosive_barrel') {
      soundManager.playExplosion();
      this.state.screenShake = 0.8;

      let blastLabel = 'KABOOM!';
      let blastColor = '#EF4444';
      if (block.obstacleType === 'cryo_keg') {
        blastLabel = '❄️ CRYO FREEZE!';
        blastColor = '#38BDF8';
      } else if (block.obstacleType === 'dust_keg') {
        blastLabel = '🌪️ DUST STORM!';
        blastColor = '#D97706';
      } else if (block.obstacleType === 'magma_pot') {
        blastLabel = '🔥 MAGMA ERUPTION!';
        blastColor = '#EA580C';
      } else if (block.obstacleType === 'plasma_capacitor') {
        blastLabel = '⚡ EMP SHOCKWAVE!';
        blastColor = '#7C3AED';
      }

      this.addFloatingText(block.x + block.width / 2, block.y, blastLabel, blastColor, 1.6);
      const blastRadius = 145;

      for (const other of structures) {
        if (other.id === block.id || other.health <= 0) continue;
        const dx = (other.x + other.width / 2) - (block.x + block.width / 2);
        const dy = (other.y + other.height / 2) - (block.y + block.height / 2);
        if (Math.hypot(dx, dy) <= blastRadius) {
          other.health -= 280;
          other.isCollapsing = true;
          other.vy = -120;
          other.vx = (dx / (Math.hypot(dx, dy) || 1)) * 140;
        }
      }

      for (const enemy of enemies) {
        const dist = Math.hypot(enemy.x - (block.x + block.width / 2), enemy.y - (block.y + block.height / 2));
        if (dist <= blastRadius) {
          const dmg = 380 * (1 - dist / blastRadius);
          enemy.health -= dmg;

          if (block.obstacleType === 'cryo_keg') {
            enemy.slowTimer = 5.0;
            enemy.slowMultiplier = 0.15;
            this.addFloatingText(enemy.x, enemy.y - 25, 'FROZEN SOLID!', '#38BDF8', 1.3);
          } else if (block.obstacleType === 'dust_keg') {
            enemy.slowTimer = 4.0;
            enemy.slowMultiplier = 0.45;
            this.addFloatingText(enemy.x, enemy.y - 25, 'BLINDED!', '#D97706', 1.3);
          } else if (block.obstacleType === 'magma_pot') {
            enemy.burningTimer = 6.0;
            enemy.burningDps = 75;
            this.addFloatingText(enemy.x, enemy.y - 25, 'IGNITED!', '#EA580C', 1.3);
          } else if (block.obstacleType === 'plasma_capacitor') {
            enemy.conductiveTimer = 6.0;
            enemy.isStunned = true;
            enemy.stunTimer = 2.5;
            this.addFloatingText(enemy.x, enemy.y - 25, 'STUNNED EMP!', '#A855F7', 1.3);
          } else {
            this.addFloatingText(enemy.x, enemy.y - 20, `BLAST! -${Math.round(dmg)}`, '#F97316');
          }
        }
      }
    }
  }

  // Chain lightning to up to 3 nearby enemies
  private chainLightning(source: Enemy, allEnemies: Enemy[], damage: number) {
    let chained = 0;
    for (const target of allEnemies) {
      if (target.id === source.id || target.health <= 0) continue;
      const d = Math.hypot(target.x - source.x, target.y - source.y);
      if (d < 120 && chained < 3) {
        target.health -= damage;
        this.addFloatingText(target.x, target.y - 15, `ZAP -${Math.round(damage)}`, '#60A5FA');
        this.spawnParticles(target.x, target.y, 6, '#93C5FD', 100);
        chained++;
      }
    }
  }

  // Electricity conducting through metal beams to nearby enemies
  private conductThroughMetal(
    metalBlock: StructureBlock,
    allBlocks: StructureBlock[],
    enemies: Enemy[]
  ) {
    const shockCenter = { x: metalBlock.x + metalBlock.width / 2, y: metalBlock.y + metalBlock.height / 2 };
    this.addFloatingText(shockCenter.x, shockCenter.y - 20, 'CONDUCTIVE SURGE!', '#38BDF8', 1.3);
    this.spawnParticles(shockCenter.x, shockCenter.y, 18, '#60A5FA', 140);
    this.state.elementalReactionsCount++;

    for (const e of enemies) {
      const d = Math.hypot(e.x - shockCenter.x, e.y - shockCenter.y);
      if (d < 110) {
        e.health -= 80;
        e.isStunned = true;
        e.stunTimer = 1.2;
        this.addFloatingText(e.x, e.y - 20, 'ELECTROCUTED! -80', '#60A5FA');
      }
    }
  }

  // Calculate active proximity synergies & formations
  public calculateSynergies(towers: PlacedTower[]): {
    synergies: ProximitySynergy[];
    formations: FormationAbility[];
  } {
    const synergies: ProximitySynergy[] = [];
    const formations: FormationAbility[] = [];

    // Pairwise proximity check
    for (let i = 0; i < towers.length; i++) {
      for (let j = i + 1; j < towers.length; j++) {
        const t1 = towers[i];
        const t2 = towers[j];
        const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);

        if (dist <= 160) {
          // Check pair type
          const pairKey = [t1.typeId, t2.typeId].sort().join('+');

          if (pairKey === 'penguin+phoenix') {
            synergies.push({
              id: `syn-${t1.id}-${t2.id}`,
              name: 'Thermal Shock Reaction',
              towerIds: [t1.id, t2.id],
              type: 'active_combo',
              effectDescription: 'Alternating fire & frost deals +100% shatter damage to structures & armor.',
              abilityName: 'Thermal Cataclysm',
              abilityDescription: 'Triggers an instant thermal shockwave, shattering frozen armor and dealing 500 damage to all marching pigs!',
              cooldown: 18,
              currentCooldown: 0,
              active: true,
            });
          } else if (pairKey === 'owl+woodpecker') {
            synergies.push({
              id: `syn-${t1.id}-${t2.id}`,
              name: 'Structural Demolition Pair',
              towerIds: [t1.id, t2.id],
              type: 'active_combo',
              effectDescription: 'Destabilized structural joints take +75% collapse damage from artillery.',
              abilityName: 'Tectonic Quake',
              abilityDescription: 'Triggers a massive seismic shockwave that fractures standing supports and crushes ground enemies!',
              cooldown: 20,
              currentCooldown: 0,
              active: true,
            });
          } else if (pairKey === 'cardinal+falcon' || pairKey === 'falcon+cardinal') {
            synergies.push({
              id: `syn-${t1.id}-${t2.id}`,
              name: 'Rapid Aerial Interception',
              towerIds: [t1.id, t2.id],
              type: 'active_combo',
              effectDescription: '+25% attack speed and homing velocity for both avian towers.',
              abilityName: 'Supersonic Crossfire',
              abilityDescription: 'Launches a synchronized 360° flurry of 24 homing razor darts targeting every enemy on screen!',
              cooldown: 15,
              currentCooldown: 0,
              active: true,
            });
          }
        }
      }
    }

    // Formation checks: 3+ towers
    if (towers.length >= 3) {
      // Demolition Triangle: 3 towers encircling a zone
      const demolitionTowers = towers.filter(
        (t) => t.typeId === 'owl' || t.typeId === 'woodpecker' || t.tiers.path_a >= 2
      );
      if (demolitionTowers.length >= 3) {
        formations.push({
          id: 'formation-demolition',
          name: 'Demolition Resonance Triangle',
          type: 'triangle',
          towerIds: demolitionTowers.slice(0, 3).map((t) => t.id),
          description: 'Focuses structural vibration frequencies, amplifying building collapse speed by 2.5x!',
          abilityName: 'Resonance Implosion',
          abilityDescription: 'Collapses the acoustic triangle inward, dealing 600 damage to all enemies inside and shattering barriers!',
          cooldown: 16,
          currentCooldown: 0,
          active: true,
        });
      }

      // Elemental Circuit: 2+ elemental towers
      const elementalTowers = towers.filter(
        (t) => t.typeId === 'phoenix' || t.typeId === 'penguin' || t.tiers.path_b >= 2
      );
      if (elementalTowers.length >= 2) {
        formations.push({
          id: 'formation-circuit',
          name: 'Elemental Conduit Beam',
          type: 'circuit',
          towerIds: elementalTowers.slice(0, 2).map((t) => t.id),
          description: 'Generates an electrified thermal beam between towers that burns and slows marching pigs.',
          abilityName: 'Plasma Supercharge',
          abilityDescription: 'Overcharges the laser beam with 50,000 volts, dealing 450 damage and stunning all pigs in the sector!',
          cooldown: 14,
          currentCooldown: 0,
          active: true,
        });
      }
    }

    return { synergies, formations };
  }

  // Execute Active Combo Abilities unlocked by tower proximity and formations
  public triggerComboAbility(
    abilityName: string,
    enemies: Enemy[],
    structures: StructureBlock[],
    towers: PlacedTower[]
  ) {
    if (abilityName === 'Plasma Supercharge') {
      soundManager.playPowerUp();
      this.state.screenShake = 0.6;
      this.addFloatingText(450, 260, 'PLASMA SUPERCHARGE!', '#38BDF8', 1.6);
      this.spawnParticles(450, 260, 45, '#38BDF8', 220);

      enemies.forEach((e) => {
        e.health -= 450;
        e.isStunned = true;
        e.stunTimer = 2.5;
        this.addFloatingText(e.x, e.y - 20, '-450 ZAP!', '#38BDF8');
        this.spawnParticles(e.x, e.y, 8, '#60A5FA', 140);
      });
      this.state.elementalReactionsCount += 3;
    } else if (abilityName === 'Tectonic Quake' || abilityName === 'Resonance Implosion') {
      soundManager.playCollapse();
      this.state.screenShake = 0.9;
      this.addFloatingText(450, 260, 'TECTONIC RESONANCE QUAKE!', '#F59E0B', 1.6);
      this.spawnParticles(450, 260, 50, '#A8A29E', 240);

      // Fracture structures
      structures.forEach((s) => {
        if (s.health > 0) {
          s.health -= 350;
          this.spawnParticles(s.x + s.width / 2, s.y + s.height / 2, 12, '#78716C', 160);
        }
      });

      enemies.forEach((e) => {
        e.health -= 500;
        e.isStunned = true;
        e.stunTimer = 2.0;
        this.addFloatingText(e.x, e.y - 20, '-500 QUAKE!', '#F59E0B');
      });
      this.state.combosTriggeredCount += 2;
    } else if (abilityName === 'Supersonic Crossfire') {
      soundManager.playShoot('falcon');
      this.addFloatingText(450, 260, 'SUPERSONIC CROSSFIRE SALVO!', '#DC2626', 1.6);

      enemies.forEach((e) => {
        e.health -= 380;
        this.addFloatingText(e.x, e.y - 20, '-380 DART!', '#EF4444');
        this.spawnParticles(e.x, e.y, 10, '#DC2626', 160);
      });
      this.state.combosTriggeredCount += 2;
    } else if (abilityName === 'Thermal Cataclysm') {
      soundManager.playExplosion();
      this.state.screenShake = 0.7;
      this.addFloatingText(450, 260, 'THERMAL CATACLYSM!', '#06B6D4', 1.7);
      this.spawnParticles(450, 260, 45, '#38BDF8', 200);

      enemies.forEach((e) => {
        e.health -= 520;
        e.burningTimer = 4.0;
        e.burningDps = 70;
        e.slowTimer = 4.0;
        e.slowMultiplier = 0.4;
        this.addFloatingText(e.x, e.y - 25, '-520 SHATTER!', '#06B6D4');
      });
      this.state.elementalReactionsCount += 4;
    }
  }

  // Update floating particles and text
  public updateVisuals(dt: number) {
    // Screen shake decay
    if (this.state.screenShake > 0) {
      this.state.screenShake = Math.max(0, this.state.screenShake - dt * 2.5);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * dt;
      }

      if (p.gravity) {
        p.vy += p.gravity * dt;
      }

      // Check ground bounce for tumbling debris
      if (
        p.isDebris &&
        p.bounceGroundY !== undefined &&
        p.y >= p.bounceGroundY &&
        (p.bouncesRemaining || 0) > 0
      ) {
        p.y = p.bounceGroundY;
        p.vy = -p.vy * 0.42; // bounce dampening
        p.vx *= 0.65; // ground friction
        p.bouncesRemaining = (p.bouncesRemaining || 1) - 1;
        p.rotationSpeed = (p.rotationSpeed || 0) * 0.5;
      }

      if (p.shape === 'smoke') {
        p.radius += dt * 7; // expanding smoke puff
      }

      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private boxesIntersect(
    b1: { x: number; y: number; w: number; h: number },
    b2: { x: number; y: number; w: number; h: number }
  ) {
    return (
      b1.x < b2.x + b2.w &&
      b1.x + b1.w > b2.x &&
      b1.y < b2.y + b2.h &&
      b1.y + b1.h > b2.y
    );
  }

  private circleBoxIntersect(
    cx: number,
    cy: number,
    r: number,
    box: { x: number; y: number; w: number; h: number }
  ) {
    const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  private getMaterialColor(mat: string) {
    switch (mat) {
      case 'wood':
        return '#B45309';
      case 'stone':
        return '#78716C';
      case 'metal':
        return '#94A3B8';
      case 'ice':
        return '#7DD3FC';
      case 'explosive_barrel':
        return '#EF4444';
      default:
        return '#A8A29E';
    }
  }

  private getElementColor(elem: ElementType) {
    switch (elem) {
      case 'fire':
        return '#F97316';
      case 'ice':
        return '#38BDF8';
      case 'electric':
        return '#FACC15';
      case 'explosive':
        return '#EF4444';
      case 'sonic':
        return '#A855F7';
      default:
        return '#E2E8F0';
    }
  }
}

export const physicsEngine = new PhysicsEngine();
