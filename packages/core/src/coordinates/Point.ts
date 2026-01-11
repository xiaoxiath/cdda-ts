/**
 * 二维点属性
 */
export interface PointProps {
  readonly x: number;
  readonly y: number;
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
    return new Point({ x: 0, y: 0 });
  }

  /**
   * 从坐标创建
   */
  static from(x: number, y: number): Point {
    return new Point({ x, y });
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
   * 除法
   */
  divide(scalar: number): Point {
    return this.set('x', Math.floor(this.x / scalar)).set('y', Math.floor(this.y / scalar));
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
