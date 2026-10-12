# Avian Siege — Gameplay, Progression, UX, and Visual Overhaul

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4.x-729B1B.svg)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

A bird-themed tower defense game featuring upgradeable avian defenders, swine enemy waves, physics-driven destructible environments, regional campaigns, permanent research, and deep strategic progression inspired by modern tower defense titles like Bloons TD 6.

---

## 🌟 Key Overhaul Highlights

### 1. Unified Bloons TD 6-Inspired Drawer (`ModernTowerDrawer`)
- **Slide-Out Control Hub**: Consolidates the disparate placement and upgrade panels into a slide-out drawer on desktop and mobile.
- **Categorized Tabs**:
  - **Available Towers**: Complete roster of avian defenders with costs, roles, and status indicators.
  - **My Towers**: Pre-upgraded rewards and specialized loadouts featuring badge indicators (`NEW`, tier badges) and one-click field deployment.
  - **Selected Defender Controls**: Real-time stats, interactive upgrade paths, live stat deltas, targeting priorities (`first`, `last`, `strongest`, `weakest`, `closest`), active abilities, deliberate combo linking, and waypoint route toggles.
  - **Research & Tech Tree**: Fast access to permanent upgrades.
- **Touch-Friendly & Responsive**: Large touch targets, full landscape and portrait ergonomics, no hover dependencies.

### 2. Pre-Upgraded Tower Rewards & Milestones
- **Meaningful Tower Rewards**: Not just cosmetic unlocks; players earn fully deployable pre-upgraded loadouts.
- **Deterministic Budget & Path Rules**:
  - Enforces Bloons TD 6 upgrade path limits: up to 5 tiers per path, maximum of 2 active upgrade paths (the 3rd path is strictly locked).
  - Four distinct reward tiers:
    - **Campaign Clear**: Tier 1–2 starting upgrades (budget 2–3).
    - **Boss Victory**: Veteran loadouts (budget 3–5).
    - **Round 100 Centurion**: High-tier elite loadouts (budget 6–7).
    - **Round 200 Apex**: Premium loadouts with maximum investment (budget 8–9).
- **Milestone Protection**: One-time achievement milestones prevent reward duplication on replays.
- **Celebration Modal (`RewardClaimModal`)**: Displays tier badges, allocated paths, bonus stats, and options to either save to collection or deploy immediately.

### 3. Deliberate Tower Combos System
- **Player-Controlled Synergy**: Combos are no longer accidental proximity triggers. Players manually connect compatible towers via the selection panel.
- **Dynamic Laser Link Visualization**: High-voltage energy beams connect linked towers on the battlefield with animated traveling spark pulses.
- **Seven Tactical Recipes**:
  1. **Thermal Shock Reaction** (*Penguin + Phoenix*): Shatters frozen armor, strips enemy shields, and grants +45 frostfire burst damage with active *Thermal Cataclysm*.
  2. **Supersonic Crossfire** (*Cardinal + Falcon*): +20% Projectile velocity, homing darts, and 1.2s slow with active 360° razor storm.
  3. **Seismic Demolition Pair** (*Owl + Woodpecker*): +60% Environmental structure collapse damage and ground stuns with active *Tectonic Quake*.
  4. **Precision Shrapnel Battery** (*Bomb Bird + Falcon*): Explosions release secondary piercing shrapnel flechettes with active *Cluster Barrage*.
  5. **Volcanic Caldera Resonance** (*Bomb Bird + Phoenix*): Explosions ignite lingering molten magma pools with active *Magma Eruption*.
  6. **Air-Ground Rapid Intercept** (*Cardinal + Harrier*): Cardinal gains bonus range and pierce; Harrier gains +25% flight velocity with active *Coordinated Air Raid*.
  7. **Cryo Spray Patrol** (*Harrier + Penguin*): Harrier creates a continuous freezing mist trail across its flight route with active *Blizzard Runway*.

### 4. Aerial Flight Patrol Units (Harrier)
- **Patrol Flight Loop Mechanics**: The Harrier flies along closed-loop waypoint routes (`src/utils/flightPath.ts`), banking and rotating realistically along its vector.
- **Interactive Waypoint Route Editor**: Click or tap anywhere on the canvas while in Waypoint Edit mode to add custom patrol points (up to 8 waypoints) or tap an existing waypoint to remove it.
- **Flight Visuals**: Smooth ground altitude drop shadow, sleek delta-wing raptor silhouette with glowing cyan afterburners and golden cockpit canopy.

### 5. Environmental Visual Overhaul
- **Organic World Generation**:
  - Farmland plots with wheat furrows and crop rows.
  - Apple and citrus orchards with directional drop shadows.
  - Meandering river with animated water flow and ripples.
  - Planks and railings for wooden bridges spanning waterways.
  - Regional wild foliage and environmental trees that blend with destructible pig structures.

### 6. Multi-Slot Save Management (`SaveManagerModal`)
- **Three Independent Save Slots**: Manage multiple concurrent campaigns or start fresh runs without losing existing progress.
- **Slot Controls**: Switch active slot, rename slots, overwrite/reset, and delete slots.
- **Automatic Legacy Migration**: Automatically detects and migrates legacy v1 save data (`avian_siege_save_v1`) into Slot 1 on first launch.

