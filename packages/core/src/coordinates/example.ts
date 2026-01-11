#!/usr/bin/env tsx
/**
 * Coordinate System Example
 *
 * This example demonstrates the coordinate system functionality including:
 * - Point and Tripoint creation
 * - Arithmetic operations
 * - Distance calculations
 * - Coordinate scale conversions
 * - Z-axis operations
 */

import { Point, Tripoint } from './Point';
import {
  mapToSubmap,
  submapToMap,
  inSubmapLocal,
  mapToOmt,
  omtToMap,
  CoordinateConverter,
  SCALE_CONSTANTS,
} from './conversions';

// Example 1: Creating Points
console.log('=== Example 1: Creating Points ===\n');

const p1 = Point.from(5, 10);
const p2 = Point.from(15, 25);
const origin = Point.origin();

console.log('Points created:');
console.log(`  p1: ${p1.toString()}`);
console.log(`  p2: ${p2.toString()}`);
console.log(`  origin: ${origin.toString()}`);
console.log();

// Example 2: Point Arithmetic
console.log('=== Example 2: Point Arithmetic ===\n');

console.log(`p1: ${p1.toString()}, p2: ${p2.toString()}`);

const sum = p1.add({ x: p2.x, y: p2.y });
console.log(`  p1 + p2 = ${sum.toString()}`);

const diff = p2.subtract({ x: p1.x, y: p1.y });
console.log(`  p2 - p1 = ${diff.toString()}`);

const scaled = p1.multiply(3);
console.log(`  p1 * 3 = ${scaled.toString()}`);

const divided = p2.divide(5);
console.log(`  p2 / 5 = ${divided.toString()} (floor division)`);
console.log();

// Example 3: Distance Calculations
console.log('=== Example 3: Distance Calculations ===\n');

const pointA = Point.from(0, 0);
const pointB = Point.from(3, 4);

console.log(`pointA: ${pointA.toString()}, pointB: ${pointB.toString()}`);

const manhattan = pointA.manhattanDistanceTo(pointB);
console.log(`  Manhattan distance: ${manhattan}`);
console.log(`    (|3-0| + |4-0| = ${manhattan})`);

const euclidean = pointA.euclideanDistanceTo(pointB);
console.log(`  Euclidean distance: ${euclidean.toFixed(2)}`);
console.log(`    (sqrt(3² + 4²) = ${euclidean.toFixed(2)})`);

const chebyshev = pointA.chebyshevDistanceTo(pointB);
console.log(`  Chebyshev distance: ${chebyshev}`);
console.log(`    (max(|3-0|, |4-0|) = ${chebyshev})`);
console.log();

// Example 4: Creating Tripoints
console.log('=== Example 4: Creating Tripoints ===\n');

const t1 = Tripoint.from(5, 10, -3);
const t2 = Tripoint.from(15, 25, 2);
const tOrigin = Tripoint.origin();

console.log('Tripoints created:');
console.log(`  t1: ${t1.toString()}`);
console.log(`  t2: ${t2.toString()}`);
console.log(`  tOrigin: ${tOrigin.toString()}`);
console.log();

// From Point
const point3D = Point.from(8, 13);
const fromPoint = Tripoint.fromPoint(point3D, 1);
console.log(`  From Point ${point3D.toString()} with z=1: ${fromPoint.toString()}`);
console.log();

// Example 5: Tripoint Arithmetic
console.log('=== Example 5: Tripoint Arithmetic ===\n');

console.log(`t1: ${t1.toString()}, t2: ${t2.toString()}`);

const tSum = t1.add({ x: t2.x, y: t2.y, z: t2.z });
console.log(`  t1 + t2 = ${tSum.toString()}`);

const tDiff = t2.subtract({ x: t1.x, y: t1.y, z: t1.z });
console.log(`  t2 - t1 = ${tDiff.toString()}`);

const tScaled = t1.multiply(2);
console.log(`  t1 * 2 = ${tScaled.toString()}`);

const tDivided = t2.divide(5);
console.log(`  t2 / 5 = ${tDivided.toString()}`);
console.log();

// Example 6: Modulo Operation (Coordinate Wrapping)
console.log('=== Example 6: Modulo Operation ===\n');

const wrappedPos = Tripoint.from(-5, 25, 13);
console.log(`Position before mod: ${wrappedPos.toString()}`);

const wrapped = wrappedPos.mod(12);
console.log(`Position after mod(12): ${wrapped.toString()}`);
console.log(`  (-5 → 7, 25 → 1, 13 → 1)`);
console.log();

// Example 7: 3D Distance Calculations
console.log('=== Example 7: 3D Distance Calculations ===\n');

const underground = Tripoint.from(50, 50, -2);
const rooftop = Tripoint.from(55, 55, 3);

console.log(`underground: ${underground.toString()}`);
console.log(`rooftop: ${rooftop.toString()}`);

const tManhattan = underground.manhattanDistanceTo(rooftop);
console.log(`  Manhattan distance: ${tManhattan}`);
console.log(`    (|55-50| + |55-50| + |3-(-2)| = ${tManhattan})`);

