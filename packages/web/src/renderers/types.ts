/**
 * Tile 渲染器类型定义
 */

/**
 * Tile 配置类型
 */
export interface TileConfig {
  'tile_info': TileInfo[]
  'tiles-new': TileEntry[]
}

/**
 * 图块信息
 */
export interface TileInfo {
  pixelscale?: number
  width: number
  height: number
  zlevel_height?: number
  iso?: boolean
  retract_dist_min?: number
  retract_dist_max?: number
}

/**
 * 图块条目
 */
export interface TileEntry {
  file: string
  sprite_width?: number
  sprite_height?: number
  sprite_offset_x?: number
  sprite_offset_y?: number
  tiles?: TileDef[]
}

/**
 * 图块定义
 */
export interface TileDef {
  id: string
  animated?: boolean
  fg?: Sprite[]
  bg?: Sprite[]
}

/**
 * 精灵定义
 */
export interface Sprite {
  weight?: number
  sprite: number
}
