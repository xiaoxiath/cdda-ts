/**
 * DamageHandler - 伤害处理器
 *
 * 参考 Cataclysm-DDA 的 player.cpp 和 monster.cpp
 * 处理伤害应用到生物的完整流程
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  DamageAmount,
  BodyPartId,
  EffectTypeId,
} from './types';
import { createBodyPartId } from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';
import { DamageCalculator, FullDamageCalcResult, BodyPartDamageResult } from './DamageCalculator';

// ============================================================================
// 伤害应用结果
// ============================================================================

/**
 * 伤害应用事件
 */
export interface DamageEvent {
  /** 事件类型 */
  type: 'damage' | 'heal' | 'death' | 'effect' | 'miss';
  /** 目标部位 */
  bodyPart?: BodyPartId;
  /** 伤害类型 */
  damageType?: DamageTypeId;
  /** 数值 */
  amount?: number;
  /** 消息 */
  message?: string;
}

/**
 * 伤害应用结果
 */
export interface DamageApplicationResult {
  /** 是否命中 */
  hit: boolean;
  /** 总原始伤害 */
  totalRawDamage: DamageAmount;
  /** 总实际伤害 */
  totalActualDamage: DamageAmount;
  /** 各部位伤害结果 */
  bodyPartResults: Map<BodyPartId, BodyPartDamageResult>;
  /** 是否导致死亡 */
  killed: boolean;
  /** 是否导致致残 */
  disabled: boolean;
  /** 触发的效果 */
  triggeredEffects: EffectTypeId[];
  /** 事件日志 */
  events: DamageEvent[];
  /** 目标当前HP（按部位） */
  currentHP: Map<BodyPartId, number>;
}

// ============================================================================
// 生物HP数据接口
// ============================================================================

/**
 * 身体部位HP数据
 */
export interface BodyPartHPData {
  /** 部位ID */
  bodyPart: BodyPartId;
  /** 当前HP */
  currentHP: number;
  /** 最大HP */
  maxHP: number;
}

// ============================================================================
// 生物接口（用于伤害应用）
// ============================================================================

/**
 * 可受伤生物接口
 */
export interface DamageableCreature {
  /** 获取身体部位HP数据 */
  getBodyPartHP(): Map<BodyPartId, BodyPartHPData>;
  /** 检查是否免疫某种伤害 */
  isImmuneTo(damageType: DamageTypeId): boolean;
  /** 获取抗性 */
  getResistances(): Resistances;
  /** 应用伤害效果（如流血、中毒等） */
  applyDamageEffect?(effectType: EffectTypeId, intensity: number): void;
  /** 处理死亡 */
  onDeath?(): void;
}

// ============================================================================
// DamageHandler 类
// ============================================================================

/**
 * DamageHandler - 伤害处理器类
 *
 * 处理伤害应用到生物的完整流程
 */
export class DamageHandler {
  // ============ 应用伤害 ============

