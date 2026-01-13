/**
 * Attack - 攻击系统
 *
 * 参考 Cataclysm-DDA 的 melee.h 和 ballistics.h
 * 实现近战和远程攻击的命中判定和伤害结算
 */

import { List, Map } from 'immutable';
import {
  AttackType,
  HitResult,
} from './types';
import type {
  DamageTypeId,
  BodyPartId,
  SkillId,
  Multiplier,
  HitRollResult,
  AttackStats,
} from './types';
import { createBodyPartId } from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';

// ============================================================================
// 攻击属性接口
// ============================================================================

/**
 * 攻击属性
 */
export interface AttackProps {
  /** 攻击类型 */
  type: AttackType;
  /** 伤害实例 */
  damage: DamageInstance;
  /** 命中加值 */
  toHitBonus: number;
  /** 散布值（远程） */
  dispersion: number;
  /** 射程（远程） */
  range: number;
  /** 攻击技能 */
  skill: SkillId | null;
  /** 技能等级 */
  skillLevel: number;
  /** 暴击倍率 */
  critMultiplier: number;
  /** 暴击率加值 */
  critBonus: number;
}

/**
 * 攻击结果
 */
export interface AttackResult {
  /** 命中结果 */
  hitResult: HitResult;
  /** 命中部位 */
  bodyPart: BodyPartId | null;
  /** 原始伤害 */
  rawDamage: DamageInstance;
  /** 实际伤害（考虑抗性后） */
  actualDamage: number;
  /** 是否暴击 */
  critical: boolean;
  /** 是否双重暴击 */
  doubleCrit: boolean;
  /** 伤害详情 */
  damageDetails: Map<DamageTypeId, number>;
}

// ============================================================================
// Attack 类
// ============================================================================

/**
 * Attack - 攻击类
 *
 * 表示一次攻击，包含伤害、命中判定和效果
 */
export class Attack {
  // ============ 属性 ============

  /** 攻击类型 */
  readonly type: AttackType;

  /** 伤害实例 */
  readonly damage: DamageInstance;

  /** 命中加值 */
  readonly toHitBonus: number;

  /** 散布值（远程） */
  readonly dispersion: number;

  /** 射程（远程） */
  readonly range: number;

  /** 攻击技能 */
  readonly skill: SkillId | null;

  /** 技能等级 */
  readonly skillLevel: number;

  /** 暴击倍率 */
  readonly critMultiplier: number;

  /** 暴击率加值 */
  readonly critBonus: number;

  // ============ 构造函数 ============

  private constructor(props: AttackProps) {
    this.type = props.type;
    this.damage = props.damage;
    this.toHitBonus = props.toHitBonus ?? 0;
    this.dispersion = props.dispersion ?? 0;
    this.range = props.range ?? 1;
    this.skill = props.skill ?? null;
    this.skillLevel = props.skillLevel ?? 0;
    this.critMultiplier = props.critMultiplier ?? 2.0;
    this.critBonus = props.critBonus ?? 0;
  }

  // ============ 工厂方法 ============

  /**
   * 创建攻击
   */
  static create(props: AttackProps): Attack {
    return new Attack(props);
  }

  /**
   * 创建近战攻击
   */
  static melee(damage: DamageInstance, toHitBonus: number = 0): Attack {
    return new Attack({
      type: AttackType.MELEE,
      damage,
      toHitBonus,
      dispersion: 0,
      range: 1,
      skill: null,
      skillLevel: 0,
      critMultiplier: 2.0,
      critBonus: 0,
    });
  }

  /**
   * 创建远程攻击
   */
  static ranged(
    damage: DamageInstance,
    dispersion: number,
    range: number,
    skill: SkillId | null = null,
    skillLevel: number = 0
  ): Attack {
    return new Attack({
      type: AttackType.RANGED,
      damage,
      toHitBonus: 0,
      dispersion,
      range,
      skill,
      skillLevel,
      critMultiplier: 2.0,
      critBonus: 0,
    });
  }

