/**
 * Overmap - 大地图主类
 *
 * 管理 180x180x21 的 Overmap 数据，对应 CDDA 的 overmap 类
 */

import { City } from './City';
import { OvermapLayer } from './OvermapLayer';
import type {
  CityInterface,
  OmExtra,
  OmNote,
  OmVisionLevel,
  OvermapProps,
  PointAbsOM,
  PointOMT,
  RadioTower,
  TripointOMT,
} from './types';
import { OMAPX, OMAPY, OVERMAP_LAYERS, RadioType } from './types';

/**
 * Overmap - 大地图类
 *
 * 使用不可变数据结构，管理多层 Overmap 数据
 */
export class Overmap {
  readonly localPos: PointAbsOM;
  readonly layers: readonly OvermapLayer[];
  readonly cities: readonly City[];
  readonly radios: readonly RadioTower[];
  readonly connections: Map<string, TripointOMT[]>;
  readonly specials: Map<string, TripointOMT>;

  private constructor(props: OvermapProps) {
    this.localPos = props.localPos;
    this.layers = props.layers;
    this.cities = props.cities;
    this.radios = props.radios;
    this.connections = props.connections;
    this.specials = props.specials;

    Object.freeze(this.layers);
    Object.freeze(this.cities);
    Object.freeze(this.radios);
    Object.freeze(this);
  }

  /**
   * 创建空的 Overmap
   */
  static create(globalPos: PointAbsOM): Overmap {
    const layers: OvermapLayer[] = [];
    for (let z = 0; z < OVERMAP_LAYERS; z++) {
      layers.push(OvermapLayer.create());
    }

    return new Overmap({
      localPos: globalPos,
      layers,
      cities: [],
      radios: [],
      connections: new Map(),
      specials: new Map(),
    });
  }

  /**
   * 从属性创建 Overmap
   */
  static fromProps(props: OvermapProps): Overmap {
    const layers = props.layers.map(layerProps =>
      OvermapLayer.fromProps(layerProps)
    );

    const cities = props.cities.map(cityProps =>
      City.create(cityProps)
    );

    return new Overmap({
      ...props,
      layers,
      cities,
      radios: Object.freeze([...props.radios]),
      connections: new Map(props.connections),
      specials: new Map(props.specials),
    });
  }

  // ========== 地形操作 ==========

  /**
   * 获取指定位置的地形 ID
   */
  getTerrain(p: TripointOMT): string {
    if (!this.inBounds(p)) {
      return '';
    }
    return this.layers[p.z]?.getTerrain(p.x, p.y) || '';
  }

