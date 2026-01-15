/**
 * DamageDistributionSystem - 伤害分配系统
 *
 * 根据攻击类型、装备和命中部位智能分配伤害到具体身体部位
 */

import { BodyPartId, BodyPartType } from '../creature/types';
import { BodyPartManager } from './BodyPartManager';
import type { BodyPart } from './BodyPart';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 攻击类型
 */
export enum AttackType {
  /** 近战攻击 */
  MELEE = 'melee',
  /** 远程射击 */
  RANGED = 'ranged',
  /** 爆炸 */
  EXPLOSION = 'explosion',
  /** 毒素 */
  POISON = 'poison',
  /** 火焰 */
  FIRE = 'fire',
  /** 电击 */
  ELECTRIC = 'electric',
  /** 跌落 */
  FALL = 'fall',
}

/**
 * 攻击方向
 */
export enum AttackDirection {
  /** 正面 */
  FRONT = 'front',
  /** 背后 */
  BACK = 'back',
  /** 左侧 */
  LEFT = 'left',
  /** 右侧 */
  RIGHT = 'right',
  /** 上方 */
  ABOVE = 'above',
  /** 下方 */
  BELOW = 'below',
  /** 全方位（爆炸等） */
  ALL = 'all',
}

/**
 * 伤害分配策略
 */
export enum DistributionStrategy {
  /** 完全随机 */
  RANDOM = 'random',
  /** 基于部位大小加权 */
  SIZE_WEIGHTED = 'size_weighted',
  /** 基于命中部位（指定主目标） */
  TARGETED = 'targeted',
  /** 均匀分配 */
  EVEN = 'even',
}

/**
 * 装备防护信息
 */
export interface ArmorProtection {
  readonly bodyPart: BodyPartId;
  readonly protection: number; // 防护值 (0-1)
  readonly coverage: number; // 覆盖率 (0-1)
}

/**
 * 伤害分配请求
 */
export interface DamageDistributionRequest {
  readonly attackType: AttackType;
  readonly direction: AttackDirection;
  readonly totalDamage: number;
  readonly strategy: DistributionStrategy;
  readonly targetPart?: BodyPartId; // TARGETED 策略时使用
  readonly armor?: ArmorProtection[]; // 装备防护
  readonly randomness?: number; // 随机性 (0-1), 默认 0.5
}

/**
 * 单个部位的伤害结果
 */
export interface PartDamageResult {
  readonly partId: BodyPartId;
  readonly partName: string;
  readonly rawDamage: number; // 原始伤害
  readonly mitigatedDamage: number; // 减免后的伤害
  readonly blockedDamage: number; // 被装备阻挡的伤害
  readonly finalDamage: number; // 最终伤害
}

/**
 * 伤害分配结果
 */
export interface DamageDistributionResult {
  readonly request: DamageDistributionRequest;
  readonly partDamages: readonly PartDamageResult[];
  readonly totalDamage: number; // 总实际伤害
  readonly totalBlocked: number; // 总阻挡伤害
  readonly lethalHits: readonly BodyPartId[]; // 致命伤害的部位
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * 部位权重配置
 */
interface PartWeight {
  readonly partId: BodyPartId;
  readonly weight: number; // 命中权重
}

// ============================================================================
// DamageDistributionSystem 类
// ============================================================================

/**
 * 伤害分配系统
 *
 * 根据攻击类型、方向和策略智能分配伤害到身体部位
 */
export class DamageDistributionSystem {
  private readonly random: () => number;

  constructor(randomFn?: () => number) {
    this.random = randomFn || Math.random;
  }

  // ========== 主要方法 ==========

