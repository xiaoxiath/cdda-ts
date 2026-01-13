/**
 * Wetness - 潮湿系统
 *
 * 参考 Cataclysm-DDA 的 item.h 中与潮湿相关的功能
 * 处理物品的潮湿度及其对物品属性的影响
 */

import type { TimePoint } from '../field/FieldEntry';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 潮湿度值 (0-100)
 * 0 = 完全干燥
 * 100 = 完全湿透
 */
export type WetnessValue = number;

/**
 * 潮湿等级
 */
export enum WetnessLevel {
  BONE_DRY = 'bone_dry',       // 骨干 (0-10)
  DRY = 'dry',                 // 干燥 (10-30)
  DAMP = 'damp',               // 微湿 (30-50)
  WET = 'wet',                 // 潮湿 (50-70)
  SOAKED = 'soaked',           // 湿透 (70-90)
  DRENCHED = 'drenched',       // 滴水 (90-100)
}

/**
 * 潮湿数据
 */
export interface WetnessData {
  /** 当前潮湿度 (0-100) */
  current: WetnessValue;
  /** 最后更新时间 */
  lastUpdate: TimePoint;
  /** 所在环境的湿度因子 (0-1) */
  envHumidity: number;
  /** 物品的干燥速度因子 */
  dryFactor: number;
}

/**
 * 潮湿影响
 */
export interface WetnessEffect {
  /** 保暖值修正 */
  warmthModifier: number;
  /** 重量修正 */
  weightModifier: number;
  /** 舒适度修正 */
  comfortModifier: number;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认干燥因子
 */
export const DEFAULT_DRY_FACTOR = 1.0;

/**
 * 基础干燥速度（每毫秒）
 */
export const BASE_DRY_RATE = 0.000001; // 每毫秒减少的潮湿度（调整后更合理的速度）

/**
 * 保暖惩罚因子（每单位潮湿度）
 */
export const WETNESS_WARMTH_PENALTY = 0.02;

/**
 * 重量增加因子（每单位潮湿度）
 */
export const WETNESS_WEIGHT_BONUS = 0.01;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取潮湿等级
 */
export function getWetnessLevel(wetness: WetnessValue): WetnessLevel {
  if (wetness < 10) return WetnessLevel.BONE_DRY;
  if (wetness < 30) return WetnessLevel.DRY;
  if (wetness < 50) return WetnessLevel.DAMP;
  if (wetness < 70) return WetnessLevel.WET;
  if (wetness < 90) return WetnessLevel.SOAKED;
  return WetnessLevel.DRENCHED;
}

/**
 * 获取潮湿等级的显示名称
 */
export function getWetnessLevelName(level: WetnessLevel): string {
  switch (level) {
    case WetnessLevel.BONE_DRY:
      return '骨干';
    case WetnessLevel.DRY:
      return '干燥';
    case WetnessLevel.DAMP:
      return '微湿';
    case WetnessLevel.WET:
      return '潮湿';
    case WetnessLevel.SOAKED:
      return '湿透';
    case WetnessLevel.DRENCHED:
      return '滴水';
  }
}

/**
 * 创建潮湿数据
 */
export function createWetnessData(
  initialWetness: WetnessValue = 0,
  dryFactor: number = DEFAULT_DRY_FACTOR,
  envHumidity: number = 0.5
): WetnessData {
  return {
    current: Math.max(0, Math.min(100, initialWetness)),
    lastUpdate: Date.now() as TimePoint,
    envHumidity: Math.max(0, Math.min(1, envHumidity)),
    dryFactor: Math.max(0.1, dryFactor),
  };
}

/**
 * 计算潮湿影响
 */
export function calculateWetnessEffect(wetness: WetnessValue): WetnessEffect {
  const level = getWetnessLevel(wetness);

  // 基础保暖惩罚：潮湿度越高，保暖效果越差
  const warmthModifier = -wetness * WETNESS_WARMTH_PENALTY;

  // 重量增加：物品吸水后变重
  const weightModifier = wetness * WETNESS_WEIGHT_BONUS;

  // 舒适度惩罚
  const comfortModifier = -wetness * 0.01;

  return {
    warmthModifier,
    weightModifier,
    comfortModifier,
  };
}

/**
 * 更新潮湿度
 */
export function updateWetness(
  data: WetnessData,
  currentTime: TimePoint = Date.now() as TimePoint
): WetnessData {
  const timeDelta = currentTime - data.lastUpdate;

  if (timeDelta <= 0) {
    return data;
  }

  // 计算干燥速度
  // 干燥速度 = 基础速度 * 干燥因子 * (1 - 环境湿度)
  const dryRate = BASE_DRY_RATE * data.dryFactor * (1 - data.envHumidity);

  // 计算干燥量
  const dryAmount = dryRate * timeDelta;

  // 更新潮湿度
  const newWetness = Math.max(0, data.current - dryAmount);

  return {
    ...data,
    current: newWetness,
    lastUpdate: currentTime,
  };
}

/**
 * 增加潮湿度（淋雨等）
 */
export function addWetness(
  data: WetnessData,
  amount: WetnessValue,
  currentTime: TimePoint = Date.now() as TimePoint
): WetnessData {
  return {
    ...updateWetness(data, currentTime),
    current: Math.min(100, data.current + amount),
  };
}

/**
 * 设置潮湿度
 */
export function setWetness(
  data: WetnessData,
  newWetness: WetnessValue,
  currentTime: TimePoint = Date.now() as TimePoint
): WetnessData {
  return {
    ...updateWetness(data, currentTime),
    current: Math.max(0, Math.min(100, newWetness)),
  };
}

/**
 * 检查物品是否潮湿
 */
export function isWet(data: WetnessData): boolean {
  return data.current > 30;
}

/**
 * 检查物品是否湿透
 */
export function isSoaked(data: WetnessData): boolean {
  return data.current > 70;
}

/**
 * 获取干燥状态描述
 */
export function getWetnessDescription(data: WetnessData): string {
  const level = getWetnessLevel(data.current);
  const levelName = getWetnessLevelName(level);

  if (data.current === 0) {
    return '完全干燥';
  }

  const percentage = Math.floor(data.current);
  return `${levelName} (${percentage}%)`;
}

// ============================================================================
// 材料相关函数
// ============================================================================

/**
 * 获取材料的干燥因子
 * 不同材料有不同的干燥速度
 */
export function getMaterialDryFactor(materialId: string): number {
  const dryFactors: Record<string, number> = {
    // 金属材料干燥很快
    'iron': 2.0,
    'steel': 2.0,
    'copper': 2.0,

    // 塑料材料中等
    'plastic': 1.5,

    // 皮革材料中等偏慢
    'leather': 1.2,

    // 织物材料干燥较慢
    'cotton': 0.8,
    'wool': 0.7,
    'denim': 0.8,

    // 凯夫拉干燥较慢
    'kevlar': 0.6,

    // 木材干燥很慢
    'wood': 0.5,
    'bone': 0.5,
  };

  return dryFactors[materialId] || DEFAULT_DRY_FACTOR;
}

/**
 * 获取材料的吸水因子
 * 不同材料吸水能力不同
 */
export function getMaterialAbsorbFactor(materialId: string): number {
  const absorbFactors: Record<string, number> = {
    // 金属材料不吸水
    'iron': 0.1,
    'steel': 0.1,
    'copper': 0.1,

    // 塑料材料几乎不吸水
    'plastic': 0.2,

    // 皮革材料吸水中等
    'leather': 0.6,

    // 织物材料吸水较多
    'cotton': 1.0,
    'wool': 0.9,
    'denim': 0.95,

    // 凯夫拉吸水较多
    'kevlar': 0.8,

    // 木材吸水很多
    'wood': 1.2,
    'bone': 0.3,
  };

  return absorbFactors[materialId] || 0.5;
}

/**
 * 根据材料计算实际吸水量
 */
export function calculateAbsorbedWetness(
  baseWetness: WetnessValue,
  materialId: string
): WetnessValue {
  const absorbFactor = getMaterialAbsorbFactor(materialId);
  return baseWetness * absorbFactor;
}

// ============================================================================
// 潮湿工具类
// ============================================================================

/**
 * Wetness - 潮湿工具类
 *
 * 提供潮湿相关的计算和操作
 */
export class Wetness {
  /**
   * 创建潮湿数据
   */
  static create(
    initialWetness: WetnessValue = 0,
    materialId?: string
  ): WetnessData {
    const dryFactor = materialId
      ? getMaterialDryFactor(materialId)
      : DEFAULT_DRY_FACTOR;

    return createWetnessData(initialWetness, dryFactor);
  }