  /**
   * 应用伤害到生物
   *
   * @param creature 目标生物
   * @param damage 伤害实例
   * @param targetPart 目标部位（null表示随机选择）
   * @param critMult 暴击倍率
   */
  static applyDamage(
    creature: DamageableCreature,
    damage: DamageInstance,
    targetPart: BodyPartId | null = null,
    critMult: number = 1.0
  ): DamageApplicationResult {
    const events: DamageEvent[] = [];
    const triggeredEffects: EffectTypeId[] = [];

    // 检查免疫
    let immuneTo = List<DamageTypeId>();
    for (const unit of damage.damageUnits) {
      if (creature.isImmuneTo(unit.type)) {
        immuneTo = immuneTo.push(unit.type);
      }
    }

    // 如果全部免疫，返回未命中
    if (immuneTo.size === damage.damageUnits.size) {
      events.push({
        type: 'miss',
        message: '目标免疫此伤害类型',
      });
      return {
        hit: false,
        totalRawDamage: 0,
        totalActualDamage: 0,
        bodyPartResults: Map(),
        killed: false,
        disabled: false,
        triggeredEffects,
        events,
        currentHP: creature.getBodyPartHP().map((hp: BodyPartHPData) => hp.currentHP),
      };
    }

    // 获取身体部位HP
    const bodyPartHP = creature.getBodyPartHP();
    const resistances = creature.getResistances();

    // 确定目标部位
    const actualTarget = targetPart ?? DamageHandler.selectRandomBodyPart(bodyPartHP);

    let totalActualDamage = 0;
    let totalRawDamage = 0;
    const bodyPartResults = Map<BodyPartId, BodyPartDamageResult>();
    let killed = false;
    let disabled = false;

    if (actualTarget) {
      // 单部位伤害
      const hpData = bodyPartHP.get(actualTarget);
      if (hpData) {
        const result = DamageCalculator.calculateBodyPartDamage(
          damage,
          resistances,
          actualTarget,
          hpData.currentHP,
          hpData.maxHP,
          critMult
        );

        totalActualDamage += result.finalDamage;
        totalRawDamage += result.rawDamage;

        if (result.lethal) {
          killed = true;
        }
        if (result.disabled) {
          disabled = true;
        }

        // 记录事件
        events.push({
          type: 'damage',
          bodyPart: actualTarget,
          amount: result.finalDamage,
          message: `${actualTarget} 受到 ${result.finalDamage} 点伤害`,
        });

        if (result.lethal) {
          events.push({
            type: 'death',
            bodyPart: actualTarget,
            message: `${actualTarget} 受到致命伤害，目标死亡`,
          });
        } else if (result.disabled) {
          events.push({
            type: 'damage',
            bodyPart: actualTarget,
            message: `${actualTarget} 被致残`,
          });
        }
      }
    }

    return {
      hit: true,
      totalRawDamage,
      totalActualDamage,
      bodyPartResults,
      killed,
      disabled,
      triggeredEffects,
      events,
      currentHP: creature.getBodyPartHP().map((hp: BodyPartHPData) => hp.currentHP),
    };
  }

  /**
   * 应用伤害实例到多个部位（AOE伤害）
   *
   * @param creature 目标生物
   * @param damage 伤害实例
   * @param targetParts 目标部位列表
   * @param distribution 伤害分布方式
   */
  static applyAoeDamage(
    creature: DamageableCreature,
    damage: DamageInstance,
    targetParts: BodyPartId[],
    distribution: 'equal' | 'random' | 'full' = 'equal'
  ): DamageApplicationResult {
    const events: DamageEvent[] = [];
    const triggeredEffects: EffectTypeId[] = [];

    const resistances = creature.getResistances();
    const bodyPartHP = creature.getBodyPartHP();

    let totalActualDamage = 0;
    let totalRawDamage = 0;
    const bodyPartResults = Map<BodyPartId, BodyPartDamageResult>();
    let killed = false;
    let disabled = false;

    if (distribution === 'full') {
      // 每个部位受到完整伤害
      for (const part of targetParts) {
        const hpData = bodyPartHP.get(part);
        if (hpData) {
          const calcResult = DamageCalculator.calculateDamageInstance(
            damage,
            resistances,
            part,
            1.0
          );

          const result: BodyPartDamageResult = {
            bodyPart: part,
            rawDamage: calcResult.totalRawDamage,
            finalDamage: calcResult.totalFinalDamage,
            disabled: hpData.currentHP - calcResult.totalFinalDamage <= 0,
            lethal: DamageCalculator.isLethalBodyPart(part) &&
                    hpData.currentHP - calcResult.totalFinalDamage <= 0,
          };

          totalActualDamage += result.finalDamage;
          totalRawDamage += result.rawDamage;

          if (result.lethal) killed = true;
          if (result.disabled) disabled = true;

          events.push({
            type: 'damage',
            bodyPart: part,
            amount: result.finalDamage,
            message: `${part} 受到 ${result.finalDamage} 点伤害`,
          });
        }
      }
    } else {
      // 均分或随机分配
      const totalDmg = damage.totalDamage();
      const distributionMap = DamageCalculator.distributeDamage(
        totalDmg,
        targetParts,
        distribution
      );

      for (const [part, dmg] of distributionMap.entries()) {
        const hpData = bodyPartHP.get(part);
        if (hpData && dmg > 0) {
          const result: BodyPartDamageResult = {
            bodyPart: part,
            rawDamage: dmg,
            finalDamage: dmg,
            disabled: hpData.currentHP - dmg <= 0,
            lethal: DamageCalculator.isLethalBodyPart(part) &&
                    hpData.currentHP - dmg <= 0,
          };

          totalActualDamage += result.finalDamage;
          totalRawDamage += result.rawDamage;

          if (result.lethal) killed = true;
          if (result.disabled) disabled = true;

          events.push({
            type: 'damage',
            bodyPart: part,
            amount: result.finalDamage,
            message: `${part} 受到 ${result.finalDamage} 点伤害`,
          });
        }
      }
    }

    return {
      hit: true,
      totalRawDamage,
      totalActualDamage,
      bodyPartResults,
      killed,
      disabled,
      triggeredEffects,
      events,
      currentHP: creature.getBodyPartHP().map((hp: BodyPartHPData) => hp.currentHP),
    };
  }

