/**
 * Scheduler - 调度器
 *
 * 参考 Cataclysm-DDA 的生物调度系统
 * 管理所有生物的行动顺序，基于速度和行动点数
 *
 * 核心概念：
 * - 速度决定行动频率（speed/100 = moves per turn）
 * - 行动点预算管理每个生物的行动能力
 * - 调度器选择下一个行动的生物
 * - 支持延迟事件和计划行动
 */

import { List, Map } from 'immutable';
import type { Creature } from '../creature/Creature';
import type { Tripoint } from '../coordinates/Tripoint';
import type { GameMap } from '../map/GameMap';
import type { ActionPointSystem, ActionType } from './ActionPointSystem';

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 调度条目 - 生物在调度队列中的条目
 */
export interface ScheduleEntry {
  /** 生物 ID */
  readonly creatureId: string;
  /** 当前行动预算（剩余行动点） */
  readonly budget: number;
  /** 下次行动时间（游戏时间单位） */
  readonly nextActionTime: number;
  /** 优先级（玩家行动优先） */
  readonly priority: number;
  /** 是否正在行动中 */
  readonly isActing: boolean;
}

/**
 * 延迟事件
 */
export interface DelayedEvent {
  /** 事件 ID */
  readonly id: string;
  /** 触发时间（游戏时间单位） */
  readonly triggerTime: number;
  /** 事件类型 */
  readonly type: string;
  /** 事件数据 */
  readonly data: Record<string, any>;
  /** 回调函数 */
  readonly callback: (map: GameMap) => GameMap;
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 基础时间单位（毫秒） */
  readonly baseTimeUnit: number;
  /** 玩家行动优先级加成 */
  readonly playerPriorityBonus: number;
  /** 最大延迟事件数量 */
  readonly maxDelayedEvents: number;
}

/**
 * 默认调度器配置
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = Object.freeze({
  baseTimeUnit: 100, // 100 毫秒为 1 时间单位
  playerPriorityBonus: 1000, // 玩家优先
  maxDelayedEvents: 1000,
});

/**
 * 调度器属性（内部）
 */
interface SchedulerProps {
  readonly entries: Map<string, ScheduleEntry>;
  readonly delayedEvents: List<DelayedEvent>;
  readonly currentTime: number;
  readonly currentTurn: number;
  readonly activeCreatureId: string | null;
  readonly config: SchedulerConfig;
}

/**
 * Scheduler - 调度器
 *
 * 使用不可变数据结构管理所有生物的行动顺序
 */
export class Scheduler {
  readonly entries!: Map<string, ScheduleEntry>;
  readonly delayedEvents!: List<DelayedEvent>;
  readonly currentTime!: number;
  readonly currentTurn!: number;
  readonly activeCreatureId!: string | null;
  readonly config!: SchedulerConfig;

  private constructor(props: SchedulerProps) {
    this.entries = props.entries;
    this.delayedEvents = props.delayedEvents;
    this.currentTime = props.currentTime;
    this.currentTurn = props.currentTurn;
    this.activeCreatureId = props.activeCreatureId;
    this.config = props.config;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建调度器
   * @param config 调度器配置
   */
  static create(config?: Partial<SchedulerConfig>): Scheduler {
    const schedulerConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config };

    return new Scheduler({
      entries: Map(),
      delayedEvents: List(),
      currentTime: 0,
      currentTurn: 0,
      activeCreatureId: null,
      config: schedulerConfig,
    });
  }

  // ========== 生物管理 ==========

  /**
   * 添加生物到调度队列
   * @param creature 生物实例
   * @param isPlayer 是否为玩家
   */
  addCreature(creature: Creature, isPlayer: boolean = false): Scheduler {
    const speed = creature.speed ?? 100;
    const budget = Math.floor(speed);

    const entry: ScheduleEntry = {
      creatureId: creature.id,
      budget,
      nextActionTime: this.currentTime,
      priority: isPlayer ? this.config.playerPriorityBonus : 0,
      isActing: false,
    };

    return new Scheduler({
      ...this,
      entries: this.entries.set(creature.id, entry),
    });
  }

  /**
   * 从调度队列移除生物
   * @param creatureId 生物 ID
   */
  removeCreature(creatureId: string): Scheduler {
    return new Scheduler({
      ...this,
      entries: this.entries.delete(creatureId),
    });
  }

