import { MapTile } from './MapTile';
import { MapTileSoa } from './MapTileSoa';
import { TerrainId } from '../terrain/types';
import { Point } from '../coordinates/Point';

/**
 * Submap 配置常量
 */
export const SUBMAP_SIZE = 12; // SEEX = SEEY = 12

/**
 * 生成点
 */
export interface SpawnPoint {
  type: string;
  position: Point;
  data: Record<string, unknown>;
}

/**
 * 部分建造的建筑
 */
export interface PartialConstruction {
  position: Point;
  progress: number;
  type: string;
}

/**
 * Submap 属性
 */
export interface SubmapProps {
  readonly size: number;
  readonly tiles: MapTileSoa | null; // null 表示 uniform
  readonly uniformTerrain: TerrainId | null;
  readonly spawns: SpawnPoint[];
  readonly fieldCount: number;
  readonly lastTouched: number;
}

/**
 * 子地图
 *
 * 存储单元，包含 12x12 的地图方块
 */
export class Submap {
  private readonly _props: SubmapProps;

  readonly size!: number;
  readonly tiles!: MapTileSoa | null;
  readonly uniformTerrain!: TerrainId | null;
  readonly spawns!: SpawnPoint[];
  readonly fieldCount!: number;
  readonly lastTouched!: number;

