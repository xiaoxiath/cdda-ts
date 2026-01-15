/**
 * OvermapBuffer - Overmap 缓冲区管理
 *
 * 管理多个 Overmap 实例，提供跨 overmap 的查询功能
 * 对应 CDDA 的 overmapbuffer
 */

import { Overmap } from './Overmap';
import { OmTerrain } from './OmTerrain';
import type { PointAbsOM, TripointOMT } from './types';

/**
 * OvermapBuffer - 缓冲区管理类
 *
 * 管理多个 Overmap 实例
 */
export class OvermapBuffer {
  private readonly overmaps: Map<string, Overmap>;
  private readonly terrainCache: Map<string, OmTerrain>;

  private constructor(
    overmaps: Map<string, Overmap>,
    terrainCache: Map<string, OmTerrain>
  ) {
    this.overmaps = overmaps;
    this.terrainCache = terrainCache;

    Object.freeze(this);
  }

  /**
   * 创建空的缓冲区
   */
  static create(): OvermapBuffer {
    return new OvermapBuffer(new Map(), new Map());
  }

  /**
   * 获取或创建 overmap
   */
  getOrCreate(globalPos: PointAbsOM): Overmap {
    const key = this.makeKey(globalPos);
    let om = this.overmaps.get(key);

    if (!om) {
      om = Overmap.create(globalPos);
      // 注意：由于是不可变的，这里我们返回新实例
      // 调用者需要负责更新缓冲区
      return om;
    }

    return om;
  }

  /**
   * 添加 overmap 到缓冲区
   */
  addOvermap(overmap: Overmap): OvermapBuffer {
    const key = this.makeKey(overmap.localPos);
    const newOvermaps = new Map(this.overmaps);
    newOvermaps.set(key, overmap);

    return new OvermapBuffer(newOvermaps, this.terrainCache);
  }

  /**
   * 获取 overmap (不创建)
   */
  get(globalPos: PointAbsOM): Overmap | undefined {
    const key = this.makeKey(globalPos);
    return this.overmaps.get(key);
  }

  /**
   * 检查是否存在指定位置的 overmap
   */
  has(globalPos: PointAbsOM): boolean {
    const key = this.makeKey(globalPos);
    return this.overmaps.has(key);
  }

  /**
   * 获取地形 (跨 overmap)
   */
  getOvermapTerrain(globalPos: PointAbsOM, localPos: TripointOMT): string {
    const om = this.get(globalPos);
    return om?.getTerrain(localPos) || '';
  }

  /**
   * 获取或加载地形定义
   */
  getTerrainById(terrainId: string): OmTerrain | undefined {
    return this.terrainCache.get(terrainId);
  }

  /**
   * 缓存地形定义
   */
  cacheTerrain(terrain: OmTerrain): OvermapBuffer {
    const newCache = new Map(this.terrainCache);
    newCache.set(terrain.getPrimaryId(), terrain);

    return new OvermapBuffer(this.overmaps, newCache);
  }

  /**
   * 批量缓存地形定义
   */
  cacheTerrains(terrains: OmTerrain[]): OvermapBuffer {
    let newCache = this.terrainCache;
    for (const terrain of terrains) {
      newCache = newCache.set(terrain.getPrimaryId(), terrain);
    }

    return new OvermapBuffer(this.overmaps, newCache);
  }

  /**
   * 获取所有已加载的 overmap 位置
   */
  getLoadedPositions(): PointAbsOM[] {
    const positions: PointAbsOM[] = [];
    for (const key of this.overmaps.keys()) {
      const [x, y] = key.split(',').map(Number);
      positions.push({ x, y });
    }
    return positions;
  }

  /**
   * 获取已加载的 overmap 数量
   */
  getLoadedCount(): number {
    return this.overmaps.size;
  }

  /**
   * 获取缓冲区大小 (alias for getLoadedCount)
   */
  size(): number {
    return this.overmaps.size;
  }

  /**
   * 获取地形定义
   */
  getTerrain(terrainId: string): OmTerrain | undefined {
    return this.terrainCache.get(terrainId);
  }

  /**
   * 获取所有已加载的 overmap 位置 (alias for getLoadedPositions)
   */
  getAllPositions(): PointAbsOM[] {
    return this.getLoadedPositions();
  }

  /**
   * 获取相邻的 overmap 位置
   */
  getNeighbors(globalPos: PointAbsOM): PointAbsOM[] {
    const neighbors: PointAbsOM[] = [];
    const directions: PointAbsOM[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (const dir of directions) {
      const neighborPos = { x: globalPos.x + dir.x, y: globalPos.y + dir.y };
      if (this.has(neighborPos)) {
        neighbors.push(neighborPos);
      }
    }

    return neighbors;
  }

  /**
   * 清空缓冲区
   */
  clear(): OvermapBuffer {
    return new OvermapBuffer(new Map(), new Map());
  }

  /**
   * 移除指定位置的 overmap
   */
  remove(globalPos: PointAbsOM): OvermapBuffer {
    const key = this.makeKey(globalPos);
    const newOvermaps = new Map(this.overmaps);
    newOvermaps.delete(key);

    return new OvermapBuffer(newOvermaps, this.terrainCache);
  }

  /**
   * 转换为 JSON
   */
  toJson(): object {
    return {
      overmaps: Array.from(this.overmaps.entries()).map(([key, om]) => ({
        key,
        overmap: om.toJson(),
      })),
      terrainCount: this.terrainCache.size,
      terrains: Array.from(this.terrainCache.values()).map(t => t.toJson()),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: any): OvermapBuffer {
    const buffer = OvermapBuffer.create();
    let result = buffer;

    // 处理 overmaps
    if (json.overmaps && Array.isArray(json.overmaps)) {
      for (const item of json.overmaps) {
        const overmap = Overmap.fromJson(item.overmap || item);
        result = result.addOvermap(overmap);
      }
    }

    return result;
  }

  /**
   * 生成坐标键
   */
  private makeKey(pos: PointAbsOM): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * 从坐标键解析坐标
   */
  private parseKey(key: string): PointAbsOM {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}
