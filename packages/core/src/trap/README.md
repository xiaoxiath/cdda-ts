# Trap System

The trap system provides comprehensive trap mechanics for the game, including visibility, detection, triggering, damage, and disarm mechanics.

## Architecture

### Core Classes

- **Trap**: Immutable trap data class using Immutable.js Record
- **TrapData**: Manager for trap storage and filtering
- **TrapParser**: Parses trap data from JSON format
- **TrapLoader**: Loads trap data from URLs and files
- **TrapFlags**: Set-based flag management for trap properties

## Features

### Trap Properties

Each trap has the following properties:

- **id**: Unique identifier (e.g., `tr_snare_light`)
- **name**: Display name
- **description**: Detailed description
- **symbol**: Map symbol (e.g., `^`, `*`, `O`)
- **color**: Display color
- **visibility**: Detection difficulty (1-10, lower is easier to detect)
- **avoidance**: Dodge difficulty (higher is harder to avoid)
- **difficulty**: Disarm difficulty (skill required)
- **trapRadius**: Trigger radius (0 = single tile)
- **benign**: Whether trap is harmless
- **alwaysInvisible**: Cannot be detected
- **triggerWeight**: Minimum weight to trigger (in grams)
- **action**: Trap action type
- **flags**: Set of trap behavior flags
- **fun**: Entertainment value (0-3)
- **complexity**: Construction complexity

### Trap Flags

Flags control trap behavior:

**Visibility:**
- `VISIBLE`: Always visible to players
- `HIDDEN`: Hidden until detected or triggered
- `ALWAYS_INVISIBLE`: Cannot be detected

**Danger Level:**
- `BENIGN`: Harmless trap
- `DANGEROUS`: Can cause harm
- `LETHAL`: Can kill creatures

**Triggering:**
- `CAN_BE_AVOIDED`: Can be dodged
- `TRIGGERED_BY_WALK`: Triggers when walked over
- `TRIGGERED_BY_WEIGHT`: Triggers based on weight

**Usage:**
- `CONSUMED`: Single-use trap
- `RELOADABLE`: Can be reloaded
- `LOUD`: Makes noise when triggered

### Trap Actions

Action types determine trap behavior:

**Physical Traps:**
- `snare_light`: Light snare (0 damage, immobilizes)
- `snare_heavy`: Heavy snare (5 damage, immobilizes)
- `caltrops`: Metal spikes (3 damage)
- `board`: Nailed board (2 damage)
- `tripwire`: Tripping hazard (stumble)
- `blade`: Swinging blade (lethal)

**Projectile Traps:**
- `crossbow`: Fires bolt (20 damage, requires ammo)
- `shotgun`: Fires shell (40 damage, lethal, requires ammo)

**Pit Traps:**
- `hole`: Simple hole (5 damage)
- `pit`: Deep pit (5 damage, climb out)
- `pit_spikes`: Spiked pit (25 damage, lethal)
- `pit_glass`: Glass pit (25 damage, lethal)
- `sinkhole`: Collapsed tunnel (10 damage, lethal)

**Special Traps:**
- `teleport`: Random teleport
- `bubble`: Bubble wrap (harmless, loud)
- `glow`: Emits light
- `alarm`: Loud alarm (harmless)
- `funnel`: Collection funnel
- `mouse`: Mouse trap
- `ledge`: Collapsing ledge
- `talisman`: Magical enchantment

## Usage

### Creating a Trap

```typescript
import { Trap } from './trap';
import { TrapAction, TrapFlags } from './types';

const trap = new Trap({
  id: 'tr_snare_light',
  name: 'snare trap',
  description: 'A simple snare trap that catches small game.',
  symbol: '^',
  color: 'light_green',
  visibility: 2,
  avoidance: 8,
  difficulty: 2,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 1000,
  action: TrapAction.SNARE_LIGHT,
  flags: new TrapFlags(['HIDDEN']),
  fun: 0,
  complexity: 1,
});
```

### Loading Trap Data

