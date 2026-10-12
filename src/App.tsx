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
  RewardedTowerLoadout,
  SaveSlotData,
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
import { ModernTowerDrawer } from './components/ModernTowerDrawer';
import { FormationSynergyBar } from './components/FormationSynergyBar';
import { PowerUpBar, PowerUpState } from './components/PowerUpBar';
import { CampaignMap } from './components/CampaignMap';
import { TowerCollection } from './components/TowerCollection';
import { ResearchTreeModal } from './components/ResearchTreeModal';
import { ChallengeModal } from './components/ChallengeModal';
import { SettingsModal } from './components/SettingsModal';
import { LevelVictoryModal } from './components/LevelVictoryModal';
import { SaveManagerModal } from './components/SaveManagerModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { RewardClaimModal } from './components/RewardClaimModal';
import { Play, Pause, FastForward, RotateCcw, Heart, Feather, ShieldAlert, Flame, Zap } from 'lucide-react';

import { computeEffectiveTowerStats } from './utils/towerStats';
import { calculateWaveHealthMultiplier, DIFFICULTY_CONFIGS, TOWER_BASE_HEALTH } from './data/balance';
import { advanceFlightPath, createDefaultFlightPath } from './utils/flightPath';
import { generateTowerReward } from './utils/rewardGenerator';
import {
  getActiveSaveSlot,
  setActiveSaveSlotId,
  getAllSaveSlots,
  saveSlot,
  deleteSaveSlot,
  renameSaveSlot,
  overwriteSaveSlot,
} from './utils/saveManager';
import {
  getOrGenerateDailyMissions,
  updateDailyMissionProgress,
  claimDailyMissionReward,
} from './utils/dailyMissions';

