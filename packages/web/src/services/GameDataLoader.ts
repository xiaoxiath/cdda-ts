import { TerrainLoader } from '@cataclym-web/core'
import { FurnitureLoader } from '@cataclym-web/core'
import { MapGenDataLoader } from './MapGenDataLoader'

/**
 * 游戏数据加载器 - 简化版
 * 直接从静态资源加载 JSON 数据
 */
export class GameDataLoader {
  private terrainLoader: TerrainLoader
  private furnitureLoader: FurnitureLoader
  private mapGenLoader: MapGenDataLoader
  private loaded = false

  constructor() {
    this.terrainLoader = new TerrainLoader()
    this.furnitureLoader = new FurnitureLoader()
    this.mapGenLoader = new MapGenDataLoader(this.terrainLoader, this.furnitureLoader)
  }

  /**
   * 加载所有核心游戏数据
   */
  async loadCoreData(): Promise<void> {
    if (this.loaded) {
      console.log('[GameDataLoader] 数据已加载')
      return
    }

    console.log('[GameDataLoader] 开始加载游戏数据...')

    try {
      // 加载地形和家具文件
      const dataDir = '/data/json/furniture_and_terrain'

      // 获取所有 JSON 文件列表
      const response = await fetch(`${dataDir}/index.json`)
      if (!response.ok) {
        throw new Error(`无法获取数据索引: ${response.statusText}`)
      }

      const files = await response.json()
      console.log(`[GameDataLoader] 找到 ${files.length} 个数据文件`)

      // 逐个加载地形文件
      let terrainCount = 0
      let furnitureCount = 0

      for (const file of files) {
        if (file.includes('terrain-')) {
          try {
            await this.terrainLoader.loadFromUrl(`${dataDir}/${file}`)
            terrainCount++
          } catch (err) {
            console.warn(`[GameDataLoader] 加载地形文件失败: ${file}`, err)
          }
        } else if (file.includes('furniture-')) {
          try {
            await this.furnitureLoader.loadFromUrl(`${dataDir}/${file}`)
            furnitureCount++
          } catch (err) {
            console.warn(`[GameDataLoader] 加载家具文件失败: ${file}`, err)
          }
        }
      }

      this.loaded = true
      console.log(`[GameDataLoader] 基础数据加载完成!`)
      console.log(`  - 地形: ${terrainCount} 个`)
      console.log(`  - 家具: ${furnitureCount} 个`)

      // 加载 mapgen 数据
      console.log(`[GameDataLoader] 开始加载 mapgen 数据...`)
      await this.mapGenLoader.loadCoreData()
    } catch (error) {
      console.error('[GameDataLoader] 加载数据失败:', error)
      throw error
    }
  }

  /**
   * 加载核心地形文件（指定的文件列表）
   */
  async loadCoreTerrainFiles(files: string[]): Promise<void> {
    const dataDir = '/data/json/furniture_and_terrain'
    console.log(`[GameDataLoader] 加载 ${files.length} 个核心地形文件...`)

    for (const file of files) {
      try {
        await this.terrainLoader.loadFromUrl(`${dataDir}/${file}`)
        console.log(`  ✓ ${file}`)
      } catch (err) {
        console.warn(`  ✗ ${file}`, err)
      }
    }
  }

  /**
   * 加载核心家具文件（指定的文件列表）
   */
  async loadCoreFurnitureFiles(files: string[]): Promise<void> {
    const dataDir = '/data/json/furniture_and_terrain'
    console.log(`[GameDataLoader] 加载 ${files.length} 个核心家具文件...`)

    for (const file of files) {
      try {
        await this.furnitureLoader.loadFromUrl(`${dataDir}/${file}`)
        console.log(`  ✓ ${file}`)
      } catch (err) {
        console.warn(`  ✗ ${file}`, err)
      }
    }
  }

  /**
   * 获取地形加载器
   */
  getTerrainLoader(): TerrainLoader {
    return this.terrainLoader
  }

  /**
   * 获取家具加载器
   */
  getFurnitureLoader(): FurnitureLoader {
    return this.furnitureLoader
  }

  /**
   * 获取 MapGen 加载器
   */
  getMapGenLoader(): MapGenDataLoader {
    return this.mapGenLoader
  }

  /**
   * 检查是否已加载
   */
  isDataLoaded(): boolean {
    return this.loaded
  }

  /**
   * 获取加载统计
   */
  getStats(): { terrainCount: number; furnitureCount: number } {
    return {
      terrainCount: this.terrainLoader.getAll().length,
      furnitureCount: this.furnitureLoader.getAll().length,
    }
  }
}

// 导出单例
export const gameDataLoader = new GameDataLoader()
