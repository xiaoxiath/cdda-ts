/**
 * TurnManager - 回合管理器
 *
 * 统一管理游戏回合处理
 * 协调调度器、生物行动、AI 处理和效果系统
 *
 * 核心功能：
 * - 协调所有生物的行动顺序
 * - 处理 AI 决策和行动
 * - 更新游戏效果（饥饿、疲劳、毒药等）
 * - 管理战斗和交互
 */

import type { GameMap } from '../map/GameMap';
import type { Creature } from '../creature/Creature';
import type { Avatar } from '../creature/Avatar';
import type { NPC } from '../creature/NPC';
import { Scheduler } from './Scheduler';
import type { ScheduleEntry } from './Scheduler';
import type { ActionPointSystem, ActionType } from './ActionPointSystem';

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 回合结果
 */
export interface TurnResult {
  /** 更新后的地图 */
  readonly map: GameMap;
  /** 更新后的调度器 */
  readonly scheduler: Scheduler;
  /** 处理的生物数量 */
  readonly processedCount: number;
  /** 生成的消息 */
  readonly messages: string[];
  /** 回合是否完成 */
  readonly turnComplete: boolean;
}

/**
 * 行动结果
 */
export interface ActionResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 消耗的行动点 */
  readonly cost: number;
  /** 生成的消息 */
  readonly messages: string[];
  /** 更新后的地图 */
  readonly map: GameMap;
  /** 更新后的生物 */
  readonly creature?: Creature;
}

/**
 * 生物行动数据
 */
export interface CreatureActionData {
  /** 生物实例 */
  readonly creature: Creature;
  /** 行动类型 */
  readonly actionType: ActionType;
  /** 目标位置（可选） */
  readonly targetPosition?: any; // Tripoint
  /** 目标生物（可选） */
  readonly targetCreature?: string;
  /** 行动数据（可选） */
  readonly actionData?: Record<string, any>;
}

/**
 * 回合管理器属性（内部）
 */
interface TurnManagerProps {
  readonly scheduler: Scheduler;
  readonly processingOrder: string[];
  readonly currentCreatureIndex: number;
}

/**
 * TurnManager - 回合管理器
 *
 * 使用不可变数据结构管理回合处理
 */
export class TurnManager {
  readonly scheduler!: Scheduler;
  readonly processingOrder!: string[];
  readonly currentCreatureIndex!: number;

