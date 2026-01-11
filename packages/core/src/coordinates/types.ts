/**
 * 坐标系统常量
 */

/**
 * 坐标比例尺枚举
 */
export enum CoordinateScale {
  MapSquare = 'map_square',
  Submap = 'submap',
  OvermapTerrain = 'omt',
  Segment = 'segment',
  Overmap = 'overmap',
}

/**
 * 坐标比例尺常量
 */
export const SCALE_CONSTANTS = {
  /** Submap 尺寸（方块数） */
  SUBMAP_SIZE: 12,

  /** 2x2 Submaps（用于 OMT） */
  SUBMAP_SIZE_2: 24,

  /** 1 OMT = 2 Submaps */
  OMT_TO_SUBMAP: 2,

  /** 段大小（OMT 数） */
  SEGMENT_SIZE: 32,

  /** Overmap 尺寸（OMT 数） */
  OVERMAP_SIZE: 180,

  /** 总层数（1 地面 + 10 地下 + 10 天空） */
  OVERMAP_LAYERS: 21,

  /** 现实气泡大小（Submap 数） */
  MAPSIZE: 11,
} as const;

/**
 * 地形 ID 类型
 */
export type TerrainId = number;

/**
 * 家具 ID 类型
 */
export type FurnitureId = number;

/**
 * 场类型 ID
 */
export type FieldTypeId = string;

/**
 * 陷阱 ID 类型
 */
export type TrapId = string;
