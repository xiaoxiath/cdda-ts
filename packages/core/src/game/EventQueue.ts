/**
 * EventQueue - 事件队列
 *
 * 管理游戏中的延迟事件和计划事件
 * 支持基于时间的触发和条件触发
 *
 * 核心功能：
 * - 延迟事件（一段时间后触发）
 * - 周期性事件（每隔一段时间触发）
 * - 条件事件（满足条件时触发）
 * - 优先级系统
 */

import { List, Map } from 'immutable';
import type { GameMap } from '../map/GameMap';
import type { Tripoint } from '../coordinates/Tripoint';

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 事件 ID (Brand Type)
 */
export type EventId = string & { readonly __brand: unique symbol };

/**
 * 创建事件 ID
 */
export function createEventId(id: string): EventId {
  return id as EventId;
}

/**
 * 事件类型
 */
export enum EventType {
  /** 延迟事件 */
  DELAYED = 'delayed',
  /** 周期性事件 */
  PERIODIC = 'periodic',
  /** 条件事件 */
  CONDITIONAL = 'conditional',
  /** 即时事件 */
  IMMEDIATE = 'immediate',
}

/**
 * 事件优先级
 */
export enum EventPriority {
  /** 低优先级 */
  LOW = 0,
  /** 普通优先级 */
  NORMAL = 1,
  /** 高优先级 */
  HIGH = 2,
  /** 紧急优先级 */
  URGENT = 3,
}

/**
 * 事件状态
 */
export enum EventStatus {
  /** 等待中 */
  PENDING = 'pending',
  /** 已触发 */
  TRIGGERED = 'triggered',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 暂停 */
  PAUSED = 'paused',
}

/**
 * 事件回调函数
 */
export type EventCallback = (map: GameMap, data: Record<string, any>) => {
  map: GameMap;
  result?: any;
};

/**
 * 条件检查函数
 */
export type ConditionCheck = (map: GameMap) => boolean;

/**
 * 基础事件数据
 */
export interface BaseEventData {
  /** 事件 ID */
  readonly id: EventId;
  /** 事件类型 */
  readonly type: EventType;
  /** 事件名称 */
  readonly name: string;
  /** 优先级 */
  readonly priority: EventPriority;
  /** 状态 */
  readonly status: EventStatus;
  /** 创建时间 */
  readonly createdAt: number;
  /** 事件数据 */
  readonly data: Record<string, any>;
}

/**
 * 延迟事件数据
 */
export interface DelayedEventData extends BaseEventData {
  readonly type: EventType.DELAYED;
  /** 触发时间 */
  readonly triggerTime: number;
  /** 回调函数 */
  readonly callback: EventCallback;
}

/**
 * 周期性事件数据
 */
export interface PeriodicEventData extends BaseEventData {
  readonly type: EventType.PERIODIC;
  /** 触发时间 */
  readonly triggerTime: number;
  /** 周期间隔（毫秒） */
  readonly interval: number;
  /** 触发次数（-1 表示无限） */
  readonly maxTriggers: number;
  /** 已触发次数 */
  readonly triggeredCount: number;
  /** 回调函数 */
  readonly callback: EventCallback;
}

/**
 * 条件事件数据
 */
export interface ConditionalEventData extends BaseEventData {
  readonly type: EventType.CONDITIONAL;
  /** 条件检查函数 */
  readonly condition: ConditionCheck;
  /** 回调函数 */
  readonly callback: EventCallback;
  /** 检查间隔（毫秒） */
  readonly checkInterval: number;
  /** 上次检查时间 */
  readonly lastCheckTime: number;
}

/**
 * 即时事件数据
 */
export interface ImmediateEventData extends BaseEventData {
  readonly type: EventType.IMMEDIATE;
  /** 回调函数 */
  readonly callback: EventCallback;
}

/**
 * 事件类型联合
 */
