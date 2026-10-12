import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LevelDefinition,
  PlacedTower,
  Enemy,
  Projectile,
  EnemyProjectile,
  StructureBlock,
  TowerTypeId,
  TargetPriority,
  GameSettings,
  PlayerProgression,
  FormationAbility,
  ProximitySynergy,
  CollapseCrater,
} from './types/game';
import { CAMPAIGN_LEVELS } from './data/levels';
import { TOWERS_DATA } from './data/towers';
import { BIRD_SPECIAL_ABILITIES } from './data/towerAbilities';
import { ENEMIES_DATA } from './data/enemies';
import { generateEndlessWave } from './data/waves';
import { physicsEngine } from './physics/engine';
import { soundManager } from './audio/soundManager';
import { TopNav } from './components/TopNav';
import { GameCanvas, isPlacementValid } from './components/GameCanvas';
import { TowerPlaceBar } from './components/TowerPlaceBar';
import { TowerUpgradePanel } from './components/TowerUpgradePanel';
import { FormationSynergyBar } from './components/FormationSynergyBar';
import { PowerUpBar, PowerUpState } from './components/PowerUpBar';
import { CampaignMap } from './components/CampaignMap';
import { TowerCollection } from './components/TowerCollection';
import { ResearchTreeModal } from './components/ResearchTreeModal';
import { ChallengeModal } from './components/ChallengeModal';
import { SettingsModal } from './components/SettingsModal';
import { LevelVictoryModal } from './components/LevelVictoryModal';
import { Play, Pause, FastForward, RotateCcw, Heart, Feather, ShieldAlert, Flame, Zap } from 'lucide-react';

const STORAGE_KEY = 'avian_siege_save_v1';

