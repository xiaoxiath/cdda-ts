/**
 * 效果系统类型定义
 *
 * 参考 Cataclysm-DDA 的 effect_type 结构
 */

import { Map, List } from 'immutable';
import type { BodyPartId } from '../combat/types';

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
 * 身体部位效果强度映射
 * 用于存储每个身体部位的效果强度值
 */
export type BodyPartIntensityMap = Map<BodyPartId, number>;

/**
 * 创建身体部位强度映射
 */
export function createBodyPartIntensityMap(): BodyPartIntensityMap {
  return Map<BodyPartId, number>();
}

// ============================================================================
// 效果相关枚举
// ============================================================================

/**
 * 效果强度
 */
export enum EffectIntensity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  DEADLY = 'deadly',
}

/**
 * 效果持续时间类型
 */
export enum EffectDurationType {
  INSTANT = 'instant',
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
  PERMANENT = 'permanent',
}

/**
 * 效果应用模式
 */
export enum EffectApplyMode {
  /** 立即应用 */
  IMMEDIATE = 'immediate',
  /** 延迟应用 */
  DELAYED = 'delayed',
  /** 周期性应用 */
  PERIODIC = 'periodic',
  /** 条件触发 */
  CONDITIONAL = 'conditional',
}

/**
 * 效果类别
 */
export enum EffectCategory {
  BUFF = 'buff',           // 增益效果
  DEBUFF = 'debuff',       // 减益效果
  POISON = 'poison',       // 中毒
  DISEASE = 'disease',     // 疾病
  TRIGGER = 'trigger',     // 触发效果
  REGEN = 'regen',         // 再生
  DAMAGE = 'damage',       // 伤害
  HEAL = 'heal',           // 治疗
  MOVEMENT = 'movement',   // 移动效果
  VISION = 'vision',       // 视觉效果
  STAMINA = 'stamina',     // 耐力效果
  PAIN = 'pain',           // 疼痛
  HUNGER = 'hunger',       // 饥饿
  THIRST = 'thirst',       // 口渴
  FATIGUE = 'fatigue',     // 疲劳
  SLEEP = 'sleep',         // 睡眠
  STUN = 'stun',           // 眩晕
  BLEED = 'bleed',         // 出血
  INFECTION = 'infection', // 感染
}

/**
 * 效果修饰符类型
 */
export enum EffectModifierType {
  // ============ 基础属性修饰 ============
  STAT_ADD = 'stat_add',           // 属性加法
  STAT_MULTIPLY = 'stat_multiply', // 属性乘法

  // ============ 战斗修饰 - 命中 ============
  HIT_BONUS = 'hit_bonus',         // 命中加值
  HIT_MULTIPLIER = 'hit_multiplier', // 命中乘数

  // ============ 战斗修饰 - 伤害 ============
  DAMAGE_ADD = 'damage_add',       // 伤害加法
  DAMAGE_BONUS = 'damage_bonus',   // 伤害加值
  DAMAGE_MULTIPLY = 'damage_multiply', // 伤害乘法

  // ============ 战斗修饰 - 护甲 ============
  ARMOR_ADD = 'armor_add',         // 护甲加法
  ARMOR_BONUS = 'armor_bonus',     // 护甲加值
  ARMOR_MULTIPLY = 'armor_multiply', // 护甲乘数

  // ============ 战斗修饰 - 速度 ============
  SPEED_ADD = 'speed_add',         // 速度加法
  SPEED_BONUS = 'speed_bonus',     // 速度加值
  SPEED_MULTIPLY = 'speed_multiply', // 速度乘数

  // ============ 战斗修饰 - 暴击 ============
  CRIT_CHANCE_BONUS = 'crit_chance_bonus',   // 暴击率加值
  CRIT_DAMAGE_MULTIPLIER = 'crit_damage_multiplier', // 暴击伤害乘数

  // ============ 战斗修饰 - 远程 ============
  ACCURACY_BONUS = 'accuracy_bonus',         // 精度加值
  DISPERSION_MODIFIER = 'dispersion_modifier', // 散布修正

  // ============ 战斗修饰 - 其他 ============
  VISION_RANGE = 'vision_range',     // 视野范围

  // ============ 抗性修饰 ============
  RESISTANCE = 'resistance',         // 伤害抗性
}

/**
 * 强度衰减类型
 */
export enum IntensityDecayType {
  NONE = 'none',           // 不衰减
  LINEAR = 'linear',       // 线性衰减
  EXPONENTIAL = 'exponential', // 指数衰减
  STEP = 'step',           // 阶梯式衰减
}

/**
 * 强度变化触发器
 */
export interface IntensityChangeTrigger {
  /** 触发时间点（毫秒） */
  triggerTime: number;
  /** 目标强度 */
  targetIntensity: EffectIntensity;
  /** 触发消息 */
  message?: string;
}

