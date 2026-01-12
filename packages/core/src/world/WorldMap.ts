import { Tripoint } from '../coordinates'
import { Submap, SUBMAP_SIZE } from '../map/Submap'
import { MapTile } from '../map/MapTile'

/**
 * Submap 缓存项
 */
interface CachedSubmap {
  submap: Submap
  lastAccessed: number
  isLoading: boolean
}

/**
 * 世界地图配置
 */
export interface WorldMapConfig {
  /** Submap 缓存大小 */
  cacheSize?: number
  /** 加载距离（submap 数量） */
  loadRadius?: number
}

/**
 * Submap 坐标（网格坐标）
 */
export interface SubmapCoord {
  sx: number // submap x
  sy: number // submap y
  sz: number // submap z
}

/**
 * Submap 生成器接口
 */
export interface SubmapGenerator {
  /**
   * 生成指定位置的 submap
   */
  generate(coord: SubmapCoord): Submap | Promise<Submap>

  /**
   * 检查是否可以生成此位置
   */
  canGenerate(coord: SubmapCoord): boolean
}

/**
 * 世界地图
 *
 * 管理无限大的游戏世界，支持动态加载 submap
 */
export class WorldMap {
  private readonly cache = new Map<string, CachedSubmap>()
  private readonly cacheSize: number
  private readonly loadRadius: number
  private readonly generator: SubmapGenerator

  // 当前加载的中心位置（submap 网格坐标），null 表示未初始化
  private currentCenter: SubmapCoord | null = null

  constructor(generator: SubmapGenerator, config: WorldMapConfig = {}) {
    this.generator = generator
    this.cacheSize = config.cacheSize || 100 // 默认缓存 100 个 submap
    this.loadRadius = config.loadRadius || 2 // 默认加载周围 2 层
  }

  /**
   * 将世界坐标转换为 submap 坐标
   */
  static worldToSubmap(pos: Tripoint): SubmapCoord {
    return {
      sx: Math.floor(pos.x / SUBMAP_SIZE),
      sy: Math.floor(pos.y / SUBMAP_SIZE),
      sz: pos.z,
    }
  }

  /**
   * 将 submap 坐标转换为世界坐标（左上角）
   */
  static submapToWorld(coord: SubmapCoord): Tripoint {
    return new Tripoint({
      x: coord.sx * SUBMAP_SIZE,
      y: coord.sy * SUBMAP_SIZE,
      z: coord.sz,
    })
  }

  /**
   * 生成缓存键
   */
  private static cacheKey(coord: SubmapCoord): string {
    return `${coord.sx},${coord.sy},${coord.sz}`
  }

