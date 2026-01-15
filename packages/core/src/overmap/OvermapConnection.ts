/**
 * OvermapConnection - Overmap 连接系统
 *
 * 管理道路、隧道等线性特征的连接，对应 CDDA 的 overmap_connection
 */

import type {
  ConnectionSubtype,
  OvermapConnectionJson,
} from './types';

/**
 * OvermapConnection - 连接类
 *
 * 使用不可变数据结构表示连接
 */
export class OvermapConnection {
  readonly id: string;
  readonly subtypes: readonly ConnectionSubtype[];

  private constructor(props: {
    id: string;
    subtypes: ConnectionSubtype[];
  }) {
    this.id = props.id;
    this.subtypes = props.subtypes;

    Object.freeze(this.subtypes);
    Object.freeze(this);
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: OvermapConnectionJson): OvermapConnection {
    return new OvermapConnection({
      id: json.id,
      subtypes: json.subtypes,
    });
  }

  /**
   * 获取在指定位置的连接地形
   */
  getTerrainForLocation(locationId: string): string | null {
    const subtype = this.subtypes.find(s => s.locations.includes(locationId));
    return subtype?.terrain || null;
  }

  /**
   * 获取在指定位置的连接代价
   */
  getCostForLocation(locationId: string): number {
    const subtype = this.subtypes.find(s => s.locations.includes(locationId));
    return subtype?.basic_cost || 0;
  }

  /**
   * 获取在指定位置的标志
   */
  getFlagsForLocation(locationId: string): ReadonlySet<string> {
    const subtype = this.subtypes.find(s => s.locations.includes(locationId));
    return subtype?.flags ? new Set(subtype.flags) : new Set();
  }

  /**
   * 检查指定位置是否有 ORTHOGONAL 标志
   */
  isOrthogonal(locationId: string): boolean {
    return this.getFlagsForLocation(locationId).has('ORTHOGONAL');
  }

  /**
   * 检查指定位置是否有 PERPENDICULAR_CROSSING 标志
   */
  isPerpendicularCrossing(locationId: string): boolean {
    return this.getFlagsForLocation(locationId).has('PERPENDICULAR_CROSSING');
  }

  /**
   * 获取在指定位置的子类型
   */
  getSubtypeForLocation(locationId: string): ConnectionSubtype | null {
    return this.subtypes.find(s => s.locations.includes(locationId)) || null;
  }

  /**
   * 检查指定位置的子类型是否有指定标志
   */
  hasFlag(locationId: string, flag: string): boolean {
    const subtype = this.getSubtypeForLocation(locationId);
    return subtype?.flags?.includes(flag) || false;
  }

  /**
   * 检查是否支持指定位置
   */
  supportsLocation(locationId: string): boolean {
    return this.subtypes.some(s => s.locations.includes(locationId));
  }

  /**
   * 转换为 JSON
   */
  toJson(): OvermapConnectionJson {
    return {
      type: 'overmap_connection',
      id: this.id,
      subtypes: Array.from(this.subtypes),
    };
  }
}
