/**
 * DamageCalculator - 伤害计算器
 *
 * 参考 Cataclysm-DDA 的 damage.h 和 player.cpp
 * 提供完整的伤害计算系统，包括护甲减免、部位伤害、暴击等
 */

import { Map } from 'immutable';
import type {
  DamageTypeId,
  DamageAmount,
  ResistanceAmount,
  Multiplier,
  BodyPartId,
} from './types';
import { createDamageTypeId } from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';
import { DamageType } from './DamageType';

// ============================================================================
// 伤害计算结果
// ============================================================================

/**
 * 单次伤害计算结果
 */
export interface DamageCalcResult {
  /** 伤害类型 */
  damageType: DamageTypeId;
  /** 原始伤害 */
  rawDamage: DamageAmount;
  /** 护甲值 */
  armorValue: ResistanceAmount;
  /** 穿透值 */
  penetration: ResistanceAmount;
  /** 有效护甲（考虑穿透后） */
  effectiveArmor: ResistanceAmount;
  /** 抗性倍率 */
  resistanceMult: Multiplier;
  /** 最终伤害 */
  finalDamage: DamageAmount;
  /** 是否被完全格挡 */
  blocked: boolean;
}

/**
 * 完整伤害计算结果
 */
export interface FullDamageCalcResult {
  /** 总原始伤害 */
  totalRawDamage: DamageAmount;
  /** 总最终伤害 */
  totalFinalDamage: DamageAmount;
  /** 各类型伤害详情 */
  damageDetails: DamageCalcResult[];
  /** 命中部位 */
  bodyPart: BodyPartId | null;
  /** 是否暴击 */
  critical: boolean;
  /** 暴击倍率 */
  critMultiplier: Multiplier;
}

/**
 * 身体部位伤害结果
 */
export interface BodyPartDamageResult {
  /** 身体部位 */
  bodyPart: BodyPartId;
  /** 原始伤害 */
  rawDamage: DamageAmount;
  /** 最终伤害 */
  finalDamage: DamageAmount;
  /** 是否致残 */
  disabled: boolean;
  /** 是否致死 */
  lethal: boolean;
}

// ============================================================================
// 伤害计算配置
// ============================================================================

/**
 * 伤害计算配置
 */
export interface DamageCalcConfig {
  /** 是否启用部位伤害 */
  enableBodyPartDamage: boolean;
  /** 是否启用暴击系统 */
  enableCriticalHits: boolean;
  /** 默认暴击倍率 */
  defaultCritMultiplier: Multiplier;
  /** 最小伤害阈值（小于此值的伤害会被忽略） */
  minDamageThreshold: DamageAmount;
  /** 护甲效率倍率（护甲实际效果 = 护甲值 * 此倍率） */
  armorEfficiency: Multiplier;
  /** 穿透效率倍率（穿透实际效果 = 穿透值 * 此倍率） */
  penetrationEfficiency: Multiplier;
}

// ============================================================================
// DamageCalculator 类
// ============================================================================

/**
 * DamageCalculator - 伤害计算器类
 *
 * 提供静态方法用于各种伤害计算
 */
export class DamageCalculator {
  // ============ 默认配置 ============

  private static readonly DEFAULT_CONFIG: DamageCalcConfig = {
    enableBodyPartDamage: true,
    enableCriticalHits: true,
    defaultCritMultiplier: 2.0,
    minDamageThreshold: 0,
    armorEfficiency: 1.0,
    penetrationEfficiency: 1.0,
  };

  // ============ 基础伤害计算 ============

  /**
   * 计算单次伤害
   *
   * @param damageType 伤害类型
   * @param rawDamage 原始伤害值
   * @param resistance 目标抗性值
   * @param penetration 穿透值
   * @param resistanceMult 抗性倍率
   * @param config 计算配置
   */
  static calculateDamage(
    damageType: DamageTypeId,
    rawDamage: DamageAmount,
    resistance: ResistanceAmount,
    penetration: ResistanceAmount = 0,
    resistanceMult: Multiplier = 1.0,
    config: DamageCalcConfig = DamageCalculator.DEFAULT_CONFIG
  ): DamageCalcResult {
    // 应用穿透
    const penEfficiency = config.penetrationEfficiency;
    const effectivePenetration = Math.floor(penetration * penEfficiency);

    // 计算有效护甲
    const armorEfficiency = config.armorEfficiency;
    const effectiveArmor = Math.max(0, resistance - effectivePenetration) * armorEfficiency;

    // 应用抗性倍率
    const effectiveResistance = effectiveArmor * resistanceMult;

    // 计算最终伤害
    const finalDamage = Math.max(0, Math.floor(rawDamage - effectiveResistance));

    // 检查是否被完全格挡
    const blocked = finalDamage <= 0;

    return {
      damageType,
      rawDamage,
      armorValue: resistance,
      penetration,
      effectiveArmor: Math.floor(effectiveArmor),
      resistanceMult,
      finalDamage,
      blocked,
    };
  }