  /**
   * 加载指定位置周围的 submap
   */
  async loadAround(centerPos: Tripoint): Promise<void> {
    const centerCoord = WorldMap.worldToSubmap(centerPos)

    // 如果中心位置没变，跳过
    if (
      this.currentCenter &&
      centerCoord.sx === this.currentCenter.sx &&
      centerCoord.sy === this.currentCenter.sy &&
      centerCoord.sz === this.currentCenter.sz
    ) {
      return
    }

    this.currentCenter = centerCoord

    console.log(`[WorldMap] 加载周围区域，中心: (${centerCoord.sx}, ${centerCoord.sy}, ${centerCoord.sz})`)

    // 计算需要加载的 submap 范围
    const toLoad: SubmapCoord[] = []

    for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        const coord: SubmapCoord = {
          sx: centerCoord.sx + dx,
          sy: centerCoord.sy + dy,
          sz: centerCoord.sz,
        }
        toLoad.push(coord)
      }
    }

    // 并发生成 submap
    await Promise.all(
      toLoad.map(coord => this.loadSubmap(coord))
    )

    // 清理超出范围的缓存
    this.cleanupCache()

    console.log(`[WorldMap] 加载完成，缓存: ${this.cache.size}/${this.cacheSize}`)
  }

  /**
   * 加载单个 submap
   */
  private async loadSubmap(coord: SubmapCoord): Promise<void> {
    const key = WorldMap.cacheKey(coord)

    // 检查是否已缓存
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!
      cached.lastAccessed = Date.now()
      return
    }

    // 检查是否可以生成
    if (!this.generator.canGenerate(coord)) {
      return
    }

    // 标记为加载中
    this.cache.set(key, {
      submap: null as any,
      lastAccessed: Date.now(),
      isLoading: true,
    })

    try {
      // 生成 submap
      const submap = await this.generator.generate(coord)

      // 更新缓存
      this.cache.set(key, {
        submap,
        lastAccessed: Date.now(),
        isLoading: false,
      })
    } catch (error) {
      console.error(`[WorldMap] 生成 submap 失败:`, coord, error)
      this.cache.delete(key)
    }
  }

  /**
   * 清理超出范围的缓存
   */
  private cleanupCache(): void {
    if (!this.currentCenter) return

    const { sx, sy, sz } = this.currentCenter
    const maxDistance = this.loadRadius + 1 // 多保留一层作为缓冲

    const keysToDelete: string[] = []

    for (const [key, cached] of this.cache.entries()) {
      // 解析坐标
      const [sx_str, sy_str, sz_str] = key.split(',')
      const cx = parseInt(sx_str, 10)
      const cy = parseInt(sy_str, 10)
      const cz = parseInt(sz_str, 10)

      // 检查是否超出范围
      const dx = Math.abs(cx - sx)
      const dy = Math.abs(cy - sy)
      const dz = Math.abs(cz - sz)

      if (dx > maxDistance || dy > maxDistance || dz !== 0) {
        keysToDelete.push(key)
      }
    }

    // 如果缓存仍然过大，删除最久未使用的
    if (this.cache.size - keysToDelete.length > this.cacheSize) {
      const sorted = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

      const excessCount = this.cache.size - this.cacheSize - keysToDelete.length
      for (let i = 0; i < excessCount; i++) {
        keysToDelete.push(sorted[i][0])
      }
    }

    // 删除
    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }

  /**
   * 获取指定位置的瓦片
   */
  getTile(pos: Tripoint): MapTile | null {
    const coord = WorldMap.worldToSubmap(pos)
    const key = WorldMap.cacheKey(coord)

    const cached = this.cache.get(key)
    if (!cached || !cached.submap || cached.isLoading) {
      return null
    }

    // 计算在 submap 中的相对坐标
    const localX = ((pos.x % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE
    const localY = ((pos.y % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE

    return cached.submap.tiles?.getTile(localX, localY) || null
  }

  /**
   * 设置指定位置的瓦片
   */
  setTile(pos: Tripoint, tile: MapTile): WorldMap {
    const coord = WorldMap.worldToSubmap(pos)
    const key = WorldMap.cacheKey(coord)

    const cached = this.cache.get(key)
    if (!cached || !cached.submap || cached.isLoading) {
      console.warn('[WorldMap] 尝试设置未加载的瓦片:', pos)
      return this
    }

    // 计算在 submap 中的相对坐标
    const localX = ((pos.x % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE
    const localY = ((pos.y % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE

    const newTiles = cached.submap.tiles!.setTile(localX, localY, tile)
    const newSubmap = new Submap({
      size: cached.submap.size,
      tiles: newTiles,
      uniformTerrain: cached.submap.uniformTerrain,
      spawns: cached.submap.spawns,
      fieldCount: cached.submap.fieldCount,
      lastTouched: Date.now(),
    })

    cached.submap = newSubmap
    cached.lastAccessed = Date.now()

    return this
  }

  /**
   * 获取地图宽度（返回当前加载范围）
   */
  getWidth(): number {
    return this.loadRadius * 2 * SUBMAP_SIZE
  }

  /**
   * 获取地图高度（返回当前加载范围）
   */
  getHeight(): number {
    return this.loadRadius * 2 * SUBMAP_SIZE
  }

  /**
   * 获取缓存的 submap 数量
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentCenter = null
  }
}