const tEuclidean = underground.euclideanDistanceTo(rooftop);
console.log(`  Euclidean distance: ${tEuclidean.toFixed(2)}`);
console.log(`    (sqrt(5² + 5² + 5²) = ${tEuclidean.toFixed(2)})`);
console.log();

// Example 8: Coordinate Scale Constants
console.log('=== Example 8: Coordinate Scale Constants ===\n');

console.log('Scale constants:');
console.log(`  SUBMAP_SIZE: ${SCALE_CONSTANTS.SUBMAP_SIZE} tiles`);
console.log(`  SUBMAP_SIZE_2: ${SCALE_CONSTANTS.SUBMAP_SIZE_2} tiles (2×2 submaps)`);
console.log(`  OMT_TO_SUBMAP: ${SCALE_CONSTANTS.OMT_TO_SUBMAP}`);
console.log(`  SEGMENT_SIZE: ${SCALE_CONSTANTS.SEGMENT_SIZE} OMTs`);
console.log(`  OVERMAP_SIZE: ${SCALE_CONSTANTS.OVERMAP_SIZE} OMTs`);
console.log(`  OVERMAP_LAYERS: ${SCALE_CONSTANTS.OVERMAP_LAYERS} layers`);
console.log(`  MAPSIZE (reality bubble): ${SCALE_CONSTANTS.MAPSIZE} submaps`);
console.log();

// Example 9: Map to Submap Conversion
console.log('=== Example 9: Map to Submap Conversion ===\n');

const mapPos = Tripoint.from(150, 200, 0);
console.log(`Map position: ${mapPos.toString()}`);

const submapPos = mapToSubmap(mapPos);
console.log(`  In submap coordinates: ${submapPos.toString()}`);
console.log(`    (150/12 = ${submapPos.x}, 200/12 = ${submapPos.y})`);

const localPos = inSubmapLocal(mapPos);
console.log(`  Local within submap: ${localPos.toString()}`);
console.log(`    (150%12 = ${localPos.x}, 200%12 = ${localPos.y})`);

const backToMap = submapToMap(submapPos);
console.log(`  Back to map: ${backToMap.toString()}`);
console.log(`    (Note: loses local position info)`);
console.log();

// Example 10: Map to OMT Conversion
console.log('=== Example 10: Map to OMT Conversion ===\n');

const mapPos2 = Tripoint.from(500, 600, 0);
console.log(`Map position: ${mapPos2.toString()}`);

const omtPos = mapToOmt(mapPos2);
console.log(`  In OMT coordinates: ${omtPos.toString()}`);
console.log(`    (500/24 = ${omtPos.x}, 600/24 = ${omtPos.y})`);

const backToMap2 = omtToMap(omtPos);
console.log(`  Back to map: ${backToMap2.toString()}`);
console.log();

// Example 11: Reality Bubble Conversion
console.log('=== Example 11: Reality Bubble Conversion ===\n');

// Reality bubble is 11×11 submaps centered on player
const absSub = Tripoint.from(10, 15, 0);  // Submap in world coordinates
const bubPos = Tripoint.from(5, 8, 0);    // Position within reality bubble

console.log(`Bubble submap: ${absSub.toString()}`);
console.log(`Position in bubble: ${bubPos.toString()}`);

const absPos = CoordinateConverter.bubToAbs(bubPos, absSub);
console.log(`  Absolute world position: ${absPos.toString()}`);
console.log(`    (${absSub.x}*12 + ${bubPos.x}, ${absSub.y}*12 + ${bubPos.y})`);
console.log(`    = (${absSub.x * 12 + bubPos.x}, ${absSub.y * 12 + bubPos.y})`);

const backToBub = CoordinateConverter.absToBub(absPos, absSub);
console.log(`  Back to bubble: ${backToBub.toString()}`);
console.log();

// Example 12: Practical Use Case - Finding Adjacent Tiles
console.log('=== Example 12: Finding Adjacent Tiles ===\n');

const center = Point.from(50, 50);
console.log(`Center tile: ${center.toString()}`);

const adjacent = [
  center.add({ x: 0, y: -1 }),
  center.add({ x: 1, y: -1 }),
  center.add({ x: 1, y: 0 }),
  center.add({ x: 1, y: 1 }),
  center.add({ x: 0, y: 1 }),
  center.add({ x: -1, y: 1 }),
  center.add({ x: -1, y: 0 }),
  center.add({ x: -1, y: -1 }),
];

console.log('  Adjacent tiles (N, NE, E, SE, S, SW, W, NW):');
adjacent.forEach((pos, i) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  console.log(`    ${directions[i].padStart(2)}: ${pos.toString()}`);
});
console.log();

// Example 13: Practical Use Case - Movement Cost
console.log('=== Example 13: Movement Cost Calculation ===\n');

const start = Point.from(10, 10);
const end = Point.from(15, 15);

console.log(`Start: ${start.toString()}, End: ${end.toString()}`);

const gridDist = start.manhattanDistanceTo(end);
console.log(`  Grid movement cost: ${gridDist} moves`);

