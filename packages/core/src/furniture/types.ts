/**
 * Re-export FurnitureId from coordinates for convenience
 */
export type { FurnitureId } from '../coordinates/types';

/**
 * 家具标志枚举
 */
export enum FurnitureFlag {
  // 基础属性
  TRANSPARENT = 'TRANSPARENT',
  FLAMMABLE = 'FLAMMABLE',
  FLAMMABLE_ASH = 'FLAMMABLE_ASH',
  LIQUID = 'LIQUID',
  LIQUID_CONT = 'LIQUID_CONT',
  FLAT = 'FLAT',

  // 交互属性
  MOUNTABLE = 'MOUNTABLE',
  CLIMBABLE = 'CLIMBABLE',
  SITTABLE = 'SITTABLE',
  PLANT = 'PLANT',
  ORGANIC = 'ORGANIC',
  WOOD = 'WOOD',
  METAL = 'METAL',
  PLASTIC = 'PLASTIC',
  GLASS = 'GLASS',

  // 功能属性
  WORKBENCH = 'WORKBENCH',
  CONTAINER = 'CONTAINER',
  CHARGES_REACTOR = 'CHARGES_REACTOR',
  DISABLES = 'DISABLES',
  SEALABLE = 'SEALABLE',
  NO_SUN = 'NO_SUN',
  LUXURY_FLOOR = 'LUXURY_FLOOR',

  // 特殊属性
  BLOCKSDOOR = 'BLOCKSDOOR',
  OPERABLE = 'OPERABLE',
  OPENCLOSE_INSIDE = 'OPENCLOSE_INSIDE',
  PLACE_ITEM = 'PLACE_ITEM',
  ALLOWS_ROLL = 'ALLOWS_ROLL',
  BLOCKS_CLIMB = 'BLOCKS_CLIMB',
  DIFFUSOR = 'DIFFUSOR',
  THERMOMETER = 'THERMOMETER',
  BAROMETER = 'BAROMETER',
  CLOCK = 'CLOCK',
  OPAQUE = 'OPAQUE',
  CAN_PUTITEMS_VISIBLE = 'CAN_PUTITEMS_VISIBLE',
  BARRICADABLE_WINDOW = 'BARRICADABLE_WINDOW',

  // 安全相关
  BURNT = 'BURNT',
  NOITEM = 'NOITEM',
  DISABLED_WHEN_OFF = 'DISABLED_WHEN_OFF',
}

/**
 * 家具标志集合
 */
export class FurnitureFlags {
  private readonly _flags: Set<FurnitureFlag>;

  constructor(flags?: FurnitureFlag[]) {
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
  static fromJson(json: string[]): FurnitureFlags {
    const flags = json
      .map((s) => {
        const flag = Object.values(FurnitureFlag).find((v) => v === s);
        return flag;
      })
      .filter((f): f is FurnitureFlag => f !== undefined);

    return new FurnitureFlags(flags);
  }

  /**
   * 获取所有标志
   */
  values(): FurnitureFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 检查是否有标志
   */
  hasFlag(flag: FurnitureFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 检查是否包含标志（Immutable.js Set 兼容）
   */
  has(flag: FurnitureFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 添加标志
   */
  add(flag: FurnitureFlag): FurnitureFlags {
    const newFlags = new Set(this._flags);
    newFlags.add(flag);
    return new FurnitureFlags(Array.from(newFlags));
  }

  /**
   * 移除标志
   */
  remove(flag: FurnitureFlag): FurnitureFlags {
    const newFlags = new Set(this._flags);
    newFlags.delete(flag);
    return new FurnitureFlags(Array.from(newFlags));
  }

  /**
   * 检查是否透明
   */
  isTransparent(): boolean {
    return !this.has(FurnitureFlag.OPAQUE) && this.has(FurnitureFlag.TRANSPARENT);
  }

  /**
   * 检查是否可坐
   */
  isSittable(): boolean {
    return this.has(FurnitureFlag.SITTABLE) || this.has(FurnitureFlag.MOUNTABLE);
  }

  /**
   * 检查是否是工作台
   */
  isWorkbench(): boolean {
    return this.has(FurnitureFlag.WORKBENCH);
  }

  /**
   * 检查是否是容器
   */
  isContainer(): boolean {
    return this.has(FurnitureFlag.CONTAINER);
  }

  /**
   * 检查是否可操作
   */
  isOperable(): boolean {
    return this.has(FurnitureFlag.OPERABLE);
  }

  /**
   * 检查是否是植物
   */
  isPlant(): boolean {
    return this.has(FurnitureFlag.PLANT);
  }

  /**
   * 检查是否易燃
   */
  isFlammable(): boolean {
    return this.has(FurnitureFlag.FLAMMABLE) || this.has(FurnitureFlag.FLAMMABLE_ASH);
  }

  /**
   * 检查是否是木制的
   */
  isWood(): boolean {
    return this.has(FurnitureFlag.WOOD);
  }

  /**
   * 检查是否是金属的
   */
  isMetal(): boolean {
    return this.has(FurnitureFlag.METAL);
  }

  /**
   * 检查是否阻挡门
   */
  blocksDoor(): boolean {
    return this.has(FurnitureFlag.BLOCKSDOOR);
  }

  /**
   * 检查是否可以放置物品
   */
  canPlaceItems(): boolean {
    return (
      !this.has(FurnitureFlag.NOITEM) &&
      (this.has(FurnitureFlag.CAN_PUTITEMS_VISIBLE) || this.has(FurnitureFlag.FLAT))
    );
  }

  /**
   * 检查是否阻挡攀爬
   */
  blocksClimb(): boolean {
    return this.has(FurnitureFlag.BLOCKS_CLIMB);
  }

  /**
   * 检查是否密封
   */
  isSealable(): boolean {
    return this.has(FurnitureFlag.SEALABLE);
  }
}
