/**
 * BodyPartTypes - 身体部位类型定义
 *
 * 定义身体部位状态、效果和相关类型
 * 参考 Cataclysm-DDA 的 bodypart.h 和 hp_part.cpp
 */

import type { BodyPartId, BodyPartType } from '../creature/types';
import type { SubBodyPartId } from './SubBodyPart';
import type { SubBodyPartType } from '../combat/types';

// ============================================================================
// 身体部位状态枚举
// ============================================================================

/**
 * 身体部位健康状态
 */
export enum BodyPartHealth {
  HEALTHY = 'healthy',         // 健康 (90-100% HP)
  BRUISED = 'bruised',         // 淤伤 (60-89% HP)
  HURT = 'hurt',              // 受伤 (30-59% HP)
  BADLY_HURT = 'badly_hurt',  // 重伤 (10-29% HP)
  BROKEN = 'broken',          // 骨折/断肢 (0-9% HP)
}

/**
 * 身体部位状态效果
 */
export enum BodyPartStatus {
  // ========== 基础状态 ==========
  HEALTHY = 'healthy',           // 健康 - 无任何负面状态
  BRUISED = 'bruised',           // 淤伤 - 轻微伤害，轻微疼痛
  HURT = 'hurt',                 // 受伤 (30-59% HP) - 通用伤害状态
  BADLY_HURT = 'badly_hurt',     // 重伤 (10-29% HP) - 严重伤害状态
  CUT = 'cut',                   // 割伤 - 出血，可能感染
  BITED = 'bitten',              // 咬伤 - 可能感染，出血
  BITE = 'bite',                 // 咬伤状态（BITED的别名，兼容性）
  SCRATCH = 'scratch',           // 抓伤 - 轻微皮肤损伤
  BURN = 'burn',                 // 烧伤 - 火焰伤害
  FROSTBITE = 'frostbite',       // 冻伤 - 寒冷伤害
  BLISTERS = 'blisters',         // 水泡 - 摩擦或轻微烧伤
  GRAZE = 'graze',               // 擦伤 - 表皮损伤

  // ========== 骨骼状态 ==========
  BROKEN = 'broken',             // 骨折 - 严重影响功能，需要固定
  CRUSHED = 'crushed',           // 粉碎 - 更严重，可能永久残疾
  DISLOCATED = 'dislocated',     // 脱臼 - 疼痛，影响功能

  // ========== 皮肤/组织状态 ==========
  INFECTED = 'infected',         // 感染 - 随时间恶化，需要抗生素
  GANGRENOUS = 'gangrenous',     // 坏疽 - 严重感染，可能致命
  SCARRED = 'scarred',           // 疤痕 - 永久性，轻微影响功能

  // ========== 神经状态 ==========
  NUMB = 'numb',                 // 麻木 - 失去感觉
  PARALYZED = 'paralyzed',       // 瘫痪 - 无法移动
  CRIPPLED = 'crippled',         // 残废 - 永久性功能丧失

  // ========== 永久状态 ==========
  AMPUTATED = 'amputated',       // 断肢 - 永久性缺失
  REMOVED = 'removed',           // 移除 - 手术移除
  DESTROYED = 'destroyed',       // 毁灭 - 完全破坏

  // ========== 特殊状态 ==========
  BANDAGED = 'bandaged',         // 已包扎 - 止血中
  SPLINTED = 'splinted',         // 已固定 - 骨折治疗中
  CASTED = 'casted',             // 打石膏 - 骨折恢复中

  // ========== 恢复状态 ==========
  HEALING = 'healing',           // 恢复中 - 自然恢复
  TREATED = 'treated',           // 已治疗 - 医疗处理
  RECOVERING = 'recovering',     // 康复中 - 功能逐渐恢复
}

// ============================================================================
// 身体部位属性
// ============================================================================

/**
 * 身体部位属性
 */
export interface BodyPartProps {
  /** 部位 ID */
  readonly id: BodyPartId;
  /** 部位类型 */
  readonly type: BodyPartType;
  /** 部位名称 */
  readonly name: string;
  /** 最大 HP */
  readonly maxHP: number;
  /** 当前 HP */
  readonly currentHP: number;
  /** 部位大小（用于命中计算） */
  readonly size: number;
  /** 是否是致命部位 */
  readonly isLethal: boolean;
  /** 是否可以缺失 */
  readonly canBeMissing: boolean;
  /** 当前状态 */
  readonly status: BodyPartStatus;
  /** 状态持续时间（回合数） */
  readonly statusDuration: number;
  /** 疼痛等级 (0-10) */
  readonly pain: number;
  /** 出血量 (每回合 HP 损失) */
  readonly bleeding: number;
  /** 感染等级 (0-1) */
  readonly infection: number;
}

/**
 * 子身体部位属性
 */
export interface SubBodyPartProps {
  /** 子部位 ID */
  readonly id: SubBodyPartId;
  /** 子部位类型 */
  readonly type: SubBodyPartType;
  /** 子部位名称 */
  readonly name: string;
  /** 最大 HP */
  readonly maxHP: number;
  /** 当前 HP */
  readonly currentHP: number;
  /** 部位大小（用于命中计算） */
  readonly size: number;
  /** 是否是致命部位 */
  readonly isLethal: boolean;
  /** 是否可以缺失 */
  readonly canBeMissing: boolean;
  /** 当前状态 */
  readonly status: BodyPartStatus;
  /** 状态持续时间（回合数） */
  readonly statusDuration: number;
  /** 疼痛等级 (0-10) */
  readonly pain: number;
  /** 出血量 (每回合 HP 损失) */
  readonly bleeding: number;
  /** 感染等级 (0-1) */
  readonly infection: number;
}

