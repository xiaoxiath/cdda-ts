/**
 * EffectCombatIntegration - 效果与战斗系统集成
 *
 * 处理效果对战斗属性的影响
 * 包括命中、伤害、防御等属性修正
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  BodyPartId,
  SkillId as CombatSkillId,
} from './types';
import { Resistances } from './Resistances';
import type { Effect } from '../effect/Effect';
import type { EffectDefinition, EffectModifier } from '../effect/EffectDefinition';
import { EffectModifierType } from '../effect/types';

// ============ 战斗属性修正 ============

/**
 * 战斗属性修正值
 */
export interface CombatModifier {
  /** 命中加值 */
  hitBonus?: number;
  /** 命中乘数 */
  hitMultiplier?: number;
  /** 伤害加值 */
  damageBonus?: number;
  /** 伤害乘数 */
  damageMultiplier?: number;
  /** 护甲加值 */
  armorBonus?: number;
  /** 护甲乘数 */
  armorMultiplier?: number;
  /** 移动速度加值 */
  speedBonus?: number;
  /** 移动速度乘数 */
  speedMultiplier?: number;
  /** 暴击率加值 */
  critChanceBonus?: number;
  /** 暴击伤害乘数 */
  critDamageMultiplier?: number;
  /** 视野范围 */
  visionRange?: number;
  /** 精度修正 */
  accuracyBonus?: number;
  /** 散布修正 */
  dispersionModifier?: number;
}

// ============ 战斗效果上下文 ============

/**
 * 战斗效果应用上下文
 */
export interface CombatEffectContext {
  /** 是否是攻击者 */
  isAttacker: boolean;
  /** 攻击类型 */
  attackType?: 'melee' | 'ranged';
  /** 使用的伤害类型 */
  damageType?: DamageTypeId;
  /** 目标身体部位 */
  targetBodyPart?: BodyPartId;
  /** 当前回合数 */
  turnNumber?: number;
  /** 是否是暴击 */
  isCritical?: boolean;
  /** 是否未命中 */
  isMiss?: boolean;
}

// ============ 效果战斗应用器 ============

/**
 * 效果战斗应用器类
 *
 * 处理效果对战斗的影响
 */
export class EffectCombatIntegration {
  // ============ 计算效果修正 ============

  /**
   * 计算效果对战斗属性的修正
   *
   * @param effects 效果列表
   * @param context 战斗上下文
   * @returns 战斗属性修正值
   */
  static calculateCombatModifiers(
    effects: List<Effect>,
    context: CombatEffectContext
  ): CombatModifier {
    const modifier: CombatModifier = {};

    for (const effect of effects) {
      if (!effect.isActive) continue;

      const effectModifiers = effect.definition.modifiers;
      for (const em of effectModifiers) {
        // 检查应用条件
        if (!this.shouldApplyModifier(em, context, effect)) {
          continue;
        }

        // 应用修正
        this.applyModifier(modifier, em, effect.intensity);
      }
    }

    return modifier;
  }

  /**
   * 检查修饰符是否应该应用
   */
  private static shouldApplyModifier(
    em: EffectModifier,
    context: CombatEffectContext,
    effect: Effect
  ): boolean {
    // 检查条件
    if (em.condition) {
      if (!this.evaluateCondition(em.condition, context)) {
        return false;
      }
    }

    // 检查目标类型
    if (em.targetType) {
      const isAttackerEffect = em.targetType === 'attacker';
      if (context.isAttacker !== isAttackerEffect) {
        return false;
      }
    }

    // 检查伤害类型
    if (em.damageTypes && em.damageTypes.size > 0 && context.damageType) {
      if (!em.damageTypes.includes(context.damageType)) {
        return false;
      }
    }

    // 检查攻击类型
    if (em.attackTypes && em.attackTypes.size > 0) {
      if (context.attackType && !em.attackTypes.includes(context.attackType)) {
        return false;
      }
    }

    // 检查强度要求
    if (em.minIntensity !== undefined && effect.intensity < em.minIntensity) {
      return false;
    }

    return true;
  }

