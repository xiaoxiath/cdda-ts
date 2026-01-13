/**
 * MeleeCombat - 近战战斗系统
 *
 * 参考 Cataclysm-DDA 的 melee.h
 * 处理近战攻击的完整流程，包括命中判定、伤害计算、格挡等
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  BodyPartId,
  SkillId,
  Multiplier,
} from './types';
import { createBodyPartId, createDamageTypeId } from './types';
import { AttackType, HitResult, MeleeHitRange, BodyPartType } from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';
import { Attack, AttackResult } from './Attack';
import { DamageCalculator } from './DamageCalculator';
import { DamageHandler, DamageableCreature } from './DamageHandler';

// ============================================================================
// 近战攻击类型
// ============================================================================

/**
 * 近战攻击类别
 */
export enum MeleeAttackType {
  BASH = 'BASH',         // 钝击
  CUT = 'CUT',           // 切割
  STAB = 'STAB',         // 刺击
}

// ============================================================================
// 近战攻击属性
// ============================================================================

/**
 * 近战攻击属性
 */
export interface MeleeAttackProps {
  /** 攻击类型 */
  attackType: MeleeAttackType;
  /** 基础伤害 */
  baseDamage: number;
  /** 伤害类型 */
  damageType: DamageTypeId;
  /** 命中加值 */
  toHitBonus: number;
  /** 速度（移动点数） */
  moveCost: number;
  /** 精度惩罚 */
  accuracyPenalty: number;
  /** 护甲穿透 */
  armorPenetration: number;
  /** 攻击技能 */
  skill: SkillId | null;
  /** 需要的武器品质 */
  requiredQuality?: string;
}

// ============================================================================
// 格挡和闪避
// ============================================================================

/**
 * 格挡结果
 */
export interface BlockResult {
  /** 是否格挡成功 */
  blocked: boolean;
  /** 格挡工具 */
  blockingWith?: string;
  /** 减免的伤害 */
  damageReduced: number;
  /** 消耗的耐久度 */
  durabilityCost: number;
}

/**
 * 闪避结果
 */
export interface DodgeResult {
  /** 是否闪避成功 */
  dodged: boolean;
  /** 闪避方向 */
  direction?: 'left' | 'right' | 'back' | 'down';
  /** 消耗的体力 */
  staminaCost: number;
}

// ============================================================================
// 近战攻击结果
// ============================================================================

/**
 * 近战攻击完整结果
 */
export interface MeleeAttackResult {
  /** 攻击者 */
  attackerId: string;
  /** 目标ID */
  targetId: string;
  /** 使用的武器 */
  weaponUsed?: string;
  /** 攻击类型 */
  attackType: MeleeAttackType;
  /** 基础攻击结果 */
  attackResult: AttackResult;
  /** 格挡结果 */
  blockResult?: BlockResult;
  /** 闪避结果 */
  dodgeResult?: DodgeResult;
  /** 使用的移动点数 */
  moveCost: number;
  /** 技能检定结果 */
  skillCheck?: {
    skill: SkillId;
    required: number;
    rolled: number;
    success: boolean;
  };
}

// ============================================================================
// 近战战斗统计
// ============================================================================

/**
 * 近战战斗统计数据
 */
export interface MeleeCombatStats {
  /** 总攻击次数 */
  totalAttacks: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 格挡次数 */
  blocks: number;
  /** 闪避次数 */
  dodges: number;
  /** 暴击次数 */
  criticals: number;
  /** 总伤害量 */
  totalDamageDealt: number;
  /** 承受的总伤害量 */
  totalDamageTaken: number;
}

// ============================================================================
// MeleeCombat 类
// ============================================================================

/**
 * MeleeCombat - 近战战斗类
 *
 * 处理近战攻击的完整流程
 */
export class MeleeCombat {
  // ============ 创建近战攻击 ============