// ============================================================================
// 身体部位效果
// ============================================================================

/**
 * 身体部位状态效果
 */
export interface BodyPartEffect {
  /** 效果类型 */
  readonly type: BodyPartStatus;
  /** 严重程度 (0-1) */
  readonly severity: number;
  /** 持续时间（回合数，0 表示永久） */
  readonly duration: number;
  /** 疼痛等级 (0-10) */
  readonly pain: number;
  /** 出血量 (每回合 HP 损失) */
  readonly bleeding: number;
  /** 感染等级 (0-1) */
  readonly infection: number;
  /** 功能影响 (0-1, 1 = 无影响) */
  readonly efficiency: number;
}

/**
 * 身体部位伤害结果
 */
export interface DamageResult {
  /** 原始伤害 */
  readonly originalDamage: number;
  /** 实际伤害（考虑护甲等） */
  readonly actualDamage: number;
  /** 受伤的部位 */
  readonly partId: BodyPartId | SubBodyPartId;
  /** 新的 HP */
  readonly newHP: number;
  /** 是否破坏了部位 */
  readonly destroyed: boolean;
  /** 是否断肢 */
  readonly severed: boolean;
  /** 附加的状态效果 */
  readonly effects: BodyPartEffect[];
}

/**
 * 身体部位治疗结果
 */
export interface HealResult {
  /** 治疗的部位 */
  readonly partId: BodyPartId | SubBodyPartId;
  /** 原始 HP */
  readonly originalHP: number;
  /** 治疗量 */
  readonly healAmount: number;
  /** 新的 HP */
  readonly newHP: number;
  /** 是否移除了状态 */
  readonly statusRemoved: boolean;
  /** 移除的状态 */
  readonly removedStatus: BodyPartStatus | null;
}

// ============================================================================
// 身体部位效率影响
// ============================================================================

/**
 * 身体部位对能力的影响
 */
export interface BodyPartImpact {
  /** 移动速度修正 (0-1) */
  speedModifier: number;
  /** 操作能力修正 (0-1) */
  dexterityModifier: number;
  /** 战斗能力修正 (0-1) */
  combatModifier: number;
  /** 感知能力修正 (0-1) */
  perceptionModifier: number;
  /** 负重能力修正 (0-1) */
  carryModifier: number;
  /** 是否可以移动 */
  canMove: boolean;
  /** 是否可以使用双手 */
  canUseBothHands: boolean;
  /** 是否可以进行精细操作 */
  canDoFineWork: boolean;
}

// ============================================================================
// 恢复相关类型
// ============================================================================

/**
 * 医疗物品类型
 */
export enum MedicalItemType {
  BANDAGE = 'bandage',           // 绷带 - 止血
  SPLINT = 'splint',             // 夹板 - 固定骨折
  CAST = 'cast',                 // 石膏 - 完全固定
  ANTIBIOTIC = 'antibiotic',     // 抗生素 - 治疗感染
  PAINKILLER = 'painkiller',     // 止痛药 - 减少疼痛
  FIRST_AID_KIT = 'first_aid_kit', // 急救包 - 综合治疗
  DISINFECTANT = 'disinfectant', // 消毒剂 - 防止感染
  HEALING_SALVE = 'healing_salve', // 治疗药膏 - 加速恢复
}

/**
 * 医疗物品属性
 */
export interface MedicalItemProps {
  readonly type: MedicalItemType;
  readonly name: string;
  readonly healAmount: number;
  readonly stopBleeding: number;    // 止血量
  readonly cureInfection: number;   // 治愈感染量
  readonly reducePain: number;      // 减少疼痛量
  readonly setBone: boolean;        // 是否能固定骨折
  readonly applyTime: number;       // 使用时间（回合）
}

/**
 * 恢复速率
 */
export interface RecoveryRate {
  /** 基础恢复率（HP/回合） */
  readonly baseRate: number;
  /** 休息加成 */
  readonly restBonus: number;
  /** 健康状态加成 */
  readonly healthBonus: number;
  /** 护理加成 */
  readonly careBonus: number;
  /** 感染惩罚 */
  readonly infectionPenalty: number;
}

// ============================================================================
// 工具函数类型
// ============================================================================

/**
 * 身体部位查询
 */
export interface BodyPartQuery {
  /** 是否包含子部位 */
  includeSubParts?: boolean;
  /** 是否只查询功能正常的部位 */
  onlyFunctional?: boolean;
  /** 是否只查询特定类型的部位 */
  typeFilter?: BodyPartType;
  /** 是否只查询有特定状态的部位 */
  statusFilter?: BodyPartStatus;
}

/**
 * 身体部位统计
 */
export interface BodyPartStats {
  /** 总 HP */
  readonly totalHP: number;
  /** 总最大 HP */
  readonly totalMaxHP: number;
  /** 功能正常的部位数量 */
  readonly functionalParts: number;
  /** 受伤的部位数量 */
  readonly injuredParts: number;
  /** 断肢数量 */
  readonly amputatedParts: number;
  /** 总疼痛等级 */
  readonly totalPain: number;
  /** 总出血量 */
  readonly totalBleeding: number;
  /** 总感染程度 */
  readonly totalInfection: number;
  /** 健康百分比 */
  readonly healthPercentage: number;
}
