import { Submap } from './Submap';
import { Tripoint } from '../coordinates/Tripoint';

/**
 * 地图缓冲
 *
 * 管理所有已加载的 submap，使用 Map 进行缓存
 */
export class MapBuffer {
  private readonly _props: MapBufferProps;

  readonly submaps!: Map<string, Submap>;
  readonly maxSize!: number;

  constructor(props?: Partial<MapBufferProps>) {
    const defaults: MapBufferProps = {
      submaps: new Map(),
      maxSize: 500, // 默认最多缓存 500 个 submap
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'submaps', {
      get: () => this._props.submaps,
      enumerable: true,
    });
    Object.defineProperty(this, 'maxSize', {
      get: () => this._props.maxSize,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private setProperty<K extends keyof MapBufferProps>(
    key: K,
    value: MapBufferProps[K]
  ): MapBuffer {
    const newProps = { ...this._props, [key]: value };
    return new MapBuffer(newProps);
  }

  /**
   * 获取 submap（不存在则返回 null）
   */
  get(pos: Tripoint): Submap | null {
    const key = this.toKey(pos);
    return this.submaps.get(key) || null;
  }

  /**
   * 设置 submap
   */
  set(pos: Tripoint, submap: Submap): MapBuffer {
    const key = this.toKey(pos);
    const newSubmaps = new Map(this.submaps);
    newSubmaps.set(key, submap);

    // 如果超过最大大小，移除最旧的项（简单的 LRU）
    if (newSubmaps.size > this.maxSize) {
      const firstKey = newSubmaps.keys().next().value;
      if (firstKey) {
        newSubmaps.delete(firstKey);
      }
    }

    return this.setProperty('submaps', newSubmaps);
  }

  /**
   * 移除 submap
   */
  delete(pos: Tripoint): MapBuffer {
    const key = this.toKey(pos);
    const newSubmaps = new Map(this.submaps);
    newSubmaps.delete(key);
    return this.setProperty('submaps', newSubmaps);
  }

  /**
   * 清空缓冲
   */
  clear(): MapBuffer {
    return this.setProperty('submaps', new Map());
  }

  /**
   * 获取缓冲大小
   */
  size(): number {
    return this.submaps.size;
  }

  /**
   * 检查是否包含指定位置的 submap
   */
  has(pos: Tripoint): boolean {
    return this.submaps.has(this.toKey(pos));
  }

  /**
   * 获取所有缓存的位置
   */
  getKeys(): Tripoint[] {
    return Array.from(this.submaps.keys()).map((key) => this.fromKey(key));
  }

  /**
   * 获取内存使用估算（字节）
   */
  getMemoryUsage(): number {
    let total = 0;

    // 每个 submap 的内存
    for (const submap of this.submaps.values()) {
      total += submap.getMemoryUsage();
    }

    // Map overhead
    total += this.submaps.size * 50;

    return total;
  }

  /**
   * 转换为 key
   */
  private toKey(pos: Tripoint): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  /**
   * 从 key 转换为 Tripoint
   */
  private fromKey(key: string): Tripoint {
    const [x, y, z] = key.split(',').map(Number);
    return new Tripoint({ x, y, z });
  }

  /**
   * 克隆
   */
  clone(): MapBuffer {
    return new MapBuffer({
      submaps: new Map(this.submaps),
      maxSize: this.maxSize,
    });
  }
}

/**
 * MapBuffer 属性
 */
export interface MapBufferProps {
  readonly submaps: Map<string, Submap>;
  readonly maxSize: number;
}
