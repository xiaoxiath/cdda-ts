import { WorldMap, CddaWorldGenerator, type SubmapCoord } from '@cataclym-web/core/world'
import { CataclysmMapGenGenerator } from '@cataclym-web/core/mapgen'
import { TerrainLoader } from '@cataclym-web/core'
import { FurnitureLoader } from '@cataclym-web/core'
import { Tripoint } from '@cataclym-web/core'
import { MapGenDataLoader } from './MapGenDataLoader'

/**
 * 世界地图加载器
 *
 * 管理 WorldMap 的创建和动态加载
 */
export class WorldMapLoader {
  private readonly worldMap: WorldMap
  private readonly worldGenerator: CddaWorldGenerator
  private readonly mapGenDataLoader: MapGenDataLoader

  constructor(
    terrainLoader: TerrainLoader,
    furnitureLoader: FurnitureLoader
  ) {
    this.mapGenDataLoader = new MapGenDataLoader(terrainLoader, furnitureLoader)
    this.worldGenerator = new CddaWorldGenerator(terrainLoader, furnitureLoader)

    // 创建 WorldMap
    this.worldMap = new WorldMap(this.worldGenerator, {
      cacheSize: 100, // 缓存 100 个 submap
      loadRadius: 3, // 加载周围 3 层 submap (约 72x72 瓦片)
    })
  }

  /**
   * 加载 mapgen 数据
   */
  async loadMapGenData(): Promise<void> {
    await this.mapGenDataLoader.loadCoreData()

    // 将所有已加载的 mapgen 生成器注册到世界生成器
    for (const id of this.mapGenDataLoader.getAvailableMapgens()) {
      const generator = this.mapGenDataLoader.getGenerator(id)
      if (generator) {
        this.worldGenerator.registerGenerator(id, generator)
      }
    }

    console.log(`[WorldMapLoader] 已注册 ${this.mapGenDataLoader.getAvailableMapgens().length} 个 mapgen 生成器`)
  }

  /**
   * 加载指定位置周围的世界
   */
  async loadAround(centerPos: Tripoint): Promise<void> {
    await this.worldMap.loadAround(centerPos)
  }

  /**
   * 获取 WorldMap
   */
  getWorldMap(): WorldMap {
    return this.worldMap
  }

  /**
   * 获取 MapGenDataLoader
   */
  getMapGenDataLoader(): MapGenDataLoader {
    return this.mapGenDataLoader
  }

  /**
   * 获取世界生成器
   */
  getWorldGenerator(): CddaWorldGenerator {
    return this.worldGenerator
  }

  /**
   * 注册自定义 mapgen 生成器
   */
  registerMapgen(id: string, generator: CataclysmMapGenGenerator): void {
    this.worldGenerator.registerGenerator(id, generator)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.worldMap.clear()
  }
}