  // ============ 治疗处理 ============

  /**
   * 治疗生物
   *
   * @param creature 目标生物
   * @param amount 治疗量
   * @param targetPart 目标部位（null表示所有部位）
   */
  static heal(
    creature: DamageableCreature,
    amount: number,
    targetPart: BodyPartId | null = null
  ): DamageApplicationResult {
    const events: DamageEvent[] = [];
    const bodyPartHP = creature.getBodyPartHP();

    let totalHealed = 0;
    const newHP = Map<BodyPartId, number>();

    if (targetPart) {
      // 单部位治疗
      const hpData = bodyPartHP.get(targetPart);
      if (hpData) {
        const healed = Math.min(amount, hpData.maxHP - hpData.currentHP);
        const newHpValue = Math.min(hpData.maxHP, hpData.currentHP + amount);
        newHP.set(targetPart, newHpValue);
        totalHealed = healed;

        events.push({
          type: 'heal',
          bodyPart: targetPart,
          amount: healed,
          message: `${targetPart} 恢复 ${healed} 点HP`,
        });
      }
    } else {
      // 全部位治疗
      let remaining = amount;
      for (const [part, hpData] of bodyPartHP.entries()) {
        if (remaining <= 0) break;

        const canHeal = hpData.maxHP - hpData.currentHP;
        if (canHeal > 0) {
          const healed = Math.min(remaining, canHeal);
          newHP.set(part, hpData.currentHP + healed);
          remaining -= healed;
          totalHealed += healed;

          events.push({
            type: 'heal',
            bodyPart: part,
            amount: healed,
            message: `${part} 恢复 ${healed} 点HP`,
          });
        }
      }
    }

    return {
      hit: true,
      totalRawDamage: totalHealed,
      totalActualDamage: totalHealed,
      bodyPartResults: Map(),
      killed: false,
      disabled: false,
      triggeredEffects: [],
      events,
      currentHP: newHP,
    };
  }

  // ============ 辅助方法 ============

  /**
   * 随机选择一个身体部位
   */
  private static selectRandomBodyPart(
    bodyPartHP: Map<BodyPartId, BodyPartHPData>
  ): BodyPartId | null {
    const parts = bodyPartHP.keySeq().toArray();
    if (parts.length === 0) return null;

    // 权重：重要部位（躯干、头部）权重更高
    const weights = parts.map(part => {
      if (part === 'TORSO' as BodyPartId) return 50;
      if (part === 'HEAD' as BodyPartId) return 20;
      return 10;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < parts.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        return parts[i];
      }
    }

    return parts[Math.floor(Math.random() * parts.length)];
  }

  /**
   * 格式化伤害应用结果
   */
  static formatDamageResult(result: DamageApplicationResult): string {
    const lines = [
      '=== 伤害应用结果 ===',
      result.hit ? '命中成功' : '未命中',
      `总原始伤害: ${result.totalRawDamage}`,
      `总实际伤害: ${result.totalActualDamage}`,
      result.killed ? '目标已死亡' : '',
      result.disabled ? '目标被致残' : '',
    ];

    if (result.events.length > 0) {
      lines.push('\n事件日志:');
      for (const event of result.events) {
        lines.push(`  [${event.type}] ${event.message ?? ''}`);
      }
    }

    return lines.filter(line => line !== '').join('\n');
  }

  /**
   * 获取身体部位状态描述
   */
  static getBodyPartStatusDescription(
    currentHP: number,
    maxHP: number
  ): string {
    const ratio = currentHP / maxHP;

    if (ratio <= 0) return '已损毁';
    if (ratio <= 0.25) return '重伤';
    if (ratio <= 0.5) return '受伤';
    if (ratio <= 0.75) return '轻伤';
    return '健康';
  }
}
