/**
 * Body System - 身体部位系统
 *
 * 提供身体部位相关的类型定义和工具函数
 */

// 子身体部位系统
export { SubBodyPart } from './SubBodyPart';
export type { SubBodyPartId, BodyPartRelation, BodyPartProps } from './SubBodyPart';

// 身体部位类型定义
export * from './BodyPartTypes';

// 身体部位类
export { BodyPart } from './BodyPart';

// 身体部位管理器
export { BodyPartManager } from './BodyPartManager';

// 伤害分配系统
export { DamageDistributionSystem } from './DamageDistributionSystem';
export type {
  AttackType,
  AttackDirection,
  DistributionStrategy,
  ArmorProtection,
  DamageDistributionRequest,
  PartDamageResult,
  DamageDistributionResult,
} from './DamageDistributionSystem';

// 状态效果系统
export { BodyPartEffectSystem } from './BodyPartEffectSystem';
export type {
  AbilityType,
  AbilityModifier,
  AbilityImpact,
  ActionRestriction,
  StatusEffectSummary,
  OverallAbilityAssessment,
} from './BodyPartEffectSystem';

// 装备身体部位集成
export { EquipmentBodyIntegration } from './EquipmentBodyIntegration';
export {
  DEFAULT_SLOT_TO_BODY_PART_MAP,
  getProtectedBodyParts,
  calculateItemProtection,
  calculateCombinedProtection,
  calculateCombinedCoverage,
  createEmptyEquipmentState,
  createTestEquipmentItem,
} from './EquipmentBodyIntegration';
export type {
  SlotToBodyPartMap,
  BodyPartProtection,
  EquipmentProtectionSummary,
} from './EquipmentBodyIntegration';
