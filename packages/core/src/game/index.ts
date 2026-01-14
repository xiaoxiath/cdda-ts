/**
 * Game Module - 游戏循环和状态管理
 *
 * 导出游戏循环相关的类和类型
 */

export { GameState } from './GameState';
export { GameLoop, GameAction } from './GameLoop';
export { ActionPointSystem, ActionType, DEFAULT_ACTION_COST } from './ActionPointSystem';
export { Scheduler, DEFAULT_SCHEDULER_CONFIG } from './Scheduler';
export { TurnManager } from './TurnManager';
export { EventQueue, EventType, EventPriority, EventStatus, createEventId } from './EventQueue';

export type { InputHandler, RenderHandler, GameLoopConfig } from './GameLoop';
export type { GameStateProps } from './GameState';
export type { ActionCostConfig, ActionRecord, ActionBudget } from './ActionPointSystem';
export type { ScheduleEntry, DelayedEvent, SchedulerConfig } from './Scheduler';
export type { TurnResult, ActionResult, CreatureActionData } from './TurnManager';
export type { EventId, EventCallback, ConditionCheck, BaseEventData, DelayedEventData, PeriodicEventData, ConditionalEventData, ImmediateEventData, GameEvent } from './EventQueue';
