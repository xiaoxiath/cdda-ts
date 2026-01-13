/**
 * 物品系统类型定义
 *
 * 参考 Cataclysm-DDA 的 item.h 和 itype.h
 */

import type { TimeDuration, TimePoint } from '../field/FieldEntry';
import type { Tripoint } from '../coordinates';

// 重新导出腐烂系统类型
export type { SpoilState, SpoilageData } from './spoilage';

// ============ 物品 ID 类型 ============

/**
 * 物品类型 ID - 使用 branded type 实现类型安全
 */
export type ItemTypeId = string & { readonly __brand: unique symbol };

/**
 * 物品组 ID
 */
export type ItemGroupId = string & { readonly __brand: unique symbol };

/**
 * 弹药类型 ID
 */
export type AmmoTypeId = string & { readonly __brand: unique symbol };

/**
 * 技能 ID
 */
export type SkillId = string & { readonly __brand: unique symbol };

/**
 * 材料 ID
 */
export type MaterialId = string & { readonly __brand: unique symbol };

/**
 * 品质 ID
 */
export type QualityId = string & { readonly __brand: unique symbol };

// ============ ID 创建函数 ============

/**
 * 创建物品类型 ID
 */
export function createItemTypeId(id: string): ItemTypeId {
  return id as ItemTypeId;
}

/**
 * 创建物品组 ID
 */
export function createItemGroupId(id: string): ItemGroupId {
  return id as ItemGroupId;
}

/**
 * 创建弹药类型 ID
 */
export function createAmmoTypeId(id: string): AmmoTypeId {
  return id as AmmoTypeId;
}

/**
 * 创建技能 ID
 */
export function createSkillId(id: string): SkillId {
  return id as SkillId;
}

/**
 * 创建材料 ID
 */
export function createMaterialId(id: string): MaterialId {
  return id as MaterialId;
}

/**
 * 创建品质 ID
 */
export function createQualityId(id: string): QualityId {
  return id as QualityId;
}

// ============ 物品类型枚举 ============

/**
 * 物品类别枚举
 */
export enum ItemCategory {
  // 普通物品
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  FOOD = 'FOOD',
  TOOL = 'TOOL',
  BOOK = 'BOOK',
  AMMO = 'AMMO',
  CONTAINER = 'CONTAINER',

  // 特殊类型
  GUN = 'GUN',
  GUNMOD = 'GUNMOD',
  ARMOR_MOD = 'ARMOR_MOD',
  BIONIC = 'BIONIC',
  COMESTIBLE = 'COMESTIBLE',
  ENGINE = 'ENGINE',
  WHEEL = 'WHEEL',
  PET_ARMOR = 'PET_ARMOR',

