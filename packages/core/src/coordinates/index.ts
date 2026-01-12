export { Point } from './Point';
export { Tripoint } from './Tripoint';
export { mapToSubmap, submapToMap, inSubmapLocal, mapToOmt, omtToMap, CoordinateConverter } from './conversions';
export { CoordinateScale, SCALE_CONSTANTS, TerrainId, FurnitureId, FieldTypeId, TrapId } from './types';

// 螺旋搜索工具
export {
  rectangleSize,
  findPointClosestFirst,
  findPointClosestFirstMax,
  closestPointsFirst,
  closestPointsFirstRange,
} from './spiral';

// 哈希工具
export {
  hashPoint,
  hashTripoint,
  pointKey,
  tripointKey,
  pointFromKey,
  tripointFromKey,
  PointMap,
  TripointMap,
  PointSet,
  TripointSet,
} from './hash';

// Re-export ID types for convenience
export type { PointProps } from './Point';
export type { TripointProps } from './Tripoint';
