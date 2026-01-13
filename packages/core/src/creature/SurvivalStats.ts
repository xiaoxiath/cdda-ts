/**
 * SurvivalStats - 生存状态统计
 *
 * 参考 Cataclysm-DDA 的生存属性系统
 * 管理角色的饥饿、口渴、疲劳等生存状态
 */

/**
 * 生存状态值（0-1000）
 */
export type SurvivalValue = number;

/**
 * 饥饿程度
 */
export enum HungerLevel {
  STARVING = 'starving',       // 饥饿中 (0-200)
  NEAR_STARVING = 'near_starving', // 接近饥饿 (200-400)
  FAMISHED = 'famished',       // 极饿 (400-600)
  HUNGRY = 'hungry',           // 饥饿 (600-800)
  FULL = 'full',               // 饱腹 (800-1000)
  OVERFULL = 'overfull',       // 过饱 (1000+)
}

/**
 * 口渴程度
 */
export enum ThirstLevel {
  DEHYDRATED = 'dehydrated',     // 脱水 (0-200)
  NEAR_DEHYDRATED = 'near_dehydrated', // 接近脱水 (200-400)
  THIRSTY = 'thirsty',           // 口渴 (400-600)
  SLIGHT_THIRSTY = 'slight_thirsty', // 轻微口渴 (600-800)
  NORMAL = 'normal',             // 正常 (800-1000)
  OVERHYDRATED = 'overhydrated', // 过度饮水 (1000+)
}

/**
 * 疲劳程度
 */
export enum FatigueLevel {
  EXHAUSTED = 'exhausted',       // 筋疲力尽 (0-200)
  DEAD_TIRED = 'dead_tired',     // 极度疲劳 (200-400)
  VERY_TIRED = 'very_tired',     // 非常疲劳 (400-600)
  TIRED = 'tired',               // 疲劳 (600-800)
  NORMAL = 'normal',             // 正常 (800-1000)
  ALERT = 'alert',               // 精力充沛 (1000-1200)
}

/**
 * 生存状态属性接口
 */
export interface SurvivalStatsProps {
  /** 饥饿值 (0=濒死, 1000=饱腹) */
  hunger: SurvivalValue;

  /** 口渴值 (0=濒死, 1000=满足) */
  thirst: SurvivalValue;

  /** 疲劳值 (0=昏睡, 1000=精力充沛) */
  fatigue: SurvivalValue;

  /** 睡眠 debt 累积 */
  sleepDebt: SurvivalValue;

  /** 是否正在休息 */
  isResting?: boolean;

  /** 是否正在睡眠 */
  isSleeping?: boolean;
}

/**
 * SurvivalStats - 生存状态统计类
 *
 * 使用不可变数据结构
 */
export class SurvivalStats {
  readonly hunger!: SurvivalValue;
  readonly thirst!: SurvivalValue;
  readonly fatigue!: SurvivalValue;
  readonly sleepDebt!: SurvivalValue;
  readonly isResting!: boolean;
  readonly isSleeping!: boolean;

  constructor(props?: SurvivalStatsProps) {
    const defaults = {
      hunger: 1000,
      thirst: 1000,
      fatigue: 1000,
      sleepDebt: 0,
      isResting: false,
      isSleeping: false,
    };

    const finalProps = { ...defaults, ...props };

    Object.defineProperty(this, 'hunger', { value: finalProps.hunger, enumerable: true });
    Object.defineProperty(this, 'thirst', { value: finalProps.thirst, enumerable: true });
    Object.defineProperty(this, 'fatigue', { value: finalProps.fatigue, enumerable: true });
    Object.defineProperty(this, 'sleepDebt', { value: finalProps.sleepDebt, enumerable: true });
    Object.defineProperty(this, 'isResting', { value: finalProps.isResting ?? false, enumerable: true });
    Object.defineProperty(this, 'isSleeping', { value: finalProps.isSleeping ?? false, enumerable: true });

    Object.freeze(this);
  }

  // ========== 饥饿相关 ==========

