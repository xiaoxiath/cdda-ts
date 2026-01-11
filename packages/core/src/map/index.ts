/**
 * Map 模块导出
 */

// 数据结构
export { MapTile } from './MapTile';
export { MapTileSoa } from './MapTileSoa';
export { Submap, SUBMAP_SIZE } from './Submap';
export { GameMap, MAPSIZE, MAP_SIZE_X, MAP_SIZE_Y, OVERMAP_LAYERS, posToSubmap } from './GameMap';
export { MapBuffer } from './MapBuffer';
export { LevelCache, TransparencyCache } from './MapCache';

// 类型
export type { MapTileProps } from './MapTile';
export type { SubmapProps, SpawnPoint, PartialConstruction } from './Submap';
export type { GameMapProps } from './GameMap';
export type { MapBufferProps } from './MapBuffer';
export type { LevelCacheProps, TransparencyCacheProps } from './MapCache';