  /**
   * 计算伤害实例（包含多种伤害类型）
   *
   * @param damage 伤害实例
   * @param resistances 抗性
   * @param bodyPart 命中部位（null表示使用基础抗性）
   * @param critMult 暴击倍率
   * @param config 计算配置
   */
  static calculateDamageInstance(
    damage: DamageInstance,
    resistances: Resistances,
    bodyPart: BodyPartId | null = null,
    critMult: Multiplier = 1.0,
    config: DamageCalcConfig = DamageCalculator.DEFAULT_CONFIG
  ): FullDamageCalcResult {
    const damageDetails: DamageCalcResult[] = [];
    let totalRawDamage = 0;
    let totalFinalDamage = 0;

    // 应用暴击倍率到伤害倍率
    const adjustedDamage = critMult > 1.0
      ? damage.multDamage(critMult, true)
      : damage;

    // 计算每种伤害类型
    for (const unit of adjustedDamage.damageUnits) {
      const rawDmg = unit.amount * unit.damageMult;
      totalRawDamage += rawDmg;

      // 获取有效抗性
      const resistance = resistances.getEffectiveResistance(bodyPart, unit.type);

      // 计算伤害
      const result = DamageCalculator.calculateDamage(
        unit.type,
        Math.floor(rawDmg),
        resistance,
        unit.resPen,
        unit.resMult,
        config
      );

      damageDetails.push(result);
      totalFinalDamage += result.finalDamage;
    }

    return {
      totalRawDamage: Math.floor(totalRawDamage),
      totalFinalDamage: totalFinalDamage,
      damageDetails,
      bodyPart,
      critical: critMult > 1.0,
      critMultiplier: critMult,
    };
  }

  // ============ 部位伤害计算 ============

  /**
   * 计算身体部位伤害
   *
   * @param damage 伤害实例
   * @param resistances 抗性
   * @param bodyPart 目标部位
   * @param currentHP 当前HP
   * @param maxHP 最大HP
   * @param critMult 暴击倍率
   */
  static calculateBodyPartDamage(
    damage: DamageInstance,
    resistances: Resistances,
    bodyPart: BodyPartId,
    currentHP: number,
    maxHP: number,
    critMult: Multiplier = 1.0
  ): BodyPartDamageResult {
    const result = DamageCalculator.calculateDamageInstance(
      damage,
      resistances,
      bodyPart,
      critMult
    );

    const newHP = Math.max(0, currentHP - result.totalFinalDamage);

    return {
      bodyPart,
      rawDamage: result.totalRawDamage,
      finalDamage: result.totalFinalDamage,
      disabled: newHP <= 0,
      lethal: DamageCalculator.isLethalBodyPart(bodyPart) && newHP <= 0,
    };
  }

  /**
   * 检查是否为致命部位
   */
  static isLethalBodyPart(bodyPart: BodyPartId): boolean {
    const lethalParts: Set<BodyPartId> = new Set([
      'HEAD' as BodyPartId,
      'TORSO' as BodyPartId,
    ]);
    return lethalParts.has(bodyPart);
  }

  // ============ 暴击计算 ============

  /**
   * 计算暴击倍率
   *
   * @param baseCritChance 基础暴击率 (0-100)
   * @param critBonus 暴击加值
   * @param luck 运气值
   * @param critMultiplier 暴击倍率
   */
  static calculateCritMultiplier(
    baseCritChance: number = 5,
    critBonus: number = 0,
    luck: number = 0,
    critMultiplier: Multiplier = 2.0
  ): { critMultiplier: Multiplier; isCrit: boolean; isDoubleCrit: boolean } {
    const totalCritChance = baseCritChance + critBonus + luck;

    const roll = Math.random() * 100;
    const isCrit = roll < totalCritChance;

    if (isCrit) {
      // 检查双重暴击（暴击后再检定）
      const doubleCritRoll = Math.random() * 100;
      const isDoubleCrit = doubleCritRoll < totalCritChance * 0.5; // 双重暴击概率是普通暴击的一半

      return {
        critMultiplier: isDoubleCrit ? critMultiplier * 2 : critMultiplier,
        isCrit: true,
        isDoubleCrit,
      };
    }

    return {
      critMultiplier: 1.0,
      isCrit: false,
      isDoubleCrit: false,
    };
  }

  // ============ 护甲计算 ============

  /**
   * 计算护甲减免后的伤害
   *
   * @param damage 原始伤害
   * @param armor 护甲值
   * @param penetration 穿透值
   * @param damageType 伤害类型
   */
  static calculateArmorReduction(
    damage: DamageAmount,
    armor: ResistanceAmount,
    penetration: ResistanceAmount = 0,
    damageType: DamageTypeId | null = null
  ): DamageAmount {
    // 某些伤害类型忽略护甲
    if (damageType) {
      // 直接比较 DamageTypeId
      const ignoreArmorTypes = [
        'PSYCHIC' as DamageTypeId,
        'BIOLOGICAL' as DamageTypeId,
        'RADIATION' as DamageTypeId,
      ];
      if (ignoreArmorTypes.includes(damageType)) {
        return damage;
      }
    }

    const effectiveArmor = Math.max(0, armor - penetration);
    return Math.max(0, damage - effectiveArmor);
  }