export default function App() {
  // Navigation Tabs
  const [currentTab, setCurrentTab] = useState<
    'battle' | 'map' | 'roster' | 'research' | 'challenges' | 'settings'
  >('battle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Multi-slot Save System
  const [activeSlotId, setActiveSlotIdState] = useState<string>(() => getActiveSaveSlot().id);
  const [allSlots, setAllSlots] = useState<SaveSlotData[]>(() => getAllSaveSlots());
  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);

  // Daily Missions Modal
  const [isDailyMissionsOpen, setIsDailyMissionsOpen] = useState(false);

  // Milestone Tower Reward Modal
  const [pendingRewardClaim, setPendingRewardClaim] = useState<RewardedTowerLoadout | null>(null);

  // Aerial Patrol Path Editing Mode
  const [isEditingFlightPath, setIsEditingFlightPath] = useState(false);

  // Pre-upgraded Loadout Placement Selection
  const [selectedPreUpgradedLoadout, setSelectedPreUpgradedLoadout] =
    useState<RewardedTowerLoadout | null>(null);

  // Global Persistent Progression
  const [progression, setProgression] = useState<PlayerProgression>(() => {
    const slot = getActiveSaveSlot();
    const p = slot.progression;
    if (!p.unlockedTowers?.includes('harrier')) {
      p.unlockedTowers = [...(p.unlockedTowers || []), 'harrier'];
    }
    return p;
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
  const [structures, setStructures] = useState<StructureBlock[]>(() =>
    JSON.parse(JSON.stringify(CAMPAIGN_LEVELS[0].initialStructures))
  );
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

  // Synchronized refs for stable simulation loop (prevents maximum update depth / re-render loops)
  const placedTowersRef = useRef(placedTowers);
  placedTowersRef.current = placedTowers;
  const enemiesRef = useRef(enemies);
  enemiesRef.current = enemies;
  const structuresRef = useRef(structures);
  structuresRef.current = structures;
  const cratersRef = useRef(craters);
  cratersRef.current = craters;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const victoryModalOpenRef = useRef(victoryModalOpen);
  victoryModalOpenRef.current = victoryModalOpen;
  const gameSpeedRef = useRef(gameSpeed);
  gameSpeedRef.current = gameSpeed;
  const currentLevelRef = useRef(currentLevel);
  currentLevelRef.current = currentLevel;
  const isWaveActiveRef = useRef(isWaveActive);
  isWaveActiveRef.current = isWaveActive;
  const currentWaveIndexRef = useRef(currentWaveIndex);
  currentWaveIndexRef.current = currentWaveIndex;
  const isEndlessModeRef = useRef(isEndlessMode);
  isEndlessModeRef.current = isEndlessMode;
  const autoWaveEnabledRef = useRef(autoWaveEnabled);
  autoWaveEnabledRef.current = autoWaveEnabled;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const selectedTowerRef = useRef(selectedTower);
  selectedTowerRef.current = selectedTower;
  const activeSynergiesRef = useRef(activeSynergies);
  activeSynergiesRef.current = activeSynergies;
  const activeFormationsRef = useRef(activeFormations);
  activeFormationsRef.current = activeFormations;
  const handleStartWaveRef = useRef<() => void>(() => {});

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

  // Save progression changes to active slot
  useEffect(() => {
    const cur = getActiveSaveSlot();
    saveSlot({
      ...cur,
      id: activeSlotId,
      progression,
      settings,
      highestWaveReached: Math.max(currentWaveIndex + 1, cur.highestWaveReached),
    });
    setAllSlots(getAllSaveSlots());
  }, [progression, activeSlotId, currentWaveIndex]);

  // Daily missions date check & initialization
  useEffect(() => {
    const { date, missions } = getOrGenerateDailyMissions(
      progression.dailyMissionsDate,
      progression.dailyMissions
    );
    if (
      progression.dailyMissionsDate !== date ||
      !progression.dailyMissions ||
      progression.dailyMissions.length === 0
    ) {
      setProgression((p) => ({
        ...p,
        dailyMissionsDate: date,
        dailyMissions: missions,
      }));
    }
  }, []);

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

          const healthScale = calculateWaveHealthMultiplier(waveNumber, settings.difficulty);
          const diffConfig = DIFFICULTY_CONFIGS[settings.difficulty] || DIFFICULTY_CONFIGS.normal;

          const finalHealth = Math.round(enemyStats.health * healthScale);
          const finalArmor = Math.round(
            enemyStats.armor * (1 + Math.min(0.5, (waveNumber - 1) * 0.015))
          );
          const finalShield = Math.round(
            enemyStats.shieldFrontal * diffConfig.multiplier * (1 + Math.min(0.8, (waveNumber - 1) * 0.02))
          );
          const finalSpeed = Math.min(
            130,
            enemyStats.speed * (1 + Math.min(0.25, (waveNumber - 1) * 0.002))
          );

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
  handleStartWaveRef.current = handleStartWave;

  // Main Combat Simulation Loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const gameLoop = (time: number) => {
      const rawDt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (!isPausedRef.current && !victoryModalOpenRef.current) {
        const dt = rawDt * gameSpeedRef.current;
        const now = performance.now();
        const currentEnemies = enemiesRef.current;
        const currentStructures = structuresRef.current;
        const currentTowers = placedTowersRef.current;
        const currentLevel = currentLevelRef.current;

        // 0. Update Flying Patrol Towers along their flight paths
        for (const tower of currentTowers) {
          if (tower.isFlying && tower.flightPath && tower.flightPath.length >= 2) {
            const flightSpeed = tower.flightSpeed || 90;
            const progress = tower.flightPathProgress || 0;
            const { x, y, rotation, newProgressDistance } = advanceFlightPath(
              tower.flightPath,
              progress,
              flightSpeed,
              dt
            );
            tower.x = x;
            tower.y = y;
            tower.rotation = rotation;
            tower.flightPathProgress = newProgressDistance;
          }
        }

        // 1. Update PowerUp Cooldowns & Combo Cooldowns (guarded to avoid redundant renders)
        setPowerUps((prev) => {
          if (!prev.some((p) => p.currentCooldown > 0)) return prev;
          return prev.map((p) => ({
            ...p,
            currentCooldown: Math.max(0, p.currentCooldown - dt),
          }));
        });

        setComboCooldowns((prev) => {
          const keys = Object.keys(prev);
          if (keys.length === 0 || !keys.some((k) => prev[k] > 0)) return prev;
          const updated: Record<string, number> = {};
          for (const k of keys) {
            if (prev[k] > 0) {
              updated[k] = Math.max(0, prev[k] - dt);
            }
          }
          return updated;
        });

        // 2. Update Structures Stability & Physics Collapses
        setStructures((prevStructures) => {
          if (prevStructures.length === 0) return prevStructures;
          const hasCollapsing = prevStructures.some((b) => b.isCollapsing);
          if (!hasCollapsing) return prevStructures;

          physicsEngine.updateStructures(prevStructures, currentEnemies, dt, (_boss) => {
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
              for (const enemy of currentEnemies) {
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
          if (prevEnemies.length === 0) return prevEnemies;
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
              const isBoss = enemy.isBoss;
              setProgression((p) => {
                let updatedMissions = p.dailyMissions;
                if (updatedMissions) {
                  updatedMissions = updateDailyMissionProgress(
                    updatedMissions,
                    'defeat_enemies',
                    1,
                    enemy.type
                  ).missions;
                }
                return {
                  ...p,
                  feathers: p.feathers + enemy.rewardFeathers,
                  acorns: p.acorns + enemy.rewardAcorns,
                  dailyMissions: updatedMissions,
                };
              });
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
        for (const enemy of currentEnemies) {
          if (enemy.isStunned || enemy.health <= 0) continue;
          const enemyStats = ENEMIES_DATA[enemy.type];
          if (!enemyStats) continue;

          const atkCooldown = enemyStats.attackCooldown || 2.4;
          const atkRange = enemyStats.attackRange || 85;

          if (now - (enemy.lastAttackTime || 0) >= atkCooldown * 1000) {
            // Find closest placed tower within attackRange
            let targetTower: PlacedTower | null = null;
            let closestDist = Infinity;

            for (const t of currentTowers) {
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
          if (prevEProj.length === 0 && launchedEProj.length === 0) return prevEProj;
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
                  p.enemyType === 'frost_hog' ||
                  p.enemyType === 'blizzard_goliath' ||
                  p.enemyType === 'sand_titan' ||
                  p.enemyType === 'magma_behemoth' ||
                  p.enemyType === 'cinder_tyrant' ||
                  p.enemyType === 'bramble_crusher' ||
                  p.enemyType === 'storm_king' ||
                  p.enemyType === 'volt_ram' ||
                  p.enemyType === 'mecha_boar' ||
                  p.enemyType === 'emperor_pork',
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

                  // 2. Falling debris particles
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

                  if (selectedTowerRef.current?.id === tower.id) {
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
        if (currentTowers.some((t) => now - t.lastDamagedTime >= 3000 && t.health < t.maxHealth)) {
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
        }

        // 5. Update Towers Targeting & Projectile Firing (in-place on currentTowers ref, no setState thrashing)
        const newProjectiles: Projectile[] = [];

        for (const tower of currentTowers) {
          const def = TOWERS_DATA[tower.typeId];
          if (!def) continue;

          const tStats = computeEffectiveTowerStats(tower, progression.researchPurchased);
          const effectiveFireRate = tStats.fireRate;
          const effectiveRange = tStats.range;
          const effectiveDamage = tStats.damage;
          const effectiveStructuralDmg = tStats.structuralDamage;
          const element = tStats.element;

          let target: { x: number; y: number; id?: string } | null = null;
          const inRangeEnemies = currentEnemies.filter((e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= effectiveRange);

          if (tower.targetPriority === 'structures') {
            const inRangeStructs = currentStructures.filter(
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

            if (tower.linkedComboTowerId || (tower.comboPartnerIds && tower.comboPartnerIds.length > 0)) {
              isComboProj = true;
              comboVis = 'thermal';
            }

            for (const s of activeSynergiesRef.current) {
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
            for (const f of activeFormationsRef.current) {
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
              pierceRemaining: tStats.pierce,
              radius: def.projectileRadius,
              maxDistance: effectiveRange,
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
        }

        if (newProjectiles.length > 0) {
          setProjectiles((prev) => [...prev, ...newProjectiles]);
        }

        // 6. Update Projectiles Physics Collisions (guarded)
        setProjectiles((prevProjectiles) => {
          if (prevProjectiles.length === 0) return prevProjectiles;
          return physicsEngine.updateProjectiles(prevProjectiles, currentEnemies, currentStructures, dt);
        });

        // 7. Update Visual Particles and Floaters
        physicsEngine.updateVisuals(dt);

        // 8. Check Wave Completion (only when all queued spawns are deployed and all enemies defeated)
        if (isWaveActiveRef.current && pendingSpawnsRef.current === 0 && enemiesRef.current.length === 0) {
          setIsWaveActive(false);
          setActiveWavesCount(0);
          const nextWave = currentWaveIndexRef.current + 1;
          const targetMilestone = currentLevelRef.current.milestoneWaveCount || 40;

          // Track Daily Directive: survive_waves
          setProgression((p) => {
            if (!p.dailyMissions) return p;
            return {
              ...p,
              dailyMissions: updateDailyMissionProgress(p.dailyMissions, 'survive_waves', 1).missions,
            };
          });

          // Check Endless Milestone Rewards (Round 100 & Round 200)
          if (isEndlessModeRef.current) {
            if (nextWave === 100) {
              const milestoneKey = 'milestone_round_100';
              setProgression((p) => {
                if (p.claimedMilestones?.[milestoneKey]) return p;
                const reward = generateTowerReward(
                  'round_100',
                  'Round 100 Centurion Milestone',
                  p.unlockedTowers
                );
                setPendingRewardClaim(reward);
                return {
                  ...p,
                  claimedMilestones: { ...(p.claimedMilestones || {}), [milestoneKey]: true },
                };
              });
            } else if (nextWave === 200) {
              const milestoneKey = 'milestone_round_200';
              setProgression((p) => {
                if (p.claimedMilestones?.[milestoneKey]) return p;
                const reward = generateTowerReward(
                  'round_200',
                  'Round 200 Apex Dominance',
                  p.unlockedTowers
                );
                setPendingRewardClaim(reward);
                return {
                  ...p,
                  claimedMilestones: { ...(p.claimedMilestones || {}), [milestoneKey]: true },
                };
              });
            }
          }

          if (!isEndlessModeRef.current && nextWave > targetMilestone) {
            soundManager.playVictory();
            setIsVictory(true);
            setVictoryModalOpen(true);

            // Award Campaign clear reward (with one-time milestone protection)
            const milestoneKey = `campaign_${currentLevelRef.current.id}`;
            setProgression((p) => {
              const alreadyClaimed = p.claimedMilestones?.[milestoneKey];
              if (!alreadyClaimed) {
                const tier = currentLevelRef.current.bossData ? 'boss_clear' : 'campaign_clear';
                const reward = generateTowerReward(
                  tier,
                  currentLevelRef.current.name,
                  p.unlockedTowers
                );
                setPendingRewardClaim(reward);
              }
              return {
                ...p,
                feathers: p.feathers + 300,
                acorns: p.acorns + 35,
                shards: p.shards + 10,
                claimedMilestones: {
                  ...(p.claimedMilestones || {}),
                  [milestoneKey]: true,
                },
                completedLevels: {
                  ...p.completedLevels,
                  [currentLevelRef.current.id]: {
                    stars: 3,
                    highestDifficulty: settingsRef.current.difficulty,
                  },
                },
              };
            });
          } else {
            setCurrentWaveIndex(nextWave);
            // Automatic wave progression with tracked cancellable timeout
            if (autoWaveEnabledRef.current) {
              if (autoWaveTimeoutRef.current) clearTimeout(autoWaveTimeoutRef.current);
              autoWaveTimeoutRef.current = window.setTimeout(() => {
                handleStartWaveRef.current();
              }, 1200);
            }
          }
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

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

    const initialHp = TOWER_BASE_HEALTH[typeId] || 500;
    const isFlying = def.isFlying || false;
    const flightPath = isFlying
      ? createDefaultFlightPath(Math.round(x), Math.round(y), 110)
      : undefined;
    const flightSpeed = def.flightSpeed || 90;

    // Preserve pre-upgraded loadout tiers and locked path if deployed from My Towers
    const preUpgraded = selectedPreUpgradedLoadout;
    const tiers =
      preUpgraded && preUpgraded.typeId === typeId
        ? { ...preUpgraded.tiers }
        : { path_a: 0, path_b: 0, path_c: 0 };
    const lockedPath =
      preUpgraded && preUpgraded.typeId === typeId ? preUpgraded.lockedPath : null;

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random()}`,
      typeId,
      x: Math.round(x),
      y: Math.round(y),
      level: (tiers.path_a + tiers.path_b + tiers.path_c) || 1,
      tiers,
      lockedPath,
      targetPriority: 'first',
      lastFired: 0,
      rotation: 0,
      kills: 0,
      damageDealt: 0,
      health: initialHp,
      maxHealth: initialHp,
      lastDamagedTime: 0,
      isFlying,
      flightPath,
      flightSpeed,
      flightPathProgress: 0,
      isPreUpgraded: !!preUpgraded,
      loadoutId: preUpgraded?.id,
    };

    setPlacedTowers((prev) => [...prev, newTower]);
    setSelectedDeployType(null);
    setSelectedPreUpgradedLoadout(null);
    setSelectedTower(newTower);
  };

  // Deliberate Player-Chosen Tower Combo Linking
  const handleToggleComboPartner = (towerId: string, partnerTowerId: string) => {
    soundManager.playClick();
    setPlacedTowers((prev) =>
      prev.map((t) => {
        if (t.id === towerId) {
          const partners = t.comboPartnerIds || [];
          const nextPartners = partners.includes(partnerTowerId)
            ? partners.filter((id) => id !== partnerTowerId)
            : [...partners, partnerTowerId];
          return {
            ...t,
            comboPartnerIds: nextPartners,
            linkedComboTowerId: nextPartners[0] || null,
          };
        }
        if (t.id === partnerTowerId) {
          const partners = t.comboPartnerIds || [];
          const nextPartners = partners.includes(towerId)
            ? partners.filter((id) => id !== towerId)
            : [...partners, towerId];
          return {
            ...t,
            comboPartnerIds: nextPartners,
            linkedComboTowerId: nextPartners[0] || null,
          };
        }
        return t;
      })
    );
    setSelectedTower((prev) => {
      if (!prev) return null;
      if (prev.id === towerId) {
        const partners = prev.comboPartnerIds || [];
        const nextPartners = partners.includes(partnerTowerId)
          ? partners.filter((id) => id !== partnerTowerId)
          : [...partners, partnerTowerId];
        return {
          ...prev,
          comboPartnerIds: nextPartners,
          linkedComboTowerId: nextPartners[0] || null,
        };
      }
      return prev;
    });
  };

  // Aerial Patrol Flight Path Waypoint Updates
  const handleUpdateFlightPath = (towerId: string, waypoints: { x: number; y: number }[]) => {
    setPlacedTowers((prev) =>
      prev.map((t) => (t.id === towerId ? { ...t, flightPath: waypoints } : t))
    );
    setSelectedTower((prev) =>
      prev && prev.id === towerId ? { ...prev, flightPath: waypoints } : prev
    );
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

      case 'harrier': {
        // Supersonic Strafe Run: High-speed strafe bombarding column of enemies
        physicsEngine.state.screenShake = 0.55;
        physicsEngine.spawnParticles(tower.x, tower.y, 50, '#38BDF8', 160, 260);
        physicsEngine.addFloatingText(tower.x, tower.y - 25, '🚀 SUPERSONIC STRAFE RUN!', '#38BDF8', 2.0);

        setEnemies((prev) =>
          prev.map((e) => {
            const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (dist <= 220) {
              physicsEngine.addFloatingText(e.x, e.y - 15, '-320 STRAFE!', '#38BDF8');
              physicsEngine.spawnParticles(e.x, e.y, 10, '#0284C7', 100, 180);
              return {
                ...e,
                health: e.health - 320,
                slowTimer: 3.0,
                slowMultiplier: 0.45,
                armor: Math.max(0, e.armor - 15),
              };
            }
            return e;
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
    setStats((s) => ({ ...s, combosTriggered: s.combosTriggered + 1 }));
    setProgression((p) => {
      if (!p.dailyMissions) return p;
      return {
        ...p,
        dailyMissions: updateDailyMissionProgress(p.dailyMissions, 'trigger_combos', 1).missions,
      };
    });
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

  // Multi-slot Save Actions
  const handleSwitchSlot = (slotId: string) => {
    setActiveSaveSlotId(slotId);
    setActiveSlotIdState(slotId);
    const slots = getAllSaveSlots();
    const slotData = slots.find((s) => s.id === slotId) || slots[0];
    setProgression(slotData.progression);
    setSettings(slotData.settings);
    initLevel(CAMPAIGN_LEVELS[0]);
    setAllSlots(getAllSaveSlots());
    setIsSaveManagerOpen(false);
    physicsEngine.addFloatingText(450, 260, `SLOT LOADED: ${slotData.name}`, '#38BDF8', 1.5);
  };

  const handleSaveToSlot = (slotId: string, customName?: string) => {
    const cur = getActiveSaveSlot();
    saveSlot({
      ...cur,
      id: slotId,
      name: customName || cur.name,
      progression,
      settings,
      highestWaveReached: Math.max(currentWaveIndex + 1, cur.highestWaveReached),
    });
    setAllSlots(getAllSaveSlots());
    physicsEngine.addFloatingText(450, 260, `SLOT ${slotId} SAVED`, '#10B981', 1.5);
  };

  const handleDeleteSlot = (slotId: string) => {
    deleteSaveSlot(slotId);
    setAllSlots(getAllSaveSlots());
  };

  const handleRenameSlot = (slotId: string, newName: string) => {
    renameSaveSlot(slotId, newName);
    setAllSlots(getAllSaveSlots());
  };

  // Daily Missions Claim Action
  const handleClaimDailyMission = (missionId: string) => {
    if (!progression.dailyMissions) return;
    const result = claimDailyMissionReward(progression.dailyMissions, missionId);
    if (result) {
      soundManager.playUpgrade();
      setProgression((p) => ({
        ...p,
        acorns: p.acorns + result.awardedAcorns,
        advancedTokens: (p.advancedTokens || 0) + result.awardedAdvancedTokens,
        dailyMissions: result.missions,
      }));
      physicsEngine.addFloatingText(
        450,
        260,
        `DIRECTIVE CLAIMED! +${result.awardedAdvancedTokens} ASTRAL TOKENS`,
        '#C084FC',
        1.8
      );
    }
  };

  const handleResetFlightPath = (towerId: string) => {
    const tower = placedTowers.find((t) => t.id === towerId);
    if (!tower) return;
    const newPath = createDefaultFlightPath(tower.x, tower.y, 110);
    handleUpdateFlightPath(towerId, newPath);
  };

  // Milestone Reward Claim Actions
  const handleClaimPendingReward = () => {
    if (!pendingRewardClaim) return;
    soundManager.playUpgrade();
    setProgression((p) => ({
      ...p,
      rewardedTowers: [...(p.rewardedTowers || []), pendingRewardClaim],
    }));
    setPendingRewardClaim(null);
  };

  const handleDeployNowPendingReward = () => {
    if (!pendingRewardClaim) return;
    soundManager.playUpgrade();
    const reward = pendingRewardClaim;
    setProgression((p) => ({
      ...p,
      rewardedTowers: [...(p.rewardedTowers || []), reward],
    }));
    setSelectedPreUpgradedLoadout(reward);
    setSelectedDeployType(reward.typeId);
    setPendingRewardClaim(null);
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
        advancedTokens={progression.advancedTokens || 0}
        hasUnclaimedDailyMissions={progression.dailyMissions?.some(
          (m) => m.completed && !m.claimed
        )}
        onOpenDailyMissions={() => setIsDailyMissionsOpen(true)}
        onOpenSaveManager={() => setIsSaveManagerOpen(true)}
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

                {/* Launch Wave button */}
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
              regionalBiome={currentLevel.regionalBiome || 'glacial'}
              formations={activeFormations}
              synergies={activeSynergies}
              selectedTowerId={selectedTower?.id || null}
              onSelectTower={(t) => setSelectedTower(t)}
              onPlaceTowerLocation={handlePlaceTowerLocation}
              targetingPowerUp={targetingPowerUp}
              onTriggerPowerUpLocation={handleTriggerPowerUpLocation}
              previewTowerType={selectedDeployType}
              showDamageNumbers={settings.showDamageNumbers}
              researchPurchased={progression.researchPurchased}
              isEditingFlightPath={isEditingFlightPath}
              onUpdateFlightPath={handleUpdateFlightPath}
            />

            {/* Active Synergies, Formations & Clickable Combo Powers */}
            <FormationSynergyBar
              formations={activeFormations}
              synergies={activeSynergies}
              onTriggerComboAbility={handleTriggerComboAbility}
              comboCooldowns={comboCooldowns}
            />

            {/* Tactical Power-Ups Deck */}
            <div className="w-full">
              <PowerUpBar
                feathers={levelFeathers}
                powerUps={powerUps}
                onTriggerPowerUp={handleTriggerPowerUp}
                activePowerUpId={targetingPowerUp}
              />
            </div>

            {/* Unified Bloons TD 6-Inspired Modern Tower Drawer */}
            <ModernTowerDrawer
              unlockedTowers={progression.unlockedTowers}
              rewardedTowers={progression.rewardedTowers || []}
              selectedDeployType={selectedDeployType}
              selectedPreUpgradedLoadout={selectedPreUpgradedLoadout}
              onSelectDeployType={(t: TowerTypeId | null) => {
                setSelectedDeployType(t);
                setSelectedPreUpgradedLoadout(null);
              }}
              onSelectPreUpgradedLoadout={(loadout) => {
                setSelectedPreUpgradedLoadout(loadout);
                if (loadout) {
                  setSelectedDeployType(loadout.typeId);
                  if (loadout.isNew) {
                    setProgression((p) => ({
                      ...p,
                      rewardedTowers: (p.rewardedTowers || []).map((lt) =>
                        lt.id === loadout.id ? { ...lt, isNew: false } : lt
                      ),
                    }));
                  }
                } else {
                  setSelectedDeployType(null);
                }
              }}
              feathers={levelFeathers}
              selectedTower={selectedTower}
              placedTowers={placedTowers}
              researchPurchased={progression.researchPurchased}
              onUpgradePath={handleUpgradePath}
              onSetPriority={handleSetPriority}
              onSellTower={handleSellTower}
              onTriggerAbility={handleTriggerTowerAbility}
              onToggleComboLink={handleToggleComboPartner}
              isEditingFlightPath={isEditingFlightPath}
              onToggleFlightPathEdit={() => setIsEditingFlightPath((p) => !p)}
              onResetFlightPath={handleResetFlightPath}
              onCloseSelectedTower={() => {
                setSelectedTower(null);
                setIsEditingFlightPath(false);
              }}
            />
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
            advancedTokens={progression.advancedTokens || 0}
            purchasedResearch={progression.researchPurchased}
            onUnlockResearch={(nodeId, acornCost, shardCost, advCost = 0) => {
              if (
                progression.acorns >= acornCost &&
                progression.shards >= shardCost &&
                (progression.advancedTokens || 0) >= advCost
              ) {
                setProgression((p) => ({
                  ...p,
                  acorns: p.acorns - acornCost,
                  shards: p.shards - shardCost,
                  advancedTokens: (p.advancedTokens || 0) - advCost,
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

      {/* Save Manager Modal */}
      {isSaveManagerOpen && (
        <SaveManagerModal
          slots={allSlots}
          activeSlotId={activeSlotId}
          onSelectSlot={handleSwitchSlot}
          onOverwriteSlot={handleSaveToSlot}
          onRenameSlot={handleRenameSlot}
          onDeleteSlot={handleDeleteSlot}
          onClose={() => setIsSaveManagerOpen(false)}
        />
      )}

      {/* Daily Directives Modal */}
      {isDailyMissionsOpen && (
        <DailyMissionsModal
          missions={progression.dailyMissions || []}
          todayDate={progression.dailyMissionsDate || new Date().toISOString().slice(0, 10)}
          advancedTokens={progression.advancedTokens || 0}
          onClaimReward={handleClaimDailyMission}
          onClose={() => setIsDailyMissionsOpen(false)}
        />
      )}

      {/* Milestone Tower Reward Modal */}
      {pendingRewardClaim && (
        <RewardClaimModal
          reward={pendingRewardClaim}
          onClaim={handleClaimPendingReward}
          onDeployNow={handleDeployNowPendingReward}
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
