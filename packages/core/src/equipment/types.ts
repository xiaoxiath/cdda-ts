/**
 * Equipment System - 装备系统类型定义
 *
 * 参考 Cataclysm-DDA 的 worn.h 和装备相关结构
 */

import type { Map, List } from 'immutable';
import type { BodyPartId } from '../damage/types';

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
 * 装备槽类型（支持左右区分和子身体部位）
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
  /** 手部（通用） */
  HANDS = 'HANDS',
  /** 左手 */
  HAND_L = 'HAND_L',
  /** 右手 */
  HAND_R = 'HAND_R',
  /** 手指 */
  FINGER = 'FINGER',
  /** 手腕 */
  WRIST = 'WRIST',
  /** 腿部（通用） */
  LEGS = 'LEGS',
  /** 左腿 */
  LEG_L = 'LEG_L',
  /** 右腿 */
  LEG_R = 'LEG_R',
  /** 脚部（通用） */
  FEET = 'FEET',
  /** 左脚 */
  FOOT_L = 'FOOT_L',
  /** 右脚 */
  FOOT_R = 'FOOT_R',
  /** 背部 */
  BACK = 'BACK',
  /** 腰部 */
  WAIST = 'WAIST',
  /** 主手 */
  HAND_PRIMARY = 'HAND_PRIMARY',
  /** 副手 */
  HAND_SECONDARY = 'HAND_SECONDARY',
  // ========== 子身体部位 ==========
  /** 左大臂 */
  UPPER_ARM_L = 'UPPER_ARM_L',
  /** 右大臂 */
  UPPER_ARM_R = 'UPPER_ARM_R',
  /** 左小臂 */
  LOWER_ARM_L = 'LOWER_ARM_L',
  /** 右小臂 */
  LOWER_ARM_R = 'LOWER_ARM_R',
  /** 左大腿 */
  UPPER_LEG_L = 'UPPER_LEG_L',
  /** 右大腿 */
  UPPER_LEG_R = 'UPPER_LEG_R',
  /** 左小腿 */
  LOWER_LEG_L = 'LOWER_LEG_L',
  /** 右小腿 */
  LOWER_LEG_R = 'LOWER_LEG_R',
}

/**
 * 子身体部位类型（更精细的部位划分）
 */
export enum SubBodyPartType {
  /** 左大臂 */
  UPPER_ARM_L = 'UPPER_ARM_L',
  /** 右大臂 */
  UPPER_ARM_R = 'UPPER_ARM_R',
  /** 左小臂 */
  LOWER_ARM_L = 'LOWER_ARM_L',
  /** 右小臂 */
  LOWER_ARM_R = 'LOWER_ARM_R',
  /** 左大腿 */
  UPPER_LEG_L = 'UPPER_LEG_L',
  /** 右大腿 */
  UPPER_LEG_R = 'UPPER_LEG_R',
  /** 左小腿 */
  LOWER_LEG_L = 'LOWER_LEG_L',
  /** 右小腿 */
  LOWER_LEG_R = 'LOWER_LEG_R',
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

// ============================================================================
// 材料系统类型
// ============================================================================

/**
 * 材料 ID
 */
export type MaterialId = string & { readonly __brand: unique symbol };

/**
 * 创建材料 ID
 */
export function createMaterialId(id: string): MaterialId {
  return id as MaterialId;
}

/**
 * 材料属性
 */
export interface MaterialProperties {
  /** 刚性（影响抗冲击能力） */
  rigidity: number;
  /** 柔性（影响抗切割能力） */
  flexibility: number;
  /** 密度（影响重量） */
  density: number;
  /** 导电性 */
  conductivity: number;
  /** 导热性 */
  thermalConductivity: number;
  /** 易燃性 */
  flammability: number;
  /** 耐腐蚀性 */
  corrosionResistance: number;
}

/**
 * 材料抗性数据
 */
export interface MaterialResistances {
  /** 钝击抗性 */
  bash: number;
  /** 切割抗性 */
  cut: number;
  /** 刺击抗性 */
  stab: number;
  /** 子弹抗性 */
  bullet: number;
  /** 酸性抗性 */
  acid: number;
  /** 热能抗性 */
  heat: number;
  /** 寒冷抗性 */
  cold: number;
  /** 电击抗性 */
  electric: number;
}

/**
 * 材料定义
 */
export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description?: string;
  /** 材料属性 */
  properties: MaterialProperties;
  /** 材料抗性 */
  resistances: MaterialResistances;
  /** 基础厚度 */
  baseThickness: number;
  /** 是否为金属 */
  isMetal: boolean;
  /** 是否为有机材料 */
  isOrganic: boolean;
}

// ============================================================================
// 潮湿和耐久系统类型
// ============================================================================

/**
 * 装备潮湿状态
 */
export enum WetnessLevel {
  DRY = 'DRY',           // 干燥 (0-10%)
  DAMP = 'DAMP',         // 微湿 (10-30%)
  WET = 'WET',           // 潮湿 (30-60%)
  SOAKED = 'SOAKED',     // 浸透 (60-90%)
  DRENCHED = 'DRENCHED', // 湿透 (90-100%)
}

/**
 * 装备耐久度数据
 */
export interface DurabilityData {
  /** 当前耐久度 (0-100) */
  currentDurability: number;
  /** 最大耐久度 */
  maxDurability: number;
  /** 是否已损坏 */
  isBroken: boolean;
  /** 损坏历史 */
  damageHistory: DamageEvent[];
}

/**
 * 损坏事件
 */
export interface DamageEvent {
  /** 损坏时间 */
  timestamp: number;
  /** 损坏类型 */
  damageType: string;
  /** 损坏量 */
  amount: number;
  /** 来源 */
  source: string;
}

/**
 * 装备潮湿数据
 */
export interface WetnessData {
  /** 当前潮湿值 (0-100) */
  currentWetness: number;
  /** 最大潮湿值 */
  maxWetness: number;
  /** 干燥速率（每分钟减少的潮湿值） */
  dryRate: number;
  /** 最后更新时间 */
  lastUpdate: number;
}

/**
 * 装备状态扩展（包含潮湿和耐久）
 */
export interface EquipmentItemExtended extends EquipmentItem {
  /** 材料信息 */
  material?: MaterialId;
  /** 材料定义引用 */
  materialDefinition?: MaterialDefinition;
  /** 潮湿数据 */
  wetness?: WetnessData;
  /** 耐久度数据 */
  durability?: DurabilityData;
  /** 退化修正值（基于材料和环境） */
  degradationModifier?: number;
}