  /**
   * 评估条件表达式
   */
  private static evaluateCondition(
    condition: string,
    context: CombatEffectContext
  ): boolean {
    // 简化的条件评估
    // 实际实现应该更复杂
    if (condition === 'on_hit') {
      return !context.isMiss;
    }
    if (condition === 'on_crit') {
      return context.isCritical === true;
    }
    if (condition === 'on_miss') {
      return context.isMiss === true;
    }
    if (condition === 'always') {
      return true;
    }
    return false;
  }

  /**
   * 应用单个修饰符
   */
  private static applyModifier(
    combatModifier: CombatModifier,
    em: EffectModifier,
    intensity: number
  ): void {
    const value = em.value || 0;

    switch (em.type) {
      case EffectModifierType.HIT_BONUS:
        combatModifier.hitBonus = (combatModifier.hitBonus || 0) + value * intensity;
        break;

      case EffectModifierType.HIT_MULTIPLIER:
        combatModifier.hitMultiplier = (combatModifier.hitMultiplier || 1) * (1 + value * intensity * 0.01);
        break;

      case EffectModifierType.DAMAGE_BONUS:
        combatModifier.damageBonus = (combatModifier.damageBonus || 0) + value * intensity;
        break;

      case EffectModifierType.DAMAGE_MULTIPLIER:
        combatModifier.damageMultiplier = (combatModifier.damageMultiplier || 1) * (1 + value * intensity * 0.01);
        break;

      case EffectModifierType.ARMOR_BONUS:
        combatModifier.armorBonus = (combatModifier.armorBonus || 0) + value * intensity;
        break;

      case EffectModifierType.ARMOR_MULTIPLIER:
        combatModifier.armorMultiplier = (combatModifier.armorMultiplier || 1) * (1 + value * intensity * 0.01);
        break;

      case EffectModifierType.SPEED_BONUS:
        combatModifier.speedBonus = (combatModifier.speedBonus || 0) + value * intensity;
        break;

      case EffectModifierType.SPEED_MULTIPLIER:
        combatModifier.speedMultiplier = (combatModifier.speedMultiplier || 1) * (1 + value * intensity * 0.01);
        break;

      case EffectModifierType.CRIT_CHANCE_BONUS:
        combatModifier.critChanceBonus = (combatModifier.critChanceBonus || 0) + value * intensity;
        break;

      case EffectModifierType.CRIT_DAMAGE_MULTIPLIER:
        combatModifier.critDamageMultiplier = (combatModifier.critDamageMultiplier || 1) * (1 + value * intensity * 0.01);
        break;

      case EffectModifierType.ACCURACY_BONUS:
        combatModifier.accuracyBonus = (combatModifier.accuracyBonus || 0) + value * intensity;
        break;

      case EffectModifierType.DISPERSION_MODIFIER:
        combatModifier.dispersionModifier = (combatModifier.dispersionModifier || 0) + value * intensity;
        break;
    }
  }

  // ============ 应用效果修正到抗性 ============

  /**
   * 计算效果对抗性的修正
   *
   * @param effects 效果列表
   * @param baseResistances 基础抗性
   * @returns 修正后的抗性
   */
  static calculateEffectResistances(
    effects: List<Effect>,
    baseResistances: Resistances
  ): Resistances {
    let resistances = baseResistances;

    for (const effect of effects) {
      if (!effect.isActive) continue;

      const effectModifiers = effect.definition.modifiers;
      for (const em of effectModifiers) {
        if (em.type === EffectModifierType.RESISTANCE && em.damageType) {
          // 添加临时抗性
          const value = (em.value || 0) * effect.intensity;
          resistances = resistances.withResistance(
            em.damageType,
            resistances.getResistance(em.damageType) + value
          );
        }
      }
    }

    return resistances;
  }

  // ============ 效果触发检查 ============

  /**
   * 检查战斗是否触发效果
   *
   * @param effects 角色当前效果
   * @param triggerType 触发类型
   * @param context 战斗上下文
   * @returns 应该触发的效果列表
   */
  static checkTriggeredEffects(
    effects: List<Effect>,
    triggerType: 'on_attack' | 'on_hit' | 'on_kill' | 'on_dodge' | 'on_block' | 'on_miss',
    context: CombatEffectContext
  ): List<Effect> {
    const triggered: Effect[] = [];

    for (const effect of effects) {
      if (!effect.isActive) continue;

      // 检查效果定义是否有对应的触发器
      const triggers = effect.definition.intChangeTriggers;
      for (const trigger of triggers) {
        if (trigger.type === triggerType && this.evaluateTriggerCondition(trigger.condition, context)) {
          triggered.push(effect);
        }
      }
    }

    return List(triggered);
  }

