/**
 * Mapgen 模块导出
 *
 * 地图生成系统，用于生成游戏世界的 submap
 */

// 核心接口
export { MapGenFunction, createMapGenResult } from './MapGenFunction';
export type { MapGenContext, MapGenResult, MapGenConfig } from './MapGenFunction';

// 生成数据
export { MapGenData, createMapGenDataFromJson, createEmptyMapGenData } from './MapGenData';
export type { MapGenPalette, MapTileData, FillRule, MapGenDataProps } from './MapGenData';

// JSON 生成器
export { MapGenJson } from './MapGenJson';
export type { MapGenJsonConfig, MapGenJsonProps } from './MapGenJson';

// 内置生成器
export {
  BUILTIN_GENERATORS,
  MapGenEmpty,
  MapGenGrass,
  MapGenForest,
  MapGenRoom,
  MapGenRoad,
  MapGenRandom,
  MapGenNoise,
  selectRandomGenerator,
  getBuiltinGenerator,
} from './MapGenBuiltIn';

// Cataclysm-DDA Mapgen 解析器
export {
  CataclysmMapGenParser,
  CataclysmMapGenLoader,
} from './CataclysmMapGenParser';
export type {
  CataclysmMapGenJson,
  MapGenObjectConfig,
  ParsedMapGenData,
  ItemPlacementConfig,
  MonsterPlacementConfig,
  NestedMapConfig,
  TerrainMapping,
  FurnitureMapping,
  WeightedOption,
  PaletteData,
} from './CataclysmMapGenParser';

// Cataclysm-DDA Mapgen 生成器
export { CataclysmMapGenGenerator } from './CataclysmMapGenGenerator';

// 调色板解析器
export { PaletteResolver } from './PaletteResolver';