  /**
   * 获取饥饿程度
   */
  getHungerLevel(): HungerLevel {
    if (this.hunger <= 200) return HungerLevel.STARVING;
    if (this.hunger <= 400) return HungerLevel.NEAR_STARVING;
    if (this.hunger <= 600) return HungerLevel.FAMISHED;
    if (this.hunger <= 800) return HungerLevel.HUNGRY;
    if (this.hunger <= 1000) return HungerLevel.FULL;
    return HungerLevel.OVERFULL;
  }

  /**
   * 是否饥饿
   */
  isHungry(): boolean {
    return this.hunger < 800;
  }

  /**
   * 是否濒临饿死
   */
  isStarving(): boolean {
    return this.hunger < 200;
  }

  /**
   * 增加饥饿（消耗食物）
   */
  addHunger(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      hunger: Math.min(1200, this.hunger + amount),
    });
  }

  /**
   * 减少饥饿（进食）
   */
  consumeHunger(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      hunger: Math.min(1200, this.hunger - amount),
    });
  }

  // ========== 口渴相关 ==========

  /**
   * 获取口渴程度
   */
  getThirstLevel(): ThirstLevel {
    if (this.thirst <= 200) return ThirstLevel.DEHYDRATED;
    if (this.thirst <= 400) return ThirstLevel.NEAR_DEHYDRATED;
    if (this.thirst <= 600) return ThirstLevel.THIRSTY;
    if (this.thirst <= 800) return ThirstLevel.SLIGHT_THIRSTY;
    if (this.thirst <= 1000) return ThirstLevel.NORMAL;
    return ThirstLevel.OVERHYDRATED;
  }

  /**
   * 是否口渴
   */
  isThirsty(): boolean {
    return this.thirst < 800;
  }

  /**
   * 是否脱水
   */
  isDehydrated(): boolean {
    return this.thirst < 200;
  }

  /**
   * 增加口渴（消耗水分）
   */
  addThirst(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      thirst: Math.min(1200, this.thirst + amount),
    });
  }

  /**
   * 减少口渴（饮水）
   */
  consumeThirst(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      thirst: Math.min(1200, this.thirst - amount),
    });
  }

  // ========== 疲劳相关 ==========

  /**
   * 获取疲劳程度
   */
  getFatigueLevel(): FatigueLevel {
    if (this.fatigue <= 200) return FatigueLevel.EXHAUSTED;
    if (this.fatigue <= 400) return FatigueLevel.DEAD_TIRED;
    if (this.fatigue <= 600) return FatigueLevel.VERY_TIRED;
    if (this.fatigue <= 800) return FatigueLevel.TIRED;
    if (this.fatigue <= 1000) return FatigueLevel.NORMAL;
    return FatigueLevel.ALERT;
  }

  /**
   * 是否疲劳
   */
  isTired(): boolean {
    return this.fatigue < 800;
  }

  /**
   * 是否筋疲力尽
   */
  isExhausted(): boolean {
    return this.fatigue < 200;
  }

  /**
   * 增加疲劳
   */
  addFatigue(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      fatigue: Math.max(0, this.fatigue - amount),
    });
  }

  /**
   * 减少疲劳（休息）
   */
  restFatigue(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      fatigue: Math.min(1200, this.fatigue + amount),
    });
  }

  // ========== 睡眠相关 ==========

  /**
   * 开始睡眠
   */
  startSleeping(): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      isSleeping: true,
      isResting: true,
    });
  }

  /**
   * 结束睡眠
   */
  stopSleeping(): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      isSleeping: false,
      isResting: false,
    });
  }

  /**
   * 增加睡眠 debt
   */
  addSleepDebt(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      sleepDebt: Math.min(1000, this.sleepDebt + amount),
    });
  }

  /**
   * 减少睡眠 debt（通过睡眠）
   */
  reduceSleepDebt(amount: SurvivalValue): SurvivalStats {
    return new SurvivalStats({
      ...this.asProps(),
      sleepDebt: Math.max(0, this.sleepDebt - amount),
    });
  }

  // ========== 回合更新 ==========

  /**
   * 处理一回合的生存消耗
   *
   * @param isMoving 是否在移动
   * @param isFighting 是否在战斗
   * @returns 新的生存状态
   */
  processTurn(isMoving: boolean = false, isFighting: boolean = false): SurvivalStats {
    let newHunger = this.hunger;
    let newThirst = this.thirst;
    let newFatigue = this.fatigue;

    // 基础消耗
    const hungerBurn = 1;
    const thirstBurn = 1;
    const fatigueBurn = 1;

    newHunger -= hungerBurn;
    newThirst -= thirstBurn;
    newFatigue -= fatigueBurn;

    // 移动增加消耗
    if (isMoving && !this.isSleeping) {
      newHunger -= 1;
      newThirst -= 1;
      newFatigue -= 1;
    }

    // 战斗大幅增加消耗
    if (isFighting) {
      newHunger -= 3;
      newThirst -= 2;
      newFatigue -= 2;
    }

    // 睡眠恢复疲劳
    if (this.isSleeping) {
      newFatigue = Math.min(1200, newFatigue + 10);
    } else if (this.isResting) {
      newFatigue = Math.min(1200, newFatigue + 5);
    }

    // 限制范围
    newHunger = Math.max(0, Math.min(1200, newHunger));
    newThirst = Math.max(0, Math.min(1200, newThirst));
    newFatigue = Math.max(0, Math.min(1200, newFatigue));

    return new SurvivalStats({
      ...this.asProps(),
      hunger: newHunger,
      thirst: newThirst,
      fatigue: newFatigue,
    });
  }

  // ========== 健康检查 ==========

  /**
   * 检查生存状态是否危险
   */
  isCritical(): boolean {
    return this.isStarving() || this.isDehydrated() || this.isExhausted();
  }

  /**
   * 获取生存状态描述
   */
  getDescription(): string {
    const parts: string[] = [];

    if (this.isSleeping) {
      parts.push('睡眠中');
    } else if (this.isResting) {
      parts.push('休息中');
    }

    const hungerLevel = this.getHungerLevel();
    if (hungerLevel !== HungerLevel.FULL) {
      const hungerDesc = {
        [HungerLevel.STARVING]: '濒死饥饿',
        [HungerLevel.NEAR_STARVING]: '极度饥饿',
        [HungerLevel.FAMISHED]: '极饿',
        [HungerLevel.HUNGRY]: '饥饿',
        [HungerLevel.OVERFULL]: '过饱',
      }[hungerLevel];
      if (hungerDesc) parts.push(hungerDesc);
    }

    const thirstLevel = this.getThirstLevel();
    if (thirstLevel !== ThirstLevel.NORMAL) {
      const thirstDesc = {
        [ThirstLevel.DEHYDRATED]: '脱水',
        [ThirstLevel.NEAR_DEHYDRATED]: '接近脱水',
        [ThirstLevel.THIRSTY]: '口渴',
        [ThirstLevel.SLIGHT_THIRSTY]: '轻微口渴',
        [ThirstLevel.OVERHYDRATED]: '过度饮水',
      }[thirstLevel];
      if (thirstDesc) parts.push(thirstDesc);
    }

    const fatigueLevel = this.getFatigueLevel();
    if (fatigueLevel !== FatigueLevel.NORMAL) {
      const fatigueDesc = {
        [FatigueLevel.EXHAUSTED]: '筋疲力尽',
        [FatigueLevel.DEAD_TIRED]: '极度疲劳',
        [FatigueLevel.VERY_TIRED]: '非常疲劳',
        [FatigueLevel.TIRED]: '疲劳',
        [FatigueLevel.ALERT]: '精力充沛',
      }[fatigueLevel];
      if (fatigueDesc) parts.push(fatigueDesc);
    }

    return parts.length > 0 ? parts.join(', ') : '状态良好';
  }

  // ========== 辅助方法 ==========

  /**
   * 转换为属性对象
   */
  asProps(): SurvivalStatsProps {
    return {
      hunger: this.hunger,
      thirst: this.thirst,
      fatigue: this.fatigue,
      sleepDebt: this.sleepDebt,
      isResting: this.isResting,
      isSleeping: this.isSleeping,
    };
  }

  // ========== 工厂方法 ==========

  /**
   * 创建默认生存状态
   */
  static create(): SurvivalStats {
    return new SurvivalStats();
  }

  /**
   * 从属性创建
   */
  static fromProps(props: SurvivalStatsProps): SurvivalStats {
    return new SurvivalStats(props);
  }
}
