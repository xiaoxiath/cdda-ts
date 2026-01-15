/**
 * Pathfinding - A* 寻路系统
 *
 * 实现高效的 A* 寻路算法
 * 支持路径缓存、多层地图和障碍检测
 *
 * 参考 Cataclysm-DDA 的路径查找系统
 */

import { Map, List } from 'immutable';
import { Tripoint } from '../coordinates/Tripoint';
import type { GameMap } from '../map/GameMap';
import type {
  Path,
  PathNode,
  PathfindingRequest,
  PathfindingResult,
  PathCacheEntry,
} from './types';

/**
 * Pathfinding 属性（内部）
 */
interface PathfindingProps {
  readonly map: GameMap;
  readonly cache: Map<string, PathCacheEntry>;
  readonly maxCacheSize: number;
  readonly cacheTimeout: number;
}

/**
 * Pathfinding - A* 寻路系统
 *
 * 使用不可变数据结构
 */
export class Pathfinding {
  readonly map!: GameMap;
  readonly maxCacheSize!: number;
  readonly cacheTimeout!: number;

  // 缓存不冻结，允许更新
  private _cache!: Map<string, PathCacheEntry>;

  private constructor(props: PathfindingProps) {
    this.map = props.map;
    this._cache = props.cache;
    this.maxCacheSize = props.maxCacheSize;
    this.cacheTimeout = props.cacheTimeout;

    // 只冻结部分属性
    Object.freeze(this.map);
    Object.freeze(this.maxCacheSize);
    Object.freeze(this.cacheTimeout);
  }

  // 添加 cache 的 getter 以保持 API 兼容
  get cache(): Map<string, PathCacheEntry> {
    return this._cache;
  }

  // ========== 工厂方法 ==========

  /**
   * 创建寻路系统
   * @param map 游戏地图
   * @param maxCacheSize 最大缓存大小
   * @param cacheTimeout 缓存超时时间（毫秒）
   */
  static create(
    map: GameMap,
    maxCacheSize: number = 100,
    cacheTimeout: number = 5000
  ): Pathfinding {
    return new Pathfinding({
      map,
      cache: Map(),
      maxCacheSize,
      cacheTimeout,
    });
  }

  // ========== 核心寻路方法 ==========

  /**
   * 查找路径（使用缓存）
   * @param request 寻路请求
   */
  findPath(request: PathfindingRequest): PathfindingResult {
    // 生成缓存键
    const cacheKey = this.getCacheKey(request.start, request.end);

    // 检查缓存
    const cached = this._cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      // 更新命中次数
      (this as any)._cache = this._cache.set(cacheKey, {
        ...cached,
        hitCount: cached.hitCount + 1,
      });

      return {
        path: cached.path,
        cost: this.calculatePathCost(cached.path),
        success: true,
      };
    }

    // 执行 A* 算法
    const result = this.findPathAStar(request);

    // 如果成功，缓存结果
    if (result.success && result.path.length > 0) {
      this.cachePath(cacheKey, result.path);
    }

