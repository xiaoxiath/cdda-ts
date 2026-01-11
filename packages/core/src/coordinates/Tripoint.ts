import { Point } from './Point';

/**
 * 三维点属性
 */
export interface TripointProps {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 三维点
 *
 * 不可变的三维坐标
 */
export class Tripoint {
  private readonly _props: TripointProps;

  readonly x!: number;
  readonly y!: number;
  readonly z!: number;

  constructor(props: TripointProps) {
    this._props = props;

    Object.defineProperty(this, 'x', { get: () => this._props.x, enumerable: true });
    Object.defineProperty(this, 'y', { get: () => this._props.y, enumerable: true });
    Object.defineProperty(this, 'z', { get: () => this._props.z, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private set<K extends keyof TripointProps>(key: K, value: TripointProps[K]): Tripoint {
    return new Tripoint({ ...this._props, [key]: value });
  }

  /**
   * 创建原点
   */
  static origin(): Tripoint {
    return new Tripoint({ x: 0, y: 0, z: 0 });
  }

  /**
   * 从坐标创建
   */
  static from(x: number, y: number, z: number = 0): Tripoint {
    return new Tripoint({ x, y, z });
  }

  /**
   * 从 Point 创建
   */
  static fromPoint(point: Point, z: number = 0): Tripoint {
    return new Tripoint({ x: point.x, y: point.y, z });
  }

  /**
   * 转换为二维点
   */
  toPoint(): Point {
    return new Point({ x: this.x, y: this.y });
  }

  /**
   * 加法
   */
  add(other: Partial<TripointProps>): Tripoint {
    return this.set('x', this.x + (other.x || 0))
      .set('y', this.y + (other.y || 0))
      .set('z', this.z + (other.z || 0));
  }

  /**
   * 减法
   */
  subtract(other: Partial<TripointProps>): Tripoint {
    return this.set('x', this.x - (other.x || 0))
      .set('y', this.y - (other.y || 0))
      .set('z', this.z - (other.z || 0));
  }

  /**
   * 乘法
   */
  multiply(scalar: number): Tripoint {
    return this.set('x', this.x * scalar)
      .set('y', this.y * scalar)
      .set('z', this.z * scalar);
  }

  /**
   * 除法
   */
  divide(scalar: number): Tripoint {
    return this.set('x', Math.floor(this.x / scalar))
      .set('y', Math.floor(this.y / scalar))
      .set('z', Math.floor(this.z / scalar));
  }

  /**
   * 取模
   */
  mod(modulo: number): Tripoint {
    const normalize = (n: number) => ((n % modulo) + modulo) % modulo;
    return this.set('x', normalize(this.x))
      .set('y', normalize(this.y))
      .set('z', normalize(this.z));
  }

  /**
   * 曼哈顿距离
   */
  manhattanDistanceTo(other: Tripoint): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y) + Math.abs(this.z - other.z);
  }

  /**
   * 欧几里得距离
   */
  euclideanDistanceTo(other: Tripoint): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 切比雪夫距离
   */
  chebyshevDistanceTo(other: Tripoint): number {
    return Math.max(Math.abs(this.x - other.x), Math.abs(this.y - other.y), Math.abs(this.z - other.z));
  }

  /**
   * 通用距离（默认使用切比雪夫距离）
   */
  distanceTo(other: Tripoint): number {
    return this.chebyshevDistanceTo(other);
  }

  /**
   * 检查是否与另一个点相等
   */
  equals(other: Tripoint): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * 转换为数组
   */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * 转换为 JSON
   */
  toJSON(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }
}
