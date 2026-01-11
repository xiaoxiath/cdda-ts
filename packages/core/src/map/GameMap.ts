import { Submap, SUBMAP_SIZE } from './Submap';
import { Tripoint } from '../coordinates/Tripoint';
import { MapBuffer } from './MapBuffer';
import { LevelCache } from './MapCache';
import { MapTile } from './MapTile';
import { Creature } from '../creature/Creature';

/**
 * 地图配置常量
 */
export const MAPSIZE = 11; // 11x11 submaps
export const MAP_SIZE_X = SUBMAP_SIZE * MAPSIZE; // 132
export const MAP_SIZE_Y = SUBMAP_SIZE * MAPSIZE; // 132
export const OVERMAP_LAYERS = 21; // 总层数

/**
 * 地图方块坐标转 submap 坐标
 */
export function posToSubmap(pos: Tripoint): Tripoint {
  const x = Math.floor(pos.x / SUBMAP_SIZE);
  const y = Math.floor(pos.y / SUBMAP_SIZE);
  return new Tripoint({ x, y, z: pos.z });
}

/**
 * 现实气泡地图
 *
 * 管理 11x11 的 submap 网格
 */
export class GameMap {
  private readonly _props: GameMapProps;

  readonly grid!: Map<string, Submap | null>; // 11x11x21
  readonly absSub!: Tripoint; // grid[0][0][0] 的绝对 submap 坐标
  readonly caches!: Map<number, LevelCache>;
  readonly mapBuffer!: MapBuffer;
  readonly creatures!: Map<string, Creature>; // 地图上的所有生物

