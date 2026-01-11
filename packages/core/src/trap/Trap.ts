import { TrapId } from '../coordinates/types';
import { TrapAction, TrapFlags } from './types';

/**
 * 陷阱属性
 */
export interface TrapProps {
  readonly id: TrapId;
  readonly name: string;
  readonly description: string;
  readonly symbol: string;
  readonly color: string;
  readonly visibility: number;
  readonly avoidance: number;
  readonly difficulty: number;
  readonly trapRadius: number;
  readonly benign: boolean;
  readonly alwaysInvisible: boolean;
  readonly triggerWeight: number;
  readonly action: TrapAction;
  readonly flags: TrapFlags;
  readonly fun: number;
  readonly complexity: number;
}

/**
 * 陷阱数据
 *
 * 表示一个陷阱类型
 */
export class Trap {
  private readonly _props: TrapProps;

  readonly id!: TrapId;
  readonly name!: string;
  readonly description!: string;
  readonly symbol!: string;
  readonly color!: string;
  readonly visibility!: number;
  readonly avoidance!: number;
  readonly difficulty!: number;
  readonly trapRadius!: number;
  readonly benign!: boolean;
  readonly alwaysInvisible!: boolean;
  readonly triggerWeight!: number;
  readonly action!: TrapAction;
  readonly flags!: TrapFlags;
  readonly fun!: number;
  readonly complexity!: number;

