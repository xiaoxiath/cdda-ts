/**
 * AI 模块导出
 *
 * 导出所有 AI 系统的公共接口
 *
 * @module ai
 */

// ============================================================================
// 类型定义
// ============================================================================

export * from './types';

// ============================================================================
// 行为树系统
// ============================================================================

export { BehaviorNode } from './BehaviorNode';
export type { BehaviorNodeProps } from './BehaviorNode';

export { BehaviorTree, BehaviorTreeBuilder, buildTree } from './BehaviorTree';
export type { BehaviorTreeProps } from './BehaviorTree';

// ============================================================================
// 感知系统
// ============================================================================

export { Oracle } from './Oracle';
export type { OracleProps } from './Oracle';

// ============================================================================
// 寻路系统
// ============================================================================

export { Pathfinding } from './Pathfinding';
export type { PathfindingProps } from './Pathfinding';

// ============================================================================
// AI 控制器
// ============================================================================

export { NPCAI } from './NPCAI';
export type { NPCAIProps } from './NPCAI';

// ============================================================================
// 策略模式
// ============================================================================

export {
  Strategy,
  CombatStrategy,
  SurvivalStrategy,
  SocialStrategy,
  PatrolStrategy,
  StrategyManager,
  PresetStrategies,
} from './Strategy';
export type {
  StrategyProps,
  CombatStrategyProps,
  SurvivalStrategyProps,
  SocialStrategyProps,
} from './Strategy';
