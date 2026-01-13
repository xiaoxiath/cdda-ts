/**
 * Equipment System - 装备系统类型定义
 *
 * 参考 Cataclysm-DDA 的 worn.h 和装备相关结构
 */

import type { Map, List } from 'immutable';

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 装备槽 ID
 */
export type EquipmentSlotId = string & { readonly __brand: unique symbol };

/**
 * 创建装备槽 ID
 */
export function createEquipmentSlotId(id: string): EquipmentSlotId {
  return id as EquipmentSlotId;
}

/**
 * 装备层 ID
 */
export type LayerId = string & { readonly __brand: unique symbol };

/**
 * 创建装备层 ID
 */
export function createLayerId(id: string): LayerId {
  return id as LayerId;
}

// ============================================================================
// 装备槽类型枚举
// ============================================================================

/**
 * 装备槽类型
 */
export enum EquipmentSlotType {
  /** 头部 */
  HEAD = 'HEAD',
  /** 眼睛 */
  EYES = 'EYES',
  /** 嘴巴 */
  MOUTH = 'MOUTH',
  /** 耳朵 */
  EARS = 'EARS',
  /** 颈部 */
  NECK = 'NECK',
  /** 躯干（外层） */
  TORSO_OUTER = 'TORSO_OUTER',
  /** 躯干（内层） */
  TORSO_INNER = 'TORSO_INNER',
  /** 躯干（中层） */
  TORSO_MIDDLE = 'TORSO_MIDDLE',
  /** 手部（手套） */
  HANDS = 'HANDS',
  /** 手指 */
  FINGER = 'FINGER',
  /** 手腕 */
  WRIST = 'WRIST',
  /** 腿部 */
  LEGS = 'LEGS',
  /** 脚部 */
  FEET = 'FEET',
  /** 背部 */
  BACK = 'BACK',
  /** 腰部 */
  WAIST = 'WAIST',
  /** 主手 */
  HAND_PRIMARY = 'HAND_PRIMARY',
  /** 副手 */
  HAND_SECONDARY = 'HAND_SECONDARY',
}

/**
 * 装备层
 */
export enum EquipmentLayer {
  /** 基础层（内衣） */
  BASE_LAYER = 'BASE_LAYER',
  /** 中间层 */
  MID_LAYER = 'MID_LAYER',
  /** 外层 */
  OUTER_LAYER = 'OUTER_LAYER',
  /** 腰带层 */
  BELTED = 'BELTED',
  /** 头饰层 */
  HEAD_LAYER = 'HEAD_LAYER',
}

// ============================================================================
// 装备数据接口
// ============================================================================

/**
 * 装备槽定义
 */
export interface EquipmentSlotDefinition {
  /** 槽位 ID */
  id: EquipmentSlotId;
  /** 槽位类型 */
  type: EquipmentSlotType;
  /** 槽位名称 */
  name: string;
  /** 槽位描述 */
  description: string;
  /** 支持的装备层 */
  validLayers: EquipmentLayer[];
  /** 容量（同时可装备数量，0 = 不限） */
  capacity: number;
  /** 是否必需槽位 */
  required: boolean;
}

/**
 * 装备项
 */
export interface EquipmentItem {
  /** 物品 ID */
  itemId: string;
  /** 物品名称 */
  itemName: string;
  /** 装备层 */
  layer: EquipmentLayer;
  /** 覆盖的身体部位 */
  covers: EquipmentSlotType[];
  /** 护甲值 */
  armor: EquipmentArmorData;
  /** 笨重值（影响灵活度） */
  encumbrance: number;
  /** 保暖值 */
  warmth: number;
  /** 重量 */
  weight: number;
  /** 最大容量（如果有） */
  maxCapacity?: number;
  /** 占用的槽位 */
  occupiesSlots: EquipmentSlotType[];
}

/**
 * 装备护甲数据
 */
export interface EquipmentArmorData {
  /** 覆盖率 (0-100) */
  coverage: number;
  /** 厚度 */
  thickness: number;
  /** 环境保护 */
  envProtection: number;
  /** 抗性映射 */
  resistances: Map<string, number>;
  /** 是否刚性护甲 */
  rigid: boolean;
}

/**
 * 装备统计信息
 */
export interface EquipmentStats {
  /** 总护甲值（按部位） */
  armorByBodyPart: Map<EquipmentSlotType, number>;
  /** 总笨重值（按部位） */
  encumbranceByBodyPart: Map<EquipmentSlotType, number>;
  /** 总保暖值 */
  totalWarmth: number;
  /** 总重量 */
  totalWeight: number;
  /** 总容量 */
  totalCapacity: number;
  /** 环境保护 */
  envProtection: number;
  /** 移动速度惩罚 */
  speedPenalty: number;
  /** 命中惩罚 */
  hitPenalty: number;
}

/**
 * 装备穿戴结果
 */
export interface EquipResult {
  /** 是否成功 */
  success: boolean;
  /** 装备后的状态 */
  equipment?: EquipmentState;
  /** 错误消息 */
  error?: string;
}

/**
 * 装备状态
 */
export interface EquipmentState {
  /** 装备映射（槽位 -> 装备列表） */
  equippedItems: Map<EquipmentSlotId, List<EquipmentItem>>;
  /** 装备统计 */
  stats: EquipmentStats;
}

/**
 * 装备槽冲突检查结果
 */
export interface SlotConflictResult {
  /** 是否有冲突 */
  hasConflict: boolean;
  /** 冲突的槽位 */
  conflictingSlots: EquipmentSlotType[];
  /** 被替换的装备 */
  displacedItems: EquipmentItem[];
}
