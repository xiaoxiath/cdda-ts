/**
 * EquipmentBodyIntegration - 装备身体部位集成
 *
 * 连接装备系统与身体部位系统，将装备防护转换为伤害分配系统可用的格式
 */

import { Map, List } from 'immutable';
import { BodyPartId } from '../creature/types';
import { DamageDistributionSystem } from './DamageDistributionSystem';
import type { ArmorProtection } from './DamageDistributionSystem';
import {
  EquipmentSlotType,
  type EquipmentItem,
  type EquipmentState,
} from '../equipment/types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 装备槽到身体部位的映射
 */
export type SlotToBodyPartMap = ReadonlyMap<EquipmentSlotType, BodyPartId>;

/**
 * 身体部位防护汇总
 */
export interface BodyPartProtection {
  /** 身体部位 ID */
  readonly bodyPart: BodyPartId;
  /** 身体部位名称 */
  readonly partName: string;
  /** 总防护值 (0-1) */
  readonly protection: number;
  /** 总覆盖率 (0-1) */
  readonly coverage: number;
  /** 贡献的装备项 */
  readonly sourceItems: readonly EquipmentItem[];
}

/**
 * 装备防护摘要
 */
export interface EquipmentProtectionSummary {
  /** 各身体部位的防护 */
  readonly protections: readonly BodyPartProtection[];
  /** 总防护重量 */
  readonly totalWeight: number;
  /** 平均覆盖率 */
  readonly avgCoverage: number;
}

// ============================================================================
// 装备槽到身体部位映射
// ============================================================================

/**
 * 默认的装备槽到身体部位映射
 *
 * 将装备槽映射到它们主要保护的身体部位
 */
export const DEFAULT_SLOT_TO_BODY_PART_MAP: Readonly<
  Record<EquipmentSlotType, BodyPartId>
