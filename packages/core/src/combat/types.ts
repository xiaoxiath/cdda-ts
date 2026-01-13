/**
 * 战斗系统核心类型定义
 *
 * 参考 Cataclysm-DDA 的 damage.h 和 ballistics.h
 */

import { Map, Set, List } from 'immutable';

// ============================================================================
// 品牌类型 - 类型安全的 ID
// ============================================================================

/**
 * 伤害类型 ID
 */
export type DamageTypeId = string & { readonly __brand: unique symbol };

/**
 * 创建伤害类型 ID
 */
export function createDamageTypeId(id: string): DamageTypeId {
  return id as DamageTypeId;
}

/**
 * 技能 ID
 */
export type SkillId = string & { readonly __brand: unique symbol };

/**
 * 创建技能 ID
 */
export function createSkillId(id: string): SkillId {
  return id as SkillId;
}

/**
 * 效果类型 ID
 */
export type EffectTypeId = string & { readonly __brand: unique symbol };

/**
 * 创建效果类型 ID
 */
export function createEffectTypeId(id: string): EffectTypeId {
  return id as EffectTypeId;
}

/**
 * 身体部位 ID
 */
export type BodyPartId = string & { readonly __brand: unique symbol };

/**
 * 创建身体部位 ID
 */
export function createBodyPartId(id: string): BodyPartId {
  return id as BodyPartId;
}

/**
 * 物品组 ID
 */
export type ItemGroupId = string & { readonly __brand: unique symbol };

/**
 * 物品类型 ID
 */
export type ItemTypeId = string & { readonly __brand: unique symbol };

// ============================================================================
// 基础数值类型
// ============================================================================

/**
 * 伤害量（无符号整数）
 */
export type DamageAmount = number;

/**
 * 抗性值（有符号整数，可负）
 */
export type ResistanceAmount = number;

/**
 * 倍率（浮点数）
 */
export type Multiplier = number;

// ============================================================================
// 枚举类型
// ============================================================================

/**
 * 伤害类型分类
 */
export enum DamageCategory {
  PHYSICAL = 'PHYSICAL',    // 物理伤害
  HEAT = 'HEAT',            // 热伤害
  ELECTRIC = 'ELECTRIC',    // 电击伤害
  COLD = 'COLD',            // 寒冷伤害
  BIOLOGICAL = 'BIOLOGICAL', // 生物伤害
  POISON = 'POISON',        // 毒素伤害
  ACID = 'ACID',            // 酸性伤害
  SPECIAL = 'SPECIAL',      // 特殊伤害
}

/**
 * 命中结果
 */
export enum HitResult {
  CRIT = 'CRIT',           // 暴击
  HIT = 'HIT',             // 命中
  GLANCE = 'GLANCE',       // 擦伤
  GRAZE = 'GRAZE',         // 轻伤
  MISS = 'MISS',           // 失误
}

/**
 * 攻击类型
 */
export enum AttackType {
  MELEE = 'MELEE',         // 近战
  RANGED = 'RANGED',       // 远程
  THROW = 'THROW',         // 投掷
  EXPLOSION = 'EXPLOSION', // 爆炸
}

/**
 * 近战攻击范围类型
 */
export enum MeleeHitRange {
  BASH = 'BASH',           // 钝击
  CUT = 'CUT',             // 切割
  STAB = 'STAB',           // 刺击
}

/**
身体部位类型
 */
export enum BodyPartType {
  HEAD = 'HEAD',
  EYES = 'EYES',
  MOUTH = 'MOUTH',
  TORSO = 'TORSO',
  ARM_L = 'ARM_L',
  ARM_R = 'ARM_R',
  HAND_L = 'HAND_L',
  HAND_R = 'HAND_R',
  LEG_L = 'LEG_L',
  LEG_R = 'LEG_R',
  FOOT_L = 'FOOT_L',
  FOOT_R = 'FOOT_R',
}

// ============================================================================
// JSON 对象类型
// ============================================================================

/**
 * 通用 JSON 对象
 */
export type JsonObject = Record<string, any>;

// ============================================================================
// 伤害相关接口
// ============================================================================

/**
 * 伤害单位 - 最小伤害单元
 *
 * 参考 CDDA damage_unit 结构
 */
export interface DamageUnitProps {
  /** 伤害类型 */
  type: DamageTypeId;
  /** 伤害量 */
  amount: DamageAmount;
  /** 护甲穿透值 */
  resPen: ResistanceAmount;
  /** 抗性倍率 */
  resMult: Multiplier;
  /** 伤害倍率 */
  damageMult: Multiplier;
  /** 无条件抗性倍率（忽略护甲） */
  unconditionalResMult: Multiplier;
  /** 无条件伤害倍率 */
  unconditionalDamageMult: Multiplier;
}

