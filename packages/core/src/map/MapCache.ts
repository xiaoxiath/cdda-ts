import { Point } from '../coordinates/Point';

/**
 * 透明度缓存
 */
export class TransparencyCache {
  private readonly _props: TransparencyCacheProps;

  readonly transparent!: Map<string, boolean>;
  readonly lastUpdate!: number;

  constructor(props?: Partial<TransparencyCacheProps>) {
    const defaults: TransparencyCacheProps = {
      transparent: new Map(),
      lastUpdate: Date.now(),
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'transparent', {
      get: () => this._props.transparent,
      enumerable: true,
    });
    Object.defineProperty(this, 'lastUpdate', {
      get: () => this._props.lastUpdate,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private setProperty<K extends keyof TransparencyCacheProps>(
    key: K,
    value: TransparencyCacheProps[K]
  ): TransparencyCache {
    const newProps = { ...this._props, [key]: value };
    return new TransparencyCache(newProps);
  }

  /**
   * 获取透明度
   */
  get(pos: Point): boolean | undefined {
    return this.transparent.get(`${pos.x},${pos.y}`);
  }

  /**
   * 设置透明度
   */
  set(pos: Point, value: boolean): TransparencyCache {
    const newTransparent = new Map(this.transparent);
    newTransparent.set(`${pos.x},${pos.y}`, value);
    return this.setProperty('transparent', newTransparent).setProperty('lastUpdate', Date.now());
  }

  /**
   * 清空缓存
   */
  clear(): TransparencyCache {
    return this.setProperty('transparent', new Map()).setProperty('lastUpdate', Date.now());
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.transparent.size;
  }

  /**
   * 检查是否包含指定位置
   */
  has(pos: Point): boolean {
    return this.transparent.has(`${pos.x},${pos.y}`);
  }

  /**
   * 转换为 key
   */
  private toKey(pos: Point): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * 克隆
   */
  clone(): TransparencyCache {
    return new TransparencyCache({
      transparent: new Map(this.transparent),
      lastUpdate: this.lastUpdate,
    });
  }
}

/**
 * TransparencyCache 属性
 */
export interface TransparencyCacheProps {
  readonly transparent: Map<string, boolean>;
  readonly lastUpdate: number;
}

/**
 * 层级缓存
 *
 * 缓存视野、透明度等计算结果
 */
export class LevelCache {
  private readonly _props: LevelCacheProps;

  readonly transparency!: TransparencyCache;
  readonly apparent!: Map<string, number>; // 视野等级

  constructor(props?: Partial<LevelCacheProps>) {
    const defaults: LevelCacheProps = {
      transparency: new TransparencyCache(),
      apparent: new Map(),
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'transparency', {
      get: () => this._props.transparency,
      enumerable: true,
    });
    Object.defineProperty(this, 'apparent', {
      get: () => this._props.apparent,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private setProperty<K extends keyof LevelCacheProps>(
    key: K,
    value: LevelCacheProps[K]
  ): LevelCache {
    const newProps = { ...this._props, [key]: value };
    return new LevelCache(newProps);
  }

  /**
   * 获取透明度
   */
  getTransparent(pos: Point): boolean | undefined {
    return this.transparency.get(pos);
  }

  /**
   * 设置透明度
   */
  setTransparent(pos: Point, value: boolean): LevelCache {
    return this.setProperty('transparency', this.transparency.set(pos, value));
  }

  /**
   * 获取视野等级
   */
  getApparent(pos: Point): number | undefined {
    return this.apparent.get(`${pos.x},${pos.y}`);
  }

  /**
   * 设置视野等级
   */
  setApparent(pos: Point, value: number): LevelCache {
    const newApparent = new Map(this.apparent);
    newApparent.set(`${pos.x},${pos.y}`, value);
    return this.setProperty('apparent', newApparent);
  }

  /**
   * 批量设置视野等级
   */
  setApparentBatch(entries: [Point, number][]): LevelCache {
    const newApparent = new Map(this.apparent);
    for (const [pos, value] of entries) {
      newApparent.set(`${pos.x},${pos.y}`, value);
    }
    return this.setProperty('apparent', newApparent);
  }

  /**
   * 清空缓存
   */
  clear(): LevelCache {
    return this.setProperty('transparency', this.transparency.clear()).setProperty(
      'apparent',
      new Map()
    );
  }

  /**
   * 清空透明度缓存
   */
  clearTransparency(): LevelCache {
    return this.setProperty('transparency', this.transparency.clear());
  }

  /**
   * 清空视野缓存
   */
  clearApparent(): LevelCache {
    return this.setProperty('apparent', new Map());
  }

  /**
   * 检查缓存是否过期
   */
  isExpired(lastMapChange: number): boolean {
    return this.transparency.lastUpdate < lastMapChange;
  }

  /**
   * 获取透明度缓存大小
   */
  transparencySize(): number {
    return this.transparency.size();
  }

  /**
   * 获取视野缓存大小
   */
  apparentSize(): number {
    return this.apparent.size;
  }

  /**
   * 获取内存使用估算（字节）
   */
  getMemoryUsage(): number {
    let total = 0;

    // Transparency cache: ~50 bytes per entry
    total += this.transparency.size() * 50;

    // Apparent cache: ~50 bytes per entry
    total += this.apparent.size * 50;

    // Object overhead
    total += 200;

    return total;
  }

  /**
   * 克隆
   */
  clone(): LevelCache {
    return new LevelCache({
      transparency: this.transparency.clone(),
      apparent: new Map(this.apparent),
    });
  }
}

/**
 * LevelCache 属性
 */
export interface LevelCacheProps {
  readonly transparency: TransparencyCache;
  readonly apparent: Map<string, number>;
}