  /**
   * 计算多个护甲源合并后的抗性
   *
   * @param resistances 抗性列表
   */
  static calculateCombinedResistances(...resistances: Resistances[]): Resistances {
    if (resistances.length === 0) {
      return Resistances.create();
    }

    let combined = resistances[0];
    for (let i = 1; i < resistances.length; i++) {
      combined = combined.merge(resistances[i]);
    }

    return combined;
  }

  // ============ 伤害类型特性 ============

  /**
   * 检查伤害类型是否穿透护甲
   */
  static isArmorPiercing(damageType: DamageTypeId): boolean {
    const piercingTypes: Set<DamageTypeId> = new Set([
      'STAB' as DamageTypeId,
      'BULLET' as DamageTypeId,
      'ACID' as DamageTypeId,
    ]);
    return piercingTypes.has(damageType);
  }

  /**
   * 获取伤害类型的抗性倍率
   *
   * 某些伤害类型对特定护甲有特殊倍率
   */
  static getResistanceMult(damageType: DamageTypeId, armorMaterial: string | null = null): Multiplier {
    // 默认倍率
    const defaultMult = 1.0;

    // 火焰伤害对金属护甲效果降低
    if (damageType === 'HEAT' as DamageTypeId && armorMaterial === 'metal') {
      return 0.5; // 金属护甲对火抗性减半
    }

    // 电击伤害对湿护甲效果增强
    if (damageType === 'ELECTRIC' as DamageTypeId && armorMaterial === 'wet') {
      return 2.0; // 湿润护甲对电抗性加倍（更易受伤害）
    }

    return defaultMult;
  }

  // ============ 伤害分布 ============

  /**
   * 计算伤害在多个部位间的分布
   *
   * 用于AOE伤害或爆炸等
   */
  static distributeDamage(
    totalDamage: DamageAmount,
    bodyParts: BodyPartId[],
    distribution: 'equal' | 'random' | 'weighted' = 'equal',
    weights?: Map<BodyPartId, number>
  ): Map<BodyPartId, DamageAmount> {
    let result = Map<BodyPartId, DamageAmount>();

    if (bodyParts.length === 0) {
      return result;
    }

    if (distribution === 'equal') {
      const perPart = Math.floor(totalDamage / bodyParts.length);
      for (const part of bodyParts) {
        result = result.set(part, perPart);
      }
    } else if (distribution === 'random') {
      for (const part of bodyParts) {
        const share = Math.random() * totalDamage;
        result = result.set(part, Math.floor(share));
      }
    } else if (distribution === 'weighted' && weights) {
      const totalWeight = weights.valueSeq().reduce((sum, w) => sum + w, 0);
      for (const part of bodyParts) {
        const weight = weights.get(part) ?? 1;
        const share = (totalDamage * weight) / totalWeight;
        result = result.set(part, Math.floor(share));
      }
    }

    return result;
  }

  // ============ 伤害阈值 ============

  /**
   * 检查伤害是否超过阈值
   */
  static passesThreshold(
    damage: DamageAmount,
    threshold: DamageAmount = DamageCalculator.DEFAULT_CONFIG.minDamageThreshold
  ): boolean {
    return damage >= threshold;
  }

  /**
   * 应用伤害阈值过滤
   */
  static applyThreshold(
    damage: DamageAmount,
    threshold: DamageAmount = DamageCalculator.DEFAULT_CONFIG.minDamageThreshold
  ): DamageAmount {
    return damage >= threshold ? damage : 0;
  }

  // ============ 辅助方法 ============

  /**
   * 格式化伤害结果为可读字符串
   */
  static formatDamageResult(result: DamageCalcResult): string {
    if (result.blocked) {
      return `${result.damageType}: 被格挡 (原始: ${result.rawDamage}, 护甲: ${result.effectiveArmor})`;
    }
    return `${result.damageType}: ${result.finalDamage} (原始: ${result.rawDamage}, 护甲: ${result.effectiveArmor}, 穿透: ${result.penetration})`;
  }

  /**
   * 格式化完整伤害结果
   */
  static formatFullDamageResult(result: FullDamageCalcResult): string {
    const lines = [
      `=== 伤害计算结果 ===`,
      `总原始伤害: ${result.totalRawDamage}`,
      `总最终伤害: ${result.totalFinalDamage}`,
      result.critical ? `暴击! (${result.critMultiplier}x)` : '',
      result.bodyPart ? `命中部位: ${result.bodyPart}` : '',
      `伤害详情:`,
    ];

    for (const detail of result.damageDetails) {
      lines.push(`  ${DamageCalculator.formatDamageResult(detail)}`);
    }

    return lines.filter(line => line !== '').join('\n');
  }
}
