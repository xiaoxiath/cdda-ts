import { TerrainId } from '../terrain/types';
import { FurnitureId } from '../furniture/types';
import { FieldEntry } from '../field/FieldEntry';
import { TrapId } from '../trap/types';

/**
 * 地图瓦片属性
 */
export interface MapTileProps {
  readonly terrain: TerrainId;
  readonly furniture: FurnitureId | null;
  readonly radiation: number;
  readonly field: FieldEntry | null;
  readonly trap: TrapId | null;
}

/**
 * 地图瓦片
 *
 * 单个地图方块的所有信息
 */
export class MapTile {
  private readonly _props: MapTileProps;

  readonly terrain!: TerrainId;
  readonly furniture!: FurnitureId | null;
  readonly radiation!: number;
  readonly field!: FieldEntry | null;
  readonly trap!: TrapId | null;

  constructor(props?: Partial<MapTileProps>) {
    const defaults: MapTileProps = {
      terrain: 0, // t_null
      furniture: null,
      radiation: 0,
      field: null,
      trap: null,
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'terrain', {
      get: () => this._props.terrain,
      enumerable: true,
    });
    Object.defineProperty(this, 'furniture', {
      get: () => this._props.furniture,
      enumerable: true,
    });
    Object.defineProperty(this, 'radiation', {
      get: () => this._props.radiation,
      enumerable: true,
    });
    Object.defineProperty(this, 'field', {
      get: () => this._props.field,
      enumerable: true,
    });
    Object.defineProperty(this, 'trap', {
      get: () => this._props.trap,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 设置属性值
   */
  private set<K extends keyof MapTileProps>(key: K, value: MapTileProps[K]): MapTile {
    return new MapTile({ ...this._props, [key]: value });
  }

  /**
   * 从地形 ID 创建瓦片
   */
  static fromTerrain(terrainId: TerrainId): MapTile {
    return new MapTile({ terrain: terrainId });
  }

  /**
   * 设置地形
   */
  withTerrain(terrain: TerrainId): MapTile {
    return this.set('terrain', terrain);
  }

  /**
   * 设置家具
   */
  withFurniture(furniture: FurnitureId): MapTile {
    return this.set('furniture', furniture);
  }

  /**
   * 移除家具
   */
  withoutFurniture(): MapTile {
    return this.set('furniture', null);
  }

  /**
   * 设置场
   */
  withField(field: FieldEntry): MapTile {
    return this.set('field', field);
  }

  /**
   * 移除场
   */
  withoutField(): MapTile {
    return this.set('field', null);
  }

  /**
   * 设置陷阱
   */
  withTrap(trap: TrapId): MapTile {
    return this.set('trap', trap);
  }

  /**
   * 移除陷阱
   */
  withoutTrap(): MapTile {
    return this.set('trap', null);
  }

  /**
   * 设置辐射值
   */
  withRadiation(radiation: number): MapTile {
    return this.set('radiation', radiation);
  }

  /**
   * 是否有家具
   */
  hasFurniture(): boolean {
    return this.furniture !== null;
  }

  /**
   * 是否有场
   */
  hasField(): boolean {
    return this.field !== null && this.field.isAlive;
  }

  /**
   * 是否有陷阱
   */
  hasTrap(): boolean {
    return this.trap !== null;
  }

  /**
   * 转换为简单对象（用于调试）
   */
  toJSON(): { [key: string]: any } {
    return {
      terrain: this.terrain,
      furniture: this.furniture,
      radiation: this.radiation,
      field: this.field?.toJSON(),
      trap: this.trap,
    };
  }

  /**
   * 克隆
   */
  clone(): MapTile {
    return new MapTile(this._props);
  }
}
