/**
 * GameState - 游戏状态
 *
 * 管理游戏的核心状态，包括地图、玩家、生物等
 * 集成调度器和回合管理器，实现基于速度的行动点系统
 */

import { GameMap } from '../map/GameMap';
import { Avatar } from '../creature/Avatar';
import { Tripoint } from '../coordinates/Tripoint';
import { Scheduler } from './Scheduler';
import { TurnManager, CreatureActionData } from './TurnManager';
import { EventQueue } from './EventQueue';
import { ActionType } from './ActionPointSystem';

/**
 * 游戏状态属性
 */
export interface GameStateProps {
  readonly map: GameMap;
  readonly player: Avatar;
  readonly turn: number;
  readonly messages: string[];
  readonly scheduler?: Scheduler;
  readonly turnManager?: TurnManager;
  readonly eventQueue?: EventQueue;
}

/**
 * 游戏状态类
 *
 * 使用不可变模式管理游戏状态
 */
export class GameState {
  public readonly map: GameMap;
  public readonly player: Avatar;
  public readonly turn: number;
  public readonly messages: string[];
  public readonly scheduler!: Scheduler;
  public readonly turnManager!: TurnManager;
  public readonly eventQueue!: EventQueue;

  constructor(props: GameStateProps) {
    this.map = props.map;
    this.player = props.player;
    this.turn = props.turn;
    this.messages = props.messages;

    // 初始化调度器（如果未提供）
    this.scheduler = props.scheduler ?? Scheduler.create();
    // 初始化回合管理器（如果未提供）
    this.turnManager = props.turnManager ?? TurnManager.create(this.scheduler);
    // 初始化事件队列（如果未提供）
    this.eventQueue = props.eventQueue ?? EventQueue.create();
  }

  /**
   * 创建初始游戏状态
   */
  static create(map: GameMap, player: Avatar): GameState {
    const scheduler = Scheduler.create();
    // 使用基本的 TurnManager 而不是 initialize（需要完整的 GameMap 实现）
    const turnManager = TurnManager.create(scheduler);
    const eventQueue = EventQueue.create();

    return new GameState({
      map,
      player,
      turn: 0,
      messages: ['欢迎来到 Cataclysm-DDA TypeScript 版本！'],
      scheduler,
      turnManager,
      eventQueue,
    });
  }

  /**
   * 移动玩家
   *
   * @param dx - X 方向偏移
   * @param dy - Y 方向偏移
   * @returns 新的游戏状态
   */
  movePlayer(dx: number, dy: number, dz: number = 0): GameState {
    const newPos = new Tripoint({
      x: this.player.position.x + dx,
      y: this.player.position.y + dy,
      z: this.player.z + dz,
    });

    // 克隆玩家以保持不可变性
    const updatedPlayer = new Avatar(
      this.player.id,
      newPos,
      this.player.name,
      { ...this.player.stats }
    );

    // 更新地图中的生物
    const updatedMap = this.map.updateCreaturePosition(this.player.id, newPos);

    // 检查新位置是否有效
    const tile = this.map.getTile(newPos);
    const newMessages = tile
      ? this.messages
      : [...this.messages, '警告：进入未知区域'];

    return new GameState({
      map: updatedMap,
      player: updatedPlayer,
      turn: this.turn + 1,
      messages: newMessages,
      scheduler: this.scheduler,
      turnManager: this.turnManager,
      eventQueue: this.eventQueue,
    });
  }

  /**
   * 等待一回合
   */
  wait(): GameState {
    return new GameState({
      map: this.map,
      player: this.player,
      turn: this.turn + 1,
      messages: this.messages,
      scheduler: this.scheduler,
      turnManager: this.turnManager,
      eventQueue: this.eventQueue,
    });
  }