  /**
   * 创建投掷攻击
   */
  static throw(damage: DamageInstance, range: number): Attack {
    return new Attack({
      type: AttackType.THROW,
      damage,
      toHitBonus: 0,
      dispersion: 30, // 默认散布
      range,
      skill: null,
      skillLevel: 0,
      critMultiplier: 1.5,
      critBonus: 0,
    });
  }

  // ============ 命中判定 ============

  /**
   * 执行命中检定
   *
   * @param accuracy 攻击者精度
   * @param dodge 目标闪避值
   * @param distance 距离（格）
   */
  rollHit(accuracy: number, dodge: number, distance: number = 0): HitRollResult {
    // 计算散布影响
    let dispersion = this.dispersion;
    if (this.type === AttackType.RANGED) {
      // 距离越远，散布影响越大
      dispersion *= (1 + distance * 0.1);
    }

    // 计算命中检定
    const hitRoll = accuracy + this.toHitBonus - dodge;
    const d20 = Math.random() * 20;

    let missedBy = 0;
    let hitResult: HitResult;

    if (d20 === 20 || d20 >= hitRoll - this.critBonus) {
      hitResult = HitResult.CRIT;
      missedBy = 0;
    } else if (d20 >= hitRoll - 5) {
      hitResult = HitResult.HIT;
      missedBy = Math.max(0, (hitRoll - d20) / 20);
    } else if (d20 >= hitRoll - 10) {
      hitResult = HitResult.GLANCE;
      missedBy = Math.max(0, (hitRoll - d20) / 20);
    } else if (d20 >= hitRoll - 15) {
      hitResult = HitResult.GRAZE;
      missedBy = Math.max(0, (hitRoll - d20) / 10);
    } else {
      hitResult = HitResult.MISS;
      missedBy = 1.0;
    }

    // 计算失误的格数
    const missedByTiles = missedBy * distance;

    return {
      missedBy,
      missedByTiles,
      dispersion,
    };
  }

  /**
   * 计算暴击
   *
   * @param rollResult 命中检定结果
   */
  private checkCritical(rollResult: HitRollResult): { critical: boolean; doubleCrit: boolean } {
    if (rollResult.missedBy === 0) {
      // 完美命中，检查双重暴击
      const doubleCritRoll = Math.random() * 100;
      const doubleCritChance = this.critBonus * 2;
      return {
        critical: true,
        doubleCrit: doubleCritRoll < doubleCritChance,
      };
    }
    return { critical: false, doubleCrit: false };
  }

  // ============ 伤害结算 ============

  /**
   * 执行攻击（完整流程）
   *
   * @param accuracy 攻击者精度
   * @param dodge 目标闪避值
   * @param resistances 目标抗性
   * @param targetBodyParts 可攻击的身体部位
   */
  executeAttack(
    accuracy: number,
    dodge: number,
    resistances: Resistances,
    targetBodyParts: BodyPartId[] = [createBodyPartId('TORSO')]
  ): AttackResult {
    // 1. 命中检定
    const hitRoll = this.rollHit(accuracy, dodge);

    // 2. 检查暴击
    const { critical, doubleCrit } = this.checkCritical(hitRoll);

    // 3. 选择命中部位
    const bodyPart = this.selectBodyPart(targetBodyParts, hitRoll);

    // 4. 计算伤害
    let damage = this.damage;

    if (critical) {
      const mult = doubleCrit ? this.critMultiplier * 2 : this.critMultiplier;
      damage = damage.multDamage(mult, true);
    }

    // 计算实际伤害
    const resistMap = resistances.getEffectiveResistance(bodyPart, damage.damageUnits.first()!.type);
    const actualDamage = Math.max(0, damage.totalDamage() - resistMap);

    // 构建伤害详情
    const damageDetails = Map<DamageTypeId, number>();
    for (const unit of damage.damageUnits) {
      const resist = resistances.getEffectiveResistance(bodyPart, unit.type);
      const dmg = Math.max(0, unit.amount - resist);
      damageDetails.set(unit.type, dmg);
    }

    // 5. 确定命中结果
    let hitResult: HitResult;
    if (hitRoll.missedBy >= 1.0) {
      hitResult = HitResult.MISS;
    } else if (doubleCrit) {
      hitResult = HitResult.CRIT;
    } else if (critical) {
      hitResult = HitResult.CRIT;
    } else if (hitRoll.missedBy > 0.5) {
      hitResult = HitResult.GRAZE;
    } else if (hitRoll.missedBy > 0.2) {
      hitResult = HitResult.GLANCE;
    } else {
      hitResult = HitResult.HIT;
    }

    return {
      hitResult,
      bodyPart,
      rawDamage: damage,
      actualDamage,
      critical,
      doubleCrit,
      damageDetails,
    };
  }

