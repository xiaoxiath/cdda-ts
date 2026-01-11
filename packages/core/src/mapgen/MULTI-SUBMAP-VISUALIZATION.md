# Multi-Submap Generation Visualization

## Overview

Large Cataclysm-DDA mapgens (bigger than 12x12) are automatically split into multiple 12x12 submaps.

## Grid Layout Example: 24x24 Mapgen

```
┌─────────────┬─────────────┐
│  Submap (0,0)  │  Submap (1,0)  │
│   Tiles 0-11   │   Tiles 12-23  │
├─────────────┼─────────────┤
│  Submap (0,1)  │  Submap (1,1)  │
│   Tiles 12-23  │   Tiles 24-35  │
└─────────────┴─────────────┘
```

## Coordinate Mapping

### Mapgen Coordinates → Submap Coordinates

**Example**: Item at mapgen position (18, 5)

- **Mapgen size**: 24x24
- **Submap size**: 12x12
- **Grid calculation**:
  - `gridX = floor(18 / 12) = 1`
  - `gridY = floor(5 / 12) = 0`
  - → Item is in Submap (1,0)

- **Local coordinates**:
  - `localX = 18 % 12 = 6`
  - `localY = 5 % 12 = 5`
  - → Item position within submap: (6, 5)

### Submap Grid Formulas

```typescript
// Calculate which submap a mapgen coordinate belongs to
gridX = Math.floor(mapgenX / SUBMAP_SIZE)
gridY = Math.floor(mapgenY / SUBMAP_SIZE)

// Calculate local position within that submap
localX = mapgenX % SUBMAP_SIZE
localY = mapgenY % SUBMAP_SIZE
```

## Examples

### 24x24 House (2storyModern01_basement)

```
Total: 24x24 tiles
Grid: 2x2 submaps
Submaps: 4 total

Submap Layout:
[0,0] [1,0]
[0,1] [1,1]

Statistics:
┌──────────┬──────────┬─────────┬───────────┬─────────┐
│ Submap   │ Grid     │ Items   │ Furniture │ Total   │
├──────────┼──────────┼─────────┼───────────┼─────────┤
│ #0       │ (0,0)    │ 0       │ 0         │ 0       │
│ #1       │ (1,0)    │ 1       │ 6         │ 7       │
│ #2       │ (0,1)    │ 0       │ 0         │ 0       │
│ #3       │ (1,1)    │ 0       │ 2         │ 2       │
└──────────┴──────────┴─────────┴───────────┴─────────┘
```

### 24x48 Parking Lot (sugar_house_parking)

```
Total: 24x48 tiles
Grid: 2x4 submaps
Submaps: 8 total

Submap Layout:
[0,0] [1,0]
[0,1] [1,1]
[0,2] [1,2]
[0,3] [1,3]
```

## Spawn Distribution

Items and monsters are automatically placed in the correct submap based on their coordinates:

**Example**:
```
Mapgen: 24x24
Item placements:
  - potion at (5, 5)   → Submap (0,0), local (5, 5)
  - sword at (18, 18)  → Submap (1,1), local (6, 6)
  - gold at (3, 20)    → Submap (0,1), local (3, 8)
```

## Implementation Details

### generateMultiple() Method

```typescript
const result = generator.generateMultiple(context);

// Returns:
{
  submaps: [
    { submap: Submap, position: { gridX: 0, gridY: 0, globalPosition } },
    { submap: Submap, position: { gridX: 1, gridY: 0, globalPosition } },
    { submap: Submap, position: { gridX: 0, gridY: 1, globalPosition } },
    { submap: Submap, position: { gridX: 1, gridY: 1, globalPosition } },
  ],
  generatorId: 'mapgen_id',
  mapgenWidth: 24,
  mapgenHeight: 24,
  submapGridWidth: 2,
  submapGridHeight: 2,
  timestamp: 1234567890
}
```

### Tile Range Processing

Each submap is generated independently:

```typescript
// For Submap (gridX=1, gridY=0):
startX = gridX * 12 = 12
startY = gridY * 12 = 0
endX = Math.min(12 + 12, 24) = 24
endY = Math.min(0 + 12, 24) = 12

// Process only tiles in range [12,24) x [0,12)
for (let my = 0; my < 12; my++) {
  for (let mx = 12; mx < 24; mx++) {
    const tile = mapgen.rows[my][mx]
    const localX = mx - 12  // 0-11
    const localY = my       // 0-11
    submap.setTile(localX, localY, tile)
  }
}
```

## Benefits

1. **Automatic Splitting**: Large mapgens are automatically divided into appropriate number of submaps
2. **Coordinate Translation**: Mapgen coordinates are correctly translated to submap-local coordinates
3. **Spawn Distribution**: Items and monsters are placed in the correct submap based on their position
4. **Backward Compatible**: Single submap generation still works via `generate()` method
5. **Scalable**: Works for any mapgen size (12x12, 24x24, 24x48, etc.)

## Test Results

```
Test Files: 34 passed (34)
Tests: 639 passed (639)
```

All multi-submap tests pass, including:
- 24x24 → 2x2 grid
- 24x48 → 2x4 grid
- Item distribution across submaps
- Real Cataclysm-DDA house mapgens