  private constructor(props: TurnManagerProps) {
    this.scheduler = props.scheduler;
    this.processingOrder = props.processingOrder;
    this.currentCreatureIndex = props.currentCreatureIndex;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建回合管理器
   * @param scheduler 调度器
   */
  static create(scheduler: Scheduler): TurnManager {
    return new TurnManager({
      scheduler,
      processingOrder: [],
      currentCreatureIndex: 0,
    });
  }

  /**
   * 从调度器创建回合管理器（初始化生物队列）
   * @param scheduler 调度器
   * @param map 游戏地图
   */
  static initialize(scheduler: Scheduler, map: GameMap): TurnManager {
    // 添加所有生物到调度器
    let initializedScheduler = scheduler;

    for (const [creatureId, creature] of map.creatures) {
      // 假设是 Avatar 类型的就是玩家
      const isPlayer = (creature as any).constructor.name === 'Avatar';
      initializedScheduler = initializedScheduler.addCreature(creature, isPlayer);
    }

    // 确定初始行动顺序
    const order = TurnManager.determineActionOrder(initializedScheduler, map);

    return new TurnManager({
      scheduler: initializedScheduler,
      processingOrder: order,
      currentCreatureIndex: 0,
    });
  }

  // ========== 核心回合处理 ==========

  /**
   * 处理完整回合
   * @param map 游戏地图
   * @param playerAction 玩家行动（如果有）
   */
  processTurn(map: GameMap, playerAction?: CreatureActionData): TurnResult {
    let currentMap = map;
    let currentScheduler = this.scheduler;
    const messages: string[] = [];
    let processedCount = 0;

    // 如果有玩家行动，先处理玩家
    if (playerAction) {
      const playerResult = this.processCreatureAction(currentMap, playerAction);
      currentMap = playerResult.map;
      currentScheduler = playerResult.scheduler;
      messages.push(...playerResult.messages);
      processedCount++;
    }

    // 处理所有 NPC 的行动
    const npcResult = this.processAllNPCs(currentMap, currentScheduler);
    currentMap = npcResult.map;
    currentScheduler = npcResult.scheduler;
    messages.push(...npcResult.messages);
    processedCount += npcResult.processedCount;

    // 处理游戏效果（饥饿、疲劳等）
    const effectsResult = this.processEffects(currentMap);
    currentMap = effectsResult.map;
    messages.push(...effectsResult.messages);

    // 触发延迟事件
    const eventsResult = currentScheduler.triggerEvents();
    currentScheduler = eventsResult.scheduler;
    for (const event of eventsResult.events) {
      const result = event.callback(currentMap);
      currentMap = result;
      messages.push(`事件触发: ${event.type}`);
    }

    // 检查是否需要开始新回合
    let turnComplete = false;
    if (currentScheduler.isAllExhausted()) {
      currentScheduler = currentScheduler.startNewTurn(currentMap);
      turnComplete = true;
    } else {
      // 推进到下一个行动者
      currentScheduler = currentScheduler.advanceToNextActor(currentMap);
    }

    // 创建新的回合管理器
    const newManager = TurnManager.create(currentScheduler);

    return {
      map: currentMap,
      scheduler: currentScheduler,
      processedCount,
      messages,
      turnComplete,
    };
  }

  /**
   * 处理单个生物的行动
   */
  private processCreatureAction(
    map: GameMap,
    actionData: CreatureActionData
  ): { map: GameMap; scheduler: Scheduler; messages: string[] } {
    const { creature, actionType } = actionData;

    // 检查生物是否可以行动
    if (!this.scheduler.canAct(creature.id, 100)) {
      return {
        map,
        scheduler: this.scheduler,
        messages: [`${creature.name} 无法行动（行动点不足）`],
      };
    }

    // 标记生物正在行动
    let scheduler = this.scheduler.markActing(creature.id);
    let updatedMap = map;
    const messages: string[] = [];

    // 执行行动
    const result = this.executeAction(updatedMap, actionData);
    updatedMap = result.map;
    messages.push(...result.messages);

    // 消耗行动点
    scheduler = scheduler.consumeActionPoints(creature.id, result.cost);

    return { map: updatedMap, scheduler, messages };
  }

  /**
   * 处理所有 NPC 的行动
   */
  private processAllNPCs(
    map: GameMap,
    scheduler: Scheduler
  ): { map: GameMap; scheduler: Scheduler; processedCount: number; messages: string[] } {
    let currentMap = map;
    let currentScheduler = scheduler;
    const messages: string[] = [];
    let processedCount = 0;

    // 获取所有可行动的 NPC（排除玩家）
    const availableActors = currentScheduler.getAvailableActors().filter(id => {
      const creature = currentMap.creatures.get(id);
      return creature && !creature.isAvatar();
    });

    for (const creatureId of availableActors) {
      const creature = currentMap.creatures.get(creatureId);
      if (!creature || creature.isAvatar()) continue;

      // 处理 NPC AI
      if (creature.isNPC()) {
        const npc = creature as NPC;
        const result = this.processNPCAI(currentMap, currentScheduler, npc);
        currentMap = result.map;
        currentScheduler = result.scheduler;
        messages.push(...result.messages);
        processedCount++;
      }
    }

    return { map: currentMap, scheduler: currentScheduler, processedCount, messages };
  }

  /**
   * 处理 NPC AI
   */
  private processNPCAI(
    map: GameMap,
    scheduler: Scheduler,
    npc: NPC
  ): { map: GameMap; scheduler: Scheduler; messages: string[] } {
    const messages: string[] = [];

    // 检查 NPC 是否可以行动
    if (!scheduler.canAct(npc.id)) {
      return { map, scheduler, messages: [`${npc.name} 行动点不足`] };
    }

    // 调用 NPC 的 AI 处理
    try {
      // 假设 NPC 有 processTurn 方法
      npc.processTurn?.();
      messages.push(`${npc.name} 执行了行动`);
    } catch (error) {
      messages.push(`${npc.name} 行动处理出错: ${error}`);
    }

    // 消耗行动点（NPC 默认消耗 100）
    const updatedScheduler = scheduler.consumeActionPoints(npc.id, 100);

    return { map, scheduler: updatedScheduler, messages };
  }

  /**
   * 执行具体行动
   */
  private executeAction(
    map: GameMap,
    actionData: CreatureActionData
  ): ActionResult {
    const { creature, actionType, targetPosition, targetCreature } = actionData;

    switch (actionType) {
      case 'move':
      case 'move_diagonal':
      case 'move_up':
      case 'move_down':
        return this.executeMove(map, creature, targetPosition);

      case 'attack':
        return this.executeAttack(map, creature, targetCreature);

      case 'wait':
        return this.executeWait(map, creature);

      case 'pickup':
        return this.executePickup(map, creature);

      case 'drop':
        return this.executeDrop(map, creature);

      case 'use_item':
        return this.executeUseItem(map, creature);

      default:
        return {
          success: false,
          cost: 0,
          messages: [`未知行动类型: ${actionType}`],
          map,
        };
    }
  }

  // ========== 行动执行方法 ==========

  /**
   * 执行移动
   */
  private executeMove(
    map: GameMap,
    creature: Creature,
    targetPosition?: any
  ): ActionResult {
    if (!targetPosition) {
      return {
        success: false,
        cost: 0,
        messages: ['移动需要目标位置'],
        map,
      };
    }

    // TODO: 检查目标位置是否可行（需要实现 isPassable 方法）
    // if (!map.isPassable(targetPosition)) {
    //   return {
    //     success: false,
    //     cost: 0,
    //     messages: [`${creature.name} 无法移动到目标位置`],
    //     map,
    //   };
    // }

    // 更新生物位置
    const updatedMap = map.updateCreaturePosition(creature.id, targetPosition);

    return {
      success: true,
      cost: 100,
      messages: [`${creature.name} 移动到 (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`],
      map: updatedMap,
    };
  }

  /**
   * 执行攻击
   */
  private executeAttack(
    map: GameMap,
    creature: Creature,
    targetCreatureId?: string
  ): ActionResult {
    if (!targetCreatureId) {
      return {
        success: false,
        cost: 0,
        messages: ['攻击需要目标'],
        map,
      };
    }

    const target = map.creatures.get(targetCreatureId);
    if (!target) {
      return {
        success: false,
        cost: 0,
        messages: ['目标不存在'],
        map,
      };
    }

    // TODO: 实现战斗系统
    return {
      success: true,
      cost: 100,
      messages: [`${creature.name} 攻击了 ${target.name}`],
      map,
    };
  }

  /**
   * 执行等待
   */
  private executeWait(map: GameMap, creature: Creature): ActionResult {
    return {
      success: true,
      cost: 100,
      messages: [`${creature.name} 等待了一回合`],
      map,
    };
  }

  /**
   * 执行拾取
   */
  private executePickup(map: GameMap, creature: Creature): ActionResult {
    // TODO: 实现物品拾取
    return {
      success: true,
      cost: 50,
      messages: [`${creature.name} 拾取了物品`],
      map,
    };
  }

  /**
   * 执行放下
   */
  private executeDrop(map: GameMap, creature: Creature): ActionResult {
    // TODO: 实现物品放下
    return {
      success: true,
      cost: 50,
      messages: [`${creature.name} 放下了物品`],
      map,
    };
  }

  /**
   * 执行使用物品
   */
  private executeUseItem(map: GameMap, creature: Creature): ActionResult {
    // TODO: 实现物品使用
    return {
      success: true,
      cost: 100,
      messages: [`${creature.name} 使用了物品`],
      map,
    };
  }

  // ========== 效果处理 ==========

  /**
   * 处理游戏效果
   */
  private processEffects(map: GameMap): { map: GameMap; messages: string[] } {
    const messages: string[] = [];

    // TODO: 实现效果系统
    // - 饥饿增加
    // - 疲劳增加
    // - 毒素伤害
    // - 血液流失
    // - 等等

    return { map, messages };
  }

  // ========== 辅助方法 ==========

  /**
   * 确定行动顺序
   */
  private static determineActionOrder(
    scheduler: Scheduler,
    map: GameMap
  ): string[] {
    // 按速度和优先级排序
    const entries: Array<{ id: string; speed: number; priority: number }> = [];

    for (const [creatureId, creature] of map.creatures) {
      const entry = scheduler.entries.get(creatureId);
      if (!entry) continue;

      entries.push({
        id: creatureId,
        speed: 100, // 默认速度
        priority: entry.priority,
      });
    }

    // 按优先级和速度排序
    entries.sort((a, b) => {
      // 优先级高的先行动
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 速度快的先行动
      return b.speed - a.speed;
    });

    return entries.map(e => e.id);
  }

  /**
   * 检查回合是否完成
   */
  isTurnComplete(): boolean {
    return this.scheduler.isAllExhausted();
  }

  /**
   * 获取下一个行动者
   */
  getNextActor(map: GameMap): Creature | null {
    const actorId = this.scheduler.getNextActor();
    if (!actorId) {
      return null;
    }
    return map.creatures.get(actorId) ?? null;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      scheduler: this.scheduler.toJson(),
      processingOrder: this.processingOrder,
      currentCreatureIndex: this.currentCreatureIndex,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): TurnManager {
    const scheduler = Scheduler.fromJson(json.scheduler);

    return new TurnManager({
      scheduler,
      processingOrder: json.processingOrder as string[],
      currentCreatureIndex: json.currentCreatureIndex as number,
    });
  }
}