  /**
   * 分配伤害到身体部位
   */
  distributeDamage(
    bodyPartManager: BodyPartManager,
    request: DamageDistributionRequest
  ): DamageDistributionResult {
    // 1. 根据策略确定目标部位和伤害分配
    const partDamages = this.allocateDamage(bodyPartManager, request);

    // 2. 计算装备防护
    const mitigatedDamages = this.applyArmor(partDamages, request.armor || []);

    // 3. 检查致命伤害
    const lethalHits = mitigatedDamages
      .filter(damage => {
        const part = bodyPartManager.getPart(damage.partId);
        return part && part.isLethal && damage.finalDamage > 0 &&
               part.currentHP - damage.finalDamage <= 0;
      })
      .map(d => d.partId);

    return {
      request,
      partDamages: mitigatedDamages,
      totalDamage: mitigatedDamages.reduce((sum, d) => sum + d.finalDamage, 0),
      totalBlocked: mitigatedDamages.reduce((sum, d) => sum + d.blockedDamage, 0),
      lethalHits,
    };
  }

  // ========== 私有方法 ==========

  /**
   * 根据策略分配伤害
   */
  private allocateDamage(
    bodyPartManager: BodyPartManager,
    request: DamageDistributionRequest
  ): PartDamageResult[] {
    const parts = bodyPartManager.getAllParts();
    const validParts = Array.from(parts.values()).filter(p => p.currentHP > 0);

    switch (request.strategy) {
      case DistributionStrategy.RANDOM:
        return this.allocateRandom(validParts, request);
      case DistributionStrategy.SIZE_WEIGHTED:
        return this.allocateSizeWeighted(validParts, request);
      case DistributionStrategy.TARGETED:
        return this.allocateTargeted(validParts, request);
      case DistributionStrategy.EVEN:
        return this.allocateEven(validParts, request);
      default:
        return this.allocateSizeWeighted(validParts, request);
    }
  }

  /**
   * 随机分配 - 选择单个部位承受全部伤害
   */
  private allocateRandom(
    parts: BodyPart[],
    request: DamageDistributionRequest
  ): PartDamageResult[] {
    const targetPart = this.selectRandomPart(parts, request.direction);
    return [
      this.createPartDamageResult(targetPart, request.totalDamage),
    ];
  }

  /**
   * 基于部位大小加权分配
   */
  private allocateSizeWeighted(
    parts: BodyPart[],
    request: DamageDistributionRequest
  ): PartDamageResult[] {
    // 根据攻击类型和方向调整部位权重
    const weights = this.calculatePartWeights(parts, request);

    // 使用加权随机选择主目标 ID
    const primaryPartId = this.selectWeightedPart(weights);
    const primaryPart = parts.find(p => p.id === primaryPartId);

    if (!primaryPart) {
      return [];
    }

    // 部分伤害可能溅射到相邻部位
    const splashDamage = request.totalDamage * 0.2; // 20% 溅射
    const primaryDamage = request.totalDamage - splashDamage;

    const results: PartDamageResult[] = [
      this.createPartDamageResult(primaryPart, primaryDamage),
    ];

    // 添加溅射伤害
    if (splashDamage > 0 && parts.length > 1) {
      const splashPart = this.selectRandomPart(
        parts.filter(p => p.id !== primaryPartId),
        request.direction
      );
      results.push(this.createPartDamageResult(splashPart, splashDamage));
    }

    return results;
  }

  /**
   * 指定目标分配
   */
  private allocateTargeted(
    parts: BodyPart[],
    request: DamageDistributionRequest
  ): PartDamageResult[] {
    if (!request.targetPart && request.targetPart !== 0) {
      return this.allocateSizeWeighted(parts, request);
    }

    const targetPart = parts.find(p => p.id === request.targetPart);
    if (!targetPart) {
      return this.allocateSizeWeighted(parts, request);
    }

    // 主要伤害作用于目标（80%）
    const primaryDamage = request.totalDamage * 0.8;
    const results: PartDamageResult[] = [
      this.createPartDamageResult(targetPart, primaryDamage),
    ];

    // 部分伤害溅射到相邻部位（20%）
    const adjacentParts = this.getAdjacentParts(targetPart, parts);
    if (adjacentParts.length > 0) {
      const splashPerPart = (request.totalDamage - primaryDamage) / adjacentParts.length;
      for (const part of adjacentParts) {
        results.push(this.createPartDamageResult(part, splashPerPart));
      }
    }

    return results;
  }

