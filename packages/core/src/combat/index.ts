/**
 * 战斗系统导出
 *
 * 提供 Cataclysm-DDA 战斗系统的 TypeScript 实现
 * 参考 damage.h, melee.h, ballistics.h
 */

// ============================================================================
// 类型导出
// ============================================================================

export * from './types';

// ============================================================================
// 核心类导出
// ============================================================================

export { DamageType, DamageTypes } from './DamageType';
export { DamageUnit } from './DamageUnit';
export { DamageInstance } from './DamageInstance';
export { Resistances } from './Resistances';
export { Attack } from './Attack';

// ============================================================================
// 伤害系统增强
// ============================================================================

export { DamageCalculator } from './DamageCalculator';
export type {
  DamageCalcResult,
  FullDamageCalcResult,
  BodyPartDamageResult,
  DamageCalcConfig,
} from './DamageCalculator';

export { DamageHandler } from './DamageHandler';
export type {
  DamageEvent,
  DamageApplicationResult,
  BodyPartHPData,
  DamageableCreature,
} from './DamageHandler';

export {
  DamageEffectsRegistry,
  DamageEffectsManager,
  initializeBuiltinEffects,
} from './DamageEffects';
export type {
  DamageEffectType,
  EffectIntensity,
  EffectCondition,
  EffectDuration,
  DamageEffectDef,
  DamageEffectContext,
  ActiveEffect,
} from './DamageEffects';

export {
  BLEEDING_EFFECT,
  BURNING_EFFECT,
  POISONED_EFFECT,
  STUNNED_EFFECT,
  KNOCKED_DOWN_EFFECT,
  BROKEN_EFFECT,
  FROZEN_EFFECT,
  INFECTED_EFFECT,
} from './DamageEffects';

// ============================================================================
// 近战战斗系统
// ============================================================================

export { MeleeCombat } from './MeleeCombat';
export type {
  MeleeAttackProps,
  BlockResult,
  DodgeResult,
  MeleeAttackResult,
  MeleeCombatStats,
  MeleeCombatCharacter,
} from './MeleeCombat';
export { MeleeAttackType } from './MeleeCombat';

export {
  UNARMED_BASH,
  KNUCKLE_BASH,
  DAGGER_STAB,
  SWORD_CUT,
  WARHAMMER_BASH,
  SPEAR_STAB,
  AXE_CUT,
} from './MeleeCombat';

// ============================================================================
// 远程战斗系统
// ============================================================================

export { RangedCombat } from './RangedCombat';
export type {
  BallisticData,
  ShotResult,
  RangedAttackResult,
  AimState,
  RangedCombatCharacter,
  GunData,
} from './RangedCombat';
export { FireMode } from './RangedCombat';

export { PREDEFINED_GUNS } from './RangedCombat';

// ============================================================================
// 战斗反馈系统
// ============================================================================

export { CombatFeedback, FeedbackManager } from './CombatFeedback';
export type {
  FeedbackMessage,
  VisualFeedback,
  SoundFeedback,
  CombatFeedbackEvent,
} from './CombatFeedback';
export { FeedbackType, VisualEffect, SoundEffect } from './CombatFeedback';

// ============================================================================
// 战斗管理系统
// ============================================================================

export {
  CombatManager,
  createCombatManager,
  create1v1Combat,
} from './CombatManager';
export type {
  CombatEvent,
  Combatant,
  MeleeAttackRequest,
  RangedAttackRequest,
  CombatActionResult,
} from './CombatManager';

export {
  EffectCombatIntegration,
  CombatEffects,
} from './EffectCombatIntegration';
export type {
  CombatModifier,
  CombatEffectContext,
} from './EffectCombatIntegration';