  /**
   * 创建钝击攻击
   */
  static createBashAttack(
    baseDamage: number,
    toHitBonus: number = 0,
    armorPen: number = 0
  ): Attack {
    const damage = DamageInstance.bash(baseDamage, armorPen);
    return Attack.melee(damage, toHitBonus).withType(AttackType.MELEE);
  }

  /**
   * 创建切割攻击
   */
  static createCutAttack(
    baseDamage: number,
    toHitBonus: number = 0,
    armorPen: number = 0
  ): Attack {
    const damage = DamageInstance.cut(baseDamage, armorPen);
    return Attack.melee(damage, toHitBonus).withType(AttackType.MELEE);
  }

  /**
   * 创建刺击攻击
   */
  static createStabAttack(
    baseDamage: number,
    toHitBonus: number = 0,
    armorPen: number = 2
  ): Attack {
    const damage = DamageInstance.stab(baseDamage, armorPen);
    return Attack.melee(damage, toHitBonus).withType(AttackType.MELEE);
  }

  // ============ 执行近战攻击 ============

  /**
   * 执行近战攻击
   *
   * @param attacker 攻击者
   * @param target 目标
   * @param attack 攻击定义
   * @param targetBodyParts 可攻击的身体部位
   */
  static executeMeleeAttack(
    attacker: MeleeCombatCharacter,
    target: DamageableCreature,
    attack: Attack,
    targetBodyParts: BodyPartId[] = [createBodyPartId('TORSO')]
  ): MeleeAttackResult {
    // 获取攻击者属性
    const accuracy = attacker.getMeleeAccuracy();
    const critChance = attacker.getCritChance();
    const critMult = attacker.getCritMultiplier();

    // 获取目标属性
    const dodge = (target as any).getDodgeValue?.() ?? 0;
    const resistances = target.getResistances();

    // 执行基础攻击
    const attackResult = attack.executeAttack(
      accuracy,
      dodge,
      resistances,
      targetBodyParts
    );

    // 计算移动消耗
    const moveCost = MeleeCombat.calculateMoveCost(attacker, attackResult);

    // 技能检定
    let skillCheck;
    if (attack.skill) {
      const skillLevel = attacker.getSkillLevel?.(attack.skill) ?? 0;
      const requiredSkill = 1; // 可以根据攻击强度调整
      const rolled = Math.random() * 10 + skillLevel;
      skillCheck = {
        skill: attack.skill,
        required: requiredSkill,
        rolled,
        success: rolled >= requiredSkill,
      };
    }

    return {
      attackerId: attacker.id,
      targetId: (target as any).id ?? 'unknown',
      weaponUsed: attacker.getWeaponName?.() ?? 'unarmed',
      attackType: MeleeCombat.getAttackType(attack),
      attackResult,
      moveCost,
      skillCheck,
    };
  }

  /**
   * 执行带格挡/闪避的近战攻击
   */
  static executeMeleeAttackWithDefense(
    attacker: MeleeCombatCharacter,
    target: MeleeCombatCharacter & DamageableCreature,
    attack: Attack,
    targetBodyParts: BodyPartId[] = [createBodyPartId('TORSO')]
  ): MeleeAttackResult {
    // 获取目标的格挡/闪避值
    const blockChance = target.getBlockChance?.() ?? 0;
    const dodgeChance = target.getDodgeChance?.() ?? 0;

    // 检查格挡
    let blockResult: BlockResult | undefined;
    if (blockChance > 0 && Math.random() * 100 < blockChance) {
      blockResult = {
        blocked: true,
        blockingWith: target.getBlockingWeapon?.() ?? 'shield',
        damageReduced: target.getBlockReduction?.() ?? 5,
        durabilityCost: 1,
      };
    }

    // 检查闪避
    let dodgeResult: DodgeResult | undefined;
    if (!blockResult?.blocked && dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
      dodgeResult = {
        dodged: true,
        direction: MeleeCombat.getRandomDodgeDirection(),
        staminaCost: 2,
      };
    }

    // 执行基础攻击
    const result = MeleeCombat.executeMeleeAttack(
      attacker,
      target,
      attack,
      targetBodyParts
    );

    // 如果格挡成功，减少伤害
    if (blockResult?.blocked) {
      result.attackResult.actualDamage = Math.max(
        0,
        result.attackResult.actualDamage - blockResult.damageReduced
      );
      result.blockResult = blockResult;
    }

    // 如果闪避成功，设置为未命中
    if (dodgeResult?.dodged) {
      result.attackResult.hitResult = HitResult.MISS;
      result.attackResult.actualDamage = 0;
      result.dodgeResult = dodgeResult;
    }

    return result;
  }

