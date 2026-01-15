/**
 * OvermapLayer - Overmap 单层数据类
 *
 * 管理单个 z 层的 Overmap 数据，包括地形、可见性、探索状态、笔记和额外内容
 */

import { OMAPX, OMAPY } from './types';
import type {
  OmExtra,
  OmNote,
  OmVisionLevel,
  OvermapLayerProps,
  PointOMT,
} from './types';

/**
 * OvermapLayer - 单层 Overmap 数据类
 *
 * 使用不可变数据结构，管理 180x180 的单层数据
 */
export class OvermapLayer {
  readonly terrain: Map<string, string>;
  readonly visible: Map<string, OmVisionLevel>;
  readonly explored: Map<string, boolean>;
  readonly notes: readonly OmNote[];
  readonly extras: readonly OmExtra[];

  private constructor(props: OvermapLayerProps) {
    this.terrain = props.terrain;
    this.visible = props.visible;
    this.explored = props.explored;
    this.notes = props.notes;
    this.extras = props.extras;

    Object.freeze(this.notes);
    Object.freeze(this.extras);
    Object.freeze(this);
  }

  /**
   * 创建空的 OvermapLayer
   */
  static create(): OvermapLayer {
    return new OvermapLayer({
      terrain: new Map(),
      visible: new Map(),
      explored: new Map(),
      notes: [],
      extras: [],
    });
  }

  /**
   * 从属性创建 OvermapLayer
   */
  static fromProps(props: OvermapLayerProps): OvermapLayer {
    return new OvermapLayer({
      terrain: new Map(props.terrain),
      visible: new Map(props.visible),
      explored: new Map(props.explored),
      notes: Object.freeze([...props.notes]),
      extras: Object.freeze([...props.extras]),
    });
  }

  // ========== 坐标键辅助方法 ==========