  // 其他
  GENERIC = 'GENERIC',
  FURNITURE = 'FURNITURE',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

/**
 * Pocket 类型枚举
 */
export enum PocketType {
  CONTAINER = 'CONTAINER',           // 通用容器
  MAGAZINE = 'MAGAZINE',             // 弹匣
  MAGAZINE_WELL = 'MAGAZINE_WELL',   // 弹匣槽
  MOD = 'MOD',                       // 改装件
  CORPSE = 'CORPSE',                 // 尸体
  SOFTWARE = 'SOFTWARE',             // 软件
  E_FILE_STORAGE = 'E_FILE_STORAGE', // 电子文件存储
  CABLE = 'CABLE',                   // 电缆
  MIGRATION = 'MIGRATION',           // 迁移用
  EBOOK = 'EBOOK',                   // 电子书
}

/**
 * 包含码 - 容器检查结果
 */
export enum ContainCode {
  SUCCESS = 0,
  ERR_MOD = 1,           // 只有 MOD 可以放入
  ERR_LIQUID = 2,        // 需要防水容器
  ERR_GAS = 3,           // 需要气密容器
  ERR_TOO_BIG = 4,       // 物品太大
  ERR_TOO_HEAVY = 5,     // 物品太重
  ERR_TOO_SMALL = 6,     // 物品太小
  ERR_NO_SPACE = 7,      // 容量不足
  ERR_FLAG = 8,          // 缺少必需标志
  ERR_AMMO = 9,          // 弹药类型不匹配
  ERR_COMPATIBILITY = 10, // 兼容性问题
}

// ============ 物品标志枚举 ============

/**
 * 物品标志 - 字符串常量
 */
export const ItemFlag = {
  // 基础属性
  ALLOWS_REMOTE_USE: 'ALLOWS_REMOTE_USE',
  LEAK_DAM: 'LEAK_DAM',
  USE_UPS: 'USE_UPS',
  REACH_ATTACK: 'REACH_ATTACK',

  // 消耗品
  EDIBLE: 'EDIBLE',
  EDIBLE_FROZEN: 'EDIBLE_FROZEN',
  NO_INGEST: 'NO_INGEST',
  NO_UNLOAD: 'NO_UNLOAD',
  NEVER_JAMS: 'NEVER_JAMS',
  RELOAD_AND_SHOOT: 'RELOAD_AND_SHOOT',

  // 装备
  VEHICLE: 'VEHICLE',
  BELTED: 'BELTED',
  POWERARMOR_COMPATIBLE: 'POWERARMOR_COMPATIBLE',

  // 武器
  FIRE_TWOHAND: 'FIRE_TWOHAND',
  ALWAYS_TWOHAND: 'ALWAYS_TWOHAND',
  NEEDS_UNFOLD: 'NEEDS_UNFOLD',
  NEEDS_UNFOLD_MINIMUM_STRENGTH: 'NEEDS_UNFOLD_MINIMUM_STRENGTH',
  MUST_UNFOLD: 'MUST_UNFOLD',
  BLOCK_WHILE_WIELDED: 'BLOCK_WHILE_WIELDED',
  USES_BIONIC_POWER: 'USES_BIONIC_POWER',

  // 防护
  RAIN_PROTECT: 'RAIN_PROTECT',
  SPLINT: 'SPLINT',
  HEATS: 'HEATS',
  HEATS_FOOD: 'HEATS_FOOD',
  WATCH: 'WATCH',
  ALLOWS_XL_ZOOM: 'ALLOWS_XL_ZOOM',
  SOLAR_CHARGE: 'SOLAR_CHARGE',
  GNP_ALTERNATE: 'GNP_ALTERNATE',
  NO_RELOAD: 'NO_RELOAD',
  NO_STRAFE: 'NO_STRAFE',

  // 工具
  POUCH: 'POUCH',
  REACH3: 'REACH3',
  STAB: 'STAB',
  CUT_WOOD: 'CUT_WOOD',
  COOK: 'COOK',
  WATER_EXTINGUISHER: 'WATER_EXTINGUISHER',

  // 其他
  IRREMOVABLE: 'IRREMOVABLE',
  NO_DROP: 'NO_DROP',
  TRADER_AVOID: 'TRADER_AVOID',
  NO_SALVAGE: 'NO_SALVAGE',
  LEAK_IGNORE: 'LEAK_IGNORE',
  RAD_HARD: 'RAD_HARD',
  FILTHY: 'FILTHY',
} as const;

export type ItemFlagType = typeof ItemFlag[keyof typeof ItemFlag];

/**
 * 创建物品标志集合
 */
export function createItemFlagSet(...flags: ItemFlagType[]): globalThis.Set<ItemFlagType> {
  return new globalThis.Set(flags);
}

// ============ 物品状态 ============

/**
 * 物品位置类型
 */
export enum ItemLocationType {
  INVALID = 0,
  CHARACTER = 1,
  MAP = 2,
  VEHICLE = 3,
  CONTAINER = 4,
}

/**
 * 物品位置
 */
export interface ItemLocation {
  type: ItemLocationType;
  position?: Tripoint;
  index?: number;
  container?: any; // Item - 避免循环引用
}

// ============ 质量和体积 ============

/**
 * 质量（单位：克）
 */
export type Mass = number;

/**
 * 体积（单位：毫升）
 */
export type Volume = number;

/**
 * 创建质量值
 */
export function createMass(grams: number): Mass {
  return grams;
}

/**
 * 创建体积值
 */
export function createVolume(milliliters: number): Volume {
  return milliliters;
}

// ============ 物品变量 ============

/**
 * 物品运行时变量映射
 * 使用原生 Map 以支持任意键值对
 */
export type ItemVars = globalThis.Map<string, string | number | boolean>;

// ============ 辅助类型 ============

/**
 * 溢出行为
 */
export enum OverflowBehavior {
  NONE = 0,
  SPILL = 1,    // 溢出到地面
  DISCARD = 2,  // 丢弃多余
  LAST = 3,
}

/**
 * 访问者响应
 */
export enum VisitResponse {
  NEXT = 0,      // 继续访问子项
  SKIP = 1,      // 跳过子项
  ABORT = 2,     // 中止访问
}

/**
 * 访问者函数类型
 * 注意：使用 any 避免循环引用，实际使用时是 Item 类型
 */
export type VisitorFunction = (
  item: any,
  parent: any | null
) => VisitResponse;

// ============ JSON 对象类型 ============

/**
 * JSON 对象类型（用于数据加载）
 */
export type JsonObject = Record<string, any>;
