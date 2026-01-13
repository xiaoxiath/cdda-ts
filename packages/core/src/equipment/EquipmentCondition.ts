/**
 * EquipmentCondition - 装备状态系统
 *
 * 管理装备的潮湿度和耐久度
 * 参考 Cataclysm-DDA 的 item 状态系统
 */

import { List } from 'immutable';
import type {
  WetnessData,
  DurabilityData,
  DamageEvent,
  EquipmentItemExtended,
} from './types';
import { WetnessLevel } from './types';
import type { DamageType } from '../damage/types';

/**
 * EquipmentCondition - 装备状态管理类
 */
export class EquipmentCondition {
  // ========== 潮湿系统 ==========

  /**
   * 创建初始潮湿数据
   *
   * @param maxWetness 最大潮湿值
   * @returns 潮湿数据
   */
  static createInitialWetness(maxWetness: number = 100): WetnessData {
    return {
      currentWetness: 0,
      maxWetness,
      dryRate: 5, // 每分钟干燥 5%
      lastUpdate: Date.now(),
    };
  }

  /**
   * 增加潮湿值
   *
   * @param wetness 潮湿数据
   * @param amount 增加量
   * @returns 更新后的潮湿数据
   */
  static addWetness(wetness: WetnessData, amount: number): WetnessData {
    const newWetness = Math.min(
      wetness.maxWetness,
      wetness.currentWetness + amount
    );
    return {
      ...wetness,
      currentWetness: newWetness,
      lastUpdate: Date.now(),
    };
  }

  /**
   * 更新潮湿值（干燥）
   *
   * @param wetness 潮湿数据
   * @param temperature 环境温度
   * @returns 更新后的潮湿数据
   */
  static updateWetness(wetness: WetnessData, temperature: number = 20): WetnessData {
    const now = Date.now();
    const minutesPassed = (now - wetness.lastUpdate) / (1000 * 60);

    if (minutesPassed < 1) {
      return wetness;
    }

    // 计算干燥速率
    let dryRate = wetness.dryRate;

    // 温度影响干燥速率
    if (temperature > 25) {
      dryRate *= 1 + (temperature - 25) * 0.05; // 高温加速干燥
    } else if (temperature < 10) {
      dryRate *= 0.5; // 低温减缓干燥
    }

    // 干燥
    const driedAmount = dryRate * minutesPassed;
    const newWetness = Math.max(0, wetness.currentWetness - driedAmount);

    return {
      ...wetness,
      currentWetness: newWetness,
      lastUpdate: now,
    };
  }

  /**
   * 获取潮湿等级
   *
   * @param wetness 潮湿数据
   * @returns 潮湿等级
   */
  static getWetnessLevel(wetness: WetnessData): WetnessLevel {
    const ratio = wetness.currentWetness / wetness.maxWetness;

    if (ratio <= 0.1) return WetnessLevel.DRY;
    if (ratio <= 0.3) return WetnessLevel.DAMP;
    if (ratio <= 0.6) return WetnessLevel.WET;
    if (ratio <= 0.9) return WetnessLevel.SOAKED;
    return WetnessLevel.DRENCHED;
  }

  /**
   * 潮湿对保暖值的影响
   *
   * @param baseWarmth 基础保暖值
   * @param wetness 潮湿数据
   * @returns 修正后的保暖值
   */
  static applyWetnessToWarmth(baseWarmth: number, wetness: WetnessData): number {
    const level = EquipmentCondition.getWetnessLevel(wetness);
    const ratio = wetness.currentWetness / wetness.maxWetness;

    let penalty = 0;
    switch (level) {
      case WetnessLevel.DAMP:
        penalty = 0.1;
        break;
      case WetnessLevel.WET:
        penalty = 0.3 + ratio * 0.2;
        break;
      case WetnessLevel.SOAKED:
        penalty = 0.6 + ratio * 0.2;
        break;
      case WetnessLevel.DRENCHED:
        penalty = 0.9;
        break;
    }

    return baseWarmth * (1 - penalty);
  }

  /**
   * 潮湿对重量影响
   *
   * @param baseWeight 基础重量
   * @param wetness 潮湿数据
   * @returns 修正后的重量
   */
  static applyWetnessToWeight(baseWeight: number, wetness: WetnessData): number {
    const ratio = wetness.currentWetness / wetness.maxWetness;
    return baseWeight * (1 + ratio * 0.2); // 潮湿增加 20% 重量
  }

  // ========== 耐久度系统 ==========

  /**
   * 创建初始耐久度数据
   *
   * @param maxDurability 最大耐久度
   * @returns 耐久度数据
   */
  static createInitialDurability(maxDurability: number = 100): DurabilityData {
    return {
      currentDurability: maxDurability,
      maxDurability,
      isBroken: false,
      damageHistory: List(),
    };
  }

  /**
   * 造成装备损坏
   *
   * @param durability 耐久度数据
   * @param amount 损坏量
   * @param damageType 损坏类型
   * @param source 损坏来源
   * @param degradationModifier 退化修正值
   * @returns 更新后的耐久度数据
   */
  static damageEquipment(
    durability: DurabilityData,
    amount: number,
    damageType: DamageType | string,
    source: string,
    degradationModifier: number = 1.0
  ): DurabilityData {
    // 应用退化修正
    const actualDamage = amount * degradationModifier;
    const newDurability = Math.max(0, durability.currentDurability - actualDamage);

    // 记录损坏事件
    const damageEvent: DamageEvent = {
      timestamp: Date.now(),
      damageType: typeof damageType === 'string' ? damageType : damageType,
      amount: actualDamage,
      source,
    };

    const damageHistory = durability.damageHistory.push(damageEvent);

    return {
      currentDurability: newDurability,
      maxDurability: durability.maxDurability,
      isBroken: newDurability <= 0,
      damageHistory,
    };
  }

