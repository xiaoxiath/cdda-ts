/**
 * OvermapSpecial - Overmap 特殊地点系统
 *
 * 管理特殊地点的定义和配置，对应 CDDA 的 overmap_special
 */

import type {
  OvermapSpecialJson,
  OvermapSpecialEntry,
  SpecialConnection,
} from './types';

/**
 * OvermapSpecial - 特殊地点类
 *
 * 使用不可变数据结构表示特殊地点
 */
export class OvermapSpecial {
  readonly id: string;
  readonly subtype: 'fixed' | 'mutable';
  readonly locations: readonly string[];
  readonly cityDistance: readonly [number, number];
  readonly citySizes: readonly [number, number];
  readonly occurrences: readonly [number, number];
  readonly flags: ReadonlySet<string>;
  readonly rotate: boolean;
  readonly overmaps: readonly OvermapSpecialEntry[];
  readonly connections: readonly SpecialConnection[];

  private constructor(props: {
    id: string;
    subtype: 'fixed' | 'mutable';
    locations: string[];
    cityDistance: [number, number];
    citySizes: [number, number];
    occurrences: [number, number];
    flags: Set<string>;
    rotate: boolean;
    overmaps: OvermapSpecialEntry[];
    connections: SpecialConnection[];
  }) {
    this.id = props.id;
    this.subtype = props.subtype;
    this.locations = props.locations;
    this.cityDistance = props.cityDistance;
    this.citySizes = props.citySizes;
    this.occurrences = props.occurrences;
    this.flags = props.flags;
    this.rotate = props.rotate;
    this.overmaps = props.overmaps;
    this.connections = props.connections;

    Object.freeze(this.locations);
    Object.freeze(this.overmaps);
    Object.freeze(this.connections);
    Object.freeze(this);
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: OvermapSpecialJson): OvermapSpecial {
    return new OvermapSpecial({
      id: json.id,
      subtype: json.subtype || 'fixed',
      locations: json.locations || [],
      cityDistance: json.city_distance || [0, -1],
      citySizes: json.city_sizes || [0, -1],
      occurrences: json.occurrences || [0, 10],
      flags: new Set(json.flags || []),
      rotate: json.rotate !== false,
      overmaps: json.overmaps || [],
      connections: json.connections || [],
    });
  }

  /**
   * 检查是否可以旋转
   */
  canRotate(): boolean {
    return this.rotate && !this.flags.has('NO_ROTATE');
  }

  /**
   * 检查是否是全局唯一
   */
  isGloballyUnique(): boolean {
    return this.flags.has('GLOBALLY_UNIQUE');
  }

  /**
   * 检查是否是 overmap 唯一
   */
  isOvermapUnique(): boolean {
    return this.flags.has('OVERMAP_UNIQUE');
  }

  /**
   * 检查是否是经典特殊地点
   */
  isClassic(): boolean {
    return this.flags.has('CLASSIC');
  }

  /**
   * 检查是否是荒野特殊地点
   */
  isWilderness(): boolean {
    return this.flags.has('WILDERNESS');
  }

  /**
   * 获取最小出现次数
   */
  getMinOccurrences(): number {
    if (this.isGloballyUnique() || this.isOvermapUnique()) {
      return 0;
    }
    return this.occurrences[0];
  }

  /**
   * 获取最大出现次数
   */
  getMaxOccurrences(): number {
    if (this.isGloballyUnique() || this.isOvermapUnique()) {
      return 1;
    }
    return this.occurrences[1];
  }

  /**
   * 获取最小城市距离
   */
  getMinCityDistance(): number {
    return this.cityDistance[0];
  }

  /**
   * 获取最大城市距离
   */
  getMaxCityDistance(): number {
    return this.cityDistance[1];
  }

  /**
   * 获取最小城市大小
   */
  getMinCitySize(): number {
    return this.citySizes[0];
  }

  /**
   * 获取最大城市大小
   */
  getMaxCitySize(): number {
    return this.citySizes[1];
  }

  /**
   * 检查是否有指定标志
   */
  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  /**
   * 检查是否有指定位置类型
   */
  hasLocation(locationId: string): boolean {
    return this.locations.includes(locationId);
  }

  /**
   * 转换为 JSON
   */
  toJson(): OvermapSpecialJson {
    return {
      type: 'overmap_special',
      id: this.id,
      subtype: this.subtype,
      locations: Array.from(this.locations),
      city_distance: [this.cityDistance[0], this.cityDistance[1]],
      city_sizes: [this.citySizes[0], this.citySizes[1]],
      occurrences: [this.occurrences[0], this.occurrences[1]],
      flags: Array.from(this.flags),
      rotate: this.rotate,
      overmaps: Array.from(this.overmaps),
      connections: Array.from(this.connections),
    };
  }
}
