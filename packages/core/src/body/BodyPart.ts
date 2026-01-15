/**
 * BodyPart - 身体部位类
 *
 * 表示一个具体的身体部位（如左臂、右腿等）
 * 管理部位的 HP、状态和效果
 *
 * 使用不可变数据结构
 */

import { Map, List } from 'immutable';
import { BodyPartId, BodyPartType } from '../creature/types';
import type { SubBodyPartId } from './SubBodyPart';
import {
  BodyPartHealth,
  BodyPartStatus,
  BodyPartProps,
  SubBodyPartProps,
  BodyPartEffect,
  DamageResult,
  HealResult,
  BodyPartImpact,
  BodyPartStats,
} from './BodyPartTypes';

// ============================================================================
// 身体部位属性（内部）
// ============================================================================

/**
 * BodyPart 构造函数属性
 */
interface BodyPartCtorProps {
  readonly id: BodyPartId;
  readonly type: any; // BodyPartType
  readonly name: string;
  readonly maxHP: number;
  readonly currentHP: number;
  readonly size: number;
  readonly isLethal: boolean;
  readonly canBeMissing: boolean;
  readonly status: BodyPartStatus;
  readonly statusDuration: number;
  readonly pain: number;
  readonly bleeding: number;
  readonly infection: number;
  readonly subParts?: Map<SubBodyPartId, BodyPart>; // 子身体部位
}

// ============================================================================
// BodyPart 类
// ============================================================================

/**
 * BodyPart - 身体部位类
 *
 * 表示一个具体的身体部位，管理其 HP、状态和子部位
 */
export class BodyPart {
  readonly id!: BodyPartId;
  readonly type!: BodyPartType;
  readonly name!: string;
  readonly maxHP!: number;
  readonly currentHP!: number;
  readonly size!: number;
  readonly isLethal!: boolean;
  readonly canBeMissing!: boolean;
  readonly status!: BodyPartStatus;
  readonly statusDuration!: number;
  readonly pain!: number;
  readonly bleeding!: number;
  readonly infection!: number;
  readonly subParts!: Map<SubBodyPartId, BodyPart>;