  /**
   * 修复装备
   *
   * @param durability 耐久度数据
   * @param amount 修复量
   * @param repairMaterial 修复材料（可选）
   * @returns 更新后的耐久度数据
   */
  static repairEquipment(
    durability: DurabilityData,
    amount: number,
    repairMaterial?: string
  ): DurabilityData {
    const newDurability = Math.min(
      durability.maxDurability,
      durability.currentDurability + amount
    );

    return {
      ...durability,
      currentDurability: newDurability,
      isBroken: false,
    };
  }

  /**
   * 计算装备状态对功能的影响
   *
   * @param durability 耐久度数据
   * @returns 功能修正值 (0-1)
   */
  static getConditionModifier(durability: DurabilityData): number {
    if (durability.isBroken) {
      return 0;
    }

    const conditionRatio = durability.currentDurability / durability.maxDurability;

    // 耐久度越低，功能越差
    // 90%以上：无影响
    // 50%-90%：轻微影响
    // 10%-50%：显著影响
    // 10%以下：严重影响

    if (conditionRatio >= 0.9) {
      return 1.0;
    } else if (conditionRatio >= 0.5) {
      return 0.9 + (conditionRatio - 0.5) * 0.25; // 0.9-1.0
    } else if (conditionRatio >= 0.1) {
      return 0.5 + (conditionRatio - 0.1) * 1.25; // 0.5-0.9
    } else {
      return conditionRatio * 5; // 0-0.5
    }
  }

  /**
   * 检查装备是否损坏
   *
   * @param durability 耐久度数据
   * @returns 是否损坏
   */
  static isBroken(durability: DurabilityData): boolean {
    return durability.isBroken || durability.currentDurability <= 0;
  }

  /**
   * 获取装备状态描述
   *
   * @param durability 耐久度数据
   * @returns 状态描述
   */
  static getDurabilityDescription(durability: DurabilityData): string {
    if (durability.isBroken) {
      return '已损坏';
    }

    const ratio = durability.currentDurability / durability.maxDurability;

    if (ratio >= 0.9) {
      return '完好';
    } else if (ratio >= 0.7) {
      return '轻微磨损';
    } else if (ratio >= 0.4) {
      return '磨损';
    } else if (ratio >= 0.2) {
      return '严重磨损';
    } else {
      return '即将损坏';
    }
  }

  // ========== 综合状态管理 ==========

  /**
   * 更新装备状态（潮湿和耐久度）
   *
   * @param item 装备物品
   * @param temperature 环境温度
   * @returns 更新后的装备物品
   */
  static updateCondition(
    item: EquipmentItemExtended,
    temperature: number = 20
  ): EquipmentItemExtended {
    const updated = { ...item };

    // 更新潮湿度
    if (item.wetness) {
      updated.wetness = EquipmentCondition.updateWetness(
        item.wetness,
        temperature
      );
    }

    // 潮湿导致退化
    if (item.wetness && item.durability && !item.durability.isBroken) {
      const wetnessLevel = EquipmentCondition.getWetnessLevel(item.wetness);
      if (wetnessLevel !== WetnessLevel.DRY) {
        const wetnessRatio = item.wetness.currentWetness / item.wetness.maxWetness;
        const degradationAmount = wetnessRatio * 0.1; // 潮湿导致每周期退化

        updated.durability = EquipmentCondition.damageEquipment(
          item.durability,
          degradationAmount,
          'wetness',
          'environment',
          item.degradationModifier
        );
      }
    }

    return updated;
  }

  /**
   * 检查装备是否可用
   *
   * @param item 装备物品
   * @returns 是否可用
   */
  static isUsable(item: EquipmentItemExtended): boolean {
    if (item.durability && EquipmentCondition.isBroken(item.durability)) {
      return false;
    }

    // 检查潮湿是否导致装备失效
    if (item.wetness) {
      const wetnessLevel = EquipmentCondition.getWetnessLevel(item.wetness);
      // 电子设备在潮湿时可能失效
      if (item.materialDefinition?.properties.conductivity > 0.5 &&
          wetnessLevel === WetnessLevel.DRENCHED) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取完整状态描述
   *
   * @param item 装备物品
   * @returns 状态描述
   */
  static getConditionDescription(item: EquipmentItemExtended): string {
    const parts: string[] = [];

    // 耐久度描述
    if (item.durability) {
      const desc = EquipmentCondition.getDurabilityDescription(item.durability);
      const percentage = Math.floor(
        (item.durability.currentDurability / item.durability.maxDurability) * 100
      );
      parts.push(`${desc} (${percentage}%)`);
    }

    // 潮湿描述
    if (item.wetness && item.wetness.currentWetness > 0) {
      const level = EquipmentCondition.getWetnessLevel(item.wetness);
      const percentage = Math.floor(
        (item.wetness.currentWetness / item.wetness.maxWetness) * 100
      );
      parts.push(`潮湿 (${percentage}%)`);
    }

    return parts.length > 0 ? parts.join(' | ') : '完好';
  }
}