  /**
   * 计算潮湿对保暖的影响
   */
  static calculateWarmthModifier(
    wetness: WetnessValue,
    baseWarmth: number
  ): number {
    const effect = calculateWetnessEffect(wetness);
    return baseWarmth + effect.warmthModifier;
  }

  /**
   * 计算潮湿对重量的影响
   */
  static calculateWeightModifier(
    wetness: WetnessValue,
    baseWeight: number
  ): number {
    const effect = calculateWetnessEffect(wetness);
    return baseWeight * (1 + effect.weightModifier);
  }

  /**
   * 更新潮湿数据
   */
  static update(
    data: WetnessData,
    currentTime: TimePoint = Date.now() as TimePoint
  ): WetnessData {
    return updateWetness(data, currentTime);
  }

  /**
   * 浸湿物品
   */
  static soak(
    data: WetnessData,
    amount: WetnessValue,
    materialId?: string
  ): WetnessData {
    const actualAmount = materialId
      ? calculateAbsorbedWetness(amount, materialId)
      : amount;

    return addWetness(data, actualAmount);
  }

  /**
   * 干燥物品
   */
  static dry(
    data: WetnessData,
    amount: WetnessValue
  ): WetnessData {
    return {
      ...data,
      current: Math.max(0, data.current - amount),
    };
  }

  /**
   * 获取显示信息
   */
  static getInfo(data: WetnessData): string {
    return getWetnessDescription(data);
  }
}