export default function App() {
  // Navigation Tabs
  const [currentTab, setCurrentTab] = useState<
    'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings'
  >('battle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global Persistent Progression
  const [progression, setProgression] = useState<PlayerProgression>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.unlockedTowers?.includes('bomb_bird')) {
          parsed.unlockedTowers = [...(parsed.unlockedTowers || []), 'bomb_bird'];
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return {
      feathers: 800,
      acorns: 60,
      shards: 15,
      tokens: 30,
      unlockedTowers: ['cardinal', 'owl', 'falcon', 'woodpecker', 'penguin', 'phoenix', 'bomb_bird'],
      completedLevels: {},
      researchPurchased: [],
      ownedSkins: ['skin_cardinal_classic', 'skin_owl_classic', 'skin_falcon_classic'],
      equippedSkins: {
        cardinal: 'skin_cardinal_classic',
        owl: 'skin_owl_classic',
        falcon: 'skin_falcon_classic',
        woodpecker: 'skin_woodpecker_classic',
        penguin: 'skin_penguin_classic',
        phoenix: 'skin_phoenix_classic',
        bomb_bird: 'skin_bomb_bird_classic',
      },
    };
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    masterVolume: 0.8,
    sfxVolume: 0.9,
    musicVolume: 0.7,
    screenShake: true,
    shakeIntensity: 0.8,
    showDamageNumbers: true,
    gameSpeed: 1,
    difficulty: 'normal',
    autoStartNextWave: true,
    reducedMotion: false,
  });

  // Active Level
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition>(CAMPAIGN_LEVELS[0]);

  // In-Game Battle State
  const [levelFeathers, setLevelFeathers] = useState<number>(currentLevel.startingFeathers);
  const [nestLives, setNestLives] = useState<number>(currentLevel.nestLives);
  const [currentWaveIndex, setCurrentWaveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isWaveActive, setIsWaveActive] = useState<boolean>(false);
  const [autoWaveEnabled, setAutoWaveEnabled] = useState<boolean>(true);
  const [activeWavesCount, setActiveWavesCount] = useState<number>(0);
  const [isEndlessMode, setIsEndlessMode] = useState<boolean>(false);
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  // Entities on Canvas
  const [placedTowers, setPlacedTowers] = useState<PlacedTower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [enemyProjectiles, setEnemyProjectiles] = useState<EnemyProjectile[]>([]);
  const [structures, setStructures] = useState<StructureBlock[]>([]);
  const [craters, setCraters] = useState<CollapseCrater[]>([]);
  const [activeFormations, setActiveFormations] = useState<FormationAbility[]>([]);
  const [activeSynergies, setActiveSynergies] = useState<ProximitySynergy[]>([]);
  const [comboCooldowns, setComboCooldowns] = useState<Record<string, number>>({});

  // Selection states
  const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);
  const [selectedDeployType, setSelectedDeployType] = useState<TowerTypeId | null>(null);
  const [targetingPowerUp, setTargetingPowerUp] = useState<string | null>(null);

  // Battle statistics
  const [stats, setStats] = useState({
    pigsDefeated: 0,
    pigsCrushed: 0,
    structuresDestroyed: 0,
    combosTriggered: 0,
  });

  // Spawn Timeouts ref, run token ref, and pending spawns counter to guarantee 100% clean complete resets
  const spawnTimeoutsRef = useRef<number[]>([]);
  const autoWaveTimeoutRef = useRef<number | null>(null);
  const runTokenRef = useRef<number>(0);
  const pendingSpawnsRef = useRef<number>(0);

  // Power Ups
  const [powerUps, setPowerUps] = useState<PowerUpState[]>([
    {
      id: 'bombardment',
      name: 'Egg Bombardment',
      description: 'Calls down an aerial cluster of explosive eggs upon a targeted zone.',
      cost: 150,
      cooldown: 20,
      currentCooldown: 0,
    },
    {
      id: 'frenzy',
      name: 'Feather Frenzy',
      description: 'Temporarily boosts attack cadence of all avian towers by +75% for 6 seconds.',
      cost: 100,
      cooldown: 25,
      currentCooldown: 0,
    },
    {
      id: 'timewarp',
      name: 'Time Warp',
      description: 'Slows down advancing pig columns by 60% for tactical adjustments.',
      cost: 90,
      cooldown: 22,
      currentCooldown: 0,
    },
    {
      id: 'resonance',
      name: 'Structural Shock',
      description: 'Sends seismic shockwaves through all enemy structures, weakening support joints.',
      cost: 120,
      cooldown: 30,
      currentCooldown: 0,
    },
  ]);

  // Save progression changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
    } catch {
      // ignore
    }
  }, [progression]);

  // Load level fresh & completely clear pending wave timers
  const initLevel = useCallback((lvl: LevelDefinition, endless = false) => {
    // 1. Invalidate all past and future callbacks from old runs
    runTokenRef.current += 1;
    pendingSpawnsRef.current = 0;
    spawnTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    spawnTimeoutsRef.current = [];
    if (autoWaveTimeoutRef.current) {
      clearTimeout(autoWaveTimeoutRef.current);
      autoWaveTimeoutRef.current = null;
    }

    // 2. Reset level parameters
    setCurrentLevel(lvl);
    setLevelFeathers(lvl.startingFeathers);
    setNestLives(lvl.nestLives);
    setCurrentWaveIndex(0);
    setIsPaused(false);
    setIsWaveActive(false);
    setActiveWavesCount(0);
    setIsEndlessMode(endless);
    setVictoryModalOpen(false);
    setIsVictory(false);
    setPlacedTowers([]);
    setEnemies([]);
    setProjectiles([]);
    setEnemyProjectiles([]);
    setCraters([]);
    setStructures(JSON.parse(JSON.stringify(lvl.initialStructures)));
    setSelectedTower(null);
    setSelectedDeployType(null);
    setTargetingPowerUp(null);
    setComboCooldowns({});
    physicsEngine.resetStats();
    setStats({
      pigsDefeated: 0,
      pigsCrushed: 0,
      structuresDestroyed: 0,
      combosTriggered: 0,
    });
  }, []);

  // Initialize first level on mount
  useEffect(() => {
    initLevel(currentLevel);
  }, [initLevel]);

  // Spawn a wave group of enemies with cancellable timeout tracking
  const spawnWaveData = useCallback((waveNumber: number) => {
    let wave = currentLevel.waves[waveNumber - 1];
    if (!wave) {
      wave = generateEndlessWave(waveNumber);
    }
    if (!wave) return;

    const token = runTokenRef.current;
    const waveCount = wave.groups.reduce((acc, g) => acc + g.count, 0);
    pendingSpawnsRef.current += waveCount;

    wave.groups.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const tid = window.setTimeout(() => {
          if (runTokenRef.current !== token) return;
          pendingSpawnsRef.current = Math.max(0, pendingSpawnsRef.current - 1);

          const enemyStats = ENEMIES_DATA[group.type];
          if (!enemyStats) return;

          let diffMultiplier = 1.0;
          if (settings.difficulty === 'super_easy') diffMultiplier = 0.65;
          else if (settings.difficulty === 'easy') diffMultiplier = 0.85;
          else if (settings.difficulty === 'hard') diffMultiplier = 1.35;
          else if (settings.difficulty === 'very_hard') diffMultiplier = 1.7;
          else if (settings.difficulty === 'nightmare') diffMultiplier = 2.2;

          // Progressive wave health curve matching BTD6 ramping
          let waveHealthScale = 1.0;
          if (waveNumber <= 40) {
            waveHealthScale = 1.0 + (waveNumber - 1) * 0.08 + Math.pow((waveNumber - 1) / 10, 1.5) * 0.14;
          } else {
            const endlessWave = waveNumber - 40;
            waveHealthScale = 4.2 * (Math.pow(1.045, endlessWave) + endlessWave * 0.2);
          }

          const finalHealth = Math.round(enemyStats.health * diffMultiplier * waveHealthScale);
          const finalArmor = Math.round(enemyStats.armor * (1 + (waveNumber - 1) * 0.02));
          const finalShield = Math.round(enemyStats.shieldFrontal * diffMultiplier * (1 + (waveNumber - 1) * 0.05));
          const finalSpeed = Math.min(130, enemyStats.speed * (1 + Math.min(0.35, (waveNumber - 1) * 0.0025)));

          const startPt = currentLevel.pathWaypoints[0];
          const newEnemy: Enemy = {
            id: `enemy-${Date.now()}-${Math.random()}`,
            type: group.type,
            name: enemyStats.name,
            x: startPt.x + (Math.random() - 0.5) * 12,
            y: startPt.y + (Math.random() - 0.5) * 12,
            speed: finalSpeed,
            baseSpeed: finalSpeed,
            health: finalHealth,
            maxHealth: finalHealth,
            armor: finalArmor,
            shieldFrontal: finalShield,
            pathIndex: 0,
            isFlying: enemyStats.isFlying,
            isStunned: false,
            stunTimer: 0,
            slowTimer: 0,
            slowMultiplier: 1.0,
            burningTimer: 0,
            burningDps: 0,
            conductiveTimer: 0,
            radius: enemyStats.radius,
            rewardFeathers: enemyStats.rewardFeathers,
            rewardAcorns: enemyStats.rewardAcorns,
            isBoss: enemyStats.isBoss,
            bossPhase: 1,
            bossMaxPhases: 2,
            bossShieldCracked: false,
          };

          setEnemies((prev) => [...prev, newEnemy]);
        }, (group.delay + i * group.spawnInterval) * 1000);

        spawnTimeoutsRef.current.push(tid);
      }
    });
  }, [currentLevel, settings.difficulty]);

  // Trigger Wave start (Allows sending MULTIPLE waves at a time!)
  const handleStartWave = () => {
    soundManager.playClick();

    if (isWaveActive) {
      // Stack next wave for more challenge and award bravery bonus!
      setCurrentWaveIndex((idx) => {
        const nextWaveNum = idx + 2;
        spawnWaveData(nextWaveNum);
        return idx + 1;
      });
      setActiveWavesCount((c) => c + 1);
      setLevelFeathers((f) => f + 35); // Early send bonus!
      physicsEngine.addFloatingText(450, 240, 'EARLY WAVE BONUS! +35F', '#10B981', 1.4);
    } else {
      setIsWaveActive(true);
      setActiveWavesCount(1);
      spawnWaveData(currentWaveIndex + 1);
    }
  };

  // Main Combat Simulation Loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const gameLoop = (time: number) => {
      const rawDt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (!isPaused && !victoryModalOpen) {
        const dt = rawDt * gameSpeed;
        const now = performance.now();

        // 1. Update PowerUp Cooldowns & Combo Cooldowns
        setPowerUps((prev) =>
          prev.map((p) => ({
            ...p,
            currentCooldown: Math.max(0, p.currentCooldown - dt),
          }))
        );

        setComboCooldowns((prev) => {
          const updated: Record<string, number> = {};
          for (const k in prev) {
            if (prev[k] > 0) {
              updated[k] = Math.max(0, prev[k] - dt);
            }
          }
          return updated;
        });

        // 2. Update Structures Stability & Physics Collapses
        setStructures((prevStructures) => {
          physicsEngine.updateStructures(prevStructures, enemies, dt, (_boss) => {
            soundManager.playPigDefeat(true);
            setStats((s) => ({ ...s, pigsCrushed: s.pigsCrushed + 1 }));
          });
          return [...prevStructures];
        });

        // 2.5 Update Temporary Collapse Craters & Rubble Obstacles
        setCraters((prevCraters) => {
          if (prevCraters.length === 0) return prevCraters;
          const updated: CollapseCrater[] = [];

          for (const c of prevCraters) {
            const remTime = c.remainingTime - dt;
            if (remTime > 0) {
              // Marching pigs traversing through the crater suffer slow & puncture damage
              for (const enemy of enemies) {
                if (enemy.health <= 0) continue;
                const d = Math.hypot(enemy.x - c.x, enemy.y - c.y);
                if (d <= c.radius) {
                  enemy.slowMultiplier = Math.min(enemy.slowMultiplier, 0.68);
                  enemy.slowTimer = Math.max(enemy.slowTimer, 0.4);
                  const rubbleDmg = 28 * dt;
                  enemy.health -= rubbleDmg;
                  if (Math.random() < 0.15) {
                    physicsEngine.spawnParticles(enemy.x, enemy.y, 1, '#78716C', 20, 40);
                  }
                  if (enemy.health <= 0) {
                    soundManager.playPigDefeat(enemy.isBoss);
                    setStats((s) => ({ ...s, pigsCrushed: s.pigsCrushed + 1 }));
                  }
                }
              }

              updated.push({
                ...c,
                remainingTime: remTime,
                smokeTimer: c.smokeTimer + dt,
              });
            } else {
              // Crater clears with dust clearing puff
              soundManager.playImpact('stone');
              physicsEngine.spawnParticles(c.x, c.y, 16, '#78716C', 60, 50);
              physicsEngine.spawnParticles(c.x, c.y, 8, '#A8A29E', 40, 30);
              physicsEngine.addFloatingText(c.x, c.y - 12, 'SITE CLEARED', '#86EFAC', 1.0);
            }
          }

          return updated;
        });

        // 3. Update Enemies Movement & Statuses
        setEnemies((prevEnemies) => {
          const updated: Enemy[] = [];
          for (const enemy of prevEnemies) {
            if (enemy.isStunned) {
              enemy.stunTimer -= dt;
              if (enemy.stunTimer <= 0) {
                enemy.isStunned = false;
              }
            }

            if (enemy.burningTimer > 0) {
              enemy.burningTimer -= dt;
              enemy.health -= enemy.burningDps * dt;
            }

            if (enemy.slowTimer > 0) {
              enemy.slowTimer -= dt;
              if (enemy.slowTimer <= 0) {
                enemy.slowMultiplier = 1.0;
              }
            }

            if (enemy.health <= 0) {
              soundManager.playPigDefeat(enemy.isBoss);
              setLevelFeathers((f) => f + enemy.rewardFeathers);
              setProgression((p) => ({
                ...p,
                feathers: p.feathers + enemy.rewardFeathers,
                acorns: p.acorns + enemy.rewardAcorns,
              }));
              setStats((s) => ({ ...s, pigsDefeated: s.pigsDefeated + 1 }));
              physicsEngine.addFloatingText(
                enemy.x,
                enemy.y,
                `+${enemy.rewardFeathers}F`,
                '#FACC15'
              );
              continue;
            }

            if (!enemy.isStunned) {
              const currentWp = currentLevel.pathWaypoints[enemy.pathIndex];
              const nextWp = currentLevel.pathWaypoints[enemy.pathIndex + 1];

              if (nextWp) {
                const dx = nextWp.x - enemy.x;
                const dy = nextWp.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                const moveSpeed = enemy.baseSpeed * enemy.slowMultiplier;

                if (dist <= moveSpeed * dt) {
                  enemy.x = nextWp.x;
                  enemy.y = nextWp.y;
                  enemy.pathIndex++;
                } else {
                  enemy.x += (dx / dist) * moveSpeed * dt;
                  enemy.y += (dy / dist) * moveSpeed * dt;
                }
                updated.push(enemy);
              } else {
                setNestLives((l) => {
                  const nextL = Math.max(0, l - (enemy.isBoss ? 10 : 1));
                  if (nextL <= 0) {
                    setIsVictory(false);
                    setVictoryModalOpen(true);
                  }
                  return nextL;
                });
                physicsEngine.addFloatingText(enemy.x, enemy.y, 'NEST BREACHED!', '#EF4444');
              }
            } else {
              updated.push(enemy);
            }
          }
          return updated;
        });

        // 4. Enemy Attack Nearby Towers with Visible Ballistic Projectiles
        const launchedEProj: EnemyProjectile[] = [];
        for (const enemy of enemies) {
          if (enemy.isStunned || enemy.health <= 0) continue;
          const enemyStats = ENEMIES_DATA[enemy.type];
          if (!enemyStats) continue;

          const atkCooldown = enemyStats.attackCooldown || 2.4;
          const atkRange = enemyStats.attackRange || 85;

          if (now - (enemy.lastAttackTime || 0) >= atkCooldown * 1000) {
            // Find closest placed tower within attackRange
            let targetTower: PlacedTower | null = null;
            let closestDist = Infinity;

            for (const t of placedTowers) {
              if (t.health <= 0) continue;
              const d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
              if (d <= atkRange && d < closestDist) {
                closestDist = d;
                targetTower = t;
              }
            }

            if (targetTower) {
              enemy.lastAttackTime = now;
              const flightDuration = 0.85 + Math.random() * 0.35; // visible ~1 second ballistic lob
              launchedEProj.push({
                id: `eproj-${now}-${Math.random()}`,
                sourceEnemyId: enemy.id,
                targetTowerId: targetTower.id,
                startX: enemy.x,
                startY: enemy.y,
                x: enemy.x,
                y: enemy.y,
                targetX: targetTower.x,
                targetY: targetTower.y,
                progress: 0,
                flightDuration,
                arcHeight: 24 + Math.random() * 14,
                damage: enemyStats.attackProjectileDamage || 18,
                enemyType: enemy.type,
                color: enemyStats.color,
                secondaryColor: enemyStats.accentColor,
                radius: Math.max(4, enemyStats.radius * 0.45),
                rotation: Math.random() * Math.PI,
                rotationSpeed: (Math.random() - 0.5) * 10,
                trail: [],
              });
            }
          }
        }

        // Update Enemy Projectiles flight & impacts
        setEnemyProjectiles((prevEProj) => {
          const survivingEProj: EnemyProjectile[] = [];
          const impacts: {
            towerId: string;
            damage: number;
            color: string;
            isBomb: boolean;
            x: number;
            y: number;
          }[] = [];

          for (const p of prevEProj) {
            p.progress += dt / p.flightDuration;
            p.rotation += p.rotationSpeed * dt;

            // Record trail
            p.trail.unshift({ x: p.x, y: p.y, alpha: 1.0 });
            if (p.trail.length > 8) p.trail.pop();
            for (const tr of p.trail) tr.alpha = Math.max(0, tr.alpha - dt * 1.6);

            // Parabolic ballistic trajectory
            const linX = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);
            const linY = p.startY + (p.targetY - p.startY) * Math.min(1, p.progress);
            const arcY = -Math.sin(Math.min(1, p.progress) * Math.PI) * p.arcHeight;
            p.x = linX;
            p.y = linY + arcY;

            if (p.progress >= 1) {
              impacts.push({
                towerId: p.targetTowerId,
                damage: p.damage,
                color: p.color,
                isBomb:
                  p.enemyType === 'bomber' ||
                  p.enemyType === 'iron_boar' ||
                  p.enemyType === 'mecha_boar',
                x: p.targetX,
                y: p.targetY,
              });
            } else {
              survivingEProj.push(p);
            }
          }

          // Apply projectile impacts on targeted towers
          if (impacts.length > 0) {
            setPlacedTowers((prevTowers) => {
              const updatedTowers: PlacedTower[] = [];

              for (const tower of prevTowers) {
                const hits = impacts.filter((h) => h.towerId === tower.id);
                if (hits.length > 0) {
                  for (const hit of hits) {
                    tower.health = Math.max(0, tower.health - hit.damage);
                    tower.lastDamagedTime = now;
                    physicsEngine.addFloatingText(
                      tower.x + (Math.random() - 0.5) * 14,
                      tower.y - 14,
                      `-${Math.round(hit.damage)}`,
                      '#EF4444',
                      1.0
                    );
                    physicsEngine.spawnParticles(tower.x, tower.y, 6, hit.color, 80, 130);
                    if (hit.isBomb) {
                      physicsEngine.spawnParticles(tower.x, tower.y, 10, '#EA580C', 120, 180);
                      physicsEngine.state.screenShake = 0.22;
                    }
                  }
                }

                // If tower reaches 0 health, trigger full structural collapse sequence!
                if (tower.health <= 0) {
                  soundManager.playCollapse();
                  const def = TOWERS_DATA[tower.typeId];

                  // 1. Violent screen shake effect
                  physicsEngine.state.screenShake = 0.85;

                  // 2. Falling debris particles (tumbling masonry chunks, splintered timber, dust & sparks)
                  physicsEngine.spawnStructuralCollapseDebris(tower.x, tower.y, {
                    primary: def?.accentColor || '#EF4444',
                    secondary: def?.silhouetteColor || '#78716C',
                  });

                  // 3. Floating collapse banner
                  physicsEngine.addFloatingText(
                    tower.x,
                    tower.y - 22,
                    '💥 STRUCTURAL COLLAPSE!',
                    '#EF4444',
                    1.7
                  );

                  // 4. Temporary crater and rubble obstacle created where tower once stood
                  const craterRadius = 28;
                  const crackCount = 7;
                  const cracks = [];
                  for (let i = 0; i < crackCount; i++) {
                    const angle = (i * Math.PI * 2) / crackCount + (Math.random() - 0.5) * 0.35;
                    const length = craterRadius + Math.random() * 14 + 6;
                    const branches = [];
                    if (Math.random() < 0.65) {
                      branches.push({
                        angleOffset: (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.3),
                        length: Math.random() * 9 + 5,
                      });
                    }
                    cracks.push({ angle, length, branches });
                  }

                  const rubbleBlocks = [
                    { offsetX: -9, offsetY: -5, w: 11, h: 7, rotation: -0.35, color: '#57534E' },
                    { offsetX: 7, offsetY: 3, w: 9, h: 8, rotation: 0.5, color: '#78716C' },
                    { offsetX: -2, offsetY: 8, w: 10, h: 6, rotation: 0.15, color: '#44403C' },
                    { offsetX: -6, offsetY: -9, w: 15, h: 4.5, rotation: -0.85, color: '#78350F' },
                    { offsetX: 8, offsetY: -7, w: 13, h: 4, rotation: 0.75, color: '#B45309' },
                    { offsetX: 2, offsetY: -2, w: 7, h: 7, rotation: 1.15, color: '#334155' },
                  ];

                  const newCrater: CollapseCrater = {
                    id: `crater-${now}-${Math.random()}`,
                    x: tower.x,
                    y: tower.y,
                    radius: craterRadius,
                    towerTypeId: tower.typeId,
                    towerName: def?.name || 'Avian Tower',
                    duration: 18,
                    remainingTime: 18,
                    smokeTimer: 0,
                    cracks,
                    rubbleBlocks,
                  };
                  setCraters((prev) => [...prev, newCrater]);

                  if (selectedTower?.id === tower.id) {
                    setSelectedTower(null);
                  }
                  continue; // Exclude from surviving towers!
                }

                updatedTowers.push(tower);
              }

              return updatedTowers;
            });
          }

          if (launchedEProj.length > 0) {
            return [...survivingEProj, ...launchedEProj];
          }
          return survivingEProj;
        });

        // Progressive Repair: If 3 seconds pass without damage, slowly repair health (+45 HP/s)
        setPlacedTowers((prevTowers) =>
          prevTowers.map((tower) => {
            if (now - tower.lastDamagedTime >= 3000 && tower.health < tower.maxHealth) {
              const healedHp = Math.min(tower.maxHealth, tower.health + 45 * dt);
              if (Math.random() < 0.12) {
                physicsEngine.spawnParticles(
                  tower.x + (Math.random() - 0.5) * 16,
                  tower.y + (Math.random() - 0.5) * 16,
                  1,
                  '#4ADE80',
                  25
                );
              }
              return { ...tower, health: healedHp };
            }
            return tower;
          })
        );

        // 5. Update Towers Targeting & Projectile Firing
        setPlacedTowers((prevTowers) => {
          const newProjectiles: Projectile[] = [];

          const updatedTowers = prevTowers.map((tower) => {
            const def = TOWERS_DATA[tower.typeId];
            if (!def) return tower;

            let effectiveFireRate = def.baseFireRate;
            let effectiveRange = def.baseRange;
            let effectiveDamage = def.baseDamage;
            let effectiveStructuralDmg = def.baseStructuralDamage;
            let element = def.element;

            for (let i = 0; i < tower.tiers.path_a; i++) {
              const t = def.paths.path_a.tiers[i];
              if (t) {
                effectiveDamage += t.damageBonus;
                effectiveFireRate *= t.fireRateBonus;
                effectiveRange += t.rangeBonus;
                effectiveStructuralDmg *= t.structuralBonus;
              }
            }
            for (let i = 0; i < tower.tiers.path_b; i++) {
              const t = def.paths.path_b.tiers[i];
              if (t) {
                effectiveDamage += t.damageBonus;
                effectiveFireRate *= t.fireRateBonus;
                effectiveRange += t.rangeBonus;
                effectiveStructuralDmg *= t.structuralBonus;
                if (t.elementBonus) element = t.elementBonus;
              }
            }
            for (let i = 0; i < tower.tiers.path_c; i++) {
              const t = def.paths.path_c.tiers[i];
              if (t) {
                effectiveDamage += t.damageBonus;
                effectiveFireRate *= t.fireRateBonus;
                effectiveRange += t.rangeBonus;
                effectiveStructuralDmg *= t.structuralBonus;
              }
            }

            let target: { x: number; y: number; id?: string } | null = null;
            const inRangeEnemies = enemies.filter((e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= effectiveRange);

            if (tower.targetPriority === 'structures') {
              const inRangeStructs = structures.filter(
                (s) => s.health > 0 && Math.hypot(s.x + s.width / 2 - tower.x, s.y + s.height / 2 - tower.y) <= effectiveRange
              );
              if (inRangeStructs.length > 0) {
                const s = inRangeStructs.reduce((min, cur) => (cur.health < min.health ? cur : min), inRangeStructs[0]);
                target = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
              }
            }

            if (!target && inRangeEnemies.length > 0) {
              if (tower.targetPriority === 'strongest') {
                target = inRangeEnemies.reduce((max, e) => (e.health > max.health ? e : max), inRangeEnemies[0]);
              } else if (tower.targetPriority === 'flying') {
                target = inRangeEnemies.find((e) => e.isFlying) || inRangeEnemies[0];
              } else if (tower.targetPriority === 'last') {
                target = inRangeEnemies[0];
              } else {
                target = inRangeEnemies[inRangeEnemies.length - 1];
              }
            }

            if (target) {
              tower.rotation = Math.atan2(target.y - tower.y, target.x - tower.x);
            }

            const cooldownMs = (1 / effectiveFireRate) * 1000;
            if (target && now - tower.lastFired >= cooldownMs) {
              tower.lastFired = now;
              soundManager.playShoot(tower.typeId);

              const speed = def.projectileSpeed;
              const angle = tower.rotation;
              const pVx = Math.cos(angle) * speed;
              const pVy = Math.sin(angle) * speed;

              // Check for active synergies and formations for distinctive combo visual attacks
              let isComboProj = false;
              let comboVis: 'volcanic' | 'thermal' | 'plasma' | 'supersonic' | undefined = undefined;

              for (const s of activeSynergies) {
                if (s.towerIds.includes(tower.id)) {
                  isComboProj = true;
                  if (s.abilityName?.includes('Volcanic') || s.type === 'reaction') {
                    comboVis = 'volcanic';
                  } else if (s.abilityName?.includes('Thermal')) {
                    comboVis = 'thermal';
                  } else {
                    comboVis = 'supersonic';
                  }
                }
              }
              for (const f of activeFormations) {
                if (f.towerIds.includes(tower.id)) {
                  isComboProj = true;
                  if (f.type === 'circuit') comboVis = 'plasma';
                  else comboVis = 'volcanic';
                }
              }

              const aoeRadius = tower.typeId === 'bomb_bird' ? 85 + tower.tiers.path_a * 15 : undefined;

              newProjectiles.push({
                id: `proj-${now}-${Math.random()}`,
                sourceTowerId: tower.id,
                x: tower.x + Math.cos(angle) * 14,
                y: tower.y + Math.sin(angle) * 14,
                vx: pVx,
                vy: pVy,
                damage: effectiveDamage,
                structuralDamage: effectiveStructuralDmg,
                element: isComboProj && comboVis === 'volcanic' ? 'fire' : isComboProj && comboVis === 'plasma' ? 'electric' : element,
                pierceRemaining: def.basePierce + (tower.tiers.path_a > 1 ? 2 : 0),
                radius: def.projectileRadius,
                maxDistance: effectiveRange * 1.25,
                traveledDistance: 0,
                color: isComboProj ? '#F59E0B' : def.accentColor,
                homingTargetEnemyId: tower.typeId === 'falcon' && 'id' in target ? target.id : undefined,
                gravity: tower.typeId === 'owl' ? 120 : tower.typeId === 'bomb_bird' ? 95 : undefined,
                aoeRadius,
                isComboProjectile: isComboProj,
                comboVisual: comboVis,
                trail: [],
              });
            }

            return tower;
          });

          if (newProjectiles.length > 0) {
            setProjectiles((prev) => [...prev, ...newProjectiles]);
          }

          return updatedTowers;
        });

        // 6. Update Projectiles Physics Collisions
        setProjectiles((prevProjectiles) =>
          physicsEngine.updateProjectiles(prevProjectiles, enemies, structures, dt)
        );

        // 7. Update Visual Particles and Floaters
        physicsEngine.updateVisuals(dt);

        // 7.5 Update Collapse Craters & Rubble Obstacle Slowdown on Marching Enemies
        setCraters((prevCraters) => {
          if (prevCraters.length === 0) return prevCraters;
          const nextCraters: CollapseCrater[] = [];

          for (const crater of prevCraters) {
            const rem = crater.remainingTime - dt;
            if (rem > 0) {
              crater.remainingTime = rem;
              crater.smokeTimer = (crater.smokeTimer || 0) + dt;
              if (crater.smokeTimer >= 0.45) {
                crater.smokeTimer = 0;
                physicsEngine.spawnParticles(
                  crater.x + (Math.random() - 0.5) * (crater.radius * 0.9),
                  crater.y + (Math.random() - 0.5) * (crater.radius * 0.7),
                  2,
                  'rgba(120, 113, 108, 0.45)',
                  25,
                  -20
                );
              }

              // Rubble obstacle effect: Slows down marching ground pigs traversing the crater
              for (const enemy of enemies) {
                if (enemy.isFlying || enemy.health <= 0) continue;
                const d = Math.hypot(enemy.x - crater.x, enemy.y - crater.y);
                if (d <= crater.radius + 6) {
                  enemy.speed = Math.max(10, enemy.baseSpeed * 0.52);
                  if (Math.random() < 0.05) {
                    physicsEngine.spawnParticles(enemy.x, enemy.y, 1, '#78716C', 35, 180);
                  }
                }
              }

              nextCraters.push(crater);
            } else {
              physicsEngine.addFloatingText(crater.x, crater.y - 12, 'RUBBLE CLEARED', '#A8A29E', 1.0);
              physicsEngine.spawnParticles(crater.x, crater.y, 8, '#78716C', 60, 150);
            }
          }

          return nextCraters;
        });

        // 8. Check Wave Completion (only when all queued spawns are deployed and all enemies defeated)
        if (isWaveActive && pendingSpawnsRef.current === 0 && enemies.length === 0) {
          setIsWaveActive(false);
          setActiveWavesCount(0);
          const nextWave = currentWaveIndex + 1;
          const targetMilestone = currentLevel.milestoneWaveCount || 40;

          if (!isEndlessMode && nextWave > targetMilestone) {
            soundManager.playVictory();
            setIsVictory(true);
            setVictoryModalOpen(true);
            setProgression((p) => ({
              ...p,
              feathers: p.feathers + 300,
              acorns: p.acorns + 35,
              shards: p.shards + 10,
              completedLevels: {
                ...p.completedLevels,
                [currentLevel.id]: {
                  stars: 3,
                  highestDifficulty: settings.difficulty,
                },
              },
            }));
          } else {
            setCurrentWaveIndex(nextWave);
            // Automatic wave progression with tracked cancellable timeout
            if (autoWaveEnabled) {
              if (autoWaveTimeoutRef.current) clearTimeout(autoWaveTimeoutRef.current);
              autoWaveTimeoutRef.current = window.setTimeout(() => {
                handleStartWave();
              }, 1200);
            }
          }
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPaused,
    victoryModalOpen,
    gameSpeed,
    enemies,
    structures,
    currentLevel,
    isWaveActive,
    currentWaveIndex,
    isEndlessMode,
    autoWaveEnabled,
    settings,
    spawnWaveData,
    selectedTower,
  ]);

  // Synergies and Formations recalculation
  useEffect(() => {
    const { synergies, formations } = physicsEngine.calculateSynergies(placedTowers);
    setActiveSynergies(synergies);
    setActiveFormations(formations);
  }, [placedTowers]);

  // Dynamic Free Placement anywhere on the map with initial health
  const handlePlaceTowerLocation = (x: number, y: number, typeId: TowerTypeId) => {
    const { valid } = isPlacementValid(
      x,
      y,
      currentLevel.pathWaypoints,
      structures,
      placedTowers,
      craters
    );
    if (!valid) return;

    const def = TOWERS_DATA[typeId];
    if (!def) return;
    if (levelFeathers < def.baseCost) return;

    soundManager.playUpgrade();
    setLevelFeathers((f) => f - def.baseCost);

    const baseHealthByType: Record<TowerTypeId, number> = {
      cardinal: 550,
      owl: 520,
      falcon: 480,
      woodpecker: 500,
      penguin: 540,
      phoenix: 650,
      bomb_bird: 750,
    };
    const initialHp = baseHealthByType[typeId] || 500;
    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random()}`,
      typeId,
      x: Math.round(x),
      y: Math.round(y),
      level: 1,
      tiers: { path_a: 0, path_b: 0, path_c: 0 },
      lockedPath: null,
      targetPriority: 'first',
      lastFired: 0,
      rotation: 0,
      kills: 0,
      damageDealt: 0,
      health: initialHp,
      maxHealth: initialHp,
      lastDamagedTime: 0,
    };

    setPlacedTowers((prev) => [...prev, newTower]);
    setSelectedDeployType(null);
    setSelectedTower(newTower);
  };

  // Upgrades with health scaling
  const handleUpgradePath = (towerId: string, pathKey: 'path_a' | 'path_b' | 'path_c') => {
    setPlacedTowers((prev) =>
      prev.map((t) => {
        if (t.id !== towerId) return t;
        const def = TOWERS_DATA[t.typeId];
        const curTier = t.tiers[pathKey];
        const nextTier = def.paths[pathKey].tiers[curTier];
        if (!nextTier || levelFeathers < nextTier.cost) return t;

        setLevelFeathers((f) => f - nextTier.cost);

        const newTiers = { ...t.tiers, [pathKey]: curTier + 1 };

        let lockedPath = t.lockedPath;
        const activeCount = (['path_a', 'path_b', 'path_c'] as const).filter(
          (k) => newTiers[k] > 0
        ).length;

        if (activeCount >= 2 && !lockedPath) {
          const locked = (['path_a', 'path_b', 'path_c'] as const).find(
            (k) => newTiers[k] === 0
          );
          if (locked) lockedPath = locked;
        }

        const newMaxHp = t.maxHealth + 150;
        const updated = {
          ...t,
          tiers: newTiers,
          lockedPath,
          level: t.level + 1,
          maxHealth: newMaxHp,
          health: Math.min(newMaxHp, t.health + 150),
        };

        if (selectedTower && selectedTower.id === t.id) {
          setSelectedTower(updated);
        }
        return updated;
      })
    );
  };

  const handleSetPriority = (towerId: string, priority: TargetPriority) => {
    setPlacedTowers((prev) =>
      prev.map((t) => (t.id === towerId ? { ...t, targetPriority: priority } : t))
    );
    if (selectedTower && selectedTower.id === towerId) {
      setSelectedTower((st) => (st ? { ...st, targetPriority: priority } : null));
    }
  };

  const handleSellTower = (towerId: string) => {
    const tower = placedTowers.find((t) => t.id === towerId);
    if (!tower) return;
    const def = TOWERS_DATA[tower.typeId];
    let invested = def.baseCost;
    (['path_a', 'path_b', 'path_c'] as const).forEach((pKey) => {
      const tierCount = tower.tiers[pKey];
      for (let i = 0; i < tierCount; i++) {
        invested += def.paths[pKey].tiers[i]?.cost || 0;
      }
    });
    const sellValue = Math.round(invested * 0.7);
    setLevelFeathers((f) => f + sellValue);
    setPlacedTowers((prev) => prev.filter((t) => t.id !== towerId));
    setSelectedTower(null);
  };

  // Trigger Unique Bird Special Ability (Cost-Based, Manual Player Activation)
  const handleTriggerTowerAbility = (towerId: string) => {
    const tower = placedTowers.find((t) => t.id === towerId);
    if (!tower) return;

    const ability = BIRD_SPECIAL_ABILITIES[tower.typeId];
    if (!ability) return;

    const now = performance.now();
    const timeSince = (now - (tower.lastAbilityTriggered || 0)) / 1000;
    if (timeSince < ability.cooldown) return;

    if (levelFeathers < ability.featherCost) {
      physicsEngine.addFloatingText(tower.x, tower.y - 20, 'NOT ENOUGH FEATHERS!', '#EF4444', 1.0);
      return;
    }

    // Deduct cost and update lastAbilityTriggered
    setLevelFeathers((f) => f - ability.featherCost);
    setPlacedTowers((prev) =>
      prev.map((t) => (t.id === towerId ? { ...t, lastAbilityTriggered: now } : t))
    );
    if (selectedTower?.id === towerId) {
      setSelectedTower((prev) => (prev ? { ...prev, lastAbilityTriggered: now } : null));
    }

    // Play special sound effect
    soundManager.playAbilityTrigger(tower.typeId);

    // Execute ability effects based on bird type
    switch (tower.typeId) {
      case 'bomb_bird': {
        // Cataclysmic AOE Detonation
        physicsEngine.state.screenShake = 0.8;
        soundManager.playExplosion();
        physicsEngine.spawnParticles(tower.x, tower.y, 45, '#EA580C', 180, 260);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '💥 CATACLYSMIC DETONATION!', '#EA580C', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 150) {
              const dmg = Math.round(380 * (1 - (dist / 150) * 0.45));
              physicsEngine.addFloatingText(e.x, e.y - 15, `-${dmg}`, '#EF4444');
              return {
                ...e,
                health: e.health - dmg,
                burningTimer: 4.5,
                burningDps: 28,
              };
            }
            return e;
          })
        );

        setStructures((prev) =>
          prev.map((s) => {
            const dist = Math.hypot(s.x + s.width / 2 - tower.x, s.y + s.height / 2 - tower.y);
            if (dist <= 160) {
              return { ...s, health: s.health - 220 };
            }
            return s;
          })
        );
        break;
      }

      case 'falcon': {
        // Apex Piercing Strike: Slices through all marching invaders along range, shatters shields
        physicsEngine.state.screenShake = 0.35;
        physicsEngine.spawnParticles(tower.x, tower.y, 35, '#06B6D4', 160, 300);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '⚡ APEX PIERCING STRIKE!', '#06B6D4', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 280) {
              physicsEngine.addFloatingText(e.x, e.y - 15, '-450 PIERCE!', '#38BDF8');
              physicsEngine.spawnParticles(e.x, e.y, 14, '#06B6D4', 120, 200);
              return {
                ...e,
                health: e.health - 450,
                shieldFrontal: 0,
              };
            }
            return e;
          })
        );
        break;
      }

      case 'cardinal': {
        // Crimson Razor Gale: Radial storm of razor feathers
        physicsEngine.state.screenShake = 0.25;
        physicsEngine.spawnParticles(tower.x, tower.y, 40, '#EF4444', 140, 240);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '🌪️ CRIMSON RAZOR GALE!', '#EF4444', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 135) {
              physicsEngine.addFloatingText(e.x, e.y - 15, '-240 GALE!', '#F87171');
              return {
                ...e,
                health: e.health - 240,
                slowTimer: 2.5,
                slowMultiplier: 0.5,
              };
            }
            return e;
          })
        );
        break;
      }

      case 'owl': {
        // Cosmic Gravity Vortex: Pulls enemies toward vortex center and slows heavily
        physicsEngine.state.screenShake = 0.4;
        physicsEngine.spawnParticles(tower.x, tower.y, 40, '#A855F7', 120, 200);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '🌌 GRAVITY VORTEX!', '#A855F7', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 160) {
              const pullFactor = 0.45;
              const newX = e.x + (tower.x - e.x) * pullFactor;
              const newY = e.y + (tower.y - e.y) * pullFactor;
              physicsEngine.addFloatingText(e.x, e.y - 15, '-180 VORTEX!', '#C084FC');
              return {
                ...e,
                x: newX,
                y: newY,
                health: e.health - 180,
                slowTimer: 4.5,
                slowMultiplier: 0.25,
              };
            }
            return e;
          })
        );
        break;
      }

      case 'woodpecker': {
        // Seismic Bedrock Drill: Stuns ground boars and fractures structures
        physicsEngine.state.screenShake = 0.6;
        soundManager.playCollapse();
        physicsEngine.spawnParticles(tower.x, tower.y, 45, '#F59E0B', 150, 240);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '⛏️ SEISMIC BEDROCK DRILL!', '#F59E0B', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 140) {
              physicsEngine.addFloatingText(e.x, e.y - 15, 'STUNNED!', '#FBBF24');
              return {
                ...e,
                health: e.health - 260,
                isStunned: true,
                stunTimer: 3.0,
                slowTimer: 3.0,
                slowMultiplier: 0.0,
              };
            }
            return e;
          })
        );

        setStructures((prev) =>
          prev.map((s) => {
            const dist = Math.hypot(s.x + s.width / 2 - tower.x, s.y + s.height / 2 - tower.y);
            if (dist <= 140) {
              return { ...s, health: s.health - 250 };
            }
            return s;
          })
        );
        break;
      }

      case 'penguin': {
        // Absolute Zero Blizzard: Flash freezes marching enemies in place
        physicsEngine.state.screenShake = 0.35;
        physicsEngine.spawnParticles(tower.x, tower.y, 45, '#38BDF8', 140, 220);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '❄️ ABSOLUTE ZERO BLIZZARD!', '#38BDF8', 1.8);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 170) {
              physicsEngine.addFloatingText(e.x, e.y - 15, 'FROZEN!', '#7DD3FC');
              return {
                ...e,
                health: e.health - 190,
                isStunned: true,
                stunTimer: 3.5,
                slowTimer: 3.5,
                slowMultiplier: 0.0,
                shieldFrontal: 0,
              };
            }
            return e;
          })
        );
        break;
      }

      case 'phoenix': {
        // Supernova Rebirth Flare: Incinerates pig invaders and heals all towers to full health
        physicsEngine.state.screenShake = 0.65;
        physicsEngine.spawnParticles(tower.x, tower.y, 60, '#F97316', 180, 280);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '🔥 SUPERNOVA REBIRTH!', '#F97316', 2.0);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 200) {
              const dmg = Math.round(350 * (1 - (dist / 200) * 0.4));
              physicsEngine.addFloatingText(e.x, e.y - 15, `-${dmg}`, '#FB923C');
              return {
                ...e,
                health: e.health - dmg,
                burningTimer: 5.0,
                burningDps: 35,
              };
            }
            return e;
          })
        );

        setStructures((prev) =>
          prev.map((s) => {
            const dist = Math.hypot(s.x + s.width / 2 - tower.x, s.y + s.height / 2 - tower.y);
            if (dist <= 180) {
              return { ...s, health: s.health - 280 };
            }
            return s;
          })
        );

        // Heal self and allied towers in radius
        setPlacedTowers((prev) =>
          prev.map((t) => {
            const dist = Math.hypot(t.x - tower.x, t.y - tower.y);
            if (dist <= 200) {
              physicsEngine.addFloatingText(t.x, t.y - 20, '+REPAIRED!', '#10B981', 1.4);
              physicsEngine.spawnParticles(t.x, t.y, 16, '#34D399', 100, 160);
              return { ...t, health: t.maxHealth };
            }
            return t;
          })
        );
        break;
      }
    }
  };

  // Trigger Active Combo Ability from linked formations/synergies
  const handleTriggerComboAbility = (abilityName: string) => {
    if (comboCooldowns[abilityName] > 0) return;

    physicsEngine.triggerComboAbility(abilityName, enemies, structures, placedTowers);
    setComboCooldowns((prev) => ({
      ...prev,
      [abilityName]: 15,
    }));
  };

  const handleTriggerPowerUp = (id: 'bombardment' | 'frenzy' | 'timewarp' | 'resonance') => {
    const p = powerUps.find((item) => item.id === id);
    if (!p || levelFeathers < p.cost || p.currentCooldown > 0) return;

    if (id === 'bombardment') {
      setTargetingPowerUp((prev) => (prev === 'bombardment' ? null : 'bombardment'));
    } else if (id === 'frenzy') {
      setLevelFeathers((f) => f - p.cost);
      setPowerUps((prev) =>
        prev.map((item) => (item.id === id ? { ...item, currentCooldown: item.cooldown } : item))
      );
      physicsEngine.addFloatingText(450, 280, 'FEATHER FRENZY ACTIVATED!', '#F59E0B', 1.5);
    } else if (id === 'timewarp') {
      setLevelFeathers((f) => f - p.cost);
      setPowerUps((prev) =>
        prev.map((item) => (item.id === id ? { ...item, currentCooldown: item.cooldown } : item))
      );
      setEnemies((prev) =>
        prev.map((e) => ({
          ...e,
          slowTimer: 6.0,
          slowMultiplier: 0.35,
        }))
      );
      physicsEngine.addFloatingText(450, 280, 'TIME WARP ACTIVATED!', '#38BDF8', 1.5);
    } else if (id === 'resonance') {
      setLevelFeathers((f) => f - p.cost);
      setPowerUps((prev) =>
        prev.map((item) => (item.id === id ? { ...item, currentCooldown: item.cooldown } : item))
      );
      setStructures((prev) =>
        prev.map((s) => ({
          ...s,
          health: Math.max(1, s.health - 60),
        }))
      );
      soundManager.playCollapse();
      physicsEngine.addFloatingText(450, 280, 'STRUCTURAL RESONANCE SHOCKWAVE!', '#10B981', 1.5);
    }
  };

  const handleTriggerPowerUpLocation = (x: number, y: number) => {
    if (targetingPowerUp === 'bombardment') {
      const p = powerUps.find((item) => item.id === 'bombardment');
      if (!p || levelFeathers < p.cost) return;

      setLevelFeathers((f) => f - p.cost);
      setPowerUps((prev) =>
        prev.map((item) => (item.id === 'bombardment' ? { ...item, currentCooldown: item.cooldown } : item))
      );
      setTargetingPowerUp(null);

      soundManager.playExplosion();
      physicsEngine.spawnParticles(x, y, 35, '#EF4444', 220);
      physicsEngine.addFloatingText(x, y - 20, 'EGG BOMBARDMENT!', '#EF4444', 1.6);

      const blastRadius = 90;
      setEnemies((prev) =>
        prev.map((e) => {
          const dist = Math.hypot(e.x - x, e.y - y);
          if (dist <= blastRadius) {
            const dmg = 220 * (1 - dist / blastRadius);
            physicsEngine.addFloatingText(e.x, e.y - 15, `-${Math.round(dmg)}`, '#EF4444');
            return { ...e, health: e.health - dmg };
          }
          return e;
        })
      );

      setStructures((prev) =>
        prev.map((s) => {
          const dist = Math.hypot(s.x + s.width / 2 - x, s.y + s.height / 2 - y);
          if (dist <= blastRadius) {
            return { ...s, health: s.health - 180 };
          }
          return s;
        })
      );
    }
  };

  const handleSelectCampaignLevel = (lvl: LevelDefinition) => {
    initLevel(lvl);
    setCurrentTab('battle');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Bar Contract (Wordmark - Nav - Resources) */}
      <TopNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        feathers={progression.feathers}
        acorns={progression.acorns}
        shards={progression.shards}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 flex flex-col">
        {currentTab === 'battle' && (
          <div className="flex-1 flex flex-col gap-3">
            {/* Mission status & wave controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 rounded-xl px-4 py-2.5 text-xs select-none">
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-400 text-sm">{currentLevel.name}</span>
                <span className="text-stone-500">·</span>
                <span className="text-stone-300 font-mono font-semibold">
                  {isEndlessMode ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Endless Wave {currentWaveIndex + 1}
                    </span>
                  ) : (
                    <span>Wave {currentWaveIndex + 1} / {currentLevel.milestoneWaveCount || 40}</span>
                  )}
                </span>
                {currentLevel.bossData && (currentWaveIndex + 1 >= (currentLevel.milestoneWaveCount || 40) - 2 || isEndlessMode) && (
                  <span className="px-2 py-0.5 bg-rose-950 border border-rose-900 text-[10px] text-rose-300 font-bold rounded flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>BOSS THREAT</span>
                  </span>
                )}
              </div>

              {/* In-Mission Resources & Wave Launch */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold" title="Nest Lives">
                  <Heart className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  <span>{nestLives}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-mono font-bold" title="Battle Feathers">
                  <Feather className="w-4 h-4 text-amber-400" />
                  <span>{levelFeathers}</span>
                </div>

                {/* Auto Wave Toggle */}
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setAutoWaveEnabled(!autoWaveEnabled);
                  }}
                  title="Toggle Automatic Next Wave Dispatch"
                  className={`px-2.5 py-1 rounded-lg font-mono font-semibold text-[11px] border transition-colors flex items-center gap-1 ${
                    autoWaveEnabled
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Auto: {autoWaveEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Speed toggles (1x, 2x, 3x, 5x) */}
                <div className="flex items-center bg-stone-950 rounded-lg p-0.5 border border-stone-800">
                  {[1, 2, 3, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setGameSpeed(spd)}
                      className={`px-1.5 py-1 rounded text-[11px] font-mono ${
                        gameSpeed === spd ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Pause toggle */}
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-stone-300" /> : <Pause className="w-4 h-4 fill-stone-300" />}
                </button>

                {/* Restart Stage Completely (Cancels all queued waves, refunds, & resets to Wave 1) */}
                <button
                  onClick={() => {
                    soundManager.playClick();
                    initLevel(currentLevel);
                    physicsEngine.addFloatingText(450, 260, 'STAGE RESTARTED - WAVE 1', '#F59E0B', 1.6);
                  }}
                  title="Restart Stage (Resets to Wave 1, clears all enemies, restores starting feathers)"
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-rose-950/80 hover:border-rose-700 text-stone-300 hover:text-rose-200 border border-stone-700 transition-colors shadow-sm flex items-center gap-1.5 text-[11px] font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Stage</span>
                </button>

                {/* Launch Wave button (Unlocked! Can send multiple waves simultaneously!) */}
                <button
                  onClick={handleStartWave}
                  className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-md ${
                    isWaveActive
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 animate-pulse'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  }`}
                >
                  <FastForward className="w-4 h-4 fill-stone-950" />
                  <span>
                    {isWaveActive ? `Send Next Wave (+${activeWavesCount} Active)` : 'Send Wave'}
                  </span>
                </button>
              </div>
            </div>

            {/* Canvas Stage with Dynamic Free Placement anywhere */}
            <GameCanvas
              towers={placedTowers}
              enemies={enemies}
              projectiles={projectiles}
              enemyProjectiles={enemyProjectiles}
              structures={structures}
              craters={craters}
              pathWaypoints={currentLevel.pathWaypoints}
              formations={activeFormations}
              synergies={activeSynergies}
              selectedTowerId={selectedTower?.id || null}
              onSelectTower={(t) => setSelectedTower(t)}
              onPlaceTowerLocation={handlePlaceTowerLocation}
              targetingPowerUp={targetingPowerUp}
              onTriggerPowerUpLocation={handleTriggerPowerUpLocation}
              previewTowerType={selectedDeployType}
              showDamageNumbers={settings.showDamageNumbers}
            />

            {/* Active Synergies, Formations & Clickable Combo Powers */}
            <FormationSynergyBar
              formations={activeFormations}
              synergies={activeSynergies}
              onTriggerComboAbility={handleTriggerComboAbility}
              comboCooldowns={comboCooldowns}
            />

            {/* Interactive Control Deck: Free Placement Tower Bar, Power-Ups, or Tower Upgrade Panel */}
            <div className="flex flex-col gap-2">
              {selectedTower ? (
                <div className="flex justify-center">
                  <TowerUpgradePanel
                    tower={selectedTower}
                    feathers={levelFeathers}
                    onUpgradePath={handleUpgradePath}
                    onSetPriority={handleSetPriority}
                    onSellTower={handleSellTower}
                    onTriggerAbility={handleTriggerTowerAbility}
                    onClose={() => setSelectedTower(null)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <TowerPlaceBar
                    unlockedTowers={progression.unlockedTowers}
                    selectedType={selectedDeployType}
                    onSelectType={(t) => setSelectedDeployType(t)}
                    feathers={levelFeathers}
                  />
                  <PowerUpBar
                    feathers={levelFeathers}
                    powerUps={powerUps}
                    onTriggerPowerUp={handleTriggerPowerUp}
                    activePowerUpId={targetingPowerUp}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Campaign Map */}
        {currentTab === 'map' && (
          <CampaignMap
            completedLevels={progression.completedLevels}
            onSelectLevel={handleSelectCampaignLevel}
          />
        )}

        {/* Tab: Avian Roster & Upgrade Trees */}
        {currentTab === 'roster' && (
          <TowerCollection
            unlockedTowers={progression.unlockedTowers}
            ownedSkins={progression.ownedSkins}
            equippedSkins={progression.equippedSkins}
            tokens={progression.tokens}
            onBuySkin={(skinId, cost) => {
              if (progression.tokens >= cost) {
                setProgression((p) => ({
                  ...p,
                  tokens: p.tokens - cost,
                  ownedSkins: [...p.ownedSkins, skinId],
                }));
              }
            }}
            onEquipSkin={(towerId, skinId) => {
              setProgression((p) => ({
                ...p,
                equippedSkins: {
                  ...p.equippedSkins,
                  [towerId]: skinId,
                },
              }));
            }}
          />
        )}

        {/* Tab: Research Tech Tree */}
        {currentTab === 'research' && (
          <ResearchTreeModal
            acorns={progression.acorns}
            shards={progression.shards}
            purchasedResearch={progression.researchPurchased}
            onUnlockResearch={(nodeId, acornCost, shardCost) => {
              if (progression.acorns >= acornCost && progression.shards >= shardCost) {
                setProgression((p) => ({
                  ...p,
                  acorns: p.acorns - acornCost,
                  shards: p.shards - shardCost,
                  researchPurchased: [...p.researchPurchased, nodeId],
                }));
              }
            }}
          />
        )}

        {/* Tab: Special Encounters */}
        {currentTab === 'challenges' && (
          <ChallengeModal
            onStartChallenge={(type) => {
              if (type === 'boss_rush') {
                const bossLevel = CAMPAIGN_LEVELS.find((l) => l.id === 'level_3_boss');
                if (bossLevel) initLevel(bossLevel);
              } else if (type === 'endless') {
                initLevel(CAMPAIGN_LEVELS[0], true);
              } else {
                initLevel(CAMPAIGN_LEVELS[1]);
              }
              setCurrentTab('battle');
            }}
          />
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newS) => setSettings((s) => ({ ...s, ...newS }))}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Victory / Defeat Modal */}
      {victoryModalOpen && (
        <LevelVictoryModal
          isVictory={isVictory}
          level={currentLevel}
          livesRemaining={nestLives}
          initialLives={currentLevel.nestLives}
          pigsCrushed={stats.pigsCrushed + physicsEngine.state.pigsCrushedCount}
          structuresDestroyed={
            stats.structuresDestroyed + physicsEngine.state.structuresDestroyedCount
          }
          combosTriggered={
            stats.combosTriggered +
            physicsEngine.state.combosTriggeredCount +
            physicsEngine.state.elementalReactionsCount
          }
          totalPigsDefeated={stats.pigsDefeated}
          feathersEarned={isVictory ? 250 : 50}
          acornsEarned={isVictory ? 35 : 8}
          shardsEarned={isVictory && currentLevel.bossData ? 15 : 0}
          onReplay={() => initLevel(currentLevel)}
          onEnterEndless={() => {
            setVictoryModalOpen(false);
            setIsEndlessMode(true);
            setCurrentWaveIndex(40);
            setTimeout(() => {
              handleStartWave();
            }, 600);
          }}
          onNextLevel={() => {
            const nextLvlIndex = CAMPAIGN_LEVELS.findIndex((l) => l.id === currentLevel.id) + 1;
            if (nextLvlIndex < CAMPAIGN_LEVELS.length) {
              initLevel(CAMPAIGN_LEVELS[nextLvlIndex]);
            } else {
              setCurrentTab('map');
            }
          }}
          onReturnToMap={() => {
            setVictoryModalOpen(false);
            setCurrentTab('map');
          }}
        />
      )}
    </div>
  );
}