const straightDist = start.euclideanDistanceTo(end);
console.log(`  Straight-line distance: ${straightDist.toFixed(2)} tiles`);

const diagDist = start.chebyshevDistanceTo(end);
console.log(`  Diagonal movement: ${diagDist} moves`);
console.log();

// Example 14: Multi-Level Building
console.log('=== Example 14: Multi-Level Building ===\n');

const buildingBase = Tripoint.from(100, 100, 0);
const buildingFloors = [
  buildingBase,
  buildingBase.add({ z: 1 }),
  buildingBase.add({ z: 2 }),
  buildingBase.add({ z: -1 }),
];

console.log('Building floors:');
buildingFloors.forEach((floor, i) => {
  const names = ['Basement', 'Ground Floor', '1st Floor', '2nd Floor'];
  console.log(`  ${names[i]}: ${floor.toString()}`);
});
console.log();

// Example 15: Area Bounds
console.log('=== Example 15: Area Bounds ===\n');

const bounds = {
  min: Point.from(0, 0),
  max: Point.from(180, 180),
};

console.log(`Map bounds: ${bounds.min.toString()} to ${bounds.max.toString()}`);

const testPoints = [
  Point.from(90, 90),   // Inside
  Point.from(-10, 50),  // Outside (negative)
  Point.from(200, 150), // Outside (too large)
];

console.log('Point positions:');
testPoints.forEach((pos) => {
  const inBounds =
    pos.x >= bounds.min.x &&
    pos.x <= bounds.max.x &&
    pos.y >= bounds.min.y &&
    pos.y <= bounds.max.y;

  console.log(`  ${pos.toString().padStart(12)}: ${inBounds ? 'IN BOUNDS' : 'OUT OF BOUNDS'}`);
});
console.log();

// Example 16: Conversion Between Point and Tripoint
console.log('=== Example 16: Point ↔ Tripoint Conversion ===\n');

const point2d = Point.from(25, 40);
const trip = Tripoint.fromPoint(point2d, -2);
const backToPoint = trip.toPoint();

console.log('2D → 3D → 2D conversion:');
console.log(`  Original Point: ${point2d.toString()}`);
console.log(`  To Tripoint with z=-2: ${trip.toString()}`);
console.log(`  Back to Point: ${backToPoint.toString()}`);
console.log(`  Preserved: ${point2d.x === backToPoint.x && point2d.y === backToPoint.y ? 'YES' : 'NO'}`);
console.log();

// Example 17: Large Distance Calculation
console.log('=== Example 17: Large Distance Calculation ===\n');

const cityA = Point.from(0, 0);
const cityB = Point.from(150, 75);

console.log(`City A: ${cityA.toString()}, City B: ${cityB.toString()}`);

const travelDistance = cityA.manhattanDistanceTo(cityB);
console.log(`  Travel distance (grid): ${travelDistance} tiles`);

const asTheCrowFlies = cityA.euclideanDistanceTo(cityB);
console.log(`  As the crow flies: ${asTheCrowFlies.toFixed(2)} tiles`);
console.log();

// Example 18: Coordinate Arrays
console.log('=== Example 18: Coordinate Arrays ===\n');

const t = Tripoint.from(10, 20, -5);
console.log(`Tripoint: ${t.toString()}`);

const arr = t.toArray();
console.log(`  As array: [${arr.join(', ')}]`);

const json = t.toJSON();
console.log(`  As JSON: ${JSON.stringify(json)}`);

// Recreate from array
const recreated = Tripoint.from(...arr);
console.log(`  Recreated: ${recreated.toString()}`);
console.log();

// Example 19: Practical Map Operations
console.log('=== Example 19: Practical Map Operations ===\n');

const playerPos = Tripoint.from(500, 600, 0);

// Which submap is this in?
const playerSubmap = mapToSubmap(playerPos);
console.log(`Player at: ${playerPos.toString()}`);
console.log(`  In submap: ${playerSubmap.toString()}`);

// Which OMT is this in?
const playerOMT = mapToOmt(playerPos);
console.log(`  In OMT: ${playerOMT.toString()}`);

// Local position in submap
const playerLocal = inSubmapLocal(playerPos);
console.log(`  Local in submap: ${playerLocal.toString()}`);
console.log();

// Example 20: Z-Axis Operations
console.log('=== Example 20: Z-Axis Operations ===\n');

const surface = Tripoint.from(100, 100, 0);
const deep = Tripoint.from(100, 100, -10);
const sky = Tripoint.from(100, 100, 10);

console.log('Z-axis positions:');
console.log(`  Surface: ${surface.toString()}`);
console.log(`  Deep underground: ${deep.toString()}`);
console.log(`  High in sky: ${sky.toString()}`);

const depth = surface.manhattanDistanceTo(deep);
const height = surface.manhattanDistanceTo(sky);
console.log(`\nVertical distance surface → deep: ${depth} levels`);
console.log(`Vertical distance surface → sky: ${height} levels`);

const totalDepth = deep.manhattanDistanceTo(sky);
console.log(`Total vertical range (deep → sky): ${totalDepth} levels`);
console.log();

console.log('=== Examples Complete ===');