  /**
   * 评估触发条件
   */
  private static evaluateTriggerCondition(
    condition: string | undefined,
    context: CombatEffectContext
  ): boolean {
    if (!condition || condition === 'always') {
      return true;
    }

    // 简化的条件评估
    if (condition === 'when_melee') {
      return context.attackType === 'melee';
    }
    if (condition === 'when_ranged') {
      return context.attackType === 'ranged';
    }
    if (condition === 'when_crit') {
      return context.isCritical === true;
    }
    if (condition === 'when_low_health') {
      // 需要访问角色当前HP，这里简化处理
      return false;
    }

    return false;
  }

  // ============ 战斗效果应用辅助函数 ============

  /**
   * 应用命中修正
   */
  static applyHitModifiers(
    baseAccuracy: number,
    modifiers: CombatModifier
  ): number {
    let accuracy = baseAccuracy;

    if (modifiers.hitBonus) {
      accuracy += modifiers.hitBonus;
    }

    if (modifiers.hitMultiplier) {
      accuracy *= modifiers.hitMultiplier;
    }

    if (modifiers.accuracyBonus) {
      accuracy += modifiers.accuracyBonus;
    }

    return accuracy;
  }

  /**
   * 应用伤害修正
   */
  static applyDamageModifiers(
    baseDamage: number,
    modifiers: CombatModifier
  ): number {
    let damage = baseDamage;

    if (modifiers.damageBonus) {
      damage += modifiers.damageBonus;
    }

    if (modifiers.damageMultiplier) {
      damage *= modifiers.damageMultiplier;
    }

    return Math.max(0, Math.floor(damage));
  }

  /**
   * 应用护甲修正
   */
  static applyArmorModifiers(
    baseArmor: number,
    modifiers: CombatModifier
  ): number {
    let armor = baseArmor;

    if (modifiers.armorBonus) {
      armor += modifiers.armorBonus;
    }

    if (modifiers.armorMultiplier) {
      armor *= modifiers.armorMultiplier;
    }

    return Math.max(0, Math.floor(armor));
  }

  /**
   * 应用散布修正
   */
  static applyDispersionModifiers(
    baseDispersion: number,
    modifiers: CombatModifier
  ): number {
    let dispersion = baseDispersion;

    if (modifiers.dispersionModifier) {
      dispersion += modifiers.dispersionModifier;
    }

    return Math.max(0, dispersion);
  }

  /**
   * 应用暴击率修正
   */
  static applyCritChanceModifiers(
    baseCritChance: number,
    modifiers: CombatModifier
  ): number {
    let critChance = baseCritChance;

    if (modifiers.critChanceBonus) {
      critChance += modifiers.critChanceBonus;
    }

    return Math.max(0, Math.min(1, critChance));
  }

  // ============ 效果持续时间修正 ============

  /**
   * 计算效果持续时间修正
   *
   * 某些效果可能延长或缩短其他效果的持续时间
   */
  static calculateDurationModifier(
    effect: Effect,
    allEffects: List<Effect>
  ): number {
    let modifier = 1.0;

    for (const other of allEffects) {
      if (!other.isActive || other === effect) continue;

      // 检查是否有持续时间修正
      const reduction = other.definition.reducesDuration.get(effect.definition.id);
      if (reduction !== undefined) {
        modifier -= reduction * 0.01; // 转换为百分比
      }
    }

    return Math.max(0.1, modifier); // 最少保留10%持续时间
  }

  // ============ 战斗中效果更新 ============

  /**
   * 战斗回合开始时更新效果
   *
   * @param effects 当前效果列表
   * @param currentTime 当前时间
   * @param context 战斗上下文
   * @returns 更新后的效果列表
   */
  static updateEffectsOnCombatTurn(
    effects: List<Effect>,
    currentTime: number,
    context: CombatEffectContext
  ): List<Effect> {
    const updated: Effect[] = [];

    for (const effect of effects) {
      let updatedEffect = effect;

      // 检查效果是否到期
      if (effect.isExpired(currentTime)) {
        continue; // 移除已过期的效果
      }

      // 更新效果强度（如果有衰减）
      if (effect.definition.intDecay !== undefined && effect.definition.intDecay > 0) {
        // TODO: 实现强度衰减逻辑
      }

      updated.push(updatedEffect);
    }

    return List(updated);
  }