```typescript
import { TrapLoader } from './trap/TrapLoader';

const loader = new TrapLoader();

// Load from JSON
const jsonData = [
  {
    type: 'trap',
    id: 'tr_snare_light',
    name: 'snare trap',
    action: 'snare_light',
    flags: ['HIDDEN'],
  },
];

await loader.loadFromJson(jsonData);

// Get trap
const trap = loader.get('tr_snare_light');
```

### Detection Mechanics

```typescript
// Check if trap is visible to character
const isVisible = trap.isVisible(detectionSkill);

// Get discovery difficulty (0-100, lower is easier)
const difficulty = trap.getDiscoveryDifficulty(perception);
```

Visibility rules:
1. If `alwaysInvisible` is true, never visible
2. If `VISIBLE` flag is set, always visible
3. If `HIDDEN` flag is set, never visible (until triggered)
4. Otherwise, compare `detectionSkill` vs `visibility`

### Trigger Mechanics

```typescript
// Check if trap can trigger
const canTrigger = trap.canTrigger(weight);

// Get trigger chance (0-1)
const chance = trap.getTriggerChance(dodgeSkill);

// Check if trap triggers
const triggers = trap.checkTrigger(weight, dodgeSkill);
```

Trigger conditions:
1. Benign traps never trigger
2. If `TRIGGERED_BY_WEIGHT` flag is set, checks `weight >= triggerWeight`
3. Otherwise compares `dodgeSkill` vs `avoidance`

### Damage and Effects

```typescript
// Get damage dealt
const damage = trap.getDamage(weight);

// Get movement penalty (turns lost)
const penalty = trap.getMovementPenalty();

// Check if lethal
const lethal = trap.isLethal();
```

### Disarm Mechanics

```typescript
import { Map } from 'immutable';

// Check if can disarm
const skills = Map({ traps: 5, mechanics: 3 });
const canDisarm = trap.canDisarm(skills);

// Get disarm difficulty (0-100, lower is easier)
const difficulty = trap.getDisarmDifficulty(skills);
```

Disarm requirements:
1. Cannot be benign
2. Cannot be always invisible
3. Requires `traps` or `mechanics` skill >= `difficulty`

### Filtering Traps

```typescript
import { TrapData } from './trap/TrapData';

const data = loader.getData();

// Get visible traps
const visible = data.getVisibleTraps();

// Get hidden traps
const hidden = data.getHiddenTraps();

// Get benign traps
const benign = data.getBenignTraps();

// Get dangerous traps
const dangerous = data.getDangerousTraps();

// Get lethal traps
const lethal = data.getLethalTraps();

// Get traps requiring ammunition
const withAmmo = data.getTrapsRequiringAmmunition();

// Sort by complexity
const byComplexity = data.sortByComplexity();

// Sort by difficulty
const byDifficulty = data.sortByDifficulty();

// Get beginner traps (difficulty <= 2)
const beginner = data.getBeginnerTraps(2);

// Get expert traps (difficulty >= 5)
const expert = data.getExpertTraps(5);
```

### Statistics

```typescript
const stats = loader.getStats();
console.log(`Total traps: ${stats.total}`);
console.log(`Visible: ${stats.visible}`);
console.log(`Hidden: ${stats.hidden}`);
console.log(`Benign: ${stats.benign}`);
console.log(`Dangerous: ${stats.dangerous}`);
console.log(`Lethal: ${stats.lethal}`);
console.log(`Requires ammo: ${stats.requiresAmmunition}`);
```

## Game Mechanics

### Detection System

Traps can be detected based on:
1. **Visibility property**: Higher values = harder to detect
2. **Character perception skill**: Higher = better detection
3. **Flags**: VISIBLE always seen, HIDDEN requires detection

Discovery difficulty formula:
```
difficulty = max(0, min(100, (visibility - perception) * 10))
```

### Trigger System

Traps trigger based on:
1. **Weight**: Some traps require minimum weight
2. **Dodge skill**: Higher skill = better avoidance
3. **Avoidance property**: Higher = harder to avoid

Trigger chance formula:
```
difficulty = max(0, min(100, (avoidance - dodge) * 10))
chance = (100 - difficulty) / 100
```

### Damage System

Damage varies by action type:
- Light traps: 0-5 damage
- Medium traps: 10-20 damage
- Heavy traps: 25-40 damage
- Lethal traps: Can kill