### 7. Daily Flight Directives & Astral Tokens (`DailyMissionsModal`)
- **Deterministic Daily Challenges**: Uses date-based hashing so all players receive consistent daily missions that reset daily.
- **Progression Tracking**: Tracks enemy defeats by archetype (e.g., armored pigs, gliders), wave completions, and combo triggers.
- **Astral Tokens**: Completing directives awards Astral Tokens, used to unlock Tier 4 and Tier 5 apex masteries in the Research Tree.
- **Duplicate Prevention**: Guaranteed one-time reward claiming per mission per day.

### 8. Systematic Gameplay Balance Pass
- **Non-Compounding Stats Engine (`src/utils/towerStats.ts`)**: Replaced multiplicative attack speed stacking with additive bonuses to prevent infinite DPS runaway.
- **Gentle Early-Game Curve**: Waves 1–5 have a forgiving onboarding ramp to let new players experiment with tower placement and combos before introducing heavy pressure.
- **Smooth Mid & Late-Game Scaling**: Consistent scaling from wave 6 through wave 40, leading into balanced endless milestones at wave 100 and wave 200.
- **Speed & Armor Caps**: Prevents enemies from moving faster than human reaction limits or stacking impenetrable armor.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons
- **Build Tool**: Vite 8 with `@tailwindcss/vite`
- **Testing**: Vitest 4 with in-memory storage mocks and mathematical assertions
- **Audio**: Web Audio API synthesized procedural sound manager (`soundManager.ts`)
- **Canvas Rendering**: 60 FPS HTML5 2D Canvas engine with sub-pixel particle physics and screen shake

### Project Structure

```
src/
├── __tests__/                  # Comprehensive Vitest test suites
│   ├── balance.test.ts         # Wave scaling, speed caps, armor formulas
│   ├── combos.test.ts          # Deliberate combo recipes & link rules
│   ├── dailyMissions.test.ts   # Deterministic missions & claiming
│   ├── flightPath.test.ts      # Closed-loop waypoint navigation
│   ├── rewardGenerator.test.ts # Pre-upgraded loadouts & 2-path limits
│   ├── saveManager.test.ts     # Multi-slot persistence & v1 migration
│   └── towerStats.test.ts      # Additive stats & upgrade deltas
├── audio/
│   └── soundManager.ts         # Synthesized sound effects & ambient audio
├── components/
│   ├── DailyMissionsModal.tsx  # Daily Flight Directives interface
│   ├── GameCanvas.tsx          # 60 FPS Canvas with terrain & laser links
│   ├── ModernTowerDrawer.tsx   # Slide-out Bloons TD 6-style drawer
│   ├── ResearchTreeModal.tsx   # Permanent tech tree & apex masteries
│   ├── RewardClaimModal.tsx    # Loadout reward celebration modal
│   ├── SaveManagerModal.tsx    # 3-slot archive management
│   ├── SettingsModal.tsx       # Audio, speed, visual settings
│   └── TopNav.tsx              # Resources, currencies, and modal triggers
├── data/
│   ├── balance.ts              # Centralized scaling formulas & health caps
│   ├── combos.ts               # Deliberate combo recipes & validation
│   ├── enemies.ts              # Swine enemy archetypes & boss definitions
│   ├── research.ts             # Permanent research nodes & currencies
│   ├── skins.ts                # Tower cosmetic skins
│   ├── towerAbilities.ts       # Tower active abilities
│   └── towers.ts               # Base stats, 3-path upgrade branches
├── types/
│   └── game.ts                 # Core TypeScript interfaces & definitions
└── utils/
    ├── dailyMissions.ts        # Date hashing & mission progress tracking
    ├── flightPath.ts           # Waypoint calculations & interpolation
    ├── rewardGenerator.ts      # Balanced pre-upgraded loadout generator
    ├── saveManager.ts          # Multi-slot local storage persistence
    └── towerStats.ts           # Effective stats computation & preview delta
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.18+ or v22+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/gcerkez/AvianSeige.git
cd AvianSeige

# Install dependencies
npm install
```

### Development Server

```bash
# Start Vite development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Running Tests

```bash
# Execute Vitest test runner
npm test
```

### Type Checking & Production Build

```bash
# Check TypeScript types
npm run lint

# Build production bundle
npm run build
```

---

## 🎮 How to Play

1. **Deploy Defenders**: Open the slide-out drawer on the right. Select an avian tower (Cardinal, Owl, Falcon, Woodpecker, Penguin, Phoenix, Bomb Bird, or Harrier) and place it on valid terrain.
2. **Aerial Patrol**: Place a Harrier and click **"Edit Route"** in its control panel. Click or tap around the map to configure its flight patrol route.
3. **Link Combos**: Select a placed tower and scroll to the **Deliberate Tower Combos** section. Check any eligible partner tower in range to link them with a laser beam and unlock specialized synergy attacks.
4. **Trigger Active Abilities**: Use deliberate combo active abilities or individual defender powers to turn the tide during challenging waves.
5. **Complete Directives**: Check the **Daily** button in the top navigation bar to claim Astral Tokens from daily flight missions.
6. **Milestone Rewards**: Reach Endless Wave 100 or 200, or defeat campaign boss levels to unlock powerful pre-upgraded loadouts stored in the **My Towers** drawer tab.
7. **Switch Slots**: Use the **Saves** button in the top bar to create alternate playthroughs or test different build strategies.