  /**
   * 设置指定位置的地形 ID
   */
  setTerrain(p: TripointOMT, terrainId: string): Overmap {
    if (!this.inBounds(p)) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[p.z] = newLayers[p.z].setTerrain(p.x, p.y, terrainId);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 批量设置地形 (用于初始化)
   */
  fillWithDefault(defaultTerrain: string): Overmap {
    const newLayers = this.layers.map(layer =>
      layer.fillWithDefault(defaultTerrain)
    );

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  // ========== 视野操作 ==========

  /**
   * 获取指定位置的视野等级
   */
  getSeen(p: TripointOMT): OmVisionLevel {
    if (!this.inBounds(p)) {
      return 0;
    }
    return this.layers[p.z]?.getVisible(p.x, p.y) ?? 0;
  }

  /**
   * 设置指定位置的视野等级
   */
  setSeen(p: TripointOMT, level: OmVisionLevel): Overmap {
    if (!this.inBounds(p)) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[p.z] = newLayers[p.z].setVisible(p.x, p.y, level);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 检查位置是否至少达到指定视野等级
   */
  hasSeenLevel(p: TripointOMT, level: OmVisionLevel): boolean {
    return this.getSeen(p) >= level;
  }

  // ========== 探索操作 ==========

  /**
   * 检查指定位置是否已探索
   */
  isExplored(p: TripointOMT): boolean {
    if (!this.inBounds(p)) {
      return false;
    }
    return this.layers[p.z]?.isExplored(p.x, p.y) || false;
  }

  /**
   * 探索指定位置
   */
  explore(p: TripointOMT): Overmap {
    if (!this.inBounds(p)) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[p.z] = newLayers[p.z].explore(p.x, p.y);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  // ========== 笔记操作 ==========

  /**
   * 添加笔记
   */
  addNote(note: OmNote): Overmap {
    const { z } = note.position;
    if (!this.inBounds(note.position)) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[z] = newLayers[z].addNote(note);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 移除指定位置的笔记
   */
  removeNote(p: TripointOMT): Overmap {
    if (!this.inBounds(p)) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[p.z] = newLayers[p.z].removeNote(p.x, p.y);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 获取指定位置的笔记
   */
  getNote(p: TripointOMT): OmNote | undefined {
    if (!this.inBounds(p)) {
      return undefined;
    }
    return this.layers[p.z]?.getNote(p.x, p.y);
  }

  /**
   * 检查指定位置是否有笔记
   */
  hasNote(p: TripointOMT): boolean {
    return this.getNote(p) !== undefined;
  }

  // ========== 额外内容操作 ==========

  /**
   * 添加额外内容
   */
  addExtra(extra: OmExtra): Overmap {
    const layer = this.getLayerForZ(0);
    if (!layer) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[0] = layer.addExtra(extra);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 移除指定位置的额外内容
   */
  removeExtra(p: PointOMT): Overmap {
    const layer = this.getLayerForZ(0);
    if (!layer) {
      return this;
    }

    const newLayers = [...this.layers];
    newLayers[0] = layer.removeExtra(p.x, p.y);

    return new Overmap({
      ...this,
      layers: newLayers,
    });
  }

  /**
   * 获取指定位置的额外内容
   */
  getExtra(p: PointOMT): OmExtra | undefined {
    const layer = this.getLayerForZ(0);
    return layer?.getExtra(p.x, p.y);
  }

  // ========== 城市操作 ==========

  /**
   * 添加城市
   */
  addCity(city: City): Overmap {
    return new Overmap({
      ...this,
      cities: [...this.cities, city],
    });
  }

  /**
   * 检查指定位置是否在城市内
   */
  isInCity(p: TripointOMT): boolean {
    return this.cities.some(city => city.contains(p.x, p.y));
  }

  /**
   * 获取最近的城市
   */
  getNearestCity(p: TripointOMT): City | null {
    if (this.cities.length === 0) {
      return null;
    }

    let nearest: City | null = null;
    let minDist = Infinity;

    for (const city of this.cities) {
      const dist = city.distanceTo(p.x, p.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = city;
      }
    }

    return nearest;
  }

  // ========== 边界检查 ==========

  /**
   * 检查坐标是否在边界内
   */
  inBounds(p: TripointOMT, clearance: number = 0): boolean {
    return (
      p.x >= clearance &&
      p.x < OMAPX - clearance &&
      p.y >= clearance &&
      p.y < OMAPY - clearance &&
      p.z >= 0 &&
      p.z < OVERMAP_LAYERS
    );
  }

  /**
   * 检查 2D 坐标是否在边界内
   */
  inBounds2D(x: number, y: number, clearance: number = 0): boolean {
    return (
      x >= clearance &&
      x < OMAPX - clearance &&
      y >= clearance &&
      y < OMAPY - clearance
    );
  }

  // ========== 查找方法 ==========

  /**
   * 查找所有指定地形的坐标
   */
  findTerrain(terrainId: string, z: number = 0): PointOMT[] {
    const layer = this.getLayerForZ(z);
    return layer ? layer.findTerrain(terrainId) : [];
  }

  /**
   * 查找随机指定地形的位置
   */
  findRandom(terrainId: string, z: number = 0): PointOMT | null {
    const positions = this.findTerrain(terrainId, z);
    if (positions.length === 0) {
      return null;
    }
    return positions[Math.floor(Math.random() * positions.length)];
  }

  /**
   * 查找指定半径内的所有笔记
   */
  findNotesInRange(center: TripointOMT, radius: number): OmNote[] {
    const layer = this.getLayerForZ(center.z);
    if (!layer) {
      return [];
    }

    const result: OmNote[] = [];
    for (const note of layer.notes) {
      const dx = note.position.x - center.x;
      const dy = note.position.y - center.y;
      if (dx * dx + dy * dy <= radius * radius) {
        result.push(note);
      }
    }
    return result;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): object {
    return {
      localPos: this.localPos,
      layers: this.layers.map(layer => layer.toJson()),
      cities: this.cities.map(city => city.toJson()),
      radios: this.radios,
      connections: Array.from(this.connections.entries()),
      specials: Array.from(this.specials.entries()),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: {
    localPos: PointAbsOM;
    layers: object[];
    cities: object[];
    radios: RadioTower[];
    connections: Array<[string, TripointOMT[]]>;
    specials: Array<[string, TripointOMT]>;
  }): Overmap {
    const layers = json.layers.map(layerJson =>
      OvermapLayer.fromJson(layerJson as {
        terrain: Array<[string, string]>;
        visible: Array<[string, number]>;
        explored: Array<[string, boolean]>;
        notes: OmNote[];
        extras: OmExtra[];
      })
    );

    const cities = json.cities.map(cityJson =>
      City.fromJson(cityJson as {
        pos: PointOMT;
        size: number;
        name: string;
      })
    );

    return new Overmap({
      localPos: json.localPos,
      layers,
      cities,
      radios: json.radios,
      connections: new Map(json.connections),
      specials: new Map(json.specials),
    });
  }

  // ========== 辅助方法 ==========

  /**
   * 获取指定 z 层的数据
   */
  private getLayerForZ(z: number): OvermapLayer | undefined {
    if (z < 0 || z >= this.layers.length) {
      return undefined;
    }
    return this.layers[z];
  }

  /**
   * 创建广播塔对象
   */
  static createRadioTower(
    x: number,
    y: number,
    strength: number,
    message: string,
    type: RadioType = RadioType.MESSAGE_BROADCAST
  ): RadioTower {
    return {
      position: { x, y },
      strength,
      type,
      message,
    };
  }
}