  // ============ 命中部位选择 ============

  /**
   * 选择攻击部位
   */
  static selectTargetBodyPart(
    availableParts: BodyPartId[],
    attackerAccuracy: number,
    targetSize: number,
    aimingFor?: BodyPartId
  ): BodyPartId {
    if (availableParts.length === 0) {
      return createBodyPartId('TORSO');
    }

    // 如果指定了瞄准部位
    if (aimingFor && availableParts.includes(aimingFor)) {
      // 精度越高，命中瞄准部位的概率越大
      const hitChance = Math.min(0.9, attackerAccuracy / 20);
      if (Math.random() < hitChance) {
        return aimingFor;
      }
    }

    // 根据目标大小调整命中分布
    const weights = Map<BodyPartId, number>(
      availableParts.map(part => {
        let weight = 10;
        if (part === 'TORSO' as BodyPartId) weight = 40;
        if (part === 'HEAD' as BodyPartId) weight = 15;
        if (part === 'LEG_L' as BodyPartId || part === 'LEG_R' as BodyPartId) weight = 15;
        if (part === 'ARM_L' as BodyPartId || part === 'ARM_R' as BodyPartId) weight = 10;
        return [part, weight * targetSize];
      })
    );

    const totalWeight = weights.valueSeq().reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    for (const [part, weight] of weights.entries()) {
      roll -= weight;
      if (roll <= 0) {
        return part;
      }
    }

    return availableParts[Math.floor(Math.random() * availableParts.length)];
  }

  // ============ 伤害计算 ============

  /**
   * 计算近战伤害
   */
  static calculateMeleeDamage(
    baseDamage: number,
    strength: number,
    skillLevel: number,
    weaponBonus: number = 0
  ): number {
    const strBonus = Math.floor(strength * 0.5);
    const skillBonus = Math.floor(skillLevel * 0.3);
    return baseDamage + strBonus + skillBonus + weaponBonus;
  }

  /**
   * 计算暴击伤害
   */
  static calculateCritDamage(
    baseDamage: number,
    critMultiplier: Multiplier,
    skillLevel: number
  ): number {
    const bonus = Math.floor(skillLevel * 0.2);
    return Math.floor(baseDamage * critMultiplier) + bonus;
  }

  // ============ 移动点数计算 ============

  /**
   * 计算攻击的移动点数消耗
   */
  static calculateMoveCost(
    character: MeleeCombatCharacter,
    attackResult: AttackResult
  ): number {
    let baseCost = 100;

    // 根据武器重量调整
    const weaponWeight = character.getWeaponWeight?.() ?? 0;
    baseCost += Math.floor(weaponWeight * 0.5);

    // 暴击消耗更多
    if (attackResult.critical) {
      baseCost = Math.floor(baseCost * 1.2);
    }

    // 失误消耗较少
    if (attackResult.hitResult === HitResult.MISS) {
      baseCost = Math.floor(baseCost * 0.7);
    }

    return baseCost;
  }

  // ============ 辅助方法 ============

  /**
   * 获取攻击类型
   */
  private static getAttackType(attack: Attack): MeleeAttackType {
    const damageUnits = attack.damage.damageUnits;
    if (damageUnits.isEmpty()) {
      return MeleeAttackType.BASH;
    }

    const firstType = damageUnits.first()!.type;
    if (firstType === 'CUT' as DamageTypeId) {
      return MeleeAttackType.CUT;
    }
    if (firstType === 'STAB' as DamageTypeId) {
      return MeleeAttackType.STAB;
    }
    return MeleeAttackType.BASH;
  }