export type GameEvent =
  | DelayedEventData
  | PeriodicEventData
  | ConditionalEventData
  | ImmediateEventData;

/**
 * 事件队列属性（内部）
 */
interface EventQueueProps {
  readonly events: List<GameEvent>;
  readonly currentTime: number;
  readonly eventCounter: number;
}

/**
 * EventQueue - 事件队列
 *
 * 使用不可变数据结构管理所有事件
 */
export class EventQueue {
  readonly events!: List<GameEvent>;
  readonly currentTime!: number;
  readonly eventCounter!: number;

  private constructor(props: EventQueueProps) {
    this.events = props.events;
    this.currentTime = props.currentTime;
    this.eventCounter = props.eventCounter;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建事件队列
   */
  static create(): EventQueue {
    return new EventQueue({
      events: List(),
      currentTime: 0,
      eventCounter: 0,
    });
  }

  /**
   * 生成唯一事件 ID
   */
  private generateId(): EventId {
    return createEventId(`event_${Date.now()}_${this.eventCounter}`);
  }

  // ========== 添加事件 ==========

  /**
   * 添加延迟事件
   * @param name 事件名称
   * @param delay 延迟时间（毫秒）
   * @param callback 回调函数
   * @param priority 优先级
   * @param data 事件数据
   */
  addDelayedEvent(
    name: string,
    delay: number,
    callback: EventCallback,
    priority: EventPriority = EventPriority.NORMAL,
    data: Record<string, any> = {}
  ): EventQueue {
    const event: DelayedEventData = {
      id: this.generateId(),
      type: EventType.DELAYED,
      name,
      priority,
      status: EventStatus.PENDING,
      createdAt: this.currentTime,
      triggerTime: this.currentTime + delay,
      callback,
      data,
    };

    return this.insertEvent(event);
  }

  /**
   * 添加周期性事件
   * @param name 事件名称
   * @param interval 周期间隔（毫秒）
   * @param callback 回调函数
   * @param maxTriggers 最大触发次数（-1 表示无限）
   * @param priority 优先级
   * @param data 事件数据
   */
  addPeriodicEvent(
    name: string,
    interval: number,
    callback: EventCallback,
    maxTriggers: number = -1,
    priority: EventPriority = EventPriority.NORMAL,
    data: Record<string, any> = {}
  ): EventQueue {
    const event: PeriodicEventData = {
      id: this.generateId(),
      type: EventType.PERIODIC,
      name,
      priority,
      status: EventStatus.PENDING,
      createdAt: this.currentTime,
      triggerTime: this.currentTime + interval,
      interval,
      maxTriggers,
      triggeredCount: 0,
      callback,
      data,
    };

    return this.insertEvent(event);
  }

  /**
   * 添加条件事件
   * @param name 事件名称
   * @param condition 条件检查函数
   * @param callback 回调函数
   * @param checkInterval 检查间隔（毫秒）
   * @param priority 优先级
   * @param data 事件数据
   */
  addConditionalEvent(
    name: string,
    condition: ConditionCheck,
    callback: EventCallback,
    checkInterval: number = 1000,
    priority: EventPriority = EventPriority.NORMAL,
    data: Record<string, any> = {}
  ): EventQueue {
    const event: ConditionalEventData = {
      id: this.generateId(),
      type: EventType.CONDITIONAL,
      name,
      priority,
      status: EventStatus.PENDING,
      createdAt: this.currentTime,
      condition,
      callback,
      checkInterval,
      lastCheckTime: this.currentTime,
      data,
    };

    return this.insertEvent(event);
  }

  /**
   * 添加即时事件
   * @param name 事件名称
   * @param callback 回调函数
   * @param priority 优先级
   * @param data 事件数据
   */
  addImmediateEvent(
    name: string,
    callback: EventCallback,
    priority: EventPriority = EventPriority.NORMAL,
    data: Record<string, any> = {}
  ): EventQueue {
    const event: ImmediateEventData = {
      id: this.generateId(),
      type: EventType.IMMEDIATE,
      name,
      priority,
      status: EventStatus.PENDING,
      createdAt: this.currentTime,
      callback,
      data,
    };

    return this.insertEvent(event);
  }

  /**
   * 按优先级插入事件
   */
  private insertEvent(event: GameEvent): EventQueue {
    // 按优先级和触发时间排序
    const index = this.events.findIndex(e => {
      // 优先级高的在前
      if (event.priority > e.priority) {
        return true;
      }
      if (event.priority < e.priority) {
        return false;
      }
      // 优先级相同，触发时间早的在前
      if ('triggerTime' in event && 'triggerTime' in e) {
        return event.triggerTime < e.triggerTime;
      }
      return false;
    });

    const newEvents = index >= 0
      ? this.events.insert(index, event)
      : this.events.push(event);

    return new EventQueue({
      ...this,
      events: newEvents,
      eventCounter: this.eventCounter + 1,
    });
  }

  // ========== 事件处理 ==========

  /**
   * 更新时间并处理到期事件
   * @param deltaTime 时间增量（毫秒）
   * @param map 游戏地图
   */
  update(deltaTime: number, map: GameMap): {
    queue: EventQueue;
    map: GameMap;
    triggeredEvents: GameEvent[];
  } {
    const newTime = this.currentTime + deltaTime;
    let currentQueue = this as EventQueue;
    let currentMap = map;
    const triggeredEvents: GameEvent[] = [];

    // 处理即时事件
    const immediateResult = currentQueue.processImmediateEvents(currentMap);
    currentQueue = immediateResult.queue;
    currentMap = immediateResult.map;
    triggeredEvents.push(...immediateResult.triggered);

    // 处理延迟事件
    const delayedResult = currentQueue.processDelayedEvents(newTime, currentMap);
    currentQueue = delayedResult.queue;
    currentMap = delayedResult.map;
    triggeredEvents.push(...delayedResult.triggered);

    // 处理周期性事件
    const periodicResult = currentQueue.processPeriodicEvents(newTime, currentMap);
    currentQueue = periodicResult.queue;
    currentMap = periodicResult.map;
    triggeredEvents.push(...periodicResult.triggered);

    // 处理条件事件
    const conditionalResult = currentQueue.processConditionalEvents(newTime, currentMap);
    currentQueue = conditionalResult.queue;
    currentMap = conditionalResult.map;
    triggeredEvents.push(...conditionalResult.triggered);

    // 更新时间
    currentQueue = new EventQueue({
      ...currentQueue,
      currentTime: newTime,
    });

    return { queue: currentQueue, map: currentMap, triggeredEvents };
  }

  /**
   * 处理即时事件
   */
  private processImmediateEvents(map: GameMap): {
    queue: EventQueue;
    map: GameMap;
    triggered: GameEvent[];
  } {
    const immediateEvents = this.events.filter(
      e => e.type === EventType.IMMEDIATE && e.status === EventStatus.PENDING
    );

    if (immediateEvents.isEmpty()) {
      return { queue: this, map, triggered: [] };
    }

    let currentMap = map;
    let currentQueue = this as EventQueue;
    const triggered: GameEvent[] = [];

    for (const event of immediateEvents) {
      const result = event.callback(currentMap, event.data);
      currentMap = result.map;
      triggered.push(event);

      // 标记为已触发
      currentQueue = currentQueue.updateEventStatus(
        event.id,
        EventStatus.TRIGGERED
      ) as EventQueue;
    }

    // 移除已触发的事件
    currentQueue = currentQueue.removeTriggeredEvents() as EventQueue;

    return { queue: currentQueue, map: currentMap, triggered };
  }

  /**
   * 处理延迟事件
   */
  private processDelayedEvents(currentTime: number, map: GameMap): {
    queue: EventQueue;
    map: GameMap;
    triggered: GameEvent[];
  } {
    const readyEvents = this.events.filter(e => {
      return e.type === EventType.DELAYED &&
             e.status === EventStatus.PENDING &&
             e.triggerTime <= currentTime;
    }) as List<DelayedEventData>;

    if (readyEvents.isEmpty()) {
      return { queue: this, map, triggered: [] };
    }

    let currentMap = map;
    let currentQueue = this as EventQueue;
    const triggered: GameEvent[] = [];

    for (const event of readyEvents) {
      const result = event.callback(currentMap, event.data);
      currentMap = result.map;
      triggered.push(event);

      // 标记为已触发
      currentQueue = currentQueue.updateEventStatus(
        event.id,
        EventStatus.TRIGGERED
      ) as EventQueue;
    }

    // 移除已触发的事件
    currentQueue = currentQueue.removeTriggeredEvents() as EventQueue;

    return { queue: currentQueue, map: currentMap, triggered };
  }

  /**
   * 处理周期性事件
   */
  private processPeriodicEvents(currentTime: number, map: GameMap): {
    queue: EventQueue;
    map: GameMap;
    triggered: GameEvent[];
  } {
    const periodicEvents = this.events.filter(
      e => e.type === EventType.PERIODIC && e.status === EventStatus.PENDING
    ) as List<PeriodicEventData>;

    if (periodicEvents.isEmpty()) {
      return { queue: this, map, triggered: [] };
    }

    let currentMap = map;
    let currentQueue = this as EventQueue;
    const triggered: GameEvent[] = [];

    for (const event of periodicEvents) {
      if (event.triggerTime <= currentTime) {
        // 检查是否还有剩余触发次数
        if (event.maxTriggers !== -1 && event.triggeredCount >= event.maxTriggers) {
          currentQueue = currentQueue.updateEventStatus(
            event.id,
            EventStatus.TRIGGERED
          ) as EventQueue;
          continue;
        }

        // 触发事件
        const result = event.callback(currentMap, event.data);
        currentMap = result.map;
        triggered.push(event);

        // 更新触发次数和下次触发时间
        const updatedEvent: PeriodicEventData = {
          ...event,
          triggeredCount: event.triggeredCount + 1,
          triggerTime: currentTime + event.interval,
        };

        // 如果达到最大触发次数，标记为已触发
        if (event.maxTriggers !== -1 && event.triggeredCount + 1 >= event.maxTriggers) {
          currentQueue = currentQueue.updateEventStatus(
            event.id,
            EventStatus.TRIGGERED
          ) as EventQueue;
        } else {
          // 更新事件
          currentQueue = currentQueue.replaceEvent(updatedEvent) as EventQueue;
        }
      }
    }

    // 移除已触发的事件
    currentQueue = currentQueue.removeTriggeredEvents() as EventQueue;

    return { queue: currentQueue, map: currentMap, triggered };
  }

  /**
   * 处理条件事件
   */
  private processConditionalEvents(currentTime: number, map: GameMap): {
    queue: EventQueue;
    map: GameMap;
    triggered: GameEvent[];
  } {
    const conditionalEvents = this.events.filter(
      e => e.type === EventType.CONDITIONAL && e.status === EventStatus.PENDING
    ) as List<ConditionalEventData>;

    if (conditionalEvents.isEmpty()) {
      return { queue: this, map, triggered: [] };
    }

    let currentMap = map;
    let currentQueue = this as EventQueue;
    const triggered: GameEvent[] = [];

    for (const event of conditionalEvents) {
      // 检查是否需要检查条件
      if (currentTime - event.lastCheckTime >= event.checkInterval) {
        // 更新上次检查时间
        const updatedEvent: ConditionalEventData = {
          ...event,
          lastCheckTime: currentTime,
        };
        currentQueue = currentQueue.replaceEvent(updatedEvent) as EventQueue;

        // 检查条件
        if (event.condition(currentMap)) {
          // 条件满足，触发事件
          const result = event.callback(currentMap, event.data);
          currentMap = result.map;
          triggered.push(event);

          // 标记为已触发
          currentQueue = currentQueue.updateEventStatus(
            event.id,
            EventStatus.TRIGGERED
          ) as EventQueue;
        }
      }
    }

    // 移除已触发的事件
    currentQueue = currentQueue.removeTriggeredEvents() as EventQueue;

    return { queue: currentQueue, map: currentMap, triggered };
  }

  // ========== 事件管理 ==========

  /**
   * 取消事件
   * @param eventId 事件 ID
   * @returns 更新后的队列，如果事件不存在则返回原队列
   */
  cancelEvent(eventId: EventId): EventQueue {
    return this.updateEventStatus(eventId, EventStatus.CANCELLED) ?? this;
  }

  /**
   * 暂停事件
   * @param eventId 事件 ID
   * @returns 更新后的队列，如果事件不存在则返回原队列
   */
  pauseEvent(eventId: EventId): EventQueue {
    return this.updateEventStatus(eventId, EventStatus.PAUSED) ?? this;
  }

  /**
   * 恢复事件
   * @param eventId 事件 ID
   * @returns 更新后的队列，如果事件不存在则返回原队列
   */
  resumeEvent(eventId: EventId): EventQueue {
    return this.updateEventStatus(eventId, EventStatus.PENDING) ?? this;
  }

  /**
   * 更新事件状态
   */
  private updateEventStatus(eventId: EventId, status: EventStatus): EventQueue | null {
    const index = this.events.findIndex(e => e.id === eventId);
    if (index < 0) {
      return null;
    }

    const event = this.events.get(index);
    if (!event) {
      return null;
    }

    const updatedEvent = { ...event, status };
    const newEvents = this.events.set(index, updatedEvent);

    return new EventQueue({
      ...this,
      events: newEvents,
    });
  }

  /**
   * 替换事件
   */
  private replaceEvent(event: GameEvent): EventQueue | null {
    const index = this.events.findIndex(e => e.id === event.id);
    if (index < 0) {
      return null;
    }

    const newEvents = this.events.set(index, event);

    return new EventQueue({
      ...this,
      events: newEvents,
    });
  }

  /**
   * 移除已触发的事件
   */
  private removeTriggeredEvents(): EventQueue {
    const activeEvents = this.events.filter(
      e => e.status !== EventStatus.TRIGGERED && e.status !== EventStatus.CANCELLED
    );

    return new EventQueue({
      ...this,
      events: activeEvents.toList(),
    });
  }

  /**
   * 清空所有事件
   */
  clear(): EventQueue {
    return new EventQueue({
      ...this,
      events: List(),
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
   * 获取事件数量
   */
  getEventCount(): number {
    return this.events.size;
  }

  /**
   * 获取待处理事件数量
   */
  getPendingEventCount(): number {
    return this.events.filter(e => e.status === EventStatus.PENDING).size;
  }

  /**
   * 获取事件
   */
  getEvent(eventId: EventId): GameEvent | undefined {
    return this.events.find(e => e.id === eventId);
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): List<GameEvent> {
    return this.events;
  }

  /**
   * 按类型获取事件
   */
  getEventsByType(type: EventType): List<GameEvent> {
    return this.events.filter(e => e.type === type).toList();
  }

  /**
   * 按优先级获取事件
   */
  getEventsByPriority(priority: EventPriority): List<GameEvent> {
    return this.events.filter(e => e.priority === priority).toList();
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      currentTime: this.currentTime,
      eventCounter: this.eventCounter,
      events: this.events.toArray(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): EventQueue {
    return new EventQueue({
      currentTime: json.currentTime as number,
      eventCounter: json.eventCounter as number,
      events: List(json.events as GameEvent[]),
    });
  }
}