  /**
   * 均匀分配 - 所有部位平均承受伤害
   */
  private allocateEven(
    parts: BodyPart[],
    request: DamageDistributionRequest
  ): PartDamageResult[] {
    const damagePerPart = request.totalDamage / parts.length;
    return parts.map(part => this.createPartDamageResult(part, damagePerPart));
  }

  /**
   * 计算部位权重
   */
  private calculatePartWeights(
    parts: BodyPart[],
    request: DamageDistributionRequest
  ): PartWeight[] {
    const randomness = request.randomness ?? 0.5;

    return parts.map(part => {
      let weight = part.size; // 基础权重基于部位大小

      // 根据攻击方向调整权重
      weight *= this.getDirectionMultiplier(part.type, request.direction);

      // 根据攻击类型调整
      weight *= this.getAttackTypeMultiplier(part.type, request.attackType);

      // 添加随机性
      weight *= (1 - randomness * 0.5) + this.random() * randomness;

      return { partId: part.id, weight: Math.max(0.1, weight) };
    });
  }

  /**
   * 获取方向权重倍数
   */
  private getDirectionMultiplier(partType: BodyPartType, direction: AttackDirection): number {
    switch (direction) {
      case AttackDirection.FRONT:
        if (partType === BodyPartType.HEAD || partType === BodyPartType.TORSO ||
            partType === BodyPartType.ARM || partType === BodyPartType.HAND ||
            partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
          return 1.5; // 正面更容易击中
        }
        return 1.0;
      case AttackDirection.BACK:
        if (partType === BodyPartType.TORSO || partType === BodyPartType.HEAD) {
          return 1.5;
        }
        return 0.8;
      case AttackDirection.LEFT:
        if (partType === BodyPartType.ARM || partType === BodyPartType.HAND ||
            partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
          return 1.3;
        }
        return 1.0;
      case AttackDirection.RIGHT:
        if (partType === BodyPartType.ARM || partType === BodyPartType.HAND ||
            partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
          return 1.3;
        }
        return 1.0;
      case AttackDirection.ABOVE:
        if (partType === BodyPartType.HEAD || partType === BodyPartType.TORSO) {
          return 2.0;
        }
        return 0.5;
      case AttackDirection.BELOW:
        if (partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
          return 2.0;
        }
        return 0.3;
      case AttackDirection.ALL:
        return 1.0; // 全方位攻击，不调整
      default:
        return 1.0;
    }
  }

  /**
   * 获取攻击类型权重倍数
   */
  private getAttackTypeMultiplier(partType: BodyPartType, attackType: AttackType): number {
    switch (attackType) {
      case AttackType.MELEE:
        // 近战更容易击中四肢和躯干
        if (partType === BodyPartType.TORSO || partType === BodyPartType.ARM ||
            partType === BodyPartType.HAND || partType === BodyPartType.LEG ||
            partType === BodyPartType.FOOT) {
          return 1.2;
        }
        return 0.8;
      case AttackType.RANGED:
        // 远程更容易击中躯干和头部
        if (partType === BodyPartType.TORSO || partType === BodyPartType.HEAD) {
          return 1.3;
        }
        return 0.9;
      case AttackType.EXPLOSION:
        // 爆炸对所有部位影响相似
        return 1.0;
      case AttackType.FALL:
        // 跌落主要影响下肢
        if (partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
          return 2.0;
        }
        if (partType === BodyPartType.TORSO) {
          return 1.2;
        }
        return 0.5;
      default:
        return 1.0;
    }
  }