  /**
   * 更新生物的速度
   * @param creatureId 生物 ID
   * @param newSpeed 新速度
   */
  updateCreatureSpeed(creatureId: string, newSpeed: number): Scheduler {
    const entry = this.entries.get(creatureId);
    if (!entry) {
      return this;
    }

    const newBudget = Math.floor(newSpeed);
    const updatedEntry: ScheduleEntry = {
      ...entry,
      budget: newBudget,
    };

    return new Scheduler({
      ...this,
      entries: this.entries.set(creatureId, updatedEntry),
    });
  }

  /**
   * 检查生物是否在队列中
   */
  hasCreature(creatureId: string): boolean {
    return this.entries.has(creatureId);
  }

  // ========== 核心调度方法 ==========

  /**
   * 获取下一个行动的生物
   * @returns 生物 ID，如果没有可行动的生物则返回 null
   */
  getNextActor(): string | null {
    // 筛选可行动的生物（预算 > 0）
    const availableEntries = this.entries
      .filter(entry => entry.budget > 0 && !entry.isActing)
      .toList();

    if (availableEntries.isEmpty()) {
      // 没有可行动的生物，需要推进时间
      return null;
    }

    // 按优先级排序（优先级高的先行动）
    // 优先级 = 玩家加成 + 预算（速度快的先行动）
    const sorted = availableEntries.sort((a, b) => {
      const priorityA = a.priority + a.budget;
      const priorityB = b.priority + b.budget;
      return priorityB - priorityA; // 降序
    });

    return sorted.get(0)?.creatureId ?? null;
  }

  /**
   * 消耗生物的行动点
   * @param creatureId 生物 ID
   * @param cost 消耗的行动点
   */
  consumeActionPoints(creatureId: string, cost: number): Scheduler {
    const entry = this.entries.get(creatureId);
    if (!entry) {
      return this;
    }

    const newBudget = Math.max(0, entry.budget - cost);
    const updatedEntry: ScheduleEntry = {
      ...entry,
      budget: newBudget,
      isActing: false, // 行动完成
    };

    return new Scheduler({
      ...this,
      entries: this.entries.set(creatureId, updatedEntry),
      activeCreatureId: null,
    });
  }

  /**
   * 检查生物是否可以行动
   * @param creatureId 生物 ID
   * @param cost 行动点消耗
   */
  canAct(creatureId: string, cost: number = 100): boolean {
    const entry = this.entries.get(creatureId);
    if (!entry) {
      return false;
    }
    return entry.budget >= cost;
  }

  /**
   * 标记生物正在行动
   * @param creatureId 生物 ID
   */
  markActing(creatureId: string): Scheduler {
    const entry = this.entries.get(creatureId);
    if (!entry) {
      return this;
    }

    const updatedEntry: ScheduleEntry = {
      ...entry,
      isActing: true,
    };

    return new Scheduler({
      ...this,
      entries: this.entries.set(creatureId, updatedEntry),
      activeCreatureId: creatureId,
    });
  }

  // ========== 时间推进 ==========

  /**
   * 推进时间
   * @param deltaTime 时间增量（游戏时间单位）
   */
  advanceTime(deltaTime: number): Scheduler {
    const newTime = this.currentTime + deltaTime;
    let newTurn = this.currentTurn;

    // 假设每 1000 时间单位为一回合
    if (Math.floor(newTime / 1000) > Math.floor(this.currentTime / 1000)) {
      newTurn = this.currentTurn + 1;
    }

    // 重置所有生物的预算（基于速度）
    const newEntries = this.entries.map(entry => {
      // 如果预算耗尽，重置预算
      if (entry.budget <= 0) {
        // 这里简化处理，实际应该从 creature 获取速度
        return {
          ...entry,
          budget: 100, // 默认预算
          nextActionTime: newTime,
        };
      }
      return entry;
    });

    return new Scheduler({
      ...this,
      currentTime: newTime,
      currentTurn: newTurn,
      entries: newEntries as Map<string, ScheduleEntry>,
    });
  }

  /**
   * 开始新回合
   * @param map 游戏地图（用于获取生物速度）
   */
  startNewTurn(map: GameMap): Scheduler {
    // 重置所有生物的预算
    const newEntries = this.entries.map(entry => {
      const creature = map.creatures.get(entry.creatureId);
      const speed = creature?.speed ?? 100;
      const budget = Math.floor(speed);

      return {
        ...entry,
        budget,
        isActing: false,
      };
    });

    return new Scheduler({
      ...this,
      entries: newEntries as Map<string, ScheduleEntry>,
      currentTurn: this.currentTurn + 1,
    });
  }