  constructor(props?: Partial<SubmapProps>) {
    const defaults: SubmapProps = {
      size: SUBMAP_SIZE,
      tiles: null,
      uniformTerrain: null,
      spawns: [],
      fieldCount: 0,
      lastTouched: Date.now(),
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'size', {
      get: () => this._props.size,
      enumerable: true,
    });
    Object.defineProperty(this, 'tiles', {
      get: () => this._props.tiles,
      enumerable: true,
    });
    Object.defineProperty(this, 'uniformTerrain', {
      get: () => this._props.uniformTerrain,
      enumerable: true,
    });
    Object.defineProperty(this, 'spawns', {
      get: () => this._props.spawns,
      enumerable: true,
    });
    Object.defineProperty(this, 'fieldCount', {
      get: () => this._props.fieldCount,
      enumerable: true,
    });
    Object.defineProperty(this, 'lastTouched', {
      get: () => this._props.lastTouched,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private set<K extends keyof SubmapProps>(key: K, value: SubmapProps[K]): Submap {
    const newProps = { ...this._props, [key]: value };

    // 当设置 tiles 时，同步更新 uniformTerrain
    if (key === 'tiles') {
      if (value !== null) {
        newProps.uniformTerrain = null;
      }
    }

    // 当设置 uniformTerrain 时，同步更新 tiles
    if (key === 'uniformTerrain') {
      if (value !== null) {
        newProps.tiles = null;
      }
    }

    return new Submap(newProps);
  }

  /**
   * 创建 uniform submap
   */
  static createUniform(terrainId: TerrainId): Submap {
    return new Submap({
      uniformTerrain: terrainId,
      tiles: null,
    });
  }

  /**
   * 创建空 submap
   */
  static createEmpty(): Submap {
    return new Submap({
      tiles: new MapTileSoa(SUBMAP_SIZE),
      uniformTerrain: null,
    });
  }

  /**
   * 是否为 uniform submap（整个 submap 是同一地形）
   */
  isUniform(): boolean {
    return this.uniformTerrain !== null;
  }

  /**
   * 获取指定位置的瓦片
   */
  getTile(x: number, y: number): MapTile {
    if (this.isUniform()) {
      return MapTile.fromTerrain(this.uniformTerrain!);
    }
    return this.tiles!.getTile(x, y);
  }

  /**
   * 获取地形
   */
  getTerrain(x: number, y: number): TerrainId {
    if (this.isUniform()) {
      return this.uniformTerrain!;
    }
    return this.tiles!.getTerrain(x, y);
  }

  /**
   * 设置指定位置的瓦片
   */
  setTile(x: number, y: number, tile: MapTile): Submap {
    // 如果是 uniform，需要先转换为非 uniform
    if (this.isUniform()) {
      const newTiles = MapTileSoa.fromUniform(this.uniformTerrain!, this.size);
      const updatedTiles = newTiles.setTile(x, y, tile);
      return this.set('tiles', updatedTiles).set('uniformTerrain', null);
    }

    const updatedTiles = this.tiles!.setTile(x, y, tile);

    // 更新 field count
    let newFieldCount = this.fieldCount;
    if (tile.field && tile.field.isAlive) {
      if (!this.tiles!.getField(x, y)) {
        newFieldCount++;
      }
    } else {
      if (this.tiles!.getField(x, y)) {
        newFieldCount--;
      }
    }

    return this.set('tiles', updatedTiles).set('fieldCount', newFieldCount);
  }

  /**
   * 设置地形
   */
  setTerrain(x: number, y: number, terrainId: TerrainId): Submap {
    // 如果是 uniform，检查是否仍为 uniform
    if (this.isUniform()) {
      if (this.uniformTerrain === terrainId) {
        return this;
      }
      // 转换为非 uniform
      const newTiles = MapTileSoa.fromUniform(this.uniformTerrain!, this.size);
      const updatedTiles = newTiles.setTerrain(x, y, terrainId);
      return this.set('tiles', updatedTiles).set('uniformTerrain', null);
    }

    const updatedTiles = this.tiles!.setTerrain(x, y, terrainId);
    return this.set('tiles', updatedTiles);
  }

  /**
   * 设置家具
   */
  setFurniture(x: number, y: number, furnitureId: number): Submap {
    if (this.isUniform()) {
      const newTiles = MapTileSoa.fromUniform(this.uniformTerrain!, this.size);
      const updatedTiles = newTiles.setFurniture(x, y, furnitureId);
      return this.set('tiles', updatedTiles).set('uniformTerrain', null);
    }

    const updatedTiles = this.tiles!.setFurniture(x, y, furnitureId);
    return this.set('tiles', updatedTiles);
  }

  /**
   * 设置场
   */
  setField(x: number, y: number, field: MapTile['field']): Submap {
    if (this.isUniform()) {
      const newTiles = MapTileSoa.fromUniform(this.uniformTerrain!, this.size);
      const updatedTiles = newTiles.setField(x, y, field);
      return this.set('tiles', updatedTiles).set('uniformTerrain', null);
    }

    const updatedTiles = this.tiles!.setField(x, y, field);

    // 更新 field count
    let newFieldCount = this.fieldCount;
    if (field && field.isAlive) {
      if (!this.tiles!.getField(x, y)) {
        newFieldCount++;
      }
    } else {
      if (this.tiles!.getField(x, y)) {
        newFieldCount--;
      }
    }

    return this.set('tiles', updatedTiles).set('fieldCount', newFieldCount);
  }

  /**
   * 设置陷阱
   */
  setTrap(x: number, y: number, trapId: string | null): Submap {
    if (this.isUniform()) {
      const newTiles = MapTileSoa.fromUniform(this.uniformTerrain!, this.size);
      const updatedTiles = newTiles.setTrap(x, y, trapId);
      return this.set('tiles', updatedTiles).set('uniformTerrain', null);
    }

    const updatedTiles = this.tiles!.setTrap(x, y, trapId);
    return this.set('tiles', updatedTiles);
  }

  /**
   * 转换为 uniform（如果所有瓦片地形相同）
   */
  optimize(): Submap {
    if (this.isUniform()) {
      return this;
    }

    if (!this.tiles) {
      return this;
    }

    const firstTerrain = this.tiles.terrain[0];
    const isUniform = this.tiles.isUniform(firstTerrain);

    if (isUniform) {
      return this.set('tiles', null).set('uniformTerrain', firstTerrain);
    }

    return this;
  }

  /**
   * 获取所有瓦片
   */
  allTiles(): MapTile[] {
    if (this.isUniform()) {
      const count = this.size * this.size;
      const tiles: MapTile[] = [];
      const tile = MapTile.fromTerrain(this.uniformTerrain!);
      for (let i = 0; i < count; i++) {
        tiles.push(tile);
      }
      return tiles;
    }

    return this.tiles!.allTiles();
  }

  /**
   * 填充地形
   */
  fillTerrain(terrainId: TerrainId): Submap {
    if (this.isUniform()) {
      if (this.uniformTerrain === terrainId) {
        return this;
      }
      return this.set('uniformTerrain', terrainId);
    }

    const updatedTiles = this.tiles!.fillTerrain(terrainId);
    return this.set('tiles', updatedTiles);
  }

  /**
   * 添加生成点
   */
  addSpawn(spawn: SpawnPoint): Submap {
    return this.set('spawns', [...this.spawns, spawn]);
  }

  /**
   * 清除生成点
   */
  clearSpawns(): Submap {
    return this.set('spawns', []);
  }

  /**
   * 更新触摸时间
   */
  touch(): Submap {
    return this.set('lastTouched', Date.now());
  }

  /**
   * 获取内存使用估算（字节）
   */
  getMemoryUsage(): number {
    let total = 0;

    if (this.tiles) {
      // Terrain: 2 bytes * 144 = 288 bytes
      // Furniture: 2 bytes * 144 = 288 bytes
      // Radiation: 2 bytes * 144 = 288 bytes
      // Traps: 2 bytes * 144 = 288 bytes
      total += 4 * 2 * this.size * this.size;

      // Fields: Map overhead
      total += this.tiles.fields.size * 100; // 估算每个 FieldEntry 100 bytes
    }

    // Spawns
    total += this.spawns.length * 50; // 估算每个 SpawnPoint 50 bytes

    // Object overhead
    total += 200;

    return total;
  }

  /**
   * 克隆
   */
  clone(): Submap {
    const clonedTiles = this.tiles ? this.tiles.clone() : null;

    return new Submap({
      size: this.size,
      tiles: clonedTiles,
      uniformTerrain: this.uniformTerrain,
      spawns: this.spawns.map((spawn) => ({ ...spawn })),
      fieldCount: this.fieldCount,
      lastTouched: this.lastTouched,
    });
  }

  /**
   * 旋转子地图
   * 匹配 CDDA submap::rotate()
   * @param turns 旋转次数（90度顺时针）
   */
  rotate(turns: number): Submap {
    // 如果是 uniform，旋转不会改变任何东西
    if (this.isUniform()) {
      return this;
    }

    turns = ((turns % 4) + 4) % 4; // 规范化到 0-3

    if (turns === 0) {
      return this;
    }

    const dim = { x: this.size, y: this.size };
    const newTiles = this.tiles!.clone();

    // 旋转瓦片数据
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const fromPoint = { x, y };
        const toPoint = this._rotatePoint(fromPoint, turns, dim);
        this._swapTiles(newTiles, fromPoint, toPoint);
      }
    }

    // 旋转生成点位置
    const rotatedSpawns = this.spawns.map((spawn) => ({
      ...spawn,
      position: Point.from(
        spawn.position.x,
        spawn.position.y,
      ).rotate(turns, Point.from(dim.x, dim.y)),
    }));

    return this.set('tiles', newTiles).set('spawns', rotatedSpawns);
  }

  /**
   * 镜像子地图
   * 匹配 CDDA submap::mirror()
   * @param horizontally true=水平镜像, false=垂直镜像
   */
  mirror(horizontally: boolean): Submap {
    // 如果是 uniform，镜像不会改变任何东西
    if (this.isUniform()) {
      return this;
    }

    const newTiles = this.tiles!.clone();
    const size = this.size;

    if (horizontally) {
      // 水平镜像：左右翻转
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size / 2; x++) {
          this._swapTiles(newTiles, { x, y }, { x: size - 1 - x, y });
        }
      }
    } else {
      // 垂直镜像：上下翻转
      for (let y = 0; y < size / 2; y++) {
        for (let x = 0; x < size; x++) {
          this._swapTiles(newTiles, { x, y }, { x, y: size - 1 - y });
        }
      }
    }