### Disarm System

Characters can disarm traps if:
1. Trap is not benign
2. Trap is not always invisible
3. Character has sufficient skill

Disarm difficulty formula:
```
difficulty = max(0, min(100, (difficulty - skill) * 10))
```

## Examples

### Complete Trap Lifecycle

```typescript
import { Trap } from './trap';
import { TrapAction, TrapFlags } from './types';
import { Map } from 'immutable';

// Create a crossbow trap
const trap = new Trap({
  id: 'tr_crossbow',
  name: 'crossbow trap',
  description: 'A modified crossbow that fires when triggered.',
  symbol: '}',
  color: 'brown',
  visibility: 2,
  avoidance: 15,
  difficulty: 6,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 10000,
  action: TrapAction.CROSSBOW,
  flags: new TrapFlags(['HIDDEN', 'CONSUMED']),
  fun: 1,
  complexity: 5,
});

// Character approaches with perception 3
const perception = 3;
const isDetected = trap.isVisible(perception);
console.log(`Trap detected: ${isDetected}`);

// If not detected, character might trigger it
const weight = 70000; // 70kg character
const dodge = 8;

if (trap.checkTrigger(weight, dodge)) {
  console.log('Trap triggered!');

  // Calculate effects
  const damage = trap.getDamage(weight);
  const penalty = trap.getMovementPenalty();

  console.log(`Damage: ${damage}`);
  console.log(`Movement penalty: ${penalty} turns`);
  console.log(`Lethal: ${trap.isLethal()}`);

  // Character can attempt to disarm in future
  const skills = Map({ traps: 7 });
  if (trap.canDisarm(skills)) {
    const disarmDiff = trap.getDisarmDifficulty(skills);
    console.log(`Can disarm with ${disarmDiff}% difficulty`);
  }
}
```

### Loading and Filtering Traps

```typescript
import { TrapLoader } from './trap/TrapLoader';

async function analyzeTraps() {
  const loader = new TrapLoader();

  // Load trap data
  await loader.loadFromUrl('/data/traps.json');

  // Get statistics
  const stats = loader.getStats();
  console.log('Trap Statistics:', stats);

  // Find suitable traps for different scenarios
  const beginnerTraps = loader.getData().getBeginnerTraps(2);
  console.log(`Beginner traps: ${beginnerTraps.length}`);

  const lethalTraps = loader.getData().getLethalTraps();
  console.log(`Lethal traps: ${lethalTraps.length}`);

  const ammoTraps = loader.getData().getTrapsRequiringAmmunition();
  console.log(`Traps needing ammo: ${ammoTraps.length}`);

  // Find most complex trap
  const byComplexity = loader.getData().sortByComplexity();
  const mostComplex = byComplexity[byComplexity.length - 1];
  console.log(`Most complex: ${mostComplex.name} (${mostComplex.complexity})`);
}
```

## Testing

Run tests with:

```bash
# Unit tests
pnpm test trap.test.ts

# Integration tests
pnpm test integration.test.ts

# All trap tests
pnpm test --trap
```

## Data Format

Trap data follows this JSON structure:

```json
{
  "type": "trap",
  "id": "tr_snare_light",
  "name": "snare trap",
  "description": "A simple snare trap that catches small game.",
  "symbol": "^",
  "color": "light_green",
  "visibility": 2,
  "avoidance": 8,
  "difficulty": 2,
  "trap_radius": 0,
  "benign": false,
  "always_invisible": false,
  "trigger_weight": 1000,
  "action": "snare_light",
  "flags": ["HIDDEN"],
  "fun": 0,
  "complexity": 1
}
```

## Performance Considerations

1. **Immutable Data**: All traps are Immutable.js Records for efficient updates
2. **Indexed Storage**: TrapData maintains byId, byName, and bySymbol indexes
3. **Lazy Filtering**: Filter methods create new arrays on demand
4. **Cached Calculations**: Expensive calculations are memoized

## Future Enhancements

- Trap chaining (multiple traps triggering together)
- Custom trap conditions
- Trap modification by characters
- Trap construction system
- Trap decay over time
- Environmental effects on traps