  /**
   * 加权随机选择部位
   */
  private selectWeightedPart(weights: PartWeight[]): BodyPartId {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = this.random() * totalWeight;

    for (const weight of weights) {
      random -= weight.weight;
      if (random <= 0) {
        return weight.partId;
      }
    }

    return weights[weights.length - 1].partId;
  }

  /**
   * 随机选择部位（考虑方向）
   */
  private selectRandomPart(
    parts: BodyPart[],
    direction: AttackDirection
  ): BodyPart {
    const weights = this.calculatePartWeights(parts, {
      attackType: AttackType.MELEE,
      direction,
      totalDamage: 0,
      strategy: DistributionStrategy.SIZE_WEIGHTED,
    });
    const selectedId = this.selectWeightedPart(weights);
    return parts.find(p => p.id === selectedId)!;
  }

  /**
   * 获取相邻部位
   */
  private getAdjacentParts(part: BodyPart, allParts: BodyPart[]): BodyPart[] {
    const adjacentMap: Record<BodyPartId, BodyPartId[]> = {
      [BodyPartId.HEAD]: [BodyPartId.TORSO],
      [BodyPartId.TORSO]: [BodyPartId.HEAD, BodyPartId.ARM_L, BodyPartId.ARM_R, BodyPartId.LEG_L, BodyPartId.LEG_R],
      [BodyPartId.ARM_L]: [BodyPartId.TORSO, BodyPartId.HAND_L],
      [BodyPartId.ARM_R]: [BodyPartId.TORSO, BodyPartId.HAND_R],
      [BodyPartId.HAND_L]: [BodyPartId.ARM_L],
      [BodyPartId.HAND_R]: [BodyPartId.ARM_R],
      [BodyPartId.LEG_L]: [BodyPartId.TORSO, BodyPartId.FOOT_L],
      [BodyPartId.LEG_R]: [BodyPartId.TORSO, BodyPartId.FOOT_R],
      [BodyPartId.FOOT_L]: [BodyPartId.LEG_L],
      [BodyPartId.FOOT_R]: [BodyPartId.LEG_R],
      [BodyPartId.EYES]: [BodyPartId.HEAD],
      [BodyPartId.MOUTH]: [BodyPartId.HEAD],
    };

    const adjacentIds = adjacentMap[part.id] || [];
    return adjacentIds
      .map(id => allParts.find(p => p.id === id))
      .filter((p): p is BodyPart => p !== undefined && p.currentHP > 0);
  }

  /**
   * 应用装备防护
   */
  private applyArmor(
    partDamages: PartDamageResult[],
    armor: ArmorProtection[]
  ): PartDamageResult[] {
    if (armor.length === 0) {
      return partDamages;
    }

    return partDamages.map(damage => {
      const partArmor = armor.find(a => a.bodyPart === damage.partId);
      if (!partArmor) {
        return damage;
      }

      // 计算防护效果
      const protection = partArmor.protection * partArmor.coverage;
      const blockedDamage = damage.rawDamage * protection;
      const mitigatedDamage = damage.rawDamage - blockedDamage;
      const finalDamage = Math.max(0, mitigatedDamage);

      return {
        ...damage,
        mitigatedDamage,
        blockedDamage,
        finalDamage,
      };
    });
  }

  /**
   * 创建部位伤害结果
   */
  private createPartDamageResult(
    part: BodyPart,
    rawDamage: number
  ): PartDamageResult {
    return {
      partId: part.id,
      partName: part.name,
      rawDamage,
      mitigatedDamage: rawDamage,
      blockedDamage: 0,
      finalDamage: rawDamage,
    };
  }

  // ========== 静态工厂方法 ==========

  /**
   * 创建默认的伤害分配系统
   */
  static create(): DamageDistributionSystem {
    return new DamageDistributionSystem();
  }

  /**
   * 创建带自定义随机函数的系统
   */
  static createWithRandom(randomFn: () => number): DamageDistributionSystem {
    return new DamageDistributionSystem(randomFn);
  }
}