  /**
   * 选择身体部位
   */
  private selectBodyPart(
    availableParts: BodyPartId[],
    hitRoll: HitRollResult
  ): BodyPartId | null {
    if (availableParts.length === 0) return null;

    // 根据命中质量选择部位
    // 命中质量越高，越可能击中要害部位
    const accuracyFactor = 1 - hitRoll.missedBy;

    // 简化版：随机选择，精度影响要害部位概率
    if (accuracyFactor > 0.8 && availableParts.includes(createBodyPartId('HEAD'))) {
      return createBodyPartId('HEAD');
    }
    if (accuracyFactor > 0.6 && availableParts.includes(createBodyPartId('TORSO'))) {
      return createBodyPartId('TORSO');
    }

    // 默认返回躯干或随机
    return availableParts.includes(createBodyPartId('TORSO'))
      ? createBodyPartId('TORSO')
      : availableParts[Math.floor(Math.random() * availableParts.length)];
  }

  // ============ 修改方法 ============

  /**
   * 设置攻击类型
   */
  withType(type: AttackType): Attack {
    return new Attack({ ...this.asProps(), type });
  }

  /**
   * 设置伤害
   */
  withDamage(damage: DamageInstance): Attack {
    return new Attack({ ...this.asProps(), damage });
  }

  /**
   * 添加命中加值
   */
  addToHitBonus(bonus: number): Attack {
    return new Attack({ ...this.asProps(), toHitBonus: this.toHitBonus + bonus });
  }

  /**
   * 设置技能
   */
  withSkill(skill: SkillId, level: number): Attack {
    return new Attack({ ...this.asProps(), skill, skillLevel: level });
  }

  /**
   * 设置暴击倍率
   */
  withCritMultiplier(multiplier: number): Attack {
    return new Attack({ ...this.asProps(), critMultiplier: multiplier });
  }

  // ============ 工具方法 ============

  /**
   * 转换为属性对象
   */
  asProps(): AttackProps {
    return {
      type: this.type,
      damage: this.damage,
      toHitBonus: this.toHitBonus,
      dispersion: this.dispersion,
      range: this.range,
      skill: this.skill,
      skillLevel: this.skillLevel,
      critMultiplier: this.critMultiplier,
      critBonus: this.critBonus,
    };
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      type: this.type,
      damage: this.damage.toJson(),
      toHitBonus: this.toHitBonus,
      dispersion: this.dispersion,
      range: this.range,
      skill: this.skill,
      skillLevel: this.skillLevel,
      critMultiplier: this.critMultiplier,
      critBonus: this.critBonus,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): Attack {
    return new Attack({
      type: json.type as AttackType,
      damage: DamageInstance.fromJson(json.damage),
      toHitBonus: json.toHitBonus ?? 0,
      dispersion: json.dispersion ?? 0,
      range: json.range ?? 1,
      skill: json.skill ?? null,
      skillLevel: json.skillLevel ?? 0,
      critMultiplier: json.critMultiplier ?? 2.0,
      critBonus: json.critBonus ?? 0,
    });
  }
}