  /**
   * 生成坐标键
   */
  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * 从坐标键解析坐标
   */
  private fromKey(key: string): PointOMT {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  // ========== 地形操作 ==========

  /**
   * 获取指定位置的地形 ID
   */
  getTerrain(x: number, y: number): string {
    return this.terrain.get(this.key(x, y)) || '';
  }

  /**
   * 设置指定位置的地形 ID
   */
  setTerrain(x: number, y: number, terrainId: string): OvermapLayer {
    const newTerrain = new Map(this.terrain);
    newTerrain.set(this.key(x, y), terrainId);
    return new OvermapLayer({
      ...this,
      terrain: newTerrain,
    });
  }

  /**
   * 批量设置地形 (用于初始化)
   */
  fillWithDefault(defaultTerrain: string): OvermapLayer {
    const terrain = new Map<string, string>();
    for (let y = 0; y < OMAPY; y++) {
      for (let x = 0; x < OMAPX; x++) {
        terrain.set(this.key(x, y), defaultTerrain);
      }
    }
    return new OvermapLayer({
      ...this,
      terrain,
    });
  }

  // ========== 可见性操作 ==========

  /**
   * 获取指定位置的视野等级
   */
  getVisible(x: number, y: number): OmVisionLevel {
    return this.visible.get(this.key(x, y)) ?? 0;
  }

  /**
   * 设置指定位置的视野等级
   */
  setVisible(x: number, y: number, level: OmVisionLevel): OvermapLayer {
    const newVisible = new Map(this.visible);
    newVisible.set(this.key(x, y), level);
    return new OvermapLayer({
      ...this,
      visible: newVisible,
    });
  }

  /**
   * 检查位置是否至少达到指定视野等级
   */
  hasVisibleLevel(x: number, y: number, level: OmVisionLevel): boolean {
    return this.getVisible(x, y) >= level;
  }

  // ========== 探索状态操作 ==========

  /**
   * 检查指定位置是否已探索
   */
  isExplored(x: number, y: number): boolean {
    return this.explored.get(this.key(x, y)) || false;
  }

  /**
   * 设置指定位置的探索状态
   */
  setExplored(x: number, y: number, explored: boolean): OvermapLayer {
    const newExplored = new Map(this.explored);
    newExplored.set(this.key(x, y), explored);
    return new OvermapLayer({
      ...this,
      explored: newExplored,
    });
  }

  /**
   * 探索指定位置
   */
  explore(x: number, y: number): OvermapLayer {
    return this.setExplored(x, y, true);
  }

  // ========== 笔记操作 ==========

  /**
   * 添加笔记
   */
  addNote(note: OmNote): OvermapLayer {
    return new OvermapLayer({
      ...this,
      notes: [...this.notes, note],
    });
  }

  /**
   * 移除指定位置的笔记
   */
  removeNote(x: number, y: number): OvermapLayer {
    const filteredNotes = this.notes.filter(
      note => note.position.x !== x || note.position.y !== y
    );
    return new OvermapLayer({
      ...this,
      notes: filteredNotes,
    });
  }

  /**
   * 获取指定位置的笔记
   */
  getNote(x: number, y: number): OmNote | undefined {
    return this.notes.find(
      note => note.position.x === x && note.position.y === y
    );
  }

  /**
   * 检查指定位置是否有笔记
   */
  hasNote(x: number, y: number): boolean {
    return this.getNote(x, y) !== undefined;
  }

  // ========== 额外内容操作 ==========

  /**
   * 添加额外内容
   */
  addExtra(extra: OmExtra): OvermapLayer {
    return new OvermapLayer({
      ...this,
      extras: [...this.extras, extra],
    });
  }

  /**
   * 移除指定位置的额外内容
   */
  removeExtra(pos: { x: number; y: number }): OvermapLayer {
    const filteredExtras = this.extras.filter(
      extra => extra.position.x !== pos.x || extra.position.y !== pos.y
    );
    return new OvermapLayer({
      ...this,
      extras: filteredExtras,
    });
  }

  /**
   * 获取指定位置的额外内容
   */
  getExtra(x: number, y: number): OmExtra | undefined {
    return this.extras.find(
      extra => extra.position.x === x && extra.position.y === y
    );
  }

  /**
   * 检查指定位置是否有额外内容
   */
  hasExtra(x: number, y: number): boolean {
    return this.getExtra(x, y) !== undefined;
  }

  // ========== 查询方法 ==========

  /**
   * 获取所有指定地形的坐标
   */
  findTerrain(terrainId: string): PointOMT[] {
    const results: PointOMT[] = [];
    for (const [key, value] of this.terrain.entries()) {
      if (value === terrainId) {
        results.push(this.fromKey(key));
      }
    }
    return results;
  }

  /**
   * 查找随机指定地形的位置
   */
  findRandomTerrain(terrainId: string): PointOMT | null {
    const positions = this.findTerrain(terrainId);
    if (positions.length === 0) {
      return null;
    }
    return positions[Math.floor(Math.random() * positions.length)];
  }

  /**
   * 获取已探索的地形数量
   */
  getExploredCount(): number {
    let count = 0;
    for (const explored of this.explored.values()) {
      if (explored) count++;
    }
    return count;
  }

  /**
   * 获取总地形数量
   */
  getTotalTerrainCount(): number {
    return this.terrain.size;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): object {
    return {
      terrain: Array.from(this.terrain.entries()),
      visible: Array.from(this.visible.entries()),
      explored: Array.from(this.explored.entries()),
      notes: this.notes,
      extras: this.extras,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: {
    terrain: Array<[string, string]>;
    visible: Array<[string, number]>;
    explored: Array<[string, boolean]>;
    notes: OmNote[];
    extras: OmExtra[];
  }): OvermapLayer {
    return new OvermapLayer({
      terrain: new Map(json.terrain),
      visible: new Map(json.visible),
      explored: new Map(json.explored),
      notes: json.notes,
      extras: json.extras,
    });
  }
}