/**
 * 伤害单位不可变接口
 */
export interface ReadonlyDamageUnit {
  readonly type: DamageTypeId;
  readonly amount: DamageAmount;
  readonly resPen: ResistanceAmount;
  readonly resMult: Multiplier;
  readonly damageMult: Multiplier;
  readonly unconditionalResMult: Multiplier;
  readonly unconditionalDamageMult: Multiplier;
}

// ============================================================================
// 抗性相关接口
// ============================================================================

/**
 * 抗性值集合
 */
export type ResistanceMap = Map<DamageTypeId, ResistanceAmount>;

/**
 * 身体部位抗性映射
 */
export type BodyPartResistances = Map<BodyPartId, ResistanceMap>;

// ============================================================================
// 命中相关接口
// ============================================================================

/**
 * 命中判定结果
 *
 * 参考 CDDA projectile_attack_aim
 */
export interface HitRollResult {
  /** 命中质量 (0.0=完美命中, 1.0=完全失误) */
  missedBy: Multiplier;
  /** 失误的格数 */
  missedByTiles: Multiplier;
  /** 本次攻击的散布值（角分） */
  dispersion: number;
}

/**
 * 攻击统计数据
 *
 * 参考 CDDA melee_statistic_data
 */
export interface AttackStats {
  /** 攻击次数 */
  attackCount: number;
  /** 命中次数 */
  hitCount: number;
  /** 双重暴击次数 */
  doubleCritCount: number;
  /** 暴击次数 */
  critCount: number;
  /** 实际暴击次数 */
  actualCritCount: number;
  /** 伤害总量 */
  damageAmount: number;
}

// ============================================================================
// 效果相关接口
// ============================================================================

/**
 * 效果触发时机
 */
export enum EffectTrigger {
  ON_HIT = 'ON_HIT',           // 命中时触发
  ON_DAMAGE = 'ON_DAMAGE',     // 造成伤害时触发
  ON_KILL = 'ON_KILL',         // 击杀时触发
  ON_BLOCK = 'ON_BLOCK',       // 格挡时触发
  ON_DODGE = 'ON_DODGE',       // 闪避时触发
  ON_GET_HIT = 'ON_GET_HIT',   // 被命中时触发
}

/**
 * 效果条件
 */
export interface EffectCondition {
  /** 触发时机 */
  trigger: EffectTrigger;
  /** 概率 (0-1) */
  probability?: number;
  /** 条件函数 */
  condition?: () => boolean;
}

/**
 * 效果执行上下文
 */
export interface EffectContext {
  /** 效果来源 */
  source: any; // TODO: Creature 类型
  /** 效果目标 */
  target: any;
  /** 身体部位 */
  bodyPart?: BodyPartId;
  /** 原始伤害 */
  rawDamage?: DamageInstance;
  /** 实际伤害 */
  actualDamage?: DamageInstance;
  /** 是否暴击 */
  critical?: boolean;
}

// ============================================================================
// 类型导入 (用于避免循环依赖)
// ============================================================================

/**
 * 伤害实例（前向声明）
 */
export interface DamageInstance {
  readonly damageUnits: List<ReadonlyDamageUnit>;
  readonly onHitEffects: List<EffectTypeId>;
  readonly onDamageEffects: List<EffectTypeId>;

  addDamage(type: DamageTypeId, amount: DamageAmount, resPen?: ResistanceAmount): DamageInstance;
  multDamage(multiplier: Multiplier, preArmor: boolean): DamageInstance;
  totalDamage(): DamageAmount;
  isEmpty(): boolean;
}

/**
 * 伤害类型（前向声明）
 */
export interface DamageType {
  readonly id: DamageTypeId;
  readonly name: string;
  readonly category: DamageCategory;
  readonly physical: boolean;
  readonly edged: boolean;
  readonly heat: boolean;
  readonly skill: SkillId | null;
  readonly immuneFlags: Set<string>;
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * 访问者响应
 */
export enum VisitResponse {
  NEXT = 0,      // 继续访问子项
  SKIP = 1,      // 跳过子项
  ABORT = 2,     // 中止访问
}

/**
 * 访问者函数
 */
export type VisitorFunction<T> = (
  item: T,
  parent: T | null
) => VisitResponse;
