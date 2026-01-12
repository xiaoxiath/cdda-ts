import { Point } from './Point';
import { Tripoint } from './Tripoint';

/**
 * 坐标哈希工具
 * 匹配 CDDA point.h 中的 hash<point> 和 hash<tripoint> 实现
 *
 * 使用 splitmix64 算法生成哈希值
 * 来源: https://xoshiro.di.unimi.it/splitmix64.c
 * 参考: https://nullprogram.com/blog/2018/07/31/
 */

/**
 * 64 位整数哈希函数（使用 JavaScript 53 位精度整数）
 * @param x 64 位整数值（JavaScript 中使用 Number）
 * @returns 哈希值
 */
function splitmix64(x: number): number {
  // JavaScript 的 Number 类型只有 53 位精度
  // 我们使用位运算模拟 64 位操作
  x ^= x >>> 30;
  // 0xbf58476d1ce4e5b9 是一个大质数
  // 由于 JS 精度限制，我们使用模运算
  x = (x * 0xbf58476d1ce4e5b9) % 0x100000000;
  x ^= x >>> 27;
  x = (x * 0x94d049bb133111eb) % 0x100000000;
  x ^= x >>> 31;
  return x;
}

/**
 * 计算点的哈希值
 * 匹配 CDDA hash<point>
 * @param p 点
 * @returns 哈希值
 */
export function hashPoint(p: Point): number {
  // 组合 x 和 y 为 64 位整数
  // 左移 32 位相当于乘以 2^32
  const x = (p.x * 0x100000000) | (p.y & 0xffffffff);
  return splitmix64(x);
}

/**
 * 计算三元点的哈希值
 * 匹配 CDDA hash<tripoint>
 * @param p 三元点
 * @returns 哈希值
 */
export function hashTripoint(p: Tripoint): number {
  // 首先组合 x 和 y
  let x = (p.x * 0x100000000) | (p.y & 0xffffffff);
  x = splitmix64(x);
  // 然后混入 z
  x ^= p.z;
  return splitmix64(x);
}

/**
 * 创建点字符串键（用于 Map/Set）
 * @param p 点
 * @returns 字符串键 "x,y"
 */
export function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * 创建三元点字符串键（用于 Map/Set）
 * @param p 三元点
 * @returns 字符串键 "x,y,z"
 */
export function tripointKey(p: Tripoint): string {
  return `${p.x},${p.y},${p.z}`;
}

/**
 * 从字符串键解析点
 * @param key 字符串键 "x,y"
 * @returns 点
 */
export function pointFromKey(key: string): Point {
  const [x, y] = key.split(',').map(Number);
  return new Point({ x, y });
}

/**
 * 从字符串键解析三元点
 * @param key 字符串键 "x,y,z"
 * @returns 三元点
 */
export function tripointFromKey(key: string): Tripoint {
  const [x, y, z] = key.split(',').map(Number);
  return new Tripoint({ x, y, z });
}

/**
 * 点 Map（使用字符串键）
 */
export class PointMap<T> {
  private readonly _map: Map<string, T> = new Map();

  set(key: Point, value: T): this {
    this._map.set(pointKey(key), value);
    return this;
  }

  get(key: Point): T | undefined {
    return this._map.get(pointKey(key));
  }

  has(key: Point): boolean {
    return this._map.has(pointKey(key));
  }

  delete(key: Point): boolean {
    return this._map.delete(pointKey(key));
  }

  clear(): void {
    this._map.clear();
  }

  get size(): number {
    return this._map.size;
  }

  forEach(callbackfn: (value: T, key: Point, map: Map<string, T>) => void): void {
    this._map.forEach((value, key) => {
      callbackfn(value, pointFromKey(key), this._map);
    });
  }

  entries(): IterableIterator<[Point, T]> {
    const self = this;
    return (function* () {
      for (const [key, value] of self._map.entries()) {
        yield [pointFromKey(key), value];
      }
    })();
  }

  keys(): IterableIterator<Point> {
    const self = this;
    return (function* () {
      for (const key of self._map.keys()) {
        yield pointFromKey(key);
      }
    })();
  }

