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
   */
  private selectMapgenForPosition(coord: SubmapCoord): string | null {
    // 简单的区域分配策略
    // 原点附近的区域放置建筑物
    const distance = Math.abs(coord.sx) + Math.abs(coord.sy)

    if (distance === 0) {
      // 中心区域 - 商店
      return 'abstorefront'
    } else if (distance <= 2) {
      // 附近区域 - 房屋
      return 'abstorefront' // 可以换成其他建筑类型
    }

    // 远距离区域返回 null，使用默认地形
    return null
  }

  /**
   * 生成默认地形（草地）
   */
  private generateDefaultTerrain(): Submap {
    const grassTerrain = this.terrainLoader.findByName('t_grass')
    const grassId = grassTerrain?.id ?? 4

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
      uniformTerrain: null,
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

        return generator.generate(context)
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