> = {
  // 头部
  [EquipmentSlotType.HEAD]: BodyPartId.HEAD,
  [EquipmentSlotType.EYES]: BodyPartId.EYES,
  [EquipmentSlotType.MOUTH]: BodyPartId.MOUTH,
  [EquipmentSlotType.EARS]: BodyPartId.EYES,

  // 颈部
  [EquipmentSlotType.NECK]: BodyPartId.TORSO,

  // 躯干
  [EquipmentSlotType.TORSO_OUTER]: BodyPartId.TORSO,
  [EquipmentSlotType.TORSO_MIDDLE]: BodyPartId.TORSO,
  [EquipmentSlotType.TORSO_INNER]: BodyPartId.TORSO,

  // 手臂
  [EquipmentSlotType.HANDS]: BodyPartId.ARM_L, // 双手装备同时保护双臂

  // 左侧肢体
  [EquipmentSlotType.HAND_L]: BodyPartId.ARM_L,
  [EquipmentSlotType.LEG_L]: BodyPartId.LEG_L,
  [EquipmentSlotType.FOOT_L]: BodyPartId.FOOT_L,
  [EquipmentSlotType.UPPER_ARM_L]: BodyPartId.ARM_L,
  [EquipmentSlotType.LOWER_ARM_L]: BodyPartId.ARM_L,
  [EquipmentSlotType.UPPER_LEG_L]: BodyPartId.LEG_L,
  [EquipmentSlotType.LOWER_LEG_L]: BodyPartId.LEG_L,

  // 右侧肢体
  [EquipmentSlotType.HAND_R]: BodyPartId.ARM_R,
  [EquipmentSlotType.LEG_R]: BodyPartId.LEG_R,
  [EquipmentSlotType.FOOT_R]: BodyPartId.FOOT_R,
  [EquipmentSlotType.UPPER_ARM_R]: BodyPartId.ARM_R,
  [EquipmentSlotType.LOWER_ARM_R]: BodyPartId.ARM_R,
  [EquipmentSlotType.UPPER_LEG_R]: BodyPartId.LEG_R,
  [EquipmentSlotType.LOWER_LEG_R]: BodyPartId.LEG_R,

  // 其他
  [EquipmentSlotType.FINGER]: BodyPartId.ARM_L,
  [EquipmentSlotType.WRIST]: BodyPartId.ARM_L,
  [EquipmentSlotType.LEGS]: BodyPartId.LEG_L, // 双腿装备同时保护双腿
  [EquipmentSlotType.FEET]: BodyPartId.FOOT_L, // 双脚装备同时保护双脚
  [EquipmentSlotType.BACK]: BodyPartId.TORSO,
  [EquipmentSlotType.WAIST]: BodyPartId.TORSO,
  [EquipmentSlotType.HAND_PRIMARY]: BodyPartId.ARM_R,
  [EquipmentSlotType.HAND_SECONDARY]: BodyPartId.ARM_L,
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取装备槽保护的所有身体部位
 *
 * 某些装备槽（如 HANDS、LEGS）保护左右两侧的身体部位
 */
export function getProtectedBodyParts(
  slotType: EquipmentSlotType
): readonly BodyPartId[] {
  switch (slotType) {
    // 保护双侧的装备槽
    case EquipmentSlotType.HANDS:
      return [BodyPartId.ARM_L, BodyPartId.ARM_R];
    case EquipmentSlotType.LEGS:
      return [BodyPartId.LEG_L, BodyPartId.LEG_R];
    case EquipmentSlotType.FEET:
      return [BodyPartId.FOOT_L, BodyPartId.FOOT_R];
    case EquipmentSlotType.WRIST:
      return [BodyPartId.ARM_L, BodyPartId.ARM_R];
    case EquipmentSlotType.FINGER:
      return [BodyPartId.ARM_L, BodyPartId.ARM_R];

    // 保护单侧的装备槽
    case EquipmentSlotType.HAND_L:
    case EquipmentSlotType.UPPER_ARM_L:
    case EquipmentSlotType.LOWER_ARM_L:
      return [BodyPartId.ARM_L];

    case EquipmentSlotType.HAND_R:
    case EquipmentSlotType.UPPER_ARM_R:
    case EquipmentSlotType.LOWER_ARM_R:
      return [BodyPartId.ARM_R];

    case EquipmentSlotType.LEG_L:
    case EquipmentSlotType.UPPER_LEG_L:
    case EquipmentSlotType.LOWER_LEG_L:
      return [BodyPartId.LEG_L];

    case EquipmentSlotType.LEG_R:
    case EquipmentSlotType.UPPER_LEG_R:
    case EquipmentSlotType.LOWER_LEG_R:
      return [BodyPartId.LEG_R];

    case EquipmentSlotType.FOOT_L:
      return [BodyPartId.FOOT_L];

    case EquipmentSlotType.FOOT_R:
      return [BodyPartId.FOOT_R];

    // 躯干类
    case EquipmentSlotType.TORSO_OUTER:
    case EquipmentSlotType.TORSO_MIDDLE:
    case EquipmentSlotType.TORSO_INNER:
    case EquipmentSlotType.BACK:
    case EquipmentSlotType.WAIST:
      return [BodyPartId.TORSO];

    // 头部类
    case EquipmentSlotType.HEAD:
      return [BodyPartId.HEAD];
    case EquipmentSlotType.EYES:
    case EquipmentSlotType.EARS:
      return [BodyPartId.EYES];
    case EquipmentSlotType.MOUTH:
      return [BodyPartId.MOUTH];
    case EquipmentSlotType.NECK:
      return [BodyPartId.TORSO];

    // 武器槽（不提供防护）
    case EquipmentSlotType.HAND_PRIMARY:
    case EquipmentSlotType.HAND_SECONDARY:
      return [];

    default:
      return [];
  }
}

/**
 * 计算单个装备项的防护值
 *
 * 从装备项的护甲数据计算防护系数 (0-1)
 */
export function calculateItemProtection(item: EquipmentItem): number {
  // 使用切割和穿刺阻力的平均值作为基础防护
  const bashResist = item.armor.resistances.get('BASH') || 0;
  const cutResist = item.armor.resistances.get('CUT') || 0;
  const stabResist = item.armor.resistances.get('STAB') || 0;

  // 平均阻力
  const avgResistance = (bashResist + cutResist + stabResist) / 3;

  // 将阻力转换为防护系数 (0-1)
  // 假设 30 点阻力提供 80% 防护
  const maxResistance = 30;
  const protection = Math.min(avgResistance / maxResistance, 0.95);

  return protection;
}

/**
 * 计算多个装备项的组合防护
 *
 * 使用叠加公式：1 - (1 - p1) * (1 - p2) * ... * (1 - pn)
 */
export function calculateCombinedProtection(items: readonly EquipmentItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  let combinedProtection = 0;

  for (const item of items) {
    const itemProtection = calculateItemProtection(item);
    // 叠加公式
    combinedProtection = 1 - (1 - combinedProtection) * (1 - itemProtection);
  }

  // 限制最大防护为 95%
  return Math.min(combinedProtection, 0.95);
}

/**
 * 计算多个装备项的组合覆盖率
 *
 * 使用叠加公式：1 - (1 - c1) * (1 - c2) * ... * (1 - cn)
 */
export function calculateCombinedCoverage(items: readonly EquipmentItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  let combinedCoverage = 0;

  for (const item of items) {
    const itemCoverage = item.armor.coverage / 100; // 转换百分比到 0-1
    // 叠加公式
    combinedCoverage = 1 - (1 - combinedCoverage) * (1 - itemCoverage);
  }

  return Math.min(combinedCoverage, 1.0);
}

// ============================================================================
// 主要集成类
// ============================================================================

/**
 * EquipmentBodyIntegration - 装备身体部位集成
 *
 * 提供装备系统与身体部位伤害系统的桥接功能
 */
export class EquipmentBodyIntegration {
  /**
   * 从装备状态计算各身体部位的防护
   */
  static calculateBodyPartProtections(
    equipmentState: EquipmentState,
    slotMap: Record<EquipmentSlotType, BodyPartId> = DEFAULT_SLOT_TO_BODY_PART_MAP
  ): BodyPartProtection[] {
    // 创建身体部位到装备项的映射
    let partToItems = Map<BodyPartId, EquipmentItem[]>();

    // 遍历所有装备槽
    equipmentState.equippedItems.forEach((items, slotId) => {
      // 从 slotId 提取 EquipmentSlotType
      const slotType = this.extractSlotType(slotId);
      if (!slotType) return;

      // 获取该槽保护的身体部位
      const protectedParts = getProtectedBodyParts(slotType);

      // 将装备项添加到对应的身体部位
      for (const bodyPart of protectedParts) {
        const currentItems = partToItems.get(bodyPart) || [];
        partToItems = partToItems.set(bodyPart, [...currentItems, ...items.toArray()]);
      }
    });

    // 为每个身体部位计算防护
    const protections: BodyPartProtection[] = [];

    // 获取所有唯一身体部位（有装备的部位）
    const allParts = partToItems.keySeq().toArray();

    // 为有装备的身体部位计算防护
    for (const bodyPart of allParts) {
      const items = partToItems.get(bodyPart) || [];

      if (items.length === 0) {
        continue;
      }

      const protection = calculateCombinedProtection(items);
      const coverage = calculateCombinedCoverage(items);

      protections.push({
        bodyPart: bodyPart as BodyPartId,
        partName: this.getBodyPartName(bodyPart as BodyPartId),
        protection,
        coverage,
        sourceItems: items,
      });
    }

    return protections;
  }

  /**
   * 从装备状态生成 DamageDistributionSystem 可用的防护数组
   */
  static toArmorProtections(
    equipmentState: EquipmentState,
    slotMap: Record<EquipmentSlotType, BodyPartId> = DEFAULT_SLOT_TO_BODY_PART_MAP
  ): ArmorProtection[] {
    const protections = this.calculateBodyPartProtections(equipmentState, slotMap);

    return protections.map(p => ({
      bodyPart: p.bodyPart,
      protection: p.protection,
      coverage: p.coverage,
    }));
  }

  /**
   * 生成装备防护摘要
   */
  static summarizeProtection(
    equipmentState: EquipmentState
  ): EquipmentProtectionSummary {
    const protections = this.calculateBodyPartProtections(equipmentState);

    const totalWeight = protections.reduce((sum, p) => {
      const itemWeight = p.sourceItems.reduce((s, item) => s + item.weight, 0);
      return sum + itemWeight;
    }, 0);

    const avgCoverage =
      protections.length > 0
        ? protections.reduce((sum, p) => sum + p.coverage, 0) / protections.length
        : 0;

    return {
      protections,
      totalWeight,
      avgCoverage,
    };
  }

  /**
   * 获取指定身体部位的防护
   */
  static getBodyPartProtection(
    equipmentState: EquipmentState,
    bodyPart: BodyPartId
  ): BodyPartProtection | undefined {
    const protections = this.calculateBodyPartProtections(equipmentState);
    return protections.find(p => p.bodyPart === bodyPart);
  }

  /**
   * 计算装备对特定攻击类型的防护加成
   */
  static calculateDamageTypeProtection(
    equipmentState: EquipmentState,
    bodyPart: BodyPartId,
    damageType: string
  ): number {
    const partProtection = this.getBodyPartProtection(equipmentState, bodyPart);
    if (!partProtection) {
      return 0;
    }

    // 获取所有相关装备对该伤害类型的抗性
    const totalResistance = partProtection.sourceItems.reduce((sum, item) => {
      const resistance = item.armor.resistances.get(damageType) || 0;
      return sum + resistance;
    }, 0);

    // 将抗性转换为防护系数
    const protection = Math.min(totalResistance / 30, 0.95);

    return protection * partProtection.coverage;
  }

  // ========== 私有辅助方法 ==========

  /**
   * 从槽位 ID 提取槽位类型
   */
  private static extractSlotType(
    slotId: string
  ): EquipmentSlotType | undefined {
    // 移除数字后缀，替换连字符，并转大写
    let cleanSlotId = slotId.replace(/_\d+$/, '').replace(/-/g, '_').toUpperCase();

    // 移除常见的后缀（_OUTER, _INNER, _MIDDLE 等）来匹配基础槽位类型
    const suffixes = ['_OUTER', '_INNER', '_MIDDLE', '_L', '_R'];
    for (const suffix of suffixes) {
      if (cleanSlotId.endsWith(suffix)) {
        const withoutSuffix = cleanSlotId.slice(0, -suffix.length);
        // 检查去除后缀后的部分是否是有效的槽位类型
        if (this.isValidSlotType(withoutSuffix)) {
          cleanSlotId = withoutSuffix;
          break;
        }
      }
    }

    // 查找匹配的 EquipmentSlotType
    const slotIdToType: Record<string, EquipmentSlotType> = {
      'HEAD': EquipmentSlotType.HEAD,
      'EYES': EquipmentSlotType.EYES,
      'MOUTH': EquipmentSlotType.MOUTH,
      'EARS': EquipmentSlotType.EARS,
      'NECK': EquipmentSlotType.NECK,
      'TORSO': EquipmentSlotType.TORSO_OUTER, // 默认为外层
      'TORSO_OUTER': EquipmentSlotType.TORSO_OUTER,
      'TORSO_MIDDLE': EquipmentSlotType.TORSO_MIDDLE,
      'TORSO_INNER': EquipmentSlotType.TORSO_INNER,
      'HANDS': EquipmentSlotType.HANDS,
      'HAND': EquipmentSlotType.HAND_L, // 默认为左侧
      'HAND_L': EquipmentSlotType.HAND_L,
      'HAND_R': EquipmentSlotType.HAND_R,
      'FINGER': EquipmentSlotType.FINGER,
      'WRIST': EquipmentSlotType.WRIST,
      'LEGS': EquipmentSlotType.LEGS,
      'LEG': EquipmentSlotType.LEG_L, // 默认为左侧
      'LEG_L': EquipmentSlotType.LEG_L,
      'LEG_R': EquipmentSlotType.LEG_R,
      'FEET': EquipmentSlotType.FEET,
      'FOOT': EquipmentSlotType.FOOT_L, // 默认为左侧
      'FOOT_L': EquipmentSlotType.FOOT_L,
      'FOOT_R': EquipmentSlotType.FOOT_R,
      'BACK': EquipmentSlotType.BACK,
      'WAIST': EquipmentSlotType.WAIST,
      'HAND_PRIMARY': EquipmentSlotType.HAND_PRIMARY,
      'HAND_SECONDARY': EquipmentSlotType.HAND_SECONDARY,
      'UPPER_ARM': EquipmentSlotType.UPPER_ARM_L, // 默认为左侧
      'UPPER_ARM_L': EquipmentSlotType.UPPER_ARM_L,
      'UPPER_ARM_R': EquipmentSlotType.UPPER_ARM_R,
      'LOWER_ARM': EquipmentSlotType.LOWER_ARM_L, // 默认为左侧
      'LOWER_ARM_L': EquipmentSlotType.LOWER_ARM_L,
      'LOWER_ARM_R': EquipmentSlotType.LOWER_ARM_R,
      'UPPER_LEG': EquipmentSlotType.UPPER_LEG_L, // 默认为左侧
      'UPPER_LEG_L': EquipmentSlotType.UPPER_LEG_L,
      'UPPER_LEG_R': EquipmentSlotType.UPPER_LEG_R,
      'LOWER_LEG': EquipmentSlotType.LOWER_LEG_L, // 默认为左侧
      'LOWER_LEG_L': EquipmentSlotType.LOWER_LEG_L,
      'LOWER_LEG_R': EquipmentSlotType.LOWER_LEG_R,
    };

    return slotIdToType[cleanSlotId];
  }

  /**
   * 检查是否是有效的槽位类型
   */
  private static isValidSlotType(type: string): boolean {
    const validTypes = new Set([
      'HEAD', 'EYES', 'MOUTH', 'EARS', 'NECK',
      'TORSO', 'TORSO_OUTER', 'TORSO_MIDDLE', 'TORSO_INNER',
      'HANDS', 'HAND', 'HAND_L', 'HAND_R',
      'FINGER', 'WRIST',
      'LEGS', 'LEG', 'LEG_L', 'LEG_R',
      'FEET', 'FOOT', 'FOOT_L', 'FOOT_R',
      'BACK', 'WAIST',
      'HAND_PRIMARY', 'HAND_SECONDARY',
      'UPPER_ARM', 'UPPER_ARM_L', 'UPPER_ARM_R',
      'LOWER_ARM', 'LOWER_ARM_L', 'LOWER_ARM_R',
      'UPPER_LEG', 'UPPER_LEG_L', 'UPPER_LEG_R',
      'LOWER_LEG', 'LOWER_LEG_L', 'LOWER_LEG_R',
    ]);
    return validTypes.has(type);
  }

  /**
   * 获取身体部位名称
   */
  private static getBodyPartName(bodyPart: BodyPartId): string {
    const names: Record<BodyPartId, string> = {
      [BodyPartId.HEAD]: '头部',
      [BodyPartId.TORSO]: '躯干',
      [BodyPartId.ARM_L]: '左臂',
      [BodyPartId.ARM_R]: '右臂',
      [BodyPartId.LEG_L]: '左腿',
      [BodyPartId.LEG_R]: '右腿',
      [BodyPartId.HAND_L]: '左手',
      [BodyPartId.HAND_R]: '右手',
      [BodyPartId.FOOT_L]: '左脚',
      [BodyPartId.FOOT_R]: '右脚',
      [BodyPartId.EYES]: '眼睛',
      [BodyPartId.MOUTH]: '嘴巴',
    };

    return names[bodyPart] || `部位_${bodyPart}`;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建空的装备状态（用于测试）
 */
export function createEmptyEquipmentState(): EquipmentState {
  return {
    equippedItems: Map(),
    stats: {
      armorByBodyPart: Map(),
      encumbranceByBodyPart: Map(),
      totalWarmth: 0,
      totalWeight: 0,
      totalCapacity: 0,
      envProtection: 0,
      speedPenalty: 0,
      hitPenalty: 0,
    },
  };
}

/**
 * 创建测试用的装备项
 */
export function createTestEquipmentItem(
  overrides: Partial<EquipmentItem> = {}
): EquipmentItem {
  return {
    itemId: 'test_item',
    itemName: '测试装备',
    layer: 'OUTER_LAYER' as any,
    covers: [],
    armor: {
      coverage: 50,
      thickness: 2,
      envProtection: 10,
      resistances: Map({ 'BASH': 5, 'CUT': 5, 'STAB': 5 }),
      rigid: false,
    },
    encumbrance: 5,
    warmth: 10,
    weight: 500,
    occupiesSlots: [],
    ...overrides,
  };
}
