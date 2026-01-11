# Coordinate System

The coordinate system provides a strongly-typed, immutable framework for handling positions in the game world at multiple scales. This system is inspired by Cataclysm-DDA's coordinate architecture.

## Architecture

### Core Classes

- **Point**: Immutable 2D point using Immutable.js Record
- **Tripoint**: Immutable 3D point extending Point with Z-axis support
- **CoordinateConverter**: Utility class for converting between coordinate scales
- **SCALE_CONSTANTS**: Constants defining size relationships between scales

### Coordinate Scales

The game uses multiple coordinate scales for different purposes:

| Scale | Description | Size | Usage |
|-------|-------------|------|-------|
| **Map Square** | Smallest unit | 1 tile | Individual map tiles |
| **Submap** | Local map chunk | 12×12 tiles | Map generation/storage |
| **OMT** (Overmap Terrain) | Overmap tile | 2×2 Submaps (24×24 tiles) | Overmap generation |
| **Segment** | Map region | 32×32 OMTs | World generation |
| **Overmap** | Full map | 180×180 OMTs | World storage |

### Z-Axis (Vertical Coordinate)

- **Range**: -10 to +10 (21 total layers)
- **0**: Ground level
- **-1 to -10**: Underground levels (floors below)
- **+1 to +10**: Above ground (roofs, flying, etc.)

## Features

### Point Class

Immutable 2D coordinate with comprehensive operations.

#### Creation

```typescript
import { Point } from './coordinates';

// Create from coordinates
const p1 = Point.from(5, 10);

// Create origin
const origin = Point.origin();

// Create with constructor
const p2 = new Point({ x: 3, y: 7 });
```

#### Operations

```typescript
const p1 = Point.from(5, 10);
const p2 = Point.from(2, 3);

// Arithmetic
p1.add({ x: 1, y: 2 });      // Point(6, 12)
p1.subtract({ x: 1, y: 2 }); // Point(4, 8)
p1.multiply(2);              // Point(10, 20)
p1.divide(2);                // Point(2, 5) - uses floor division

// Distance calculations
p1.manhattanDistanceTo(p2);  // |5-2| + |10-3| = 10
p1.euclideanDistanceTo(p2);  // sqrt(3² + 7²) ≈ 7.62
p1.chebyshevDistanceTo(p2);   // max(|5-2|, |10-3|) = 7
```

#### Distance Metrics

