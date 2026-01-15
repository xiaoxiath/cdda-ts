/**
 * City - 城市系统
 *
 * 表示大地图上的城市，对应 CDDA 的 city 结构
 */

import type { CityInterface, PointOMT } from './types';

/**
 * City - 城市类
 *
 * 使用不可变数据结构表示城市
 */
export class City implements CityInterface {
  readonly pos: PointOMT;
  readonly size: number;
  readonly name: string;

  private constructor(props: CityInterface) {
    this.pos = props.pos;
    this.size = props.size;
    this.name = props.name;

    Object.freeze(this);
  }

  /**
   * 创建城市
   */
  static create(props: CityInterface): City {
    return new City({
      pos: { ...props.pos },
      size: props.size,
      name: props.name || 'City',
    });
  }

  /**
   * 从坐标和大小创建城市
   */
  static fromPositionSize(x: number, y: number, size: number, name?: string): City {
    return new City({
      pos: { x, y },
      size,
      name: name || 'City',
    });
  }

  /**
   * 获取城市半径
   */
  getRadius(): number {
    return Math.floor(this.size / 2);
  }

  /**
   * 检查点是否在城市内
   */
  contains(x: number, y: number): boolean {
    const dx = Math.abs(x - this.pos.x);
    const dy = Math.abs(y - this.pos.y);
    return dx <= this.size && dy <= this.size;
  }

  /**
   * 检查点是否在城市边界内
   */
  isInBounds(x: number, y: number): boolean {
    const halfSize = this.size / 2;
    const left = this.pos.x - halfSize;
    const right = this.pos.x + halfSize;
    const top = this.pos.y - halfSize;
    const bottom = this.pos.y + halfSize;

    return x >= left && x <= right && y >= top && y <= bottom;
  }

  /**
   * 获取到城市的距离
   */
  distanceTo(x: number, y: number): number {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查是否与另一个城市重叠
   */
  overlaps(other: City): boolean {
    const combinedSize = this.size + other.size;
    const dx = Math.abs(this.pos.x - other.pos.x);
    const dy = Math.abs(this.pos.y - other.pos.y);

    return dx < combinedSize && dy < combinedSize;
  }

  /**
   * 转换为 JSON
   */
  toJson(): object {
    return {
      pos: this.pos,
      size: this.size,
      name: this.name,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: {
    pos: PointOMT;
    size: number;
    name: string;
  }): City {
    return new City({
      pos: json.pos,
      size: json.size,
      name: json.name,
    });
  }
}
