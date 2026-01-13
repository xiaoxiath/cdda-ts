/**
 * 腐烂/变质系统类型定义
 *
 * 参考 Cataclysm-DDA 的 spoilage 系统
 * 处理食物和其他易腐物品的腐烂机制
 */

import type { TimePoint } from '../field/FieldEntry';

// ============ 腐烂状态枚举 ============

/**
 * 腐烂状态枚举
 */
export enum SpoilState {
  FRESH = 'FRESH',       // 新鲜
  WILTING = 'WILTING',   // 枯萎（即将腐烂）
  SPOILED = 'SPOILED',   // 腐烂（不可食用）
  ROTTEN = 'ROTTEN',     // 完全腐烂
}

// ============ 腐烽数据接口 ============

/**
 * 腐烽数据接口
 *
 * 跟踪物品的腐烂状态和计算因素
 */
export interface SpoilageData {
  /** 创建时间（物品产生的时间） */
  created: TimePoint;
  /** 腐烂时间（毫秒，从创建到完全腐烂的时间） */
  spoilTime: number;
  /** 环境温度系数（影响腐烂速度） */
  tempFactor: number;
  /** 容器延缓系数（0-1，越小延缓越多） */
  containerFactor: number;
  /** 最后更新时间（用于计算环境变化） */
  lastUpdate: TimePoint;
}

// ============ 腐烂常量 ============

/**
 * 腐烂计算常量
 */
export const SpoilageConstants = {
  /** 基准温度（摄氏度） */
  BASE_TEMPERATURE: 20,
  /** 腐烂速度计算的基准温度 */
  SPOIL_BASE_TEMP: 20,
  /** 枯萎状态阈值（剩余时间的百分比） */
  WILTING_THRESHOLD: 0.25,
  /** 腐烂状态阈值（剩余时间的百分比） */
  SPOILED_THRESHOLD: 0,
} as const;

// ============ 温度系数计算 ============

/**
 * 计算温度对腐烂速度的影响系数
 *
 * 参考 CDDA 的 food::get_temp_factor()
 * 温度越高，腐烂越快；温度越低，腐烂越慢
 *
 * @param currentTemperature 当前温度（摄氏度）
 * @returns 温度系数（1.0 = 正常速度，>1 = 加速，<1 = 减速）
 */
export function calculateTemperatureFactor(currentTemperature: number): number {
  // 基于 CDDA 的 Q10 法则：温度每升高 10°C，化学反应速度翻倍
  // 腐烂是生物/化学反应过程，遵循同样的规律

  if (currentTemperature <= 0) {
    // 冷冻状态，腐烂极慢
    return 0.01;
  }

  if (currentTemperature < 5) {
    // 接近冷冻，腐烂很慢
    return 0.1;
  }

  // 使用指数公式计算温度系数
  // tempFactor = 2 ^ ((temp - BASE) / 10)
  const diffFromBase = currentTemperature - SpoilageConstants.SPOIL_BASE_TEMP;
  const factor = Math.pow(2, diffFromBase / 10);

  // 限制系数范围
  return Math.max(0.01, Math.min(factor, 100));
}

// ============ 腐烂状态判断 ============

/**
 * 计算物品当前的腐烂状态
 *
 * @param spoilage 腐烽数据
 * @param currentTime 当前时间
 * @returns 腐烂状态
 */
export function calculateSpoilState(spoilage: SpoilageData, currentTime: TimePoint): SpoilState {
  const remainingTime = getRemainingTime(spoilage, currentTime);
  const totalExpectedTime = spoilage.spoilTime / spoilage.tempFactor / spoilage.containerFactor;

  if (remainingTime <= 0) {
    return SpoilState.ROTTEN;
  }

  const remainingPercent = remainingTime / totalExpectedTime;

  if (remainingPercent <= SpoilageConstants.SPOILED_THRESHOLD) {
    return SpoilState.SPOILED;
  }

  if (remainingPercent <= SpoilageConstants.WILTING_THRESHOLD) {
    return SpoilState.WILTING;
  }

  return SpoilState.FRESH;
}

/**
 * 获取剩余时间（毫秒）
 */
export function getRemainingTime(spoilage: SpoilageData, currentTime: TimePoint): number {
  const elapsed = currentTime - spoilage.created;
  const adjustedSpoilTime = spoilage.spoilTime / spoilage.tempFactor / spoilage.containerFactor;
  return Math.max(0, adjustedSpoilTime - elapsed);
}

/**
 * 检查食物是否新鲜
 */
export function isFresh(spoilage: SpoilageData, currentTime: TimePoint): boolean {
  return calculateSpoilState(spoilage, currentTime) === SpoilState.FRESH;
}

/**
 * 检查食物是否枯萎
 */
export function isWilting(spoilage: SpoilageData, currentTime: TimePoint): boolean {
  return calculateSpoilState(spoilage, currentTime) === SpoilState.WILTING;
}

/**
 * 检查食物是否腐烂（不可食用）
 */
export function isSpoiled(spoilage: SpoilageData, currentTime: TimePoint): boolean {
  const state = calculateSpoilState(spoilage, currentTime);
  return state === SpoilState.SPOILED || state === SpoilState.ROTTEN;
}

/**
 * 检查食物是否完全腐烂
 */
export function isRotten(spoilage: SpoilageData, currentTime: TimePoint): boolean {
  return calculateSpoilState(spoilage, currentTime) === SpoilState.ROTTEN;
}

// ============ 腐烽数据创建和更新 ============

/**
 * 创建腐烽数据
 *
 * @param spoilTime 基础腐烂时间（毫秒）
 * @param created 创建时间（默认为当前时间）
 * @param initialTemp 初始温度（默认为基准温度）
 * @param containerFactor 容器系数（默认为 1，即无容器保护）
 */
export function createSpoilageData(
  spoilTime: number,
  created: TimePoint = Date.now() as TimePoint,
  initialTemp: number = SpoilageConstants.BASE_TEMPERATURE,
  containerFactor: number = 1
): SpoilageData {
  return {
    created,
    spoilTime,
    tempFactor: calculateTemperatureFactor(initialTemp),
    containerFactor,
    lastUpdate: created,
  };
}

/**
 * 更新腐烽数据的环境因素
 *
 * @param spoilage 现有腐烽数据
 * @param newTemperature 新温度
 * @param newContainerFactor 新容器系数
 * @param updateTime 更新时间
 * @returns 更新后的腐烽数据
 */
export function updateSpoilageEnvironment(
  spoilage: SpoilageData,
  newTemperature: number,
  newContainerFactor: number,
  updateTime: TimePoint = Date.now() as TimePoint
): SpoilageData {
  // 计算新的温度系数
  const newTempFactor = calculateTemperatureFactor(newTemperature);

  return {
    ...spoilage,
    tempFactor: newTempFactor,
    containerFactor: newContainerFactor,
    lastUpdate: updateTime,
  };
}

/**
 * 估算腐烽数据的进度（0-1）
 *
 * @param spoilage 腐烽数据
 * @param currentTime 当前时间
 * @returns 进度（0 = 刚创建，1 = 完全腐烂）
 */
export function getSpoilageProgress(spoilage: SpoilageData, currentTime: TimePoint): number {
  const totalExpectedTime = spoilage.spoilTime / spoilage.tempFactor / spoilage.containerFactor;
  const elapsed = currentTime - spoilage.created;
  return Math.min(1, Math.max(0, elapsed / totalExpectedTime));
}
