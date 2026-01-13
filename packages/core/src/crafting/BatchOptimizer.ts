/**
 * BatchOptimizer - 批量优化系统
 *
 * 参考 Cataclysm-DDA 的批量制作系统
 * 使用 Logistic 函数计算最优批量大小
 */

import type {
  BatchOptimizationParams,
  BatchOptimizationResult,
} from './types';

/**
 * BatchOptimizer - 批量优化器类
 *
 * 使用 Logistic 函数计算最优批量大小
 */
export class BatchOptimizer {
  /**
   * Logistic 函数
   *
   * f(x) = L / (1 + e^(-k * (x - x0)))
   *
   * @param x 输入值 (技能等级)
   * @param L 最大值
   * @param k 增长率
   * @param x0 中心点
   * @returns Logistic 函数值
   */
  static logisticFunction(
    x: number,
    L: number,
    k: number,
    x0: number
  ): number {
    return L / (1 + Math.exp(-k * (x - x0)));
  }

  /**
   * 计算最优批量大小
   *
   * @param params 批量优化参数
   * @returns 批量优化结果
   */
  static calculateOptimalBatch(params: BatchOptimizationParams): BatchOptimizationResult {
    const {
      baseBatchSize,
      skillLevel,
      proficiencyLevel = 0,
      difficultyMultiplier,
      maxBatchLimit = 20,
    } = params;

    // 计算综合技能等级 (技能 + 熟练度加成)
    // 难度会降低有效技能等级
    const effectiveSkillLevel = (skillLevel + proficiencyLevel * 0.5) / difficultyMultiplier;

    // Logistic 函数参数
    // L: 最大批量大小
    const maxValue = Math.min(maxBatchLimit, baseBatchSize * 4);

    // k: 增长率 (固定值，保持一致的曲线形状)
    const growthRate = 1.0;

    // x0: 中心点 (在技能等级 5 时达到最大值的一半)
    const center = 5.0;

    // 计算批量大小
    const batchSize = BatchOptimizer.logisticFunction(
      effectiveSkillLevel,
      maxValue,
      growthRate,
      center
    );

    // 确保至少为 1
    const finalBatchSize = Math.max(1, Math.floor(batchSize));

    // 计算效率评分
    // 效率 = 实际批量 / 最大可能的批量
    const efficiency = Math.min(1, finalBatchSize / maxValue);

    // 计算时间节省百分比
    // 批量制作可以节省准备时间
    const timeSavedPercent = BatchOptimizer.calculateTimeSaved(
      finalBatchSize,
      baseBatchSize
    );

    return {
      batchSize: finalBatchSize,
      efficiency,
      timeSavedPercent,
      logisticParams: {
        center,
        growthRate,
        maxValue,
      },
    };
  }

  /**
   * 计算时间节省百分比
   *
   * @param batchSize 批量大小
   * @param baseBatchSize 基础批量大小
   * @returns 时间节省百分比 (0-1)
   */
  static calculateTimeSaved(
    batchSize: number,
    baseBatchSize: number
  ): number {
    if (batchSize <= baseBatchSize) {
      return 0;
    }

    // 每个额外物品节省 10% 的准备时间
    const extraItems = batchSize - baseBatchSize;
    const timeSaved = Math.min(0.5, extraItems * 0.05);

    return timeSaved;
  }

  /**
   * 计算批量制作时间
   *
   * @param singleTime 单个制作时间
   * @param batchSize 批量大小
   * @param skillLevel 技能等级
   * @returns 批量制作时间
   */
  static calculateBatchTime(
    singleTime: number,
    batchSize: number,
    skillLevel: number
  ): number {
    // 基础时间
    let totalTime = singleTime * batchSize;

    // 技能等级越高，批量效率越高
    const efficiencyBonus = Math.min(0.3, skillLevel * 0.03);
    totalTime = totalTime * (1 - efficiencyBonus);

    return Math.max(singleTime, totalTime);
  }

  /**
   * 计算批量制作成功率
   *
   * @param singleSuccessRate 单个成功率
   * @param batchSize 批量大小
   * @returns 批量制作成功率
   */
  static calculateBatchSuccessRate(
    singleSuccessRate: number,
    batchSize: number
  ): number {
    // 批量制作时，成功率会有所降低
    // 批量越大，成功率降低越多
    const batchPenalty = Math.min(0.2, (batchSize - 1) * 0.02);
    return Math.max(0.05, singleSuccessRate - batchPenalty);
  }

  /**
   * 获取批量等级描述
   *
   * @param batchSize 批量大小
   * @param maxBatch 最大批次
   * @returns 等级描述
   */
  static getBatchLevelDescription(
    batchSize: number,
    maxBatch: number
  ): string {
    const ratio = batchSize / maxBatch;

    if (ratio >= 0.8) {
      return '大师级批量';
    } else if (ratio >= 0.6) {
      return '专家级批量';
    } else if (ratio >= 0.4) {
      return '熟练批量';
    } else if (ratio >= 0.2) {
      return '基础批量';
    } else {
      return '新手批量';
    }
  }

  /**
   * 获取批量优化建议
   *
   * @param params 批量优化参数
   * @returns 建议字符串
   */
  static getOptimizationAdvice(params: BatchOptimizationParams): string {
    const result = BatchOptimizer.calculateOptimalBatch(params);
    const lines: string[] = [];

    lines.push(`=== 批量优化建议 ===`);
    lines.push(`建议批量大小: ${result.batchSize}`);
    lines.push(`效率评分: ${(result.efficiency * 100).toFixed(1)}%`);
    lines.push(`时间节省: ${(result.timeSavedPercent * 100).toFixed(1)}%`);
    lines.push(`批量等级: ${BatchOptimizer.getBatchLevelDescription(
      result.batchSize,
      result.logisticParams.maxValue
    )}`);

    if (result.efficiency < 0.5) {
      lines.push('');
      lines.push('提示: 提高技能等级或熟练度可以增加批量大小。');
    }

    return lines.join('\n');
  }

  /**
   * 获取 Logistic 函数曲线数据
   *
   * 用于可视化批量增长曲线
   *
   * @param params 批量优化参数
   * @param steps 步数
   * @returns 曲线数据点
   */
  static getLogisticCurve(
    params: BatchOptimizationParams,
    steps: number = 11
  ): Array<{ skillLevel: number; batchSize: number }> {
    const { difficultyMultiplier, maxBatchLimit = 20, baseBatchSize } = params;
    const maxValue = Math.min(maxBatchLimit, baseBatchSize * 4);
    const growthRate = 1.0;
    const center = 5.0;

    const points: Array<{ skillLevel: number; batchSize: number }> = [];

    for (let i = 0; i < steps; i++) {
      const skillLevel = (i / (steps - 1)) * 10;
      // 应用难度影响
      const effectiveSkillLevel = skillLevel / difficultyMultiplier;
      const batchSize = Math.floor(
        BatchOptimizer.logisticFunction(effectiveSkillLevel, maxValue, growthRate, center)
      );
      points.push({ skillLevel, batchSize: Math.max(1, batchSize) });
    }

    return points;
  }
}