    // 镜像生成点位置
    const mirroredSpawns = this.spawns.map((spawn) => {
      let newX = spawn.position.x;
      let newY = spawn.position.y;

      if (horizontally) {
        newX = size - 1 - spawn.position.x;
      } else {
        newY = size - 1 - spawn.position.y;
      }

      return {
        ...spawn,
        position: Point.from(newX, newY),
      };
    });

    return this.set('tiles', newTiles).set('spawns', mirroredSpawns);
  }

  /**
   * 旋转点的辅助方法
   * 匹配 CDDA point::rotate()
   */
  private _rotatePoint(
    p: { x: number; y: number },
    turns: number,
    dim: { x: number; y: number }
  ): { x: number; y: number } {
    let x = p.x;
    let y = p.y;

    for (let i = 0; i < turns; i++) {
      const tmp = y;
      y = x;
      x = dim.y - 1 - tmp;
    }

    return { x, y };
  }

  /**
   * 交换两个位置的瓦片数据
   * 匹配 CDDA maptile_soa::swap_soa_tile()
   */
  private _swapTiles(
    tiles: MapTileSoa,
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): void {
    // 交换地形
    const tempTerrain = tiles.terrain[p1.y * tiles.size + p1.x];
    tiles.terrain[p1.y * tiles.size + p1.x] = tiles.terrain[p2.y * tiles.size + p2.x];
    tiles.terrain[p2.y * tiles.size + p2.x] = tempTerrain;

    // 交换家具
    const tempFurniture = tiles.furniture[p1.y * tiles.size + p1.x];
    tiles.furniture[p1.y * tiles.size + p1.x] = tiles.furniture[p2.y * tiles.size + p2.x];
    tiles.furniture[p2.y * tiles.size + p2.x] = tempFurniture;

    // 交换光照
    const tempLum = tiles.lum[p1.y * tiles.size + p1.x];
    tiles.lum[p1.y * tiles.size + p1.x] = tiles.lum[p2.y * tiles.size + p2.x];
    tiles.lum[p2.y * tiles.size + p2.x] = tempLum;

    // 交换辐射
    const tempRad = tiles.radiation[p1.y * tiles.size + p1.x];
    tiles.radiation[p1.y * tiles.size + p1.x] = tiles.radiation[p2.y * tiles.size + p2.x];
    tiles.radiation[p2.y * tiles.size + p2.x] = tempRad;

    // 交换物品
    const key1 = `${p1.x},${p1.y}`;
    const key2 = `${p2.x},${p2.y}`;
    const tempItems = tiles.items.get(key1);
    tiles.items.set(key1, tiles.items.get(key2) || []);
    tiles.items.set(key2, tempItems || []);

    // 交换场
    const tempField = tiles.fields.get(key1);
    tiles.fields.set(key1, tiles.fields.get(key2)!);
    tiles.fields.set(key2, tempField!);

    // 交换陷阱
    const tempTrap = tiles.traps.get(key1);
    tiles.traps.set(key1, tiles.traps.get(key2)!);
    tiles.traps.set(key2, tempTrap!);
  }
}
