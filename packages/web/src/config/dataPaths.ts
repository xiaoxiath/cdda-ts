/**
 * 游戏数据配置
 */

/**
 * CDDA 数据路径配置
 */
export const DATA_PATHS = {
  // 开发环境：使用代理访问本地文件
  development: '/api/data',

  // 生产环境：使用部署的数据文件
  production: '/data',

  // 或者从 CDN 加载
  // cdn: 'https://cdn.example.com/cdda-data',
}

/**
 * 核心地形文件列表（按加载顺序）
 * 这些是游戏运行必需的基础地形
 */
export const CORE_TERRAIN_FILES = [
  'terrain-floors-indoor.json',
  'terrain-floors-outdoors.json',
  'terrain-walls.json',
  'terrain-doors.json',
  'terrain-windows.json',
  'terrain-liquids.json',
  'terrain-flora.json',
  'terrain-manufactured.json',
]

/**
 * 核心家具文件列表
 */
export const CORE_FURNITURE_FILES = [
  'furniture-surfaces.json',
  'furniture-seats.json',
  'furniture-storage.json',
  'furniture-tools.json',
  'furniture-decorative.json',
  'furniture-terrains.json',
]

/**
 * 获取当前环境的数据路径
 */
export function getDataPath(): string {
  return import.meta.env.DEV ? DATA_PATHS.development : DATA_PATHS.production
}

/**
 * 获取地形文件的完整路径
 */
export function getTerrainFilePath(filename: string): string {
  return `${getDataPath()}/furniture_and_terrain/${filename}`
}

/**
 * 获取家具文件的完整路径
 */
export function getFurnitureFilePath(filename: string): string {
  return `${getDataPath()}/furniture_and_terrain/${filename}`
}