  constructor(props?: Partial<GameMapProps>) {
    const defaults: GameMapProps = {
      grid: GameMap.createEmptyGrid(),
      absSub: new Tripoint({ x: 0, y: 0, z: 0 }),
      caches: new Map(),
      mapBuffer: new MapBuffer(),
      creatures: new Map(),
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'grid', {
      get: () => this._props.grid,
      enumerable: true,
    });
    Object.defineProperty(this, 'absSub', {
      get: () => this._props.absSub,
      enumerable: true,
    });
    Object.defineProperty(this, 'caches', {
      get: () => this._props.caches,
      enumerable: true,
    });
    Object.defineProperty(this, 'mapBuffer', {
      get: () => this._props.mapBuffer,
      enumerable: true,
    });
    Object.defineProperty(this, 'creatures', {
      get: () => this._props.creatures,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 创建空网格
   */
  private static createEmptyGrid(): Map<string, Submap | null> {
    const grid = new Map<string, Submap | null>();
    for (let z = 0; z < OVERMAP_LAYERS; z++) {
      for (let y = 0; y < MAPSIZE; y++) {
        for (let x = 0; x < MAPSIZE; x++) {
          grid.set(`${x},${y},${z}`, null);
        }
      }
    }
    return grid;
  }

  /**
   * 设置属性值
   */
  private setProperty<K extends keyof GameMapProps>(
    key: K,
    value: GameMapProps[K]
  ): GameMap {
    const newProps = { ...this._props, [key]: value };
    return new GameMap(newProps);
  }

  /**
   * 获取指定位置的世界坐标 submap
   */
  getSubmapAt(sm: Tripoint): Submap | null {
    // 转换为本地网格坐标
    const local = this.worldToGrid(sm);

    if (!this.isValidGrid(local)) {
      return null;
    }

    return this.grid.get(`${local.x},${local.y},${local.z}`) || null;
  }

  /**
   * 设置指定位置的 submap
   */
  setSubmapAt(sm: Tripoint, submap: Submap): GameMap {
    const local = this.worldToGrid(sm);

    if (!this.isValidGrid(local)) {
      return this;
    }

    const newGrid = new Map(this.grid);
    newGrid.set(`${local.x},${local.y},${local.z}`, submap);

    // 同时更新 mapBuffer
    const newMapBuffer = this.mapBuffer.set(sm, submap);

    return this.setProperty('grid', newGrid).setProperty('mapBuffer', newMapBuffer);
  }

  /**
   * 获取指定位置的瓦片
   */
  getTile(pos: Tripoint): MapTile | null {
    // 转换为 submap 坐标
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);

    if (!submap) return null;

    // Submap 内的相对坐标（处理负数）
    const localX = ((pos.x % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;
    const localY = ((pos.y % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;

    return submap.getTile(localX, localY);
  }

  /**
   * 设置指定位置的瓦片
   */
  setTile(pos: Tripoint, tile: MapTile): GameMap {
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);

    if (!submap) return this;

    const localX = ((pos.x % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;
    const localY = ((pos.y % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;
    const newSubmap = submap.setTile(localX, localY, tile);

    return this.setSubmapAt(sm, newSubmap);
  }

  /**
   * 获取地形
   */
  getTerrain(pos: Tripoint): number | null {
    const tile = this.getTile(pos);
    return tile ? tile.terrain : null;
  }

  /**
   * 设置地形
   */
  setTerrain(pos: Tripoint, terrainId: number): GameMap {
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);

    if (!submap) return this;

    const localX = ((pos.x % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;
    const localY = ((pos.y % SUBMAP_SIZE) + SUBMAP_SIZE) % SUBMAP_SIZE;
    const newSubmap = submap.setTerrain(localX, localY, terrainId);

    return this.setSubmapAt(sm, newSubmap);
  }

  /**
   * 移动地图（加载新的 submaps）
   */
  shift(dx: number, dy: number, dz: number): GameMap {
    const submapDx = Math.sign(dx) * Math.floor(Math.abs(dx) / SUBMAP_SIZE);
    const submapDy = Math.sign(dy) * Math.floor(Math.abs(dy) / SUBMAP_SIZE);
    const submapDz = dz;

    const newAbsSub = this.absSub.add({
      x: submapDx,
      y: submapDy,
      z: submapDz,
    });

    // 重新加载网格
    const newGrid = new Map(this.grid);
    for (let z = 0; z < OVERMAP_LAYERS; z++) {
      for (let y = 0; y < MAPSIZE; y++) {
        for (let x = 0; x < MAPSIZE; x++) {
          const worldSm = newAbsSub.add({ x, y, z });
          const submap = this.mapBuffer.get(worldSm);
          newGrid.set(`${x},${y},${z}`, submap);
        }
      }
    }

    return this.setProperty('grid', newGrid).setProperty('absSub', newAbsSub);
  }

  /**
   * 获取缓存
   */
  getCache(z: number): LevelCache {
    return this.caches.get(z) || new LevelCache();
  }

  /**
   * 设置缓存
   */
  setCache(z: number, cache: LevelCache): GameMap {
    const newCaches = new Map(this.caches);
    newCaches.set(z, cache);
    return this.setProperty('caches', newCaches);
  }

  /**
   * 清空所有缓存
   */
  clearAllCaches(): GameMap {
    return this.setProperty('caches', new Map());
  }

  /**
   * 清空指定层的缓存
   */
  clearCache(z: number): GameMap {
    const newCaches = new Map(this.caches);
    newCaches.delete(z);
    return this.setProperty('caches', newCaches);
  }

  /**
   * 世界坐标转网格坐标
   */
  private worldToGrid(sm: Tripoint): Tripoint {
    return new Tripoint({
      x: sm.x - this.absSub.x,
      y: sm.y - this.absSub.y,
      z: sm.z - this.absSub.z,
    });
  }

  /**
   * 验证网格坐标是否有效
   */
  private isValidGrid(pos: Tripoint): boolean {
    return (
      pos.x >= 0 &&
      pos.x < MAPSIZE &&
      pos.y >= 0 &&
      pos.y < MAPSIZE &&
      pos.z >= 0 &&
      pos.z < OVERMAP_LAYERS
    );
  }

  /**
   * 获取网格中已加载的 submap 数量
   */
  getLoadedSubmapCount(): number {
    let count = 0;
    for (const value of this.grid.values()) {
      if (value !== null) {
        count++;
      }
    }
    return count;
  }

  /**
   * 检查位置是否在地图范围内
   */
  isInBounds(pos: Tripoint): boolean {
    const local = this.worldToGrid(posToSubmap(pos));
    return this.isValidGrid(local);
  }

  /**
   * 获取内存使用估算（字节）
   */
  getMemoryUsage(): number {
    let total = 0;

    // Grid 中的 submaps
    for (const submap of this.grid.values()) {
      if (submap) {
        total += submap.getMemoryUsage();
      }
    }

    // Caches
    for (const cache of this.caches.values()) {
      total += cache.getMemoryUsage();
    }

    // MapBuffer
    total += this.mapBuffer.getMemoryUsage();

    // Object overhead
    total += 500;

    return total;
  }

  // ========== 角色管理方法 ==========

  /**
   * 添加角色到地图
   *
   * @param creature - 要添加的角色
   * @returns 新的 GameMap 实例
   */
  addCreature(creature: Creature): GameMap {
    const newCreatures = new Map(this.creatures);
    newCreatures.set(creature.id, creature);
    return this.setProperty('creatures', newCreatures);
  }

  /**
   * 移除角色
   *
   * @param creatureId - 角色ID
   * @returns 新的 GameMap 实例
   */
  removeCreature(creatureId: string): GameMap {
    const newCreatures = new Map(this.creatures);
    newCreatures.delete(creatureId);
    return this.setProperty('creatures', newCreatures);
  }

  /**
   * 获取指定位置的角色
   *
   * @param position - 位置坐标
   * @returns 该位置的角色，如果没有则返回 undefined
   */
  getCreatureAt(position: Tripoint): Creature | undefined {
    return Array.from(this.creatures.values()).find(creature =>
      creature.position.equals(position)
    );
  }

  /**
   * 根据ID获取角色
   *
   * @param creatureId - 角色ID
   * @returns 角色实例，如果没有则返回 undefined
   */
  getCreature(creatureId: string): Creature | undefined {
    return this.creatures.get(creatureId);
  }

  /**
   * 获取所有角色
   *
   * @returns 角色数组的只读视图
   */
  getAllCreatures(): ReadonlyArray<Creature> {
    return Array.from(this.creatures.values());
  }

  /**
   * 获取指定范围内的所有角色
   *
   * @param center - 中心位置
   * @param radius - 半径
   * @returns 范围内的角色数组
   */
  getCreaturesInRange(center: Tripoint, radius: number): Creature[] {
    return Array.from(this.creatures.values()).filter(creature => {
      const distance = center.distanceTo(creature.position);
      return distance <= radius;
    });
  }

  /**
   * 更新角色位置
   *
   * @param creatureId - 角色ID
   * @param newPosition - 新位置
   * @returns 新的 GameMap 实例
   */
  updateCreaturePosition(creatureId: string, newPosition: Tripoint): GameMap {
    const creature = this.creatures.get(creatureId);
    if (!creature) {
      return this;
    }

    const updatedCreature = creature.moveTo(newPosition);
    const newCreatures = new Map(this.creatures);
    newCreatures.set(creatureId, updatedCreature);
    return this.setProperty('creatures', newCreatures);
  }

  // ========== 克隆方法 ==========

  /**
   * 克隆
   */
  clone(): GameMap {
    const newGrid = new Map<string, Submap | null>();
    for (const [key, value] of this.grid.entries()) {
      newGrid.set(key, value ? value.clone() : null);
    }

    const newCaches = new Map<number, LevelCache>();
    for (const [z, cache] of this.caches.entries()) {
      newCaches.set(z, cache.clone());
    }

    const newCreatures = new Map(this.creatures);

    return new GameMap({
      grid: newGrid,
      absSub: this.absSub,
      caches: newCaches,
      mapBuffer: this.mapBuffer.clone(),
      creatures: newCreatures,
    });
  }
}

/**
 * GameMap 属性
 */
export interface GameMapProps {
  readonly grid: Map<string, Submap | null>;
  readonly absSub: Tripoint;
  readonly caches: Map<number, LevelCache>;
  readonly mapBuffer: MapBuffer;
  readonly creatures: Map<string, Creature>;
}