  /**
   * 添加消息
   */
  addMessage(message: string): GameState {
    const maxMessages = 100;
    const newMessages = [...this.messages, message].slice(-maxMessages);

    return new GameState({
      map: this.map,
      player: this.player,
      turn: this.turn,
      messages: newMessages,
      scheduler: this.scheduler,
      turnManager: this.turnManager,
      eventQueue: this.eventQueue,
    });
  }

  /**
   * 获取最近的 N 条消息
   */
  getRecentMessages(count: number = 10): string[] {
    return this.messages.slice(-count);
  }

  /**
   * 检查游戏是否结束
   */
  isGameOver(): boolean {
    return this.player.isDead();
  }

  /**
   * 处理回合
   *
   * 使用调度器和回合管理器处理所有生物的行动
   * 包括 NPC AI、效果系统、延迟事件等
   */
  processTurn(): GameState {
    // 使用回合管理器处理回合
    const turnResult = this.turnManager.processTurn(this.map);

    // 更新事件队列
    const eventQueueResult = this.eventQueue.update(100, turnResult.map);

    // 合并所有消息
    const allMessages = [
      ...this.messages,
      ...turnResult.messages,
      ...eventQueueResult.triggeredEvents.map(e => e.name),
    ];

    return new GameState({
      map: eventQueueResult.map,
      player: this.player,
      turn: turnResult.turnComplete ? this.turn + 1 : this.turn,
      messages: allMessages,
      scheduler: turnResult.scheduler,
      turnManager: TurnManager.create(turnResult.scheduler),
      eventQueue: eventQueueResult.queue,
    });
  }

  /**
   * 处理玩家行动
   *
   * @param actionType 行动类型
   * @param targetPosition 目标位置（可选）
   * @param targetCreature 目标生物（可选）
   */
  processPlayerAction(
    actionType: ActionType,
    targetPosition?: Tripoint,
    targetCreature?: string
  ): GameState {
    const actionData: CreatureActionData = {
      creature: this.player,
      actionType,
      targetPosition,
      targetCreature,
    };

    const turnResult = this.turnManager.processTurn(this.map, actionData);

    const newMessages = [
      ...this.messages,
      ...turnResult.messages,
    ];

    return new GameState({
      map: turnResult.map,
      player: this.player,
      turn: turnResult.turnComplete ? this.turn + 1 : this.turn,
      messages: newMessages,
      scheduler: turnResult.scheduler,
      turnManager: TurnManager.create(turnResult.scheduler),
      eventQueue: this.eventQueue,
    });
  }

  /**
   * 获取当前行动的生物
   */
  getCurrentActor(): string | null {
    return this.turnManager.getNextActor(this.map)?.id ?? null;
  }

  /**
   * 检查是否是玩家回合
   */
  isPlayerTurn(): boolean {
    const actorId = this.getCurrentActor();
    return actorId === this.player.id;
  }

  /**
   * 获取游戏时间
   */
  getGameTime(): number {
    return this.scheduler.getCurrentTime();
  }

  /**
   * 获取事件队列
   */
  getEventQueue(): EventQueue {
    return this.eventQueue;
  }

  /**
   * 添加延迟事件
   */
  addDelayedEvent(
    name: string,
    delay: number,
    callback: (map: GameMap, data: Record<string, any>) => { map: GameMap; result?: any },
    data: Record<string, any> = {}
  ): GameState {
    const updatedQueue = this.eventQueue.addDelayedEvent(name, delay, callback, 0, data);

    return new GameState({
      map: this.map,
      player: this.player,
      turn: this.turn,
      messages: this.messages,
      scheduler: this.scheduler,
      turnManager: this.turnManager,
      eventQueue: updatedQueue,
    });
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      turn: this.turn,
      messages: this.messages,
      player: {
        id: this.player.id,
        name: this.player.name,
        position: this.player.position,
      },
      scheduler: this.scheduler.toJson(),
      turnManager: this.turnManager.toJson(),
      eventQueue: this.eventQueue.toJson(),
    };
  }
}
