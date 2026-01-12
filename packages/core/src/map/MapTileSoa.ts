import { MapTile } from './MapTile';
import { TerrainId } from '../terrain/types';
import { FurnitureId } from '../furniture/types';
import { FieldEntry } from '../field/FieldEntry';
import { TrapId } from '../trap/types';

/**
 * SOA (Structure of Arrays) 地图瓦片数据
 *
 * 优化缓存性能，每个属性使用独立的数组存储
 */
export class MapTileSoa {
  readonly terrain: Uint16Array;
  readonly furniture: Uint32Array; // 使用 Uint32Array 以支持更大的家具 ID
  readonly radiation: Uint16Array;
  readonly traps: Map<string, TrapId>; // 使用 Map 存储字符串 trap ID
  readonly fields: Map<string, FieldEntry>;

  constructor(readonly size: number, terrain?: TerrainId[]) {
    const count = size * size;

    this.terrain = new Uint16Array(count);
    this.furniture = new Uint32Array(count);
    this.radiation = new Uint16Array(count);
    this.traps = new Map();
    this.fields = new Map();

    // 初始化地形
    if (terrain) {
      for (let i = 0; i < count && i < terrain.length; i++) {
        this.terrain[i] = terrain[i];
      }
    }
  }

  /**
   * 从 uniform 地形创建
   */
  static fromUniform(terrainId: TerrainId, size: number): MapTileSoa {
    const count = size * size;
    const soa = new MapTileSoa(size);

    // 填充所有地形
    for (let i = 0; i < count; i++) {
      soa.terrain[i] = terrainId;
    }

    return soa;
  }

  /**
   * 创建空 SOA
   */
  static createEmpty(size: number): MapTileSoa {
    return new MapTileSoa(size);
  }

  /**
   * 获取索引
   */
  private getIndex(x: number, y: number): number {
    return y * this.size + x;
  }

  /**
   * 验证坐标
   */
  private isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  /**
   * 获取瓦片
   */
  getTile(x: number, y: number): MapTile {
    if (!this.isValid(x, y)) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }

    const idx = this.getIndex(x, y);
    const key = `${x},${y}`;

    return new MapTile({
      terrain: this.terrain[idx],
      furniture: this.furniture[idx] || null,
      radiation: this.radiation[idx],
      field: this.fields.get(key) || null,
      trap: this.traps.get(key) || null,
    });
  }

  /**
   * 设置瓦片
   */
  setTile(x: number, y: number, tile: MapTile): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const idx = this.getIndex(x, y);
    const key = `${x},${y}`;

    // 创建新的数组副本
    const newSoa = new MapTileSoa(this.size);

    // 复制现有数据
    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 更新值
    newSoa.terrain[idx] = tile.terrain;
    newSoa.furniture[idx] = tile.furniture || 0;
    newSoa.radiation[idx] = tile.radiation;

    // 更新 trap
    if (tile.trap) {
      newSoa.traps.set(key, tile.trap);
    } else {
      newSoa.traps.delete(key);
    }

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    // 更新 field
    if (tile.field && tile.field.isAlive) {
      newSoa.fields.set(key, tile.field);
    } else {
      newSoa.fields.delete(key);
    }

    return newSoa;
  }

  /**
   * 获取地形
   */
  getTerrain(x: number, y: number): TerrainId {
    if (!this.isValid(x, y)) {
      return 0; // t_null
    }
    return this.terrain[this.getIndex(x, y)];
  }

  /**
   * 设置地形
   */
  setTerrain(x: number, y: number, terrainId: TerrainId): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const idx = this.getIndex(x, y);
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    newSoa.terrain[idx] = terrainId;

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    return newSoa;
  }

  /**
   * 获取家具
   */
  getFurniture(x: number, y: number): FurnitureId | null {
    if (!this.isValid(x, y)) {
      return null;
    }
    const furnitureId = this.furniture[this.getIndex(x, y)];
    return furnitureId || null;
  }

  /**
   * 设置家具
   */
  setFurniture(x: number, y: number, furnitureId: FurnitureId | null): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const idx = this.getIndex(x, y);
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    newSoa.furniture[idx] = furnitureId || 0;

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    return newSoa;
  }

  /**
   * 获取场
   */
  getField(x: number, y: number): FieldEntry | null {
    const key = `${x},${y}`;
    return this.fields.get(key) || null;
  }

  /**
   * 设置场
   */
  setField(x: number, y: number, field: FieldEntry | null): MapTileSoa {
    const key = `${x},${y}`;
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((f, k) => {
      newSoa.fields.set(k, f);
    });

    // 设置新 field
    if (field && field.isAlive) {
      newSoa.fields.set(key, field);
    } else {
      newSoa.fields.delete(key);
    }

    return newSoa;
  }

  /**
   * 获取陷阱
   */
  getTrap(x: number, y: number): TrapId | null {
    if (!this.isValid(x, y)) {
      return null;
    }
    const key = `${x},${y}`;
    return this.traps.get(key) || null;
  }

  /**
   * 设置陷阱
   */
  setTrap(x: number, y: number, trapId: TrapId | null): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const key = `${x},${y}`;
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 设置新 trap
    if (trapId) {
      newSoa.traps.set(key, trapId);
    } else {
      newSoa.traps.delete(key);
    }

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    return newSoa;
  }

  /**
   * 获取所有瓦片
   */
  allTiles(): MapTile[] {
    const tiles: MapTile[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        tiles.push(this.getTile(x, y));
      }
    }
    return tiles;
  }

  /**
   * 获取所有地形
   */
  allTerrain(): TerrainId[] {
    return Array.from(this.terrain);
  }

  /**
   * 检查是否所有瓦片都是同一地形
   */
  isUniform(terrainId?: TerrainId): boolean {
    const first = this.terrain[0];
    const checkId = terrainId !== undefined ? terrainId : first;

    for (let i = 1; i < this.terrain.length; i++) {
      if (this.terrain[i] !== checkId) {
        return false;
      }
    }

    return true;
  }

  /**
   * 填充地形
   */
  fillTerrain(terrainId: TerrainId): MapTileSoa {
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.fill(terrainId);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    return newSoa;
  }

  /**
   * 克隆
   */
  clone(): MapTileSoa {
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.radiation.set(this.radiation);

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field.clone());
    });

    return newSoa;
  }
}