/**
 * 战斗触发器
 */
export interface CombatTrigger {
  /** 触发类型 */
  type: 'on_attack' | 'on_hit' | 'on_kill' | 'on_dodge' | 'on_block' | 'on_miss';
  /** 触发条件（可选） */
  condition?: string;
}

// ============================================================================
// 效果定义接口
// ============================================================================

/**
 * 效果修饰符
 */
export interface EffectModifier {
  /** 修饰符类型 */
  type: EffectModifierType;
  /** 目标属性/伤害类型 */
  target: string;
  /** 修饰符值 */
  value: number;
  /** 应用条件（可选） */
  condition?: string;
  /** 目标类型：attacker/victim（可选） */
  targetType?: 'attacker' | 'victim' | 'both';
  /** 适用的伤害类型列表（可选） */
  damageTypes?: List<string>;
  /** 适用的攻击类型列表（可选） */
  attackTypes?: List<'melee' | 'ranged'>;
  /** 最小强度要求（可选） */
  minIntensity?: number;
}

/**
 * 效果定义属性
 */
export interface EffectDefinitionProps {
  id: EffectTypeId;
  name: string;
  description: string;
  category: EffectCategory;
  intensity?: EffectIntensity;
  durationType?: EffectDurationType;
  applyMode?: EffectApplyMode;
  /** 是否可取消 */
  cancelable?: boolean;
  /** 是否可堆叠 */
  stackable?: boolean;
  /** 最大堆叠次数 */
  maxStacks?: number;
  /** 属性修饰符 */
  modifiers?: EffectModifier[];
  /** 周期性效果间隔（毫秒） */
  tickInterval?: number;
  /** 减免效果类型 */
  resistances?: EffectTypeId[];
  /** 是否显示在 UI 上 */
  visible?: boolean;
  /** 消息模板 */
  messageStart?: string;
  messageEnd?: string;
  messageTick?: string;
  // ========== 身体部位支持 ==========
  /** 受影响的身体部位及其强度 */
  bpAffected?: BodyPartIntensityMap;
  /** 是否为局部效果（仅影响指定部位） */
  isLocal?: boolean;
  // ========== 强度衰减 ==========
  /** 强度衰减类型 */
  intDecay?: IntensityDecayType;
  /** 强度衰减速率（每分钟衰减的强度值） */
  intDecayRate?: number;
  /** 强度变化触发器 */
  intChangeTriggers?: IntensityChangeTrigger[];
  // ========== 效果交互 ==========
  /** 减少其他效果的持续时间（效果ID -> 减少的毫秒数） */
  reducesDuration?: Map<EffectTypeId, number>;
  /** 效果抗性（免疫的效果ID列表） */
  effectImmunities?: EffectTypeId[];
  // ========== Kill 机制 ==========
  /** 是否可导致死亡 */
  canKill?: boolean;
  /** 死亡消息 */
  killMessage?: string;
}

// ============================================================================
// 效果实例接口
// ============================================================================

/**
 * 效果实例属性
 */
export interface EffectProps {
  definition: any; // EffectDefinition - 前向声明
  startTime: number;
  duration: number;
  intensity: EffectIntensity;
  currentStacks: number;
  isActive: boolean;
  // ========== 身体部位支持 ==========
  /** 当前身体部位强度映射 */
  bpIntensity?: BodyPartIntensityMap;
  // ========== 强度衰减 ==========
  /** 当前强度衰减值 */
  currentDecay?: number;
  /** 上次衰减时间 */
  lastDecayTime?: number;
}

/**
 * 效果应用结果
 */
export interface EffectApplyResult {
  applied: boolean;
  effect?: any; // Effect
  message?: string;
}

/**
 * 效果更新结果
 */
export interface EffectUpdateResult {
  updated: boolean;
  expired: boolean;
  message?: string;
}

// ============================================================================
// 效果数据接口 (用于 JSON 加载)
// ============================================================================

/**
 * 效果 JSON 对象
 */
export interface EffectJsonObject {
  id: string;
  name: string;
  description?: string;
  category: string;
  intensity?: string;
  duration_type?: string;
  apply_mode?: string;
  cancelable?: boolean;
  stackable?: boolean;
  max_stacks?: number;
  modifiers?: EffectModifier[];
  tick_interval?: number;
  resistances?: string[];
  visible?: boolean;
  message_start?: string;
  message_end?: string;
  message_tick?: string;
}

/**
 * 效果实例 JSON 对象
 */
export interface EffectInstanceJson {
  id: string;
  startTime: number;
  duration: number;
  intensity: string;
  currentStacks: number;
  isActive: boolean;
}