  private constructor(props: BodyPartCtorProps) {
    this.id = props.id;
    this.type = props.type;
    this.name = props.name;
    this.maxHP = props.maxHP;
    this.currentHP = props.currentHP;
    this.size = props.size;
    this.isLethal = props.isLethal;
    this.canBeMissing = props.canBeMissing;
    this.status = props.status;
    this.statusDuration = props.statusDuration;
    this.pain = props.pain;
    this.bleeding = props.bleeding;
    this.infection = props.infection;
    this.subParts = props.subParts || Map();

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建身体部位
   */
  static create(props: BodyPartProps): BodyPart {
    return new BodyPart({
      id: props.id,
      type: props.type,
      name: props.name,
      maxHP: props.maxHP,
      currentHP: props.currentHP,
      size: props.size,
      isLethal: props.isLethal,
      canBeMissing: props.canBeMissing,
      status: props.status,
      statusDuration: props.statusDuration,
      pain: props.pain,
      bleeding: props.bleeding,
      infection: props.infection,
    });
  }

  /**
   * 创建修改后的副本
   *
   * 基于当前实例创建一个新实例，覆盖指定的属性
   */
  with(updates: Partial<BodyPartCtorProps>): BodyPart {
    return new BodyPart({
      id: updates.id !== undefined ? updates.id : this.id,
      type: updates.type !== undefined ? updates.type : this.type,
      name: updates.name !== undefined ? updates.name : this.name,
      maxHP: updates.maxHP !== undefined ? updates.maxHP : this.maxHP,
      currentHP: updates.currentHP !== undefined ? updates.currentHP : this.currentHP,
      size: updates.size !== undefined ? updates.size : this.size,
      isLethal: updates.isLethal !== undefined ? updates.isLethal : this.isLethal,
      canBeMissing: updates.canBeMissing !== undefined ? updates.canBeMissing : this.canBeMissing,
      status: updates.status !== undefined ? updates.status : this.status,
      statusDuration: updates.statusDuration !== undefined ? updates.statusDuration : this.statusDuration,
      pain: updates.pain !== undefined ? updates.pain : this.pain,
      bleeding: updates.bleeding !== undefined ? updates.bleeding : this.bleeding,
      infection: updates.infection !== undefined ? updates.infection : this.infection,
      subParts: updates.subParts !== undefined ? updates.subParts : this.subParts,
    });
  }

  /**
   * 从子部位属性创建
   */
  static fromSubPartProps(props: SubBodyPartProps): BodyPart {
    return new BodyPart({
      id: props.id as any, // SubBodyPartId 可以转换为 BodyPartId
      type: props.type,
      name: props.name,
      maxHP: props.maxHP,
      currentHP: props.currentHP,
      size: props.size,
      isLethal: props.isLethal,
      canBeMissing: props.canBeMissing,
      status: props.status,
      statusDuration: props.statusDuration,
      pain: props.pain,
      bleeding: props.bleeding,
      infection: props.infection,
    });
  }

  // ========== 核心方法 ==========

  /**
   * 受到伤害
   */
  takeDamage(damage: number): DamageResult {
    const newHP = Math.max(0, this.currentHP - damage);
    const destroyed = newHP === 0;

    // 检查是否应该断肢：可缺失部位被完全摧毁时断肢
    const shouldSever = destroyed && this.canBeMissing;

    // 确定新状态
    let newStatus = this.status;
    let newStatusDuration = 0;
    let newPain = this.pain;
    let newBleeding = this.bleeding;
    let newInfection = this.infection;

    if (destroyed) {
      newStatus = shouldSever ? BodyPartStatus.AMPUTATED : BodyPartStatus.DESTROYED;
      newStatusDuration = -1; // 永久
      newBleeding = Math.max(this.bleeding, damage * 0.5);
      newPain = 10;
    } else {
      const healthPercent = (newHP / this.maxHP) * 100;
      newStatus = this.getHealthStatusFromPercent(healthPercent);
      newPain = Math.max(this.pain, Math.floor((1 - healthPercent / 100) * 5));

      // 根据伤害类型添加效果
      if (damage > 15) {
        newBleeding = Math.max(this.bleeding, damage * 0.2);
      }
    }

    const newPart = new BodyPart({
      ...this,
      currentHP: newHP,
      status: newStatus,
      statusDuration: newStatusDuration,
      pain: newPain,
      bleeding: newBleeding,
      infection: newInfection,
    });

    return {
      originalDamage: damage,
      actualDamage: damage,
      partId: this.id,
      newHP,
      destroyed,
      severed: shouldSever,
      effects: [{
        type: newStatus,
        severity: 1 - (newHP / this.maxHP),
        duration: newStatusDuration,
        pain: newPain - this.pain,
        bleeding: newBleeding - this.bleeding,
        infection: 0,
        efficiency: newPart.getEfficiency(),
      }],
    };
  }

  /**
   * 治疗
   */
  heal(amount: number): HealResult {
    if (this.status === BodyPartStatus.AMPUTATED || this.status === BodyPartStatus.DESTROYED) {
      // 断肢或毁灭无法通过普通治疗恢复
      return {
        partId: this.id,
        originalHP: this.currentHP,
        healAmount: 0,
        newHP: this.currentHP,
        statusRemoved: false,
        removedStatus: null,
      };
    }

    const newHP = Math.min(this.maxHP, this.currentHP + amount);
    const actualHeal = newHP - this.currentHP;

    // 检查是否可以移除状态
    let newStatus = this.status;
    let removedStatus: BodyPartStatus | null = null;

    if (newHP >= this.maxHP * 0.9 && this.status !== BodyPartStatus.HEALTHY) {
      newStatus = BodyPartStatus.HEALTHY;
      removedStatus = this.status;
    } else if (newHP >= this.maxHP * 0.6 && this.status === BodyPartStatus.BADLY_HURT) {
      newStatus = BodyPartStatus.HURT;
      removedStatus = BodyPartStatus.BADLY_HURT;
    }

    const newPart = new BodyPart({
      ...this,
      currentHP: newHP,
      status: newStatus,
      statusDuration: newStatus === BodyPartStatus.HEALTHY ? 0 : this.statusDuration,
      pain: Math.max(0, this.pain - Math.floor(actualHeal * 0.5)),
    });

    return {
      partId: this.id,
      originalHP: this.currentHP,
      healAmount: actualHeal,
      newHP,
      statusRemoved: removedStatus !== null,
      removedStatus,
    };
  }

  /**
   * 设置状态
   */
  setStatus(status: BodyPartStatus, duration: number = 0): BodyPart {
    return new BodyPart({
      ...this,
      status,
      statusDuration: duration,
      pain: status === BodyPartStatus.BROKEN ? 8 : this.pain,
      bleeding: status === BodyPartStatus.CUT ? this.maxHP * 0.05 : this.bleeding,
    });
  }

  /**
   * 处理状态持续时间（每回合调用）
   */
  processStatusTurn(): BodyPart {
    if (this.statusDuration === 0 || this.statusDuration === -1) {
      return this; // 无需更新
    }

    const newDuration = this.statusDuration - 1;

    // 持续时间结束，移除状态
    if (newDuration <= 0) {
      return new BodyPart({
        ...this,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: Math.max(0, this.pain - 2),
        bleeding: Math.max(0, this.bleeding - 1),
      });
    }

    // 状态持续中，可能自然恢复或恶化
    let newPain = this.pain;
    let newBleeding = this.bleeding;
    let newInfection = this.infection;

    // 感染会恶化
    if (this.status === BodyPartStatus.INFECTED) {
      newInfection = Math.min(1, this.infection + 0.01);
      newPain = Math.min(10, this.pain + 0.5);
    }

    // 出血会逐渐减少
    if (this.bleeding > 0) {
      newBleeding = Math.max(0, this.bleeding - 0.5);
    }

    return new BodyPart({
      ...this,
      statusDuration: newDuration,
      pain: newPain,
      bleeding: newBleeding,
      infection: newInfection,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 检查部位是否功能正常
   */
  isFunctional(): boolean {
    // 断肢、毁灭或瘫痪不正常
    if (
      this.status === BodyPartStatus.AMPUTATED ||
      this.status === BodyPartStatus.DESTROYED ||
      this.status === BodyPartStatus.PARALYZED ||
      this.status === BodyPartStatus.CRIPPLED
    ) {
      return false;
    }

    // HP 过低不正常
    if (this.currentHP < this.maxHP * 0.1) {
      return false;
    }

    return true;
  }

  /**
   * 获取部位效率 (0-1)
   */
  getEfficiency(): number {
    if (!this.isFunctional()) {
      return 0;
    }

    // 基础效率基于 HP 百分比
    const hpPercent = this.currentHP / this.maxHP;

    // 骨折严重影响效率
    if (this.status === BodyPartStatus.BROKEN) {
      return hpPercent * 0.2;
    }

    // 脱臼影响效率
    if (this.status === BodyPartStatus.DISLOCATED) {
      return hpPercent * 0.5;
    }

    // 疼痛轻微影响效率
    const painPenalty = this.pain * 0.05;

    return Math.max(0, hpPercent - painPenalty);
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): BodyPartHealth {
    const percent = (this.currentHP / this.maxHP) * 100;

    if (percent >= 90) return BodyPartHealth.HEALTHY;
    if (percent >= 60) return BodyPartHealth.BRUISED;
    if (percent >= 30) return BodyPartHealth.HURT;
    if (percent >= 10) return BodyPartHealth.BADLY_HURT;
    return BodyPartHealth.BROKEN;
  }

  /**
   * 获取部位对能力的影响
   */
  getImpact(): BodyPartImpact {
    const efficiency = this.getEfficiency();

    // 默认影响
    const impact: BodyPartImpact = {
      speedModifier: 1,
      dexterityModifier: 1,
      combatModifier: 1,
      perceptionModifier: 1,
      carryModifier: 1,
      canMove: true,
      canUseBothHands: true,
      canDoFineWork: true,
    };

    // 根据部位类型应用影响
    if (this.type === BodyPartType.LEG || this.type === BodyPartType.FOOT) {
      // 腿部影响移动速度
      impact.speedModifier = efficiency;
      if (!this.isFunctional()) {
        impact.canMove = this.currentHP > 0; // 至少有一条腿能动
      }
    }

    if (this.type === BodyPartType.ARM || this.type === BodyPartType.HAND) {
      // 手臂影响操作能力
      impact.dexterityModifier = efficiency;
      impact.combatModifier = efficiency;
      if (!this.isFunctional()) {
        impact.canUseBothHands = false;
      }
    }

    if (this.type === BodyPartType.HEAD || this.type === BodyPartType.SENSOR) {
      // 头部影响感知
      impact.perceptionModifier = efficiency;
    }

    if (this.type === BodyPartType.TORSO) {
      // 躯干影响负重和战斗
      impact.carryModifier = efficiency;
      impact.combatModifier = efficiency;
    }

    return impact;
  }

  /**
   * 获取部位统计信息
   */
  getStats(): BodyPartStats {
    let subPartStats = {
      totalHP: this.currentHP,
      totalMaxHP: this.maxHP,
      functionalParts: this.isFunctional() ? 1 : 0,
      injuredParts: this.currentHP < this.maxHP ? 1 : 0,
      amputatedParts: this.status === BodyPartStatus.AMPUTATED ? 1 : 0,
      totalPain: this.pain,
      totalBleeding: this.bleeding,
      totalInfection: this.infection,
    };

    // 累加子部位统计
    for (const subPart of this.subParts.values()) {
      const subStats = subPart.getStats();
      subPartStats.totalHP += subStats.totalHP;
      subPartStats.totalMaxHP += subStats.totalMaxHP;
      subPartStats.functionalParts += subStats.functionalParts;
      subPartStats.injuredParts += subStats.injuredParts;
      subPartStats.amputatedParts += subStats.amputatedParts;
      subPartStats.totalPain += subStats.totalPain;
      subPartStats.totalBleeding += subStats.totalBleeding;
      subPartStats.totalInfection += subStats.totalInfection;
    }

    return {
      ...subPartStats,
      healthPercentage: (subPartStats.totalHP / subPartStats.totalMaxHP) * 100,
    };
  }

  // ========== 辅助方法 ==========

  /**
   * 从 HP 百分比获取健康状态
   */
  private getHealthStatusFromPercent(percent: number): BodyPartStatus {
    if (percent >= 90) return BodyPartStatus.HEALTHY;
    if (percent >= 60) return BodyPartStatus.BRUISED;
    if (percent >= 30) return BodyPartStatus.CUT;
    if (percent >= 10) return BodyPartStatus.BROKEN;
    return BodyPartStatus.CRIPPLED;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      maxHP: this.maxHP,
      currentHP: this.currentHP,
      size: this.size,
      isLethal: this.isLethal,
      canBeMissing: this.canBeMissing,
      status: this.status,
      statusDuration: this.statusDuration,
      pain: this.pain,
      bleeding: this.bleeding,
      infection: this.infection,
      subParts: this.subParts.map(part => part.toJSON()).toObject(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJSON(json: Record<string, any>): BodyPart {
    const subParts = json.subParts
      ? Map<SubBodyPartId, BodyPart>(
          Object.entries(json.subParts).map(([id, part]) => [
            parseInt(id) as unknown as SubBodyPartId,
            BodyPart.fromJSON(part as any),
          ])
        )
      : Map<SubBodyPartId, BodyPart>();

    return new BodyPart({
      id: json.id,
      type: json.type,
      name: json.name,
      maxHP: json.maxHP,
      currentHP: json.currentHP,
      size: json.size,
      isLethal: json.isLethal,
      canBeMissing: json.canBeMissing,
      status: json.status,
      statusDuration: json.statusDuration,
      pain: json.pain,
      bleeding: json.bleeding,
      infection: json.infection,
      subParts,
    });
  }
}
