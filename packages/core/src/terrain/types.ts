/**
 * Re-export TerrainId from coordinates for convenience
 */
export type { TerrainId } from '../coordinates/types';

/**
 * 地形标志枚举
 */
export enum TerrainFlag {
  // 基础属性
  TRANSPARENT = 'TRANSPARENT',
  FLAMMABLE = 'FLAMMABLE',
  FLAT = 'FLAT',
  LIQUID = 'LIQUID',
  DEEP_WATER = 'DEEP_WATER',
  SWIMMABLE = 'SWIMMABLE',
  DIGGABLE = 'DIGGABLE',
  WALL = 'WALL',
  DOOR = 'DOOR',
  WINDOW = 'WINDOW',
  CLIMBABLE = 'CLIMBABLE',

  // 移动相关
  GOES_DOWN = 'GOES_DOWN',
  GOES_UP = 'GOES_UP',
  RAMP = 'RAMP',
  NO_FLOOR = 'NO_FLOOR',
  AUTO_ROTATE = 'AUTO_ROTATE',

  // 环境属性
  INDOORS = 'INDOORS',
  DARKNESS = 'DARKNESS',
  SUN = 'SUN',
  COLLAPSES = 'COLLAPSES',
  MINEABLE = 'MINEABLE',

  // 特殊属性
  FIREDOOR = 'FIREDOOR',
  BARRICADABLE_DOOR = 'BARRICADABLE_DOOR',
  SEALED = 'SEALED',
  ALLOW_RAIN = 'ALLOW_RAIN',
  SHRUB = 'SHRUB',
  SMALL_PLANT = 'SMALL_PLANT',
  BIG_PLANT = 'BIG_PLANT',
  TREE = 'TREE',
  YOUNG_TREE = 'YOUNG_TREE',

  // 连接组
  CONNECTED = 'CONNECTED',
}

/**
 * 地形标志集合
 */
export class TerrainFlags {
  private readonly _flags: Set<TerrainFlag>;

  constructor(flags?: TerrainFlag[]) {
    this._flags = new Set(flags);
    Object.freeze(this);
  }

  /**
   * 获取标志数量
   */
  get size(): number {
    return this._flags.size;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this._flags.size === 0;
  }

  /**
   * 从 JSON 数组创建
   */
  static fromJson(json: string[]): TerrainFlags {
    const flags = json
      .map((s) => {
        const flag = Object.values(TerrainFlag).find((v) => v === s);
        return flag;
      })
      .filter((f): f is TerrainFlag => f !== undefined);

    return new TerrainFlags(flags);
  }

  /**
   * 获取所有标志
   */
  values(): TerrainFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 检查是否有标志
   */
  hasFlag(flag: TerrainFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 检查是否包含标志（Immutable.js Set 兼容）
   */
  has(flag: TerrainFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 添加标志
   */
  add(flag: TerrainFlag): TerrainFlags {
    const newFlags = new Set(this._flags);
    newFlags.add(flag);
    return new TerrainFlags(Array.from(newFlags));
  }

  /**
   * 移除标志
   */
  remove(flag: TerrainFlag): TerrainFlags {
    const newFlags = new Set(this._flags);
    newFlags.delete(flag);
    return new TerrainFlags(Array.from(newFlags));
  }

  /**
   * 检查是否透明
   */
  isTransparent(): boolean {
    return this.has(TerrainFlag.TRANSPARENT);
  }

  /**
   * 检查是否可通行
   */
  isPassable(): boolean {
    return !this.has(TerrainFlag.WALL) && !this.has(TerrainFlag.DOOR);
  }

  /**
   * 检查是否平坦
   */
  isFlat(): boolean {
    return this.has(TerrainFlag.FLAT);
  }

  /**
   * 检查是否室内
   */
  isIndoors(): boolean {
    return this.has(TerrainFlag.INDOORS);
  }

  /**
   * 检查是否液体
   */
  isLiquid(): boolean {
    return this.has(TerrainFlag.LIQUID);
  }

  /**
   * 检查是否可挖掘
   */
  isDiggable(): boolean {
    return this.has(TerrainFlag.DIGGABLE);
  }

  /**
   * 检查是否墙
   */
  isWall(): boolean {
    return this.has(TerrainFlag.WALL);
  }

  /**
   * 检查是否门
   */
  isDoor(): boolean {
    return this.has(TerrainFlag.DOOR);
  }

  /**
   * 检查是否窗
   */
  isWindow(): boolean {
    return this.has(TerrainFlag.WINDOW);
  }
}
