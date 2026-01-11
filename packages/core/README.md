# Core Package

The core package provides the fundamental game systems for the Cataclysm-DDA web clone. It contains all data structures and mechanics for terrain, furniture, fields, traps, and coordinate systems.

## Overview

The core package is a TypeScript library that implements the game's data structures and logic. It uses Immutable.js for all data structures to ensure immutability and predictable state management.

### Key Features

- **Immutable Data**: All game objects use Immutable.js Record
- **Type-Safe**: Strongly typed with TypeScript
- **Test-Driven**: Comprehensive unit and integration tests
- **Modular**: Organized into independent, composable systems
- **Data-Driven**: Loads game data from JSON (Cataclysm-DDA compatible)

## Architecture

### Package Structure

```
packages/core/
├── src/
│   ├── coordinates/     # Coordinate system (Point, Tripoint)
│   ├── terrain/         # Terrain system
│   ├── furniture/       # Furniture system
│   ├── field/           # Field system
│   ├── trap/            # Trap system
│   ├── types/           # Shared types
│   ├── index.ts         # Main exports
│   └── validate-exports.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### System Dependencies

```
coordinates
    ↓
├──→ terrain
├──→ furniture
├──→ field
└──→ trap
```

All systems depend on the coordinate system, but are independent of each other.

## Modules

### Coordinates System

**Location**: `src/coordinates/`

Provides strongly-typed, immutable coordinate handling for the game world.

**Key Classes**:
- `Point`: 2D coordinates (x, y)
- `Tripoint`: 3D coordinates (x, y, z)
- `CoordinateConverter`: Scale conversions

**Features**:
- Multiple coordinate scales (Map Square → Submap → OMT → Segment → Overmap)
- Z-axis support (underground to sky)
- Distance calculations (Manhattan, Euclidean, Chebyshev)
- Coordinate conversions

**Documentation**: [coordinates/README.md](./coordinates/README.md)

**Example**:
```typescript
import { Point, Tripoint } from '@game/core';

const pos = Tripoint.from(100, 200, -2);
const adjacent = pos.add({ x: 1, y: 0 });
const distance = pos.manhattanDistanceTo(adjacent);
```

### Terrain System

**Location**: `src/terrain/`

Manages terrain types and their properties.

**Key Classes**:
- `Terrain`: Terrain data class
- `TerrainData`: Terrain storage manager
- `TerrainParser`: JSON parser
- `TerrainLoader`: Data loader

**Features**:
- 30+ terrain flags (TRANSPARENT, FLAT, LIQUID, WALL, etc.)
- Bash/deconstruct mechanics
- Open/close operations
- Transformations
- Movement cost calculation

**Documentation**: [terrain/README.md](./terrain/README.md)

**Example**:
```typescript
import { Terrain, TerrainFlags } from '@game/core';

const floor = new Terrain({
  id: 1,
  name: 'floor',
  description: 'A wooden floor',
  symbol: '.',
  color: 'brown',
  moveCost: 2,
  coverage: 100,
  flags: new TerrainFlags(['FLAT', 'TRANSPARENT']),
});
```

### Furniture System

**Location**: `src/furniture/`

Manages furniture types and their properties.

**Key Classes**:
- `Furniture`: Furniture data class
- `FurnitureData`: Furniture storage manager
- `FurnitureParser`: JSON parser
- `FurnitureLoader`: Data loader

**Features**:
- 50+ furniture flags (WORKBENCH, CONTAINER, PLANT, etc.)
- Workbench support with skill multipliers
- Plant growth mechanics
- Container capacity
- Field emitters

**Documentation**: [furniture/README.md](./furniture/README.md)

**Example**:
```typescript
import { Furniture, FurnitureFlags } from '@game/core';

const workbench = new Furniture({
  id: 1,
  name: 'workbench',
  description: 'A crafting station',
  symbol: '!',
  color: 'brown',
  moveCost: 0,
  flags: new FurnitureFlags(['WORKBENCH', 'TRANSPARENT']),
});
```

### Field System

**Location**: `src/field/`

Manages field types (fire, smoke, etc.) and field instances.

**Key Classes**:
- `FieldEntry`: Individual field instance
- `FieldType`: Field type definition
- `FieldData`: Field storage manager
- `FieldTypeParser`: JSON parser
- `FieldTypeLoader`: Data loader

**Features**:
- 60+ field type flags
- 5 field phases (solid, liquid, gas, plasma, energy)
- Intensity levels (1-3)
- Half-life decay mechanics
- Age tracking

**Documentation**: [field/README.md](./field/README.md)

**Example**:
```typescript
import { FieldEntry, FieldType } from '@game/core';