    return result;
  }

  /**
   * A* 算法实现
   */
  private findPathAStar(request: PathfindingRequest): PathfindingResult {
    const { start, end, allowDiagonal, maxCost, ignoreCreatures } = request;

    // 检查起点和终点是否可通过
    if (!this.isPassable(start, ignoreCreatures)) {
      return {
        path: [],
        cost: 0,
        success: false,
        reason: '起点不可通过',
      };
    }

    if (!this.isPassable(end, ignoreCreatures)) {
      return {
        path: [],
        cost: 0,
        success: false,
        reason: '终点不可通过',
      };
    }

    // 检查起点是否等于终点
    if (this.isSamePosition(start, end)) {
      return {
        path: [start],
        cost: 0,
        success: true,
      };
    }

    // 初始化开放列表和关闭列表
    const openList: PathNode[] = [];
    const closedSet = new Set<string>();
    const cameFrom: Map<string, any> = Map();

    // 创建起始节点
    const startNode: PathNode = {
      position: start,
      gCost: 0,
      hCost: this.heuristic(start, end),
      fCost: this.heuristic(start, end),
    };

    openList.push(startNode);

    // 主循环
    while (openList.length > 0) {
      // 获取 fCost 最小的节点
      openList.sort((a, b) => a.fCost - b.fCost);
      const current = openList.shift()!;

      // 检查是否到达终点
      if (this.isSamePosition(current.position, end)) {
        return {
          path: this.reconstructPath(cameFrom, current.position, start),
          cost: current.gCost,
          success: true,
        };
      }

      // 检查代价限制
      if (maxCost > 0 && current.gCost > maxCost) {
        return {
          path: [],
          cost: current.gCost,
          success: false,
          reason: '超过最大代价限制',
        };
      }

      // 添加到关闭列表
      const currentKey = this.positionToKey(current.position);
      closedSet.add(currentKey);

      // 检查所有相邻节点
      const neighbors = this.getNeighbors(current.position, allowDiagonal);

      for (const neighbor of neighbors) {
        const neighborKey = this.positionToKey(neighbor);

        // 跳过已关闭的节点
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // 检查是否可通过
        if (!this.isPassable(neighbor, ignoreCreatures)) {
          continue;
        }

        // 计算新的 gCost
        const moveCost = this.getMovementCost(current.position, neighbor);
        const newGCost = current.gCost + moveCost;

        // 查找开放列表中的节点
        const existingNodeIndex = openList.findIndex(n => this.isSamePosition(n.position, neighbor));

        if (existingNodeIndex >= 0) {
          // 如果找到更短路径，更新节点
          const existingNode = openList[existingNodeIndex];
          if (newGCost < existingNode.gCost) {
            const updatedNode: PathNode = {
              position: existingNode.position,
              gCost: newGCost,
              hCost: existingNode.hCost,
              fCost: newGCost + existingNode.hCost,
            };
            openList[existingNodeIndex] = updatedNode;
            cameFrom.set(neighborKey, current.position);
          }
        } else {
          // 添加新节点
          const hCost = this.heuristic(neighbor, end);
          const newNode: PathNode = {
            position: neighbor,
            gCost: newGCost,
            hCost: hCost,
            fCost: newGCost + hCost,
          };
          openList.push(newNode);
          cameFrom.set(neighborKey, current.position);
        }
      }
    }

    // 无法找到路径
    return {
      path: [],
      cost: 0,
      success: false,
      reason: '无法找到路径',
    };
  }

  // ========== 启发式函数 ==========

  /**
   * 计算启发式函数（曼哈顿距离）
   * @param from 起点
   * @param to 终点
   */
  private heuristic(from: Tripoint, to: Tripoint): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const dz = Math.abs(to.z - from.z);

    // 曼哈顿距离
    return dx + dy + dz * 2; // z 轴移动代价更高
  }

  /**
   * 欧几里得距离（用于更精确的寻路）
   */
  private heuristicEuclidean(from: Tripoint, to: Tripoint): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ========== 地图查询方法 ==========

  /**
   * 检查位置是否可通过
   * @param position 位置
   * @param ignoreCreatures 是否忽略生物
   */
  isPassable(position: Tripoint, ignoreCreatures: boolean = false): boolean {
    // 检查地图边界
    if (!this.isInBounds(position)) {
      return false;
    }

    // 检查地形（简化版本）
    // 实际需要查询 GameMap 的地形数据

    // 检查是否有生物
    if (!ignoreCreatures && this.map.creatures) {
      // 支持 native Map 和 Immutable.js Map
      const creatures = this.map.creatures as any;
      const entries = creatures.entries ? creatures.entries() : Object.entries(creatures);

      for (const [id, creature] of entries) {
        const creaturePos = (creature as any).position;
        if (creaturePos && this.isSamePosition(creaturePos, position)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 检查位置是否在地图边界内
   */
  private isInBounds(position: Tripoint): boolean {
    return (
      position.x >= 0 &&
      position.x < 132 && // MAP_SIZE_X
      position.y >= 0 &&
      position.y < 132 && // MAP_SIZE_Y
      position.z >= -10 &&
      position.z <= 10
    );
  }

  /**
   * 获取移动代价
   * @param from 起点
   * @param to 终点
   */
  getMovementCost(from: Tripoint, to: Tripoint): number {
    // 基础代价
    let cost = 1.0;

    // 对角线移动代价更高
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    if (dx > 0 && dy > 0) {
      cost = 1.414; // sqrt(2)
    }

    // z 轴移动代价更高
    if (to.z !== from.z) {
      cost *= 2.0;
    }

    // 地形影响（简化版本）
    // 实际需要查询地形类型

    return cost;
  }

  /**
   * 获取相邻位置
   * @param position 当前位置
   * @param allowDiagonal 是否允许对角线移动
   */
  getNeighbors(position: Tripoint, allowDiagonal: boolean): Tripoint[] {
    const neighbors: Tripoint[] = [];

    // 四方向
    const directions = [
      { x: 0, y: -1, z: 0 }, // 北
      { x: 0, y: 1, z: 0 },  // 南
      { x: -1, y: 0, z: 0 }, // 西
      { x: 1, y: 0, z: 0 },  // 东
    ];

    // 对角线方向
    if (allowDiagonal) {
      directions.push(
        { x: -1, y: -1, z: 0 }, // 西北
        { x: 1, y: -1, z: 0 },  // 东北
        { x: -1, y: 1, z: 0 },  // 西南
        { x: 1, y: 1, z: 0 }    // 东南
      );
    }

    // z 轴方向（楼梯）
    directions.push(
      { x: 0, y: 0, z: 1 },  // 上
      { x: 0, y: 0, z: -1 }  // 下
    );

    for (const dir of directions) {
      const newPos = new Tripoint({
        x: position.x + dir.x,
        y: position.y + dir.y,
        z: position.z + dir.z,
      });
      neighbors.push(newPos);
    }

    return neighbors;
  }

  // ========== 路径辅助方法 ==========

  /**
   * 重建路径
   * @param cameFrom 节点映射
   * @param current 当前位置
   * @param start 起始位置
   */
  private reconstructPath(cameFrom: Map<string, Tripoint>, current: Tripoint, start: Tripoint): Path {
    const path: Tripoint[] = [current];

    let currentKey = this.positionToKey(current);
    while (cameFrom.has(currentKey)) {
      const previous = cameFrom.get(currentKey)!;
      // 保持 Tripoint 实例
      path.unshift(previous);
      currentKey = this.positionToKey(previous);
    }

    // 确保起点在路径中（如果起点和终点相邻，可能没有 cameFrom 条目）
    if (path.length === 0 || !this.isSamePosition(path[0], start)) {
      path.unshift(start);
    }

    return path;
  }

  /**
   * 计算路径总代价
   */
  calculatePathCost(path: Path): number {
    if (path.length <= 1) return 0;

    let cost = 0;
    for (let i = 1; i < path.length; i++) {
      cost += this.getMovementCost(path[i - 1], path[i]);
    }
    return cost;
  }

  /**
   * 优化路径（移除冗余节点）
   */
  optimizePath(path: Path): Path {
    if (path.length <= 2) return path;

    const optimized: Tripoint[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const curr = path[i];
      const next = path[i + 1];

      // 检查是否可以直接跳过当前节点
      if (!this.canMoveDirectly(prev, next)) {
        optimized.push(curr);
      }
    }

    optimized.push(path[path.length - 1]);
    return optimized;
  }

  /**
   * 平滑路径（使用贝塞尔曲线等）
   */
  smoothPath(path: Path): Path {
    // 简化版本，实际可以使用更复杂的平滑算法
    return this.optimizePath(path);
  }

  /**
   * 检查是否可以直接在两点之间移动
   * 检查是否是同一直线移动（无障碍物简化版本）
   */
  private canMoveDirectly(from: Tripoint, to: Tripoint): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;

    // 检查是否在同一直线上（只有一个方向有变化）
    const isStraightLine = (dx !== 0 && dy === 0 && dz === 0) ||
                          (dx === 0 && dy !== 0 && dz === 0) ||
                          (dx === 0 && dy === 0 && dz !== 0);

    return isStraightLine;
  }

  /**
   * 获取路径长度
   */
  getPathLength(path: Path): number {
    return path.length;
  }

  /**
   * 获取路径上的下一个位置
   * @param path 路径
   * @param currentIndex 当前索引
   */
  getNextPosition(path: Path, currentIndex: number): Tripoint | null {
    if (currentIndex >= 0 && currentIndex < path.length - 1) {
      return path[currentIndex + 1];
    }
    return null;
  }

  // ========== 缓存管理 ==========

  /**
   * 缓存路径
   */
  private cachePath(key: string, path: Path): void {
    // 检查缓存大小
    if (this._cache.size >= this.maxCacheSize) {
      this.cleanupCache(Date.now());
    }

    const entry: PathCacheEntry = {
      start: path[0],
      end: path[path.length - 1],
      path,
      timestamp: Date.now(),
      hitCount: 0,
    };

    (this as any)._cache = this._cache.set(key, entry);
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(currentTime: number): void {
    let cache = this._cache;

    // 删除过期条目
    cache = cache.filter(entry => {
      const age = currentTime - entry.timestamp;
      return age < this.cacheTimeout;
    });

    // 如果仍然太大，删除最少使用的条目
    if (cache.size >= this.maxCacheSize) {
      const entries = cache.entrySeq().toArray();
      entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

      // 保留最常用的 80%
      const keepCount = Math.floor(this.maxCacheSize * 0.8);
      const toKeep = entries.slice(-keepCount);

      cache = Map(toKeep.map(e => [e[0], e[1]]));
    }

    (this as any)._cache = cache;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: PathCacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.cacheTimeout;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(start: Tripoint, end: Tripoint): string {
    return `${start.x},${start.y},${start.z}->${end.x},${end.y},${end.z}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): Pathfinding {
    return new Pathfinding({
      map: this.map,
      cache: Map(),
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout,
    });
  }

  // ========== 辅助方法 ==========

  /**
   * 将位置转换为字符串键
   */
  private positionToKey(position: Tripoint): string {
    return `${position.x},${position.y},${position.z}`;
  }

  /**
   * 检查两个位置是否相同
   */
  private isSamePosition(a: Tripoint, b: Tripoint): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout,
      cacheSize: this._cache.size,
      cache: this._cache
        .map((entry, key) => ({
          key,
          start: entry.start,
          end: entry.end,
          pathLength: entry.path.length,
          hitCount: entry.hitCount,
          timestamp: entry.timestamp,
        }))
        .toArray(),
    };
  }
}
