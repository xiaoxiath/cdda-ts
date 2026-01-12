/**
 * 二维点属性
 */
export interface PointProps {
  readonly x: number;
  readonly y: number;
}

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
 * 二维点
 *
 * 不可变的二维坐标
 */
export class Point {
  private readonly _props: PointProps;

  readonly x!: number;
  readonly y!: number;

  // 特殊常量点（匹配 CDDA point.h）
  static readonly ZERO = Object.freeze(new Point({ x: 0, y: 0 }));
  static readonly MIN = Object.freeze(new Point({ x: -2147483648, y: -2147483648 })); // INT_MIN
  static readonly MAX = Object.freeze(new Point({ x: 2147483647, y: 2147483647 })); // INT_MAX
  static readonly INVALID = Object.freeze(new Point({ x: -2147483648, y: -2147483648 })); // = MIN

  // 八方向常量（匹配 CDDA point.h）
  static readonly NORTH = Object.freeze(new Point({ x: 0, y: -1 }));
  static readonly NORTH_EAST = Object.freeze(new Point({ x: 1, y: -1 }));
  static readonly EAST = Object.freeze(new Point({ x: 1, y: 0 }));
  static readonly SOUTH_EAST = Object.freeze(new Point({ x: 1, y: 1 }));
  static readonly SOUTH = Object.freeze(new Point({ x: 0, y: 1 }));
  static readonly SOUTH_WEST = Object.freeze(new Point({ x: -1, y: 1 }));
  static readonly WEST = Object.freeze(new Point({ x: -1, y: 0 }));
  static readonly NORTH_WEST = Object.freeze(new Point({ x: -1, y: -1 }));

  constructor(props: PointProps) {
    this._props = props;

    Object.defineProperty(this, 'x', { get: () => this._props.x, enumerable: true });
    Object.defineProperty(this, 'y', { get: () => this._props.y, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private set<K extends keyof PointProps>(key: K, value: PointProps[K]): Point {
    return new Point({ ...this._props, [key]: value });
  }

  /**
   * 创建原点
   */
  static origin(): Point {
    return Point.ZERO as Point;
  }

  /**
   * 从坐标创建
   */
  static from(x: number, y: number): Point {
    return new Point({ x, y });
  }

  /**
   * 检查是否为无效坐标
   */
  isInvalid(): boolean {
    return this.x === Point.INVALID.x && this.y === Point.INVALID.y;
  }

  /**
   * 加法
   */
  add(other: Partial<PointProps>): Point {
    return this.set('x', this.x + (other.x || 0)).set('y', this.y + (other.y || 0));
  }

  /**
   * 减法
   */
  subtract(other: Partial<PointProps>): Point {
    return this.set('x', this.x - (other.x || 0)).set('y', this.y - (other.y || 0));
  }

  /**
   * 乘法
   */
  multiply(scalar: number): Point {
    return this.set('x', this.x * scalar).set('y', this.y * scalar);
  }

  /**
   * 除法（向零截断，匹配 C++ 行为）
   * C++: point operator/(int rhs) 使用整数除法，向零截断
   */
  divide(scalar: number): Point {
    return this.set('x', truncateDivide(this.x, scalar)).set('y', truncateDivide(this.y, scalar));
  }

  /**
   * 除法（向负无穷截断，用于坐标转换）
   * 匹配 CDDA divide_round_to_minus_infinity()
   */
  divideRoundToMinusInfinity(scalar: number): Point {
    return this.set('x', divideRoundToMinusInfinity(this.x, scalar)).set(
      'y',
      divideRoundToMinusInfinity(this.y, scalar),
    );
  }

  /**
   * 绝对值
   * 匹配 C++ point::abs()
   */
  abs(): Point {
    return this.set('x', Math.abs(this.x)).set('y', Math.abs(this.y));
  }

  /**
   * 旋转（顺时针，每次 90 度）
   * 匹配 C++ point::rotate(int turns, const point &dim)
   * @param turns 旋转次数（每次 90 度）
   * @param dim 旋转区域尺寸
   * @returns 旋转后的点
   */
  rotate(turns: number, dim: Point = Point.from(1, 1)): Point {
    let ret: Point = this;
    // Normalize turns to 0-3
    turns = ((turns % 4) + 4) % 4;
    for (let i = 0; i < turns; i++) {
      // 顺时针旋转 90 度: (x, y) -> (y, dim.y - 1 - x)
      const tmp = ret.y;
      ret = ret.set('x', tmp).set('y', dim.y - 1 - ret.x) as Point;
    }
    return ret;
  }

  /**
   * 曼哈顿距离
   */
  manhattanDistanceTo(other: Point): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /**
   * 欧几里得距离
   */
  euclideanDistanceTo(other: Point): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 切比雪夫距离（最大值距离）
   */
  chebyshevDistanceTo(other: Point): number {
    return Math.max(Math.abs(this.x - other.x), Math.abs(this.y - other.y));
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  /**
   * 转换为数组
   */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /**
   * 转换为 JSON
   */
  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