  /**
   * 获取随机闪避方向
   */
  private static getRandomDodgeDirection(): 'left' | 'right' | 'back' | 'down' {
    const directions: Array<'left' | 'right' | 'back' | 'down'> = [
      'left',
      'right',
      'back',
      'down',
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  /**
   * 格式化攻击结果
   */
  static formatAttackResult(result: MeleeAttackResult): string {
    const lines = [
      '=== 近战攻击结果 ===',
      `攻击者: ${result.attackerId}`,
      `目标: ${result.targetId}`,
      `武器: ${result.weaponUsed ?? '徒手'}`,
      `攻击类型: ${result.attackType}`,
      `命中结果: ${HitResult[result.attackResult.hitResult]}`,
      result.attackResult.bodyPart ? `命中部位: ${result.attackResult.bodyPart}` : '',
      `原始伤害: ${result.attackResult.rawDamage.totalDamage()}`,
      `实际伤害: ${result.attackResult.actualDamage}`,
      result.attackResult.critical ? '暴击!' : '',
      result.blockResult?.blocked ? `格挡! (${result.blockResult.blockingWith}) 减免 ${result.blockResult.damageReduced}` : '',
      result.dodgeResult?.dodged ? `闪避! (${result.dodgeResult.direction})` : '',
      `移动消耗: ${result.moveCost}`,
    ];

    if (result.skillCheck) {
      lines.push(
        `技能检定: ${result.skillCheck.skill}`,
        `  需要: ${result.skillCheck.required}`,
        `  掷出: ${result.skillCheck.rolled.toFixed(1)}`,
        `  结果: ${result.skillCheck.success ? '成功' : '失败'}`
      );
    }

    return lines.filter(line => line !== '').join('\n');
  }
}

// ============================================================================
// 近战战斗角色接口
// ============================================================================

/**
 * 近战战斗角色接口
 */
export interface MeleeCombatCharacter {
  /** 角色ID */
  id: string;
  /** 获取近战精度 */
  getMeleeAccuracy(): number;
  /** 获取暴击率 */
  getCritChance(): number;
  /** 获取暴击倍率 */
  getCritMultiplier(): number;
  /** 获取技能等级 */
  getSkillLevel?(skill: SkillId): number;
  /** 获取武器名称 */
  getWeaponName?(): string;
  /** 获取武器重量 */
  getWeaponWeight?(): number;
  /** 获取格挡几率 */
  getBlockChance?(): number;
  /** 获取格挡减免 */
  getBlockReduction?(): number;
  /** 获取格挡武器 */
  getBlockingWeapon?(): string;
  /** 获取闪避几率 */
  getDodgeChance?(): number;
  /** 获取闪避值 */
  getDodgeValue?(): number;
}

// ============================================================================
// 内置近战攻击模式
// ============================================================================

/**
 * 徒手攻击
 */
export const UNARMED_BASH = MeleeCombat.createBashAttack(3, 0, 0);

/**
 * 拳套攻击
 */
export const KNUCKLE_BASH = MeleeCombat.createBashAttack(5, 1, 0);

/**
 * 匕首刺击
 */
export const DAGGER_STAB = MeleeCombat.createStabAttack(8, 2, 3);

/**
 * 长剑斩击
 */
export const SWORD_CUT = MeleeCombat.createCutAttack(12, 1, 1);

/**
 * 战锤重击
 */
export const WARHAMMER_BASH = MeleeCombat.createBashAttack(15, -1, 3);

/**
 * 矛刺击
 */
export const SPEAR_STAB = MeleeCombat.createStabAttack(10, 0, 5);

/**
 * 斧头劈砍
 */
export const AXE_CUT = MeleeCombat.createCutAttack(18, -2, 2);
