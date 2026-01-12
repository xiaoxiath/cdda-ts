import { Submap } from '../map/Submap'
import { MapTile } from '../map/MapTile'
import { MapTileSoa } from '../map/MapTileSoa'
import { Tripoint } from '../coordinates'
import { TerrainLoader } from '../terrain/TerrainLoader'
import { FurnitureLoader } from '../furniture/FurnitureLoader'
import { CataclysmMapGenGenerator } from '../mapgen/CataclysmMapGenGenerator'
import type { SubmapCoord, SubmapGenerator } from './WorldMap'

/**
 * CDDA 世界生成器
 *
 * 根据位置选择合适的 mapgen 生成 submap
 */
export class CddaWorldGenerator implements SubmapGenerator {
  private readonly generators = new Map<string, CataclysmMapGenGenerator>()

  constructor(
    private readonly terrainLoader: TerrainLoader,
    private readonly furnitureLoader: FurnitureLoader
  ) {
    // 预加载一些常用的 mapgen
    this.preloadGenerators()
  }

  /**
   * 预加载常用 mapgen
   */
  private async preloadGenerators(): Promise<void> {
    // 这个方法会在实际使用时从外部调用
    // 这里只是占位，实际加载在 MapGenDataLoader 中完成
  }

  /**
   * 注册 mapgen 生成器
   */
  registerGenerator(id: string, generator: CataclysmMapGenGenerator): void {
    this.generators.set(id, generator)
  }

  /**
   * 根据位置选择合适的 mapgen ID
   *
   * 在完整的 CDDA 系统中，这个方法会：
   * 1. 根据 Submap 坐标计算对应的 OMT 坐标
   * 2. 查询 Overmap 获取该位置的 OMT ID
   * 3. 根据 OMT ID 查找对应的 mapgen
   *
   * 目前简化实现：使用简单的距离判断
   */
  private selectMapgenForPosition(coord: SubmapCoord): string | null {
    // 简化的位置选择策略
    // 每个 OMT 是 2x2 Submaps (24x24 tiles)
    // Submap (sx, sy) 对应 OMT (Math.floor(sx/2), Math.floor(sy/2))

    const omtX = Math.floor(coord.sx / 2)
    const omtY = Math.floor(coord.sy / 2)

    // 根据距离原点的距离选择不同的地形
    const distance = Math.abs(omtX) + Math.abs(omtY)

    // 在完整实现中，这里会查询 Overmap 来获取该位置的 OMT ID
    // 然后根据 OMT ID 查找对应的 mapgen

    // 简化实现：
    // - 中心区域 (0,0) - 使用 abstorefront 商店
    // - 附近区域 (distance <= 2) - 使用房屋 mapgen
    // - 更远的区域 - 返回 null，使用默认地形

    if (distance === 0) {
      // 检查是否有可用的 mapgen
      const availableMapgens = Array.from(this.generators.keys())
      // 优先选择 abstorefront
      if (availableMapgens.includes('abstorefront')) {
        return 'abstorefront'
      }
      // 如果没有，选择第一个可用的
      if (availableMapgens.length > 0) {
        return availableMapgens[0]
      }
    } else if (distance <= 2) {
      // 附近区域 - 尝试使用房屋 mapgen
      const availableMapgens = Array.from(this.generators.keys())
      if (availableMapgens.includes('abstorefront')) {
        return 'abstorefront'
      }
      // 或者使用其他可用的 mapgen
      if (availableMapgens.length > 0) {
        return availableMapgens[Math.min(distance, availableMapgens.length - 1)]
      }
    }

    // 远距离区域返回 null，使用默认地形
    return null
  }

  /**
   * 生成默认地形（草地）
   */
  private generateDefaultTerrain(): Submap {
    // 尝试获取草地地形，如果不存在则使用第一个可用地形
    let grassId = 4 // 默认 ID
    const grassTerrain = this.terrainLoader.findByName('t_grass')
    if (grassTerrain) {
      grassId = grassTerrain.id
    } else {
      // 使用第一个可用地形
      const allTerrains = this.terrainLoader.getAll()
      if (allTerrains.length > 0) {
        grassId = allTerrains[0].id
      }
    }

    let soa = MapTileSoa.createEmpty(12)

    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const tile = new MapTile({ terrain: grassId })
        soa = soa.setTile(x, y, tile)
      }
    }

    return new Submap({
      size: 12,
      tiles: soa,
      uniformTerrain: grassId,
      spawns: [],
      fieldCount: 0,
      lastTouched: Date.now(),
    })
  }

  /**
   * 生成指定位置的 submap
   */
  async generate(coord: SubmapCoord): Promise<Submap> {
    // 选择 mapgen
    const mapgenId = this.selectMapgenForPosition(coord)

    if (mapgenId) {
      const generator = this.generators.get(mapgenId)
      if (generator) {
        // 使用 mapgen 生成
        const context = {
          position: new Tripoint({
            x: coord.sx * 12,
            y: coord.sy * 12,
            z: coord.sz,
          }),
          seed: this.hashCoord(coord),
          map: null as any,
          params: {},
          depth: 0,
        }

        try {
          return await generator.generate(context)
        } catch (error) {
          console.warn(`[CddaWorldGenerator] mapgen ${mapgenId} 生成失败:`, error)
          // 失败时使用默认地形
        }
      }
    }

    // 使用默认地形
    return this.generateDefaultTerrain()
  }

  /**
   * 检查是否可以生成此位置
   */
  canGenerate(coord: SubmapCoord): boolean {
    return true // 总是可以生成
  }

  /**
   * 将坐标哈希为种子
   */
  private hashCoord(coord: SubmapCoord): number {
    // 简单的哈希函数
    const prime1 = 73856093
    const prime2 = 19349663
    const prime3 = 83492791

    return (
      coord.sx * prime1 +
      coord.sy * prime2 +
      coord.sz * prime3
    ) >>> 0
  }
}