- **Manhattan Distance**: |x1-x2| + |y1-y2| (grid movement)
- **Euclidean Distance**: √((x1-x2)² + (y1-y2)²) (straight line)
- **Chebyshev Distance**: max(|x1-x2|, |y1-y2|) (king's move in chess)

#### Conversion

```typescript
const p = Point.from(5, 10);

p.toString();          // "(5, 10)"
p.toArray();           // [5, 10]
p.toJSON();            // { x: 5, y: 10 }
```

### Tripoint Class

Immutable 3D coordinate extending Point with Z-axis support.

#### Creation

```typescript
import { Tripoint } from './coordinates';
import { Point } from './coordinates';

// Create from coordinates
const t1 = Tripoint.from(5, 10, -3);

// Create with default z=0
const t2 = Tripoint.from(5, 10);

// Create origin
const origin = Tripoint.origin();

// Create from Point
const p = Point.from(5, 10);
const t3 = Tripoint.fromPoint(p, 2);

// Create with constructor
const t4 = new Tripoint({ x: 3, y: 7, z: -1 });
```

#### Operations

```typescript
const t1 = Tripoint.from(5, 10, -3);
const t2 = Tripoint.from(2, 3, 1);

// Arithmetic
t1.add({ x: 1, y: 2, z: 1 });      // Tripoint(6, 12, -2)
t1.subtract({ x: 1, y: 2, z: 1 }); // Tripoint(4, 8, -4)
t1.multiply(2);                     // Tripoint(10, 20, -6)
t1.divide(2);                       // Tripoint(2, 5, -2) - floor division
t1.mod(12);                         // Tripoint(5, 10, 9) - wraps negative

// Distance calculations (3D versions)
t1.manhattanDistanceTo(t2);  // |5-2| + |10-3| + |-3-1| = 14
t1.euclideanDistanceTo(t2);  // sqrt(3² + 7² + 4²) ≈ 8.62
t1.chebyshevDistanceTo(t2);  // max(3, 7, 4) = 7

// Convert to 2D
t1.toPoint();  // Point(5, 10)
```

#### Modulo Operation

The `mod()` method handles wrapping for circular coordinates:

```typescript
const t = Tripoint.from(-5, 25, 13);
t.mod(12);  // Tripoint(7, 1, 1) - wraps to positive
```

This is essential for map edge wrapping.

### Coordinate Conversion

#### Constants

```typescript
import { SCALE_CONSTANTS } from './coordinates';

SCALE_CONSTANTS.SUBMAP_SIZE;      // 12
SCALE_CONSTANTS.SUBMAP_SIZE_2;    // 24 (2x2 submaps)
SCALE_CONSTANTS.OMT_TO_SUBMAP;    // 2
SCALE_CONSTANTS.SEGMENT_SIZE;     // 32 OMTs
SCALE_CONSTANTS.OVERMAP_SIZE;     // 180 OMTs
SCALE_CONSTANTS.OVERMAP_LAYERS;   // 21 layers
SCALE_CONSTANTS.MAPSIZE;          // 11 submaps (reality bubble)
```

#### Conversion Functions

```typescript
import {
  mapToSubmap,
  submapToMap,
  inSubmapLocal,
  mapToOmt,
  omtToMap,
  CoordinateConverter
} from './coordinates';

// Map square ↔ Submap
const mapPos = Tripoint.from(30, 45, 0);
const submapPos = mapToSubmap(mapPos);     // Tripoint(2, 3, 0)
const backToMap = submapToMap(submapPos);  // Tripoint(24, 36, 0)

// Local position within submap
const local = inSubmapLocal(mapPos);       // Tripoint(6, 9, 0)

// Map square ↔ OMT
const omtPos = mapToOmt(mapPos);           // Tripoint(1, 1, 0)
const backToMap2 = omtToMap(omtPos);       // Tripoint(24, 24, 0)
```

#### CoordinateConverter Class

```typescript
// Reality bubble ↔ Absolute coordinates
const absSub = Tripoint.from(10, 15, 0);  // Submap coordinate in reality bubble
const bubPos = Tripoint.from(5, 8, 0);    // Position within reality bubble

// Convert bubble position to absolute world position
const absPos = CoordinateConverter.bubToAbs(bubPos, absSub);
// Result: Tripoint(125, 188, 0) = (10*12 + 5, 15*12 + 8, 0)

// Convert absolute to bubble position
const backToBub = CoordinateConverter.absToBub(absPos, absSub);
// Result: Tripoint(5, 8, 0)
```

## Usage Patterns

### Basic Position Tracking

```typescript
import { Point, Tripoint } from './coordinates';

// Track player position on a single level
const playerPos = Point.from(50, 100);

// Track creature position across levels
const creaturePos = Tripoint.from(75, 120, -2); // Underground
```

### Movement

```typescript
// Move player
const newPos = playerPos.add({ x: 1, y: 0 });  // Move right

// Move creature down a level
const newCreaturePos = creaturePos.add({ z: -1 });

// Move with direction vector
const direction = { x: -1, y: 1 };
const moved = currentPos.add(direction);
```

### Distance Calculations

```typescript
const player = Point.from(10, 10);
const enemy = Point.from(15, 15);

// Grid movement distance (Manhattan)
const gridDist = player.manhattanDistanceTo(enemy);  // 10

// Straight-line distance (Euclidean)
const straightDist = player.euclideanDistanceTo(enemy);  // ≈7.07

// Diagonal movement distance (Chebyshev)
const diagDist = player.chebyshevDistanceTo(enemy);  // 5
```

### Map Operations

```typescript
// Convert map position to submap coordinates
const mapPos = Tripoint.from(150, 200, 0);
const submapPos = mapToSubmap(mapPos);  // Tripoint(12, 16, 0)

// Get local position within submap
const localPos = inSubmapLocal(mapPos);  // Tripoint(6, 8, 0)

// Calculate which submap contains a position
const submapX = Math.floor(mapPos.x / 12);
const submapY = Math.floor(mapPos.y / 12);
```

### Multi-Level Structures

```typescript
// Building with multiple floors
const groundFloor = Tripoint.from(100, 100, 0);
const firstFloor = Tripoint.from(100, 100, 1);
const basement = Tripoint.from(100, 100, -1);

// Vertical distance between floors
const verticalDist = firstFloor.manhattanDistanceTo(groundFloor);  // 1
```

### Area Calculations

```typescript
// Define area bounds
const topLeft = Point.from(10, 10);
const bottomRight = Point.from(20, 15);

const width = bottomRight.x - topLeft.x;   // 10
const height = bottomRight.y - topLeft.y;  // 5
const area = width * height;               // 50

// Check if point is in rectangle
const point = Point.from(15, 12);
const inBounds =
  point.x >= topLeft.x &&
  point.x <= bottomRight.x &&
  point.y >= topLeft.y &&
  point.y <= bottomRight.y;  // true
```

### Coordinate Wrapping

```typescript
// Wrap coordinates for circular maps
const pos = Tripoint.from(-5, 25, 0);
const wrapped = pos.mod(12);  // Tripoint(7, 1, 0)

// Useful for map edge wrapping
const mapWidth = 180;
const wrappedX = ((pos.x % mapWidth) + mapWidth) % mapWidth;
```

## Type System

### ID Types

The coordinate system defines ID types used across all game systems:

```typescript
import {
  TerrainId,      // number  - Terrain type identifier
  FurnitureId,    // number  - Furniture type identifier
  FieldTypeId,    // string  - Field type identifier
  TrapId,         // string  - Trap type identifier
} from './coordinates';
```

These types are re-exported by terrain, furniture, field, and trap modules for convenience.

## Coordinate Scale Enums

```typescript
import { CoordinateScale } from './coordinates';

enum CoordinateScale {
  MapSquare = 'map_square',      // Individual tiles
  Submap = 'submap',              // 12×12 tiles
  OvermapTerrain = 'omt',         // 24×24 tiles
  Segment = 'segment',            // 32×32 OMTs
  Overmap = 'overmap',            // 180×180 OMTs
}
```

## Immutability

All coordinate classes use Immutable.js Record:

```typescript
const p1 = Point.from(5, 10);
const p2 = p1.add({ x: 1, y: 0 });

// p1 remains unchanged
console.log(p1.x);  // 5

// p2 is a new instance
console.log(p2.x);  // 6
```

This ensures:
- **Predictable state**: Coordinates never change unexpectedly
- **Easy undo/redo**: Keep previous coordinate states
- **Thread safety**: No concurrent modification issues
- **Performance**: Efficient structural sharing

## Performance Considerations

1. **Structural Sharing**: Immutable.js reuses unchanged data
2. **Lazy Evaluation**: Convert only when needed
3. **Cache Results**: Store converted coordinates if used repeatedly
4. **Use Appropriate Scale**: Work at the lowest scale needed

## Common Patterns

### Finding Adjacent Tiles

```typescript
const center = Point.from(10, 10);
const adjacent = [
  center.add({ x: 0, y: -1 }),  // North
  center.add({ x: 1, y: -1 }),  // Northeast
  center.add({ x: 1, y: 0 }),   // East
  center.add({ x: 1, y: 1 }),   // Southeast
  center.add({ x: 0, y: 1 }),   // South
  center.add({ x: -1, y: 1 }),  // Southwest
  center.add({ x: -1, y: 0 }),  // West
  center.add({ x: -1, y: -1 }), // Northwest
];
```

### Bounding Box Check

```typescript
function isInBounds(
  pos: Point,
  min: Point,
  max: Point
): boolean {
  return (
    pos.x >= min.x &&
    pos.x <= max.x &&
    pos.y >= min.y &&
    pos.y <= max.y
  );
}

const bounds = {
  min: Point.from(0, 0),
  max: Point.from(180, 180),
};

const pos = Point.from(90, 90);
isInBounds(pos, bounds.min, bounds.max);  // true
```

### Path Distance

```typescript
// Calculate path cost (Manhattan distance)
const start = Point.from(0, 0);
const end = Point.from(10, 20);
const pathCost = start.manhattanDistanceTo(end);  // 30 moves
```

## Testing

Run coordinate system tests:

```bash
# Unit tests
pnpm test coordinates

# Specific class tests
pnpm test Point.test.ts
pnpm test Tripoint.test.ts
```

## Examples

See `packages/core/src/coordinates/example.ts` for complete examples.

## Related Modules

- **Terrain**: Uses coordinates for placement
- **Furniture**: Uses coordinates for placement
- **Field**: Uses coordinates for placement
- **Trap**: Uses coordinates for placement

## Future Enhancements

- Direction type (N, NE, E, SE, S, SW, W, NW)
- Rotation operations
- Line of sight calculations
- Pathfinding utilities
- Area selection helpers
