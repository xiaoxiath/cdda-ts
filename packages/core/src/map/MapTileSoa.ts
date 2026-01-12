import { MapTile } from './MapTile';
import { TerrainId } from '../terrain/types';
import { FurnitureId } from '../furniture/types';
import { FieldEntry } from '../field/FieldEntry';
import { TrapId } from '../trap/types';

/**
 * 物品接口（简化版，用于 SOA 存储）
 * 匹配 CDDA item 类的基本功能
 */
export interface Item {
  id: string;
  type: string;
  count: number;
  charges?: number;
}

/**
 * SOA (Structure of Arrays) 地图瓦片数据
 * 匹配 CDDA maptile_soa 结构
 */
export class MapTileSoa {
  readonly terrain: Uint16Array;
  readonly furniture: Uint32Array;
  readonly lum: Uint8Array;        // 发光物品数量，匹配 CDDA std::uint8_t lum
  readonly items: Map<string, Item[]>; // 物品列表，匹配 CDDA cata::colony<item> itm
  readonly radiation: Uint16Array;
  readonly traps: Map<string, TrapId>;
  readonly fields: Map<string, FieldEntry>;

  constructor(readonly size: number, terrain?: TerrainId[]) {
    const count = size * size;

    this.terrain = new Uint16Array(count);
    this.furniture = new Uint32Array(count);
    this.lum = new Uint8Array(count);
    this.radiation = new Uint16Array(count);
    this.traps = new Map();
    this.fields = new Map();
    this.items = new Map();

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

    // 获取该位置的所有物品
    const tileItems = this.items.get(key) || [];

    return new MapTile({
      terrain: this.terrain[idx],
      furniture: this.furniture[idx] || null,
      lum: this.lum[idx],
      items: tileItems,
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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 更新值
    newSoa.terrain[idx] = tile.terrain;
    newSoa.furniture[idx] = tile.furniture || 0;
    newSoa.lum[idx] = tile.lum || 0;
    newSoa.radiation[idx] = tile.radiation;

    // 更新 items
    if (tile.items && tile.items.length > 0) {
      newSoa.items.set(key, tile.items);
    } else {
      newSoa.items.delete(key);
    }

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    newSoa.terrain[idx] = terrainId;

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    newSoa.furniture[idx] = furnitureId || 0;

    return newSoa;
  }

  /**
   * 获取光照等级（发光物品数量）
   * 匹配 CDDA maptile_soa::lum
   */
  getLum(x: number, y: number): number {
    if (!this.isValid(x, y)) {
      return 0;
    }
    return this.lum[this.getIndex(x, y)];
  }

  /**
   * 设置光照等级
   * 匹配 CDDA maptile_soa::lum
   */
  setLum(x: number, y: number, lum: number): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const idx = this.getIndex(x, y);
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    newSoa.lum[idx] = Math.max(0, Math.min(255, lum));

    return newSoa;
  }

  /**
   * 增加光照等级（发光物品增加）
   */
  addLum(x: number, y: number, delta: number = 1): MapTileSoa {
    const currentLum = this.getLum(x, y);
    return this.setLum(x, y, currentLum + delta);
  }

  /**
   * 减少光照等级（发光物品移除）
   */
  subLum(x: number, y: number, delta: number = 1): MapTileSoa {
    const currentLum = this.getLum(x, y);
    return this.setLum(x, y, Math.max(0, currentLum - delta));
  }

  /**
   * 获取物品列表
   * 匹配 CDDA maptile_soa::itm
   */
  getItems(x: number, y: number): Item[] {
    const key = `${x},${y}`;
    return this.items.get(key) || [];
  }

  /**
   * 添加物品
   */
  addItem(x: number, y: number, item: Item): MapTileSoa {
    const key = `${x},${y}`;
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    // 添加新物品
    const currentItems = this.items.get(key) || [];
    newSoa.items.set(key, [...currentItems, item]);

    // 如果物品发光，增加 lum
    // TODO: 需要根据物品类型判断是否发光
    // newSoa = newSoa.addLum(x, y, 1);

    return newSoa;
  }

  /**
   * 移除物品
   */
  removeItem(x: number, y: number, itemIndex: number): MapTileSoa {
    const key = `${x},${y}`;
    const currentItems = this.items.get(key);

    if (!currentItems || itemIndex < 0 || itemIndex >= currentItems.length) {
      return this;
    }

    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    // 移除物品
    const newItems = [...currentItems];
    const removedItem = newItems.splice(itemIndex, 1)[0];
    newSoa.items.set(key, newItems);

    // 如果物品发光，减少 lum
    // TODO: 需要根据物品类型判断是否发光
    // newSoa = newSoa.subLum(x, y, 1);

    return newSoa;
  }

  /**
   * 清空物品
   */
  clearItems(x: number, y: number): MapTileSoa {
    const key = `${x},${y}`;
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items（跳过当前 key）
    this.items.forEach((items, k) => {
      if (k !== key) {
        newSoa.items.set(k, [...items]);
      }
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    newSoa.items.delete(key);

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    // 设置新 trap
    if (trapId) {
      newSoa.traps.set(key, trapId);
    } else {
      newSoa.traps.delete(key);
    }

    return newSoa;
  }

  /**
   * 获取辐射值
   */
  getRadiation(x: number, y: number): number {
    if (!this.isValid(x, y)) {
      return 0;
    }
    return this.radiation[this.getIndex(x, y)];
  }

  /**
   * 设置辐射值
   */
  setRadiation(x: number, y: number, radiation: number): MapTileSoa {
    if (!this.isValid(x, y)) {
      return this;
    }

    const idx = this.getIndex(x, y);
    const newSoa = new MapTileSoa(this.size);

    newSoa.terrain.set(this.terrain);
    newSoa.furniture.set(this.furniture);
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field);
    });

    newSoa.radiation[idx] = Math.max(0, radiation);

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

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
    newSoa.lum.set(this.lum);
    newSoa.radiation.set(this.radiation);

    // 复制 items
    this.items.forEach((items, k) => {
      newSoa.items.set(k, [...items]);
    });

    // 复制 traps
    this.traps.forEach((trap, k) => {
      newSoa.traps.set(k, trap);
    });

    // 复制 fields
    this.fields.forEach((field, k) => {
      newSoa.fields.set(k, field.clone());
    });

    return newSoa;
  }
}
