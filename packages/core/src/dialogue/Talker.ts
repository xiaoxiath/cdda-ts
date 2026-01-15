/**
 * Talker 接口 - 对话参与者抽象
 *
 * 提供对话系统需要的通用接口，任何参与对话的实体都需要实现此接口。
 * 对应 CDDA 的 talker.h 虚拟接口，支持 NPC、玩家、计算机和可交流的怪物。
 */

import type { SkillId } from '../skill';
import type { ItemTypeId } from '../item';
import type { AttitudeValue, TalkerType } from './types';

// 重新导出 TalkerType 以便外部使用
export { TalkerType } from './types';

/**
 * Talker 接口
 *
 * 定义了对话参与者必须实现的所有方法。
 * 这个接口抽象了不同类型实体的差异，使对话系统可以统一处理。
 */
export interface Talker {
  /**
   * 获取显示名称
   * 用于在对话中显示此角色的名字
   */
  getName(): string;

  /**
   * 检查是否活着
   * 死亡的角色不能参与对话
   */
  isAlive(): boolean;

  /**
   * 获取属性值
   * @param stat - 属性名称，如 'strength', 'intelligence', 'dexterity' 等
   * @returns 属性值，通常范围 0-20
   */
  getStat(stat: string): number;

  /**
   * 获取技能等级
   * @param skillId - 技能 ID
   * @returns 技能等级，通常范围 0-10
   */
  getSkillLevel(skillId: SkillId): number;

  /**
   * 检查是否拥有特定物品
   * @param itemId - 物品类型 ID
   * @returns 是否拥有该物品
   */
  hasItem(itemId: ItemTypeId): boolean;

  /**
   * 获取当前态度值
   * 0 = 敌对, 5 = 中立, 10 = 友好
   */
  getAttitude(): AttitudeValue;

  /**
   * 设置态度值
   * @param value - 新的态度值
   */
  setAttitude(value: AttitudeValue): void;

  /**
   * 修改态度值
   * @param delta - 态度变化量，可以是负数
   */
  modAttitude(delta: number): void;

  /**
   * 检查是否是玩家
   */
  isPlayer(): boolean;

  /**
   * 检查是否是 NPC
   */
  isNPC(): boolean;

  /**
   * 检查是否是计算机
   */
  isComputer(): boolean;

  /**
   * 检查是否持有武器
   */
  hasWeapon(): boolean;

  /**
   * 检查是否在安全地点
   */
  isInSafePlace(): boolean;

  /**
   * 获取 Talker 类型
   */
  getTalkerType(): TalkerType;

  /**
   * 检查是否可以交易
   */
  canTrade(): boolean;

  /**
   * 检查是否可以加入队伍
   */
  canJoin(): boolean;

  /**
   * 检查是否可以跟随
   */
  canFollow(): boolean;

  /**
   * 获取当前位置描述
   */
  getLocationDescription(): string;
}

/**
 * 抽象 Talker 基类
 *
 * 提供 Talker 接口的默认实现，子类可以覆盖特定方法。
 */
export abstract class AbstractTalker implements Talker {
  constructor(
    protected _name: string,
    protected _attitude: AttitudeValue = 5,
    protected _talkerType: TalkerType
  ) {}

  getName(): string {
    return this._name;
  }

  abstract isAlive(): boolean;
  abstract getStat(stat: string): number;
  abstract getSkillLevel(skillId: SkillId): number;
  abstract hasItem(itemId: ItemTypeId): boolean;

  getAttitude(): AttitudeValue {
    return this._attitude;
  }

  setAttitude(value: AttitudeValue): void {
    this._attitude = Math.max(0, Math.min(10, value));
  }

  modAttitude(delta: number): void {
    this.setAttitude((this._attitude + delta) as AttitudeValue);
  }

  isPlayer(): boolean {
    return this._talkerType === TalkerType.PLAYER;
  }

  isNPC(): boolean {
    return this._talkerType === TalkerType.NPC;
  }

  isComputer(): boolean {
    return this._talkerType === TalkerType.COMPUTER;
  }

  getTalkerType(): TalkerType {
    return this._talkerType;
  }

  // 以下提供合理的默认实现，子类可以覆盖

  hasWeapon(): boolean {
    return false;
  }

  isInSafePlace(): boolean {
    return true;
  }

  canTrade(): boolean {
    return false;
  }

  canJoin(): boolean {
    return false;
  }

  canFollow(): boolean {
    return false;
  }

  getLocationDescription(): string {
    return 'somewhere';
  }
}

/**
 * 简单的 Talker 实现用于测试
 */
export class MockTalker extends AbstractTalker {
  private readonly _stats: Readonly<Record<string, number>>;
  private readonly _skills: ReadonlyMap<SkillId, number>;
  private readonly _items: ReadonlySet<ItemTypeId>;
  private _alive: boolean;

  constructor(props: {
    name: string;
    attitude?: AttitudeValue;
    talkerType?: TalkerType;
    stats?: Record<string, number>;
    skills?: Map<SkillId, number>;
    items?: Set<ItemTypeId>;
    alive?: boolean;
  }) {
    // 使用 0 作为默认值 (对应 TalkerType.NPC)
    const defaultTalkerType = 0;
    super(
      props.name,
      props.attitude ?? 5,
      props.talkerType ?? defaultTalkerType as TalkerType
    );
    this._stats = props.stats ?? { strength: 10, intelligence: 10, dexterity: 10 };
    this._skills = props.skills ?? new Map();
    this._items = props.items ?? new Set();
    this._alive = props.alive ?? true;
  }

  isAlive(): boolean {
    return this._alive;
  }

  setAlive(value: boolean): void {
    this._alive = value;
  }

  getStat(stat: string): number {
    return this._stats[stat] ?? 0;
  }

  getSkillLevel(skillId: SkillId): number {
    return this._skills.get(skillId) ?? 0;
  }

  hasItem(itemId: ItemTypeId): boolean {
    return this._items.has(itemId);
  }
}