  values(): IterableIterator<T> {
    return this._map.values();
  }

  [Symbol.iterator](): IterableIterator<[Point, T]> {
    return this.entries();
  }
}

/**
 * 三元点 Map（使用字符串键）
 */
export class TripointMap<T> {
  private readonly _map: Map<string, T> = new Map();

  set(key: Tripoint, value: T): this {
    this._map.set(tripointKey(key), value);
    return this;
  }

  get(key: Tripoint): T | undefined {
    return this._map.get(tripointKey(key));
  }

  has(key: Tripoint): boolean {
    return this._map.has(tripointKey(key));
  }

  delete(key: Tripoint): boolean {
    return this._map.delete(tripointKey(key));
  }

  clear(): void {
    this._map.clear();
  }

  get size(): number {
    return this._map.size;
  }

  forEach(callbackfn: (value: T, key: Tripoint, map: Map<string, T>) => void): void {
    this._map.forEach((value, key) => {
      callbackfn(value, tripointFromKey(key), this._map);
    });
  }

  entries(): IterableIterator<[Tripoint, T]> {
    const self = this;
    return (function* () {
      for (const [key, value] of self._map.entries()) {
        yield [tripointFromKey(key), value];
      }
    })();
  }

  keys(): IterableIterator<Tripoint> {
    const self = this;
    return (function* () {
      for (const key of self._map.keys()) {
        yield tripointFromKey(key);
      }
    })();
  }

  values(): IterableIterator<T> {
    return this._map.values();
  }

  [Symbol.iterator](): IterableIterator<[Tripoint, T]> {
    return this.entries();
  }
}

/**
 * 点 Set（使用字符串键）
 */
export class PointSet {
  private readonly _set: Set<string> = new Set();

  add(value: Point): this {
    this._set.add(pointKey(value));
    return this;
  }

  has(value: Point): boolean {
    return this._set.has(pointKey(value));
  }

  delete(value: Point): boolean {
    return this._set.delete(pointKey(value));
  }

  clear(): void {
    this._set.clear();
  }

  get size(): number {
    return this._set.size;
  }

  forEach(callbackfn: (value: Point, value2: Point, set: Set<string>) => void): void {
    this._set.forEach((key) => {
      callbackfn(pointFromKey(key), pointFromKey(key), this._set);
    });
  }

  entries(): IterableIterator<[Point, Point]> {
    const self = this;
    return (function* () {
      for (const key of self._set) {
        const p = pointFromKey(key);
        yield [p, p];
      }
    })();
  }

  keys(): IterableIterator<Point> {
    const self = this;
    return (function* () {
      for (const key of self._set) {
        yield pointFromKey(key);
      }
    })();
  }

  values(): IterableIterator<Point> {
    return this.keys();
  }

  [Symbol.iterator](): IterableIterator<Point> {
    return this.values();
  }
}

/**
 * 三元点 Set（使用字符串键）
 */
export class TripointSet {
  private readonly _set: Set<string> = new Set();

  add(value: Tripoint): this {
    this._set.add(tripointKey(value));
    return this;
  }

  has(value: Tripoint): boolean {
    return this._set.has(tripointKey(value));
  }

  delete(value: Tripoint): boolean {
    return this._set.delete(tripointKey(value));
  }

  clear(): void {
    this._set.clear();
  }

  get size(): number {
    return this._set.size;
  }

  forEach(callbackfn: (value: Tripoint, value2: Tripoint, set: Set<string>) => void): void {
    this._set.forEach((key) => {
      callbackfn(tripointFromKey(key), tripointFromKey(key), this._set);
    });
  }

  entries(): IterableIterator<[Tripoint, Tripoint]> {
    const self = this;
    return (function* () {
      for (const key of self._set) {
        const p = tripointFromKey(key);
        yield [p, p];
      }
    })();
  }

  keys(): IterableIterator<Tripoint> {
    const self = this;
    return (function* () {
      for (const key of self._set) {
        yield tripointFromKey(key);
      }
    })();
  }

  values(): IterableIterator<Tripoint> {
    return this.keys();
  }

  [Symbol.iterator](): IterableIterator<Tripoint> {
    return this.values();
  }
}
