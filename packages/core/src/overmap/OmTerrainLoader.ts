/**
 * OmTerrain 加载器
 *
 * 负责加载和管理所有 Overmap Terrain 定义
 */

import { promises as fs } from 'fs'
import { OmTerrain, OmTerrainJson } from './OmTerrain'

/**
 * OmTerrain 加载器
 */
export class OmTerrainLoader {
  private readonly terrains = new Map<string, OmTerrain>()
  private readonly abstracts = new Map<string, OmTerrain>()

  /**
   * 添加 terrain 定义
   */
  add(terrain: OmTerrain): void {
    // 如果是抽象定义，单独存储
    if (terrain.isAbstract) {
      const primaryId = terrain.getPrimaryId()
      if (primaryId) {
        this.abstracts.set(primaryId, terrain)
      }
      return
    }

    // 为每个 ID 注册 terrain
    for (const id of terrain.ids) {
      this.terrains.set(id, terrain)
    }
  }

  /**
   * 从 JSON 数组加载
   */
  loadFromJsonArray(jsonArray: OmTerrainJson[]): void {
    // 先解析所有抽象定义
    const abstracts: OmTerrain[] = []
    const concretes: OmTerrainJson[] = []

    for (const json of jsonArray) {
      if (json.abstract) {
        const terrain = OmTerrain.fromJson(json)
        abstracts.push(terrain)
        this.add(terrain)
      } else {
        concretes.push(json)
      }
    }

    // 然后处理具体定义，应用 copy-from 和 extend
    for (const json of concretes) {
      let terrain = OmTerrain.fromJson(json)

      // 处理 copy-from
      if (json['copy-from']) {
        const source = this.get(json['copy-from'])
        if (source) {
          // 复制源属性，然后用当前属性覆盖
          terrain = source.with({
            ids: terrain.ids.length > 0 ? [...terrain.ids] : [...source.ids],
            name: terrain.name || source.name,
            symbol: terrain.symbol || source.symbol,
            color: terrain.color || source.color,
            visionLevels: terrain.visionLevels || source.visionLevels,
            seeCost: terrain.seeCost || source.seeCost,
            travelCostType: terrain.travelCostType || source.travelCostType,
            extras: terrain.extras || source.extras,
            mondensity: terrain.mondensity ?? source.mondensity,
            flags: terrain.flags.size > 0 ? Array.from(terrain.flags) : Array.from(source.flags),
            uniformTerrain: terrain.uniformTerrain || source.uniformTerrain,
            mapgenIds: terrain.mapgenIds.size > 0 ? terrain.mapgenIds : source.mapgenIds,
          })
        }
      }

      this.add(terrain)
    }
  }

  /**
   * 异步加载 overmap terrain JSON 文件
   */
  async loadFromFile(path: string): Promise<void> {
    try {
      const content = await fs.readFile(path, 'utf-8')
      const jsonArray: unknown = JSON.parse(content)
      if (!Array.isArray(jsonArray)) {
        throw new Error(`Expected array, got ${typeof jsonArray}`)
      }
      this.loadFromJsonArray(jsonArray as OmTerrainJson[])
    } catch (error) {
      console.error(`[OmTerrainLoader] Failed to load ${path}:`, error)
      throw error
    }
  }

  /**
   * 根据 ID 获取 terrain
   */
  get(id: string): OmTerrain | undefined {
    return this.terrains.get(id)
  }

  /**
   * 获取所有 terrain ID
   */
  getAllIds(): string[] {
    return Array.from(this.terrains.keys())
  }

  /**
   * 根据 mapgen ID 查找对应的 OMT ID
   * 返回第一个匹配的 OMT ID
   */
  findOmtIdByMapgen(mapgenId: string): string | null {
    for (const [omtId, terrain] of this.terrains) {
      if (terrain.mapgenIds.has('default') && terrain.mapgenIds.get('default') === mapgenId) {
        return omtId
      }
    }
    return null
  }

  /**
   * 获取统计数据
   */
  getStats(): { terrainCount: number; abstractCount: number } {
    return {
      terrainCount: this.terrains.size,
      abstractCount: this.abstracts.size,
    }
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.terrains.clear()
    this.abstracts.clear()
  }

  /**
   * 检查是否存在指定 ID
   */
  has(id: string): boolean {
    return this.terrains.has(id)
  }
}
