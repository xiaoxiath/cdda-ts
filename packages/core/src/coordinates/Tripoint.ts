import { Point } from './Point';

/**
 * 向零截断整数除法（匹配 C++ 行为）
 * @returns n / d 向零截断的结果
 */
function truncateDivide(n: number, d: number): number {
  if (d === 0) throw new Error('Division by zero');
  const result = n / d;
  return result >= 0 ? Math.floor(result) : Math.ceil(result);
}

/**
 * 向负无穷截断整数除法（CDDA 用于某些坐标转换）
 * @returns n / d 向负无穷截断的结果
 */
function divideRoundToMinusInfinity(n: number, d: number): number {
  if (d === 0) throw new Error('Division by zero');
  if (n >= 0) return Math.floor(n / d);
  return Math.floor((n - d + 1) / d);
}

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

  // 特殊常量点（匹配 CDDA point.h）
  static readonly ZERO = Object.freeze(new Tripoint({ x: 0, y: 0, z: 0 }));
  static readonly MIN = Object.freeze(new Tripoint({ x: -2147483648, y: -2147483648, z: -2147483648 }));
  static readonly MAX = Object.freeze(new Tripoint({ x: 2147483647, y: 2147483647, z: 2147483647 }));
  static readonly INVALID = Object.freeze(
    new Tripoint({ x: -2147483648, y: -2147483648, z: -2147483648 }),
  );

  // 八方向常量（匹配 CDDA point.h，z=0）
  static readonly NORTH = Object.freeze(new Tripoint({ x: 0, y: -1, z: 0 }));
  static readonly NORTH_EAST = Object.freeze(new Tripoint({ x: 1, y: -1, z: 0 }));
  static readonly EAST = Object.freeze(new Tripoint({ x: 1, y: 0, z: 0 }));
  static readonly SOUTH_EAST = Object.freeze(new Tripoint({ x: 1, y: 1, z: 0 }));
  static readonly SOUTH = Object.freeze(new Tripoint({ x: 0, y: 1, z: 0 }));
  static readonly SOUTH_WEST = Object.freeze(new Tripoint({ x: -1, y: 1, z: 0 }));
  static readonly WEST = Object.freeze(new Tripoint({ x: -1, y: 0, z: 0 }));
  static readonly NORTH_WEST = Object.freeze(new Tripoint({ x: -1, y: -1, z: 0 }));

  // 垂直方向
  static readonly ABOVE = Object.freeze(new Tripoint({ x: 0, y: 0, z: 1 }));
  static readonly BELOW = Object.freeze(new Tripoint({ x: 0, y: 0, z: -1 }));

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
    return Tripoint.ZERO;
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
   * 检查是否为无效坐标
   */
  isInvalid(): boolean {
    return this.x === Tripoint.INVALID.x && this.y === Tripoint.INVALID.y && this.z === Tripoint.INVALID.z;
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
   * 除法（向零截断，匹配 C++ 行为）
   * C++: tripoint operator/(int rhs) 使用整数除法，向零截断
   */
  divide(scalar: number): Tripoint {
    return this.set('x', truncateDivide(this.x, scalar))
      .set('y', truncateDivide(this.y, scalar))
      .set('z', truncateDivide(this.z, scalar));
  }

  /**
   * 除法（向负无穷截断，用于坐标转换）
   * 匹配 CDDA divide_round_to_minus_infinity()
   */
  divideRoundToMinusInfinity(scalar: number): Tripoint {
    return this.set('x', divideRoundToMinusInfinity(this.x, scalar))
      .set('y', divideRoundToMinusInfinity(this.y, scalar))
      .set('z', divideRoundToMinusInfinity(this.z, scalar));
  }

  /**
   * 绝对值
   * 匹配 C++ tripoint::abs()
   */
  abs(): Tripoint {
    return this.set('x', Math.abs(this.x)).set('y', Math.abs(this.y)).set('z', Math.abs(this.z));
  }

  /**
   * 旋转（仅旋转 xy 平面，z 保持不变）
   * 匹配 C++ tripoint::rotate(int turns, const point &dim)
   * @param turns 旋转次数（每次 90 度）
   * @param dim 旋转区域尺寸（仅使用 xy）
   * @returns 旋转后的点
   */
  rotate(turns: number, dim: Point = Point.from(1, 1)): Tripoint {
    const rotatedXY = this.toPoint().rotate(turns, dim);
    return this.set('x', rotatedXY.x).set('y', rotatedXY.y);
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