const fire = new FieldEntry({
  type: 'fd_fire',
  intensity: 2,
  age: 0,
  decayTime: 50,
  isAlive: true,
});
```

### Trap System

**Location**: `src/trap/`

Manages trap types and their mechanics.

**Key Classes**:
- `Trap`: Trap data class
- `TrapData`: Trap storage manager
- `TrapParser`: JSON parser
- `TrapLoader`: Data loader

**Features**:
- 20+ trap action types
- 20+ trap flags
- Detection mechanics
- Trigger mechanics
- Damage calculation
- Disarm mechanics

**Documentation**: [trap/README.md](./trap/README.md)

**Example**:
```typescript
import { Trap, TrapAction, TrapFlags } from '@game/core';

const crossbowTrap = new Trap({
  id: 'tr_crossbow',
  name: 'crossbow trap',
  description: 'A trap that fires bolts',
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
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test
```

## Usage

### Basic Import

```typescript
// Import from main package
import {
  Point,
  Tripoint,
  Terrain,
  Furniture,
  FieldEntry,
  Trap,
  // ... all exports
} from '@game/core';

// Or import from specific modules
import { Point, Tripoint } from '@game/core/coordinates';
import { Terrain } from '@game/core/terrain';
import { Furniture } from '@game/core/furniture';
```

### Creating Game Objects

```typescript
import { Point, Tripoint, Terrain, Furniture } from '@game/core';

// Create coordinates
const pos = Tripoint.from(100, 200, 0);

// Create terrain
const terrain = new Terrain({
  id: 1,
  name: 'grass',
  description: 'Wild grass',
  symbol: '"',
  color: 'green',
  moveCost: 2,
  coverage: 100,
  flags: new Set(['FLAT', 'TRANSPARENT']),
});

// Create furniture
const furniture = new Furniture({
  id: 1,
  name: 'chair',
  description: 'A wooden chair',
  symbol: '[',
  color: 'brown',
  moveCost: 0,
  flags: new Set(['TRANSPARENT']),
});
```

### Loading Game Data

```typescript
import { TerrainLoader, FurnitureLoader } from '@game/core';

async function loadGameData() {
  // Load terrain
  const terrainLoader = new TerrainLoader();
  await terrainLoader.loadFromUrl('/data/terrain.json');
  const terrain = terrainLoader.get(1);

  // Load furniture
  const furnitureLoader = new FurnitureLoader();
  await furnitureLoader.loadFromUrl('/data/furniture.json');
  const furniture = furnitureLoader.get('f_chair');
}
```

### Working with Coordinates

```typescript
import { Point, Tripoint, mapToSubmap } from '@game/core';

// Create positions
const player = Point.from(50, 100);
const enemy = Point.from(60, 110);

// Calculate distance
const distance = player.manhattanDistanceTo(enemy);

// Move
const newPlayerPos = player.add({ x: 1, y: 0 });

// Convert scales
const mapPos = Tripoint.from(150, 200, 0);
const submapPos = mapToSubmap(mapPos);
```

### Game Mechanics

```typescript
import { Terrain, Trap } from '@game/core';

// Check terrain passability
const canWalk = terrain.moveCost > 0;
const isTransparent = terrain.flags.isTransparent();

// Trap detection and triggering
const isVisible = trap.isVisible(perception);
const triggers = trap.checkTrigger(weight, dodge);
const damage = trap.getDamage(weight);
```

## Shared Types

### ID Types

Used across all systems:

```typescript
import {
  TerrainId,      // number  - Terrain type identifier
  FurnitureId,    // number  - Furniture type identifier
  FieldTypeId,    // string  - Field type identifier
  TrapId,         // string  - Trap type identifier
} from '@game/core';
```

### Common Types

```typescript
import { ItemSpawn } from '@game/core';

// Item spawn configuration
const spawn: ItemSpawn = {
  item: 'rock',
  count: [1, 3],
  chance: 50,
};
```

## Data Format

All systems support loading from Cataclysm-DDA compatible JSON:

### Terrain JSON

```json
{
  "type": "terrain",
  "id": 1,
  "name": "floor",
  "description": "A wooden floor",
  "symbol": ".",
  "color": "brown",
  "move_cost": 2,
  "coverage": 100,
  "flags": ["FLAT", "TRANSPARENT"]
}
```

### Furniture JSON

```json
{
  "type": "furniture",
  "id": "f_chair",
  "name": "chair",
  "description": "A wooden chair",
  "symbol": "[",
  "color": "brown",
  "move_cost": 0,
  "flags": ["TRANSPARENT"]
}
```

### Field JSON

```json
{
  "type": "field",
  "id": "fd_fire",
  "name": "fire",
  "description": "Dangerous fire",
  "symbol": "^",
  "phase": "plasma",
  "half_life": 50,
  "intensity_levels": [
    { "name": "smoke", "intensity": 1, "symbol": "'", "color": "gray" },
    { "name": "fire", "intensity": 2, "symbol": "^", "color": "red" },
    { "name": "inferno", "intensity": 3, "symbol": "^", "color": "yellow" }
  ]
}
```

### Trap JSON

```json
{
  "type": "trap",
  "id": "tr_crossbow",
  "name": "crossbow trap",
  "description": "A trap that fires bolts",
  "symbol": "}",
  "color": "brown",
  "visibility": 2,
  "avoidance": 15,
  "difficulty": 6,
  "trap_radius": 0,
  "benign": false,
  "always_invisible": false,
  "trigger_weight": 10000,
  "action": "crossbow",
  "flags": ["HIDDEN", "CONSUMED"],
  "fun": 1,
  "complexity": 5
}
```

## Testing

The package uses Vitest for testing with comprehensive coverage.

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific module tests
pnpm test --terrain
pnpm test --furniture
pnpm test --field
pnpm test --trap
pnpm test --coordinates
```

### Test Structure

```
src/
├── coordinates/
│   └── __tests__/
│       ├── Point.test.ts
│       └── Tripoint.test.ts
├── terrain/
│   └── __tests__/
│       ├── terrain.test.ts
│       ├── integration.test.ts
│       └── test-data.json
├── furniture/
│   └── __tests__/
│       ├── furniture.test.ts
│       ├── integration.test.ts
│       └── test-data.json
├── field/
│   └── __tests__/
│       ├── field.test.ts
│       ├── integration.test.ts
│       └── test-data.json
└── trap/
    └── __tests__/
        ├── trap.test.ts
        ├── integration.test.ts
        └── test-data.json
```

## Development

### Building

```bash
# Build TypeScript
pnpm build

# Watch mode
pnpm build:watch

# Type checking only
pnpm build:check
```

### Linting

```bash
# Run ESLint
pnpm lint

# Fix issues
pnpm lint:fix

# Format code
pnpm format
```

### Validation

```bash
# Validate all exports work correctly
npx tsx src/validate-exports.ts
```

## API Reference

### Main Exports

```typescript
// Coordinates
export * from './coordinates';

// Terrain
export * from './terrain';

// Furniture
export * from './furniture';

// Field
export * from './field';

// Trap
export * from './trap';

// Shared types
export * from './types';
```

## Performance

### Immutable.js Benefits

- **Structural Sharing**: Efficient memory usage
- **Fast Updates**: O(log n) for most operations
- **Undo/Redo**: Easy state history
- **Thread Safety**: No concurrent modifications

### Optimization Tips

1. **Reuse Objects**: Create once, use many times
2. **Batch Updates**: Use `setMany()` when possible
3. **Lazy Loading**: Load data only when needed
4. **Cache Results**: Store frequently accessed data
5. **Use Appropriate Scale**: Work at lowest scale needed

## Dependencies

### Runtime Dependencies

```json
{
  "immutable": "^5.0.0",
  "rxjs": "^7.8.0"
}
```

### Development Dependencies

```json
{
  "typescript": "^5.3.0",
  "vitest": "^1.0.0",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0"
}
```

## Integration

### With UI Packages

The core package is used by:

- **@game/ui-graphics**: Graphical web interface
- **@game/ui-tty**: Terminal interface
- **@game/data-loader**: Game data loading utilities

### Example Integration

```typescript
// In UI package
import { Terrain, Furniture, Point } from '@game/core';

// Get terrain at position
function getTerrainAt(pos: Point): Terrain {
  // ... implementation
}

// Render tile
function renderTile(pos: Point) {
  const terrain = getTerrainAt(pos);
  const furniture = getFurnitureAt(pos);

  return {
    symbol: furniture ? furniture.symbol : terrain.symbol,
    color: furniture ? furniture.color : terrain.color,
  };
}
```

## Contributing

When adding new features:

1. **Start with Tests**: Write tests first (TDD)
2. **Use Immutable**: All data must be immutable
3. **Document**: Add JSDoc comments
4. **Example**: Add usage examples
5. **Type Safe**: Ensure full TypeScript coverage
6. **Test Data**: Include test data in `__tests__/test-data.json`

## Future Enhancements

Planned additions:

- **Item System**: Item types and properties
- **Creature System**: Monster/NPC data
- **Vehicle System**: Vehicle data and mechanics
- **Construction System**: Building mechanics
- **Crafting System**: Recipe system
- **Skill System**: Character skills
- **Map Generation**: Procedural generation

## License

MIT License - See LICENSE file for details

## Related Documentation

- [Coordinates System](./coordinates/README.md)
- [Terrain System](./terrain/README.md)
- [Furniture System](./furniture/README.md)
- [Field System](./field/README.md)
- [Trap System](./trap/README.md)
- [Export Conflicts Resolution](../docs/export-conflicts-resolution.md)

## Support

For issues, questions, or contributions, please visit the main project repository.
