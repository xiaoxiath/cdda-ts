/**
 * Re-export TrapId from coordinates for convenience
 */
export type { TrapId } from '../coordinates/types';

/**
 * 陷阱动作类型
 */
export enum TrapAction {
  NONE = 'none',
  SNARE_LIGHT = 'snare_light',
  SNARE_HEAVY = 'snare_heavy',
  BOARD = 'board',
  CALTROPS = 'caltrops',
  TRIPWIRE = 'tripwire',
  CROSSBOW = 'crossbow',
  SHOTGUN = 'shotgun',
  BUBBLE = 'bubble',
  SINKHOLE = 'sinkhole',
  LEDGE = 'ledge',
  FUNNEL = 'funnel',
  TELEPORT = 'teleport',
  GLOW = 'glow',
  HOLE = 'hole',
  PIT = 'pit',
  PIT_SPIKES = 'pit_spikes',
  PIT_GAS = 'pit_gas',
  LAMP = 'lamp',
  ALARM = 'alarm',
  TALISMAN = 'talisman',
  SPELL = 'spell',
  MOUSE = 'mouse',
}

/**
 * 陷阱标志枚举
 */
export enum TrapFlag {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
  BENIGN = 'BENIGN',
  DANGEROUS = 'DANGEROUS',
  LETHAL = 'LETHAL',
  LOUD = 'LOUD',
  SILENT = 'SILENT',
  RELOADABLE = 'RELOADABLE',
  CONSUMED = 'CONSUMED',
  AUTOMATIC = 'AUTOMATIC',
  ALWAYS_INVISIBLE = 'ALWAYS_INVISIBLE',
  TRIGGERED_BY_WEIGHT = 'TRIGGERED_BY_WEIGHT',
  TRIGGERED_BY_TOUCH = 'TRIGGERED_BY_TOUCH',
  TRIGGERED_BY_WALK = 'TRIGGERED_BY_WALK',
  TRIGGERED_BY_OPEN = 'TRIGGERED_BY_OPEN',
  TRIGGERED_BY_KINEMATICS = 'TRIGGERED_BY_KINEMATICS',
  AVOIDED_BY_DOGS = 'AVOIDED_BY_DOGS',
  CAN_BE_AVOIDED = 'CAN_BE_AVOIDED',
}

/**
 * 陷阱标志集合
 */
export class TrapFlags {
  private readonly _flags: Set<TrapFlag>;

  constructor(flags?: TrapFlag[]) {
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
  static fromJson(json: string[]): TrapFlags {
    const flags = json
      .map((s) => {
        const flag = Object.values(TrapFlag).find((v) => v === s);
        return flag;
      })
      .filter((f): f is TrapFlag => f !== undefined);

    return new TrapFlags(flags);
  }

  /**
   * 获取所有标志
   */
  values(): TrapFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 检查是否有标志
   */
  hasFlag(flag: TrapFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 检查是否包含标志（Immutable.js Set 兼容）
   */
  has(flag: TrapFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 添加标志
   */
  add(flag: TrapFlag): TrapFlags {
    const newFlags = new Set(this._flags);
    newFlags.add(flag);
    return new TrapFlags(Array.from(newFlags));
  }

  /**
   * 移除标志
   */
  remove(flag: TrapFlag): TrapFlags {
    const newFlags = new Set(this._flags);
    newFlags.delete(flag);
    return new TrapFlags(Array.from(newFlags));
  }

  /**
   * 检查是否可见
   */
  isVisible(): boolean {
    return this.has(TrapFlag.VISIBLE);
  }

  /**
   * 检查是否隐藏
   */
  isHidden(): boolean {
    return this.has(TrapFlag.HIDDEN);
  }

  /**
   * 检查是否无害
   */
  isBenign(): boolean {
    return this.has(TrapFlag.BENIGN);
  }

  /**
   * 检查是否危险
   */
  isDangerous(): boolean {
    return this.has(TrapFlag.DANGEROUS);
  }

  /**
   * 检查是否大声
   */
  isLoud(): boolean {
    return this.has(TrapFlag.LOUD);
  }

  /**
   * 检查是否静音
   */
  isSilent(): boolean {
    return this.has(TrapFlag.SILENT);
  }

  /**
   * 检查是否可重载
   */
  isReloadable(): boolean {
    return this.has(TrapFlag.RELOADABLE);
  }

  /**
   * 检查是否消耗性
   */
  isConsumed(): boolean {
    return this.has(TrapFlag.CONSUMED);
  }

  /**
   * 检查是否自动触发
   */
  isAutomatic(): boolean {
    return this.has(TrapFlag.AUTOMATIC);
  }

  /**
   * 检查是否致命
   */
  isLethal(): boolean {
    return this.has(TrapFlag.LETHAL);
  }

  /**
   * 检查是否永远不可见
   */
  isAlwaysInvisible(): boolean {
    return this.has(TrapFlag.ALWAYS_INVISIBLE);
  }

  /**
   * 检查是否可以被避免
   */
  isCanBeAvoided(): boolean {
    return this.has(TrapFlag.CAN_BE_AVOIDED);
  }

  /**
   * 检查是否可以被避免（别名）
   * @deprecated 使用 isCanBeAvoided() 代替
   */
  canBeAvoided(): boolean {
    return this.isCanBeAvoided();
  }

  /**
   * 检查是否由重量触发
   */
  isTriggeredByWeight(): boolean {
    return this.has(TrapFlag.TRIGGERED_BY_WEIGHT);
  }

  /**
   * 检查是否由重量触发（别名）
   * @deprecated 使用 isTriggeredByWeight() 代替
   */
  triggeredByWeight(): boolean {
    return this.isTriggeredByWeight();
  }

  /**
   * 检查是否由触碰触发
   */
  isTriggeredByTouch(): boolean {
    return this.has(TrapFlag.TRIGGERED_BY_TOUCH);
  }

  /**
   * 检查是否由触碰触发（别名）
   * @deprecated 使用 isTriggeredByTouch() 代替
   */
  triggeredByTouch(): boolean {
    return this.isTriggeredByTouch();
  }

  /**
   * 检查是否由行走触发
   */
  isTriggeredByWalk(): boolean {
    return this.has(TrapFlag.TRIGGERED_BY_WALK);
  }

  /**
   * 检查是否由行走触发（别名）
   * @deprecated 使用 isTriggeredByWalk() 代替
   */
  triggeredByWalk(): boolean {
    return this.isTriggeredByWalk();
  }

  /**
   * 检查是否由打开触发
   */
  isTriggeredByOpen(): boolean {
    return this.has(TrapFlag.TRIGGERED_BY_OPEN);
  }

  /**
   * 检查是否由打开触发（别名）
   * @deprecated 使用 isTriggeredByOpen() 代替
   */
  triggeredByOpen(): boolean {
    return this.isTriggeredByOpen();
  }

  /**
   * 检查是否会被狗避开
   */
  avoidedByDogs(): boolean {
    return this.has(TrapFlag.AVOIDED_BY_DOGS);
  }
}