  constructor(props?: Partial<TrapProps>) {
    const defaults: TrapProps = {
      id: '' as TrapId,
      name: '',
      description: '',
      symbol: '^',
      color: 'light_green',
      visibility: 3,
      avoidance: 0,
      difficulty: 0,
      trapRadius: 0,
      benign: false,
      alwaysInvisible: false,
      triggerWeight: 500,
      action: TrapAction.NONE,
      flags: new TrapFlags(),
      fun: 0,
      complexity: 0,
    };

    // Merge props with defaults, ensuring flags is always set
    this._props = {
      ...defaults,
      ...props,
      flags: props?.flags ?? defaults.flags,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'id', { get: () => this._props.id, enumerable: true });
    Object.defineProperty(this, 'name', { get: () => this._props.name, enumerable: true });
    Object.defineProperty(this, 'description', { get: () => this._props.description, enumerable: true });
    Object.defineProperty(this, 'symbol', { get: () => this._props.symbol, enumerable: true });
    Object.defineProperty(this, 'color', { get: () => this._props.color, enumerable: true });
    Object.defineProperty(this, 'visibility', { get: () => this._props.visibility, enumerable: true });
    Object.defineProperty(this, 'avoidance', { get: () => this._props.avoidance, enumerable: true });
    Object.defineProperty(this, 'difficulty', { get: () => this._props.difficulty, enumerable: true });
    Object.defineProperty(this, 'trapRadius', { get: () => this._props.trapRadius, enumerable: true });
    Object.defineProperty(this, 'benign', { get: () => this._props.benign, enumerable: true });
    Object.defineProperty(this, 'alwaysInvisible', { get: () => this._props.alwaysInvisible, enumerable: true });
    Object.defineProperty(this, 'triggerWeight', { get: () => this._props.triggerWeight, enumerable: true });
    Object.defineProperty(this, 'action', { get: () => this._props.action, enumerable: true });
    Object.defineProperty(this, 'flags', { get: () => this._props.flags, enumerable: true });
    Object.defineProperty(this, 'fun', { get: () => this._props.fun, enumerable: true });
    Object.defineProperty(this, 'complexity', { get: () => this._props.complexity, enumerable: true });
    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof TrapProps>(key: K, value: TrapProps[K]): Trap {
    return new Trap({ ...this._props, [key]: value });
  }

  /**
   * 检查是否可见
   *
   * @param detectionSkill 角色的检测技能等级
   * @returns 是否可见
   */
  isVisible(detectionSkill: number = 0): boolean {
    if (this.alwaysInvisible) {
      return false;
    }
    if (this.flags.isVisible()) {
      return true;
    }
    if (this.flags.isHidden()) {
      return false;
    }
    return detectionSkill >= this.visibility;
  }

  /**
   * 检查是否可以被指定角色触发
   *
   * @param weight 角色重量（克）
   * @returns 是否可以触发
   */
  canTrigger(weight: number): boolean {
    if (this.benign) {
      return false;
    }

    // 检查重量触发
    if (this.flags.triggeredByWeight()) {
      return weight >= this.triggerWeight;
    }

    return true;
  }

  /**
   * 计算发现难度
   *
   * @param perception 角色的感知属性
   * @returns 发现难度（0-100，越低越容易）
   */
  getDiscoveryDifficulty(perception: number): number {
    if (this.flags.isVisible()) {
      return 0; // 可见的陷阱总是能被发现
    }

    const difficulty = this.visibility - perception;
    return Math.max(0, Math.min(100, difficulty * 10));
  }

  /**
   * 计算躲避难度
   *
   * @param dodge 角色的闪避技能
   * @returns 躲避难度（0-100，越低越容易）
   */
  getAvoidanceDifficulty(dodge: number): number {
    const difficulty = this.avoidance - dodge;
    return Math.max(0, Math.min(100, difficulty * 10));
  }

  /**
   * 检查是否可以拆除
   *
   * @param skills 角色的技能等级
   * @returns 是否可以拆除
   */
  canDisarm(skills: Map<string, number>): boolean {
    if (this.benign || this.alwaysInvisible) {
      return false;
    }

    const skillLevel = skills.get('traps') || skills.get('mechanics') || 0;
    return skillLevel >= this.difficulty;
  }

  /**
   * 计算拆除难度
   *
   * @param skills 角色的技能等级
   * @returns 拆除难度（0-100，越低越容易）
   */
  getDisarmDifficulty(skills: Map<string, number>): number {
    const skillLevel = skills.get('traps') || skills.get('mechanics') || 0;
    const difficulty = this.difficulty - skillLevel;
    return Math.max(0, Math.min(100, difficulty * 10));
  }

  /**
   * 获取触发概率
   *
   * @param dodge 角色的闪避技能
   * @returns 触发概率（0-1）
   */
  getTriggerChance(dodge: number = 0): number {
    const difficulty = this.getAvoidanceDifficulty(dodge);
    // 难度越高，触发概率越低
    return Math.max(0, Math.min(1, (100 - difficulty) / 100));
  }

  /**
   * 检查是否在范围内
   *
   * @param distance 到陷阱的距离
   * @returns 是否在触发范围内
   */
  isInRange(distance: number): boolean {
    return distance <= this.trapRadius;
  }

  /**
   * 获取伤害值
   *
   * @param weight 角色重量（克）
   * @returns 伤害值
   */
  getDamage(_weight: number): number {
    switch (this.action) {
      case TrapAction.SNARE_LIGHT:
        return 0; // 不造成伤害，只是困住
      case TrapAction.SNARE_HEAVY:
        return 5;
      case TrapAction.CALTROPS:
        return 3;
      case TrapAction.BOARD:
        return 2;
      case TrapAction.CROSSBOW:
        return 20;
      case TrapAction.SHOTGUN:
        return 40;
      case TrapAction.SINKHOLE:
        return 10;
      case TrapAction.PIT_SPIKES:
        return 25;
      case TrapAction.PIT_GAS:
        return 15;
      case TrapAction.HOLE:
      case TrapAction.PIT:
        return 5;
      default:
        return 0;
    }
  }

  /**
   * 获取移动惩罚
   *
   * @returns 移动消耗惩罚（回合）
   */
  getMovementPenalty(): number {
    switch (this.action) {
      case TrapAction.SNARE_LIGHT:
        return 100; // 被困住
      case TrapAction.SNARE_HEAVY:
        return 200;
      case TrapAction.PIT:
      case TrapAction.PIT_SPIKES:
      case TrapAction.PIT_GAS:
      case TrapAction.HOLE:
      case TrapAction.SINKHOLE:
        return 50; // 需要爬出来
      case TrapAction.CALTROPS:
        return 10;
      case TrapAction.TRIPWIRE:
        return 5;
      default:
        return 0;
    }
  }

  /**
   * 检查是否致命
   */
  isLethal(): boolean {
    return [
      TrapAction.PIT_SPIKES,
      TrapAction.SHOTGUN,
      TrapAction.SINKHOLE,
    ].includes(this.action);
  }

  /**
   * 获取显示信息
   */
  getDisplayInfo(isVisible: boolean): {
    symbol: string;
    color: string;
    name: string;
  } {
    if (isVisible) {
      return {
        symbol: this.symbol,
        color: this.color,
        name: this.name,
      };
    } else {
      return {
        symbol: '.',
        color: 'white',
        name: 'unknown',
      };
    }
  }

  /**
   * 获取动作描述
   */
  getActionDescription(): string {
    switch (this.action) {
      case TrapAction.SNARE_LIGHT:
        return 'snare trap (light)';
      case TrapAction.SNARE_HEAVY:
        return 'snare trap (heavy)';
      case TrapAction.BOARD:
        return 'nailed board';
      case TrapAction.CALTROPS:
        return 'caltrops';
      case TrapAction.TRIPWIRE:
        return 'tripwire';
      case TrapAction.CROSSBOW:
        return 'crossbow trap';
      case TrapAction.SHOTGUN:
        return 'shotgun trap';
      case TrapAction.SINKHOLE:
        return 'sinkhole';
      case TrapAction.PIT:
        return 'pit';
      case TrapAction.PIT_SPIKES:
        return 'spiked pit';
      case TrapAction.PIT_GAS:
        return 'gas pit';
      case TrapAction.HOLE:
        return 'hole';
      case TrapAction.BUBBLE:
        return 'bubble wrap';
      case TrapAction.TELEPORT:
        return 'teleport trap';
      case TrapAction.GLOW:
        return 'glowing trap';
      case TrapAction.FUNNEL:
        return 'funnel trap';
      case TrapAction.LAMP:
        return 'trap lamp';
      case TrapAction.ALARM:
        return 'alarm';
      case TrapAction.MOUSE:
        return 'mouse trap';
      default:
        return 'unknown trap';
    }
  }

  /**
   * 检查是否需要弹药
   */
  requiresAmmunition(): boolean {
    return [
      TrapAction.CROSSBOW,
      TrapAction.SHOTGUN,
    ].includes(this.action);
  }

  /**
   * 获取消耗性
   */
  isConsumable(): boolean {
    return this.flags.isConsumed();
  }

  /**
   * 检查是否可重载
   */
  isReloadable(): boolean {
    return this.flags.isReloadable();
  }

  /**
   * 获取复杂度等级
   */
  getComplexity(): number {
    return this.complexity;
  }

  /**
   * 获取娱乐值
   */
  getFunValue(): number {
    return this.fun;
  }

  /**
   * 检查是否危险
   */
  isDangerous(): boolean {
    return this.flags.isDangerous();
  }

  /**
   * 检查是否触发
   *
   * @param actor 触发的角色
   * @param weight 角色重量
   * @param dodge 角色闪避值
   * @returns 是否触发
   */
  checkTrigger(weight: number, dodge: number = 0): boolean {
    if (!this.canTrigger(weight)) {
      return false;
    }

    const chance = this.getTriggerChance(dodge);
    return Math.random() < chance;
  }

  /**
   * 创建副本
   */
  clone(): Trap {
    return new Trap(this._props);
  }
}