  /**
   * 战斗中触发效果tick
   *
   * @param effects 当前效果列表
   * @param currentTime 当前时间
   * @returns 产生的效果事件消息
   */
  static processEffectTicks(
    effects: List<Effect>,
    currentTime: number
  ): string[] {
    const messages: string[] = [];

    for (const effect of effects) {
      if (!effect.isActive) continue;

      // 检查是否需要tick
      if (currentTime - effect.lastTickTime >= effect.definition.tickInterval) {
        // TODO: 更新lastTickTime（需要创建新的Effect实例）
        if (effect.definition.messageTick) {
          messages.push(effect.definition.messageTick);
        }
      }
    }

    return messages;
  }
}

// ============ 内置战斗效果定义 ============

/**
 * 创建常见的战斗效果定义
 */
export const CombatEffects = {
  /**
   * 狂暴效果 - 提升伤害，降低防御
   */
  BERSERK: {
    id: 'effect_berserk' as any,
    name: '狂暴',
    description: '伤害+20%，护甲-30%',
    category: 'BUFF' as any,
    intensity: 1,
    modifiers: [
      {
        type: EffectModifierType.DAMAGE_MULTIPLIER,
        value: 20, // +20% 伤害
        condition: 'always',
      },
      {
        type: EffectModifierType.ARMOR_MULTIPLIER,
        value: -30, // -30% 护甲
        condition: 'always',
      },
    ],
  } as EffectDefinition,

  /**
   * 瞄准效果 - 提升命中和暴击
   */
  AIMING: {
    id: 'effect_aiming' as any,
    name: '瞄准',
    description: '命中+15%，暴击+10%',
    category: 'BUFF' as any,
    intensity: 1,
    modifiers: [
      {
        type: EffectModifierType.HIT_BONUS,
        value: 15,
        condition: 'always',
      },
      {
        type: EffectModifierType.CRIT_CHANCE_BONUS,
        value: 0.1, // +10% 暴击率
        condition: 'always',
      },
    ],
  } as EffectDefinition,

  /**
   * 中毒效果 - 降低属性，持续伤害
   */
  POISON: {
    id: 'effect_poison' as any,
    name: '中毒',
    description: '降低属性，持续伤害',
    category: 'DEBUFF' as any,
    intensity: 1,
    modifiers: [
      {
        type: EffectModifierType.SPEED_MULTIPLIER,
        value: -20, // -20% 移动速度
        condition: 'always',
      },
      {
        type: EffectModifierType.HIT_MULTIPLIER,
        value: -10, // -10% 命中
        condition: 'always',
      },
    ],
  } as EffectDefinition,

  /**
   * 燃烧效果 - 持续火焰伤害
   */
  BURNING: {
    id: 'effect_burning' as any,
    name: '燃烧',
    description: '持续受到火焰伤害',
    category: 'DEBUFF' as any,
    intensity: 1,
    modifiers: [
      {
        type: EffectModifierType.DAMAGE_MULTIPLIER,
        value: -10, // -10% 伤害（因为疼痛）
        condition: 'always',
      },
      {
        type: EffectModifierType.ARMOR_BONUS,
        value: -10, // -10 护甲（火焰削弱护甲）
        condition: 'always',
      },
    ],
  } as EffectDefinition,

  /**
   * 激励效果 - 全属性提升
   */
  ADRENALINE: {
    id: 'effect_adrenaline' as any,
    name: '肾上腺素',
    description: '速度+30%，命中+10%',
    category: 'BUFF' as any,
    intensity: 1,
    modifiers: [
      {
        type: EffectModifierType.SPEED_MULTIPLIER,
        value: 30,
        condition: 'always',
      },
      {
        type: EffectModifierType.HIT_BONUS,
        value: 10,
        condition: 'always',
      },
      {
        type: EffectModifierType.CRIT_CHANCE_BONUS,
        value: 0.05,
        condition: 'always',
      },
    ],
  } as EffectDefinition,
};