  /**
   * 推进到下一个可行动的生物
   * 如果所有生物都耗尽了预算，开始新回合
   * @param map 游戏地图
   */
  advanceToNextActor(map: GameMap): Scheduler {
    // 检查是否有可行动的生物
    const nextActor = this.getNextActor();

    if (nextActor) {
      return this;
    }

    // 没有可行动的生物，开始新回合
    return this.startNewTurn(map);
  }

  // ========== 延迟事件 ==========

  /**
   * 添加延迟事件
   * @param event 延迟事件
   */
  addDelayedEvent(event: DelayedEvent): Scheduler {
    // 检查是否超过最大数量
    if (this.delayedEvents.size >= this.config.maxDelayedEvents) {
      console.warn('Maximum delayed events reached');
      return this;
    }

    // 按触发时间排序插入
    const index = this.delayedEvents.findIndex(
      e => e.triggerTime > event.triggerTime
    );

    const newEvents = index >= 0
      ? this.delayedEvents.insert(index, event)
      : this.delayedEvents.push(event);

    return new Scheduler({
      ...this,
      delayedEvents: newEvents,
    });
  }

  /**
   * 触发到期的事件
   * @returns 更新后的调度器和触发的事件列表
   */
  triggerEvents(): { scheduler: Scheduler; events: DelayedEvent[] } {
    const triggered: DelayedEvent[] = [];
    const remaining: DelayedEvent[] = [];

    for (const event of this.delayedEvents) {
      if (event.triggerTime <= this.currentTime) {
        triggered.push(event);
      } else {
        remaining.push(event);
      }
    }

    const newScheduler = new Scheduler({
      ...this,
      delayedEvents: List(remaining),
    });

    return { scheduler: newScheduler, events: triggered };
  }

  /**
   * 清理所有延迟事件
   */
  clearDelayedEvents(): Scheduler {
    return new Scheduler({
      ...this,
      delayedEvents: List(),
    });
  }

  // ========== 查询方法 ==========

  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * 获取当前回合
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * 获取当前行动的生物
   */
  getActiveCreature(): string | null {
    return this.activeCreatureId;
  }

  /**
   * 获取生物的行动预算
   */
  getCreatureBudget(creatureId: string): number {
    return this.entries.get(creatureId)?.budget ?? 0;
  }

  /**
   * 获取所有待行动的生物
   */
  getAvailableActors(): List<string> {
    return this.entries
      .filter(entry => entry.budget > 0 && !entry.isActing)
      .map(entry => entry.creatureId)
      .toList();
  }

  /**
   * 获取已耗尽预算的生物
   */
  getExhaustedActors(): List<string> {
    return this.entries
      .filter(entry => entry.budget <= 0)
      .map(entry => entry.creatureId)
      .toList();
  }

  /**
   * 检查是否所有生物都耗尽了预算
   */
  isAllExhausted(): boolean {
    return this.entries.every(entry => entry.budget <= 0);
  }

  /**
   * 获取延迟事件数量
   */
  getDelayedEventCount(): number {
    return this.delayedEvents.size;
  }

  /**
   * 获取下一个即将触发的事件
   */
  getNextEvent(): DelayedEvent | null {
    return this.delayedEvents.first() ?? null;
  }

  /**
   * 获取下次事件触发时间
   */
  getNextEventTime(): number | null {
    const nextEvent = this.getNextEvent();
    return nextEvent?.triggerTime ?? null;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      currentTime: this.currentTime,
      currentTurn: this.currentTurn,
      activeCreatureId: this.activeCreatureId,
      entries: this.entries.toObject(),
      delayedEvents: this.delayedEvents.toArray(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>, config?: Partial<SchedulerConfig>): Scheduler {
    const schedulerConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config };

    return new Scheduler({
      currentTime: json.currentTime as number,
      currentTurn: json.currentTurn as number,
      activeCreatureId: json.activeCreatureId as string | null,
      entries: Map(json.entries as Record<string, ScheduleEntry>),
      delayedEvents: List(json.delayedEvents as DelayedEvent[]),
      config: schedulerConfig,
    });
  }
}
