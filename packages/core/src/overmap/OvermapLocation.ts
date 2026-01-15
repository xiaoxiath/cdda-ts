/**
 * OvermapLocation - Overmap 位置类型系统
 *
 * 管理位置类型定义，对应 CDDA 的 overmap_location
 */

import type { OvermapLocationJson } from './types';

/**
 * OvermapLocation - 位置类型类
 *
 * 使用不可变数据结构表示位置类型
 */
export class OvermapLocation {
  readonly id: string;
  readonly terrains: readonly string[];

  private constructor(props: { id: string; terrains: string[] }) {
    this.id = props.id;
    this.terrains = props.terrains;

    Object.freeze(this.terrains);
    Object.freeze(this);
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: OvermapLocationJson): OvermapLocation {
    return new OvermapLocation({
      id: json.id,
      terrains: json.terrains || [],
    });
  }

  /**
   * 检查是否包含指定地形
   */
  hasTerrain(terrainId: string): boolean {
    return this.terrains.includes(terrainId);
  }

  /**
   * 检查是否包含任意指定地形
   */
  hasAnyTerrain(terrainIds: string[]): boolean {
    return terrainIds.some(id => this.terrains.includes(id));
  }

  /**
   * 获取地形数量
   */
  getTerrainCount(): number {
    return this.terrains.length;
  }

  /**
   * 获取所有地形
   */
  getAllTerrains(): readonly string[] {
    return this.terrains;
  }

  /**
   * 获取随机地形
   */
  getRandomTerrain(): string | null {
    if (this.terrains.length === 0) {
      return null;
    }
    return this.terrains[Math.floor(Math.random() * this.terrains.length)];
  }

  /**
   * 创建空的 OvermapLocation
   */
  static create(id: string): OvermapLocation {
    return new OvermapLocation({ id, terrains: [] });
  }

  /**
   * 创建带地形的 OvermapLocation
   */
  static createWithTerrains(id: string, terrains: string[]): OvermapLocation {
    return new OvermapLocation({ id, terrains });
  }

  /**
   * 转换为 JSON
   */
  toJson(): OvermapLocationJson {
    return {
      type: 'overmap_location',
      id: this.id,
      terrains: Array.from(this.terrains),
    };
  }
}
