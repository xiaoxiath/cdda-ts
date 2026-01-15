/**
 * Overmap 模块
 *
 * 管理大地图系统，包括 Overmap Terrain、Overmap、OvermapSpecial 等
 * 对应 Cataclysm-DDA 的 overmap 系统
 */

// 已有模块
export { OmTerrain, OmTerrainFlag, type OmTerrainJson } from './OmTerrain'
export { OmTerrainLoader } from './OmTerrainLoader'

// 核心类型
export {
  OMAPX,
  OMAPY,
  OVERMAP_LAYERS,
  OMT_TO_SUBMAP,
  OmVisionLevel,
  OmDirection,
  RadioType,
} from './types'

export type {
  PointOMT,
  TripointOMT,
  PointAbsOM,
  TripointAbsOMT,
  OmNote,
  OmExtra,
  OvermapLayerProps,
  OvermapProps,
  RadioTower,
  CityInterface,
  OvermapSpecialJson,
  OvermapSpecialEntry,
  SpecialConnection,
  OvermapConnectionJson,
  ConnectionSubtype,
  OvermapLocationJson,
} from './types'

// 核心类
export { Overmap } from './Overmap'
export { OvermapLayer } from './OvermapLayer'
export { City } from './City'
export { OvermapBuffer } from './OvermapBuffer'
export { OvermapGenerator } from './OvermapGenerator'
export { OvermapSpecial } from './OvermapSpecial'
export { OvermapConnection } from './OvermapConnection'
export { OvermapLocation } from './OvermapLocation'
