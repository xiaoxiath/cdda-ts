/**
 * GameState - 游戏状态
 *
 * 管理游戏的核心状态，包括地图、玩家、生物等
 */

import { GameMap } from '../map/GameMap';
import { Avatar } from '../creature/Avatar';
import { Tripoint } from '../coordinates/Tripoint';

/**
 * 游戏状态属性
 */
export interface GameStateProps {
  readonly map: GameMap;
  readonly player: Avatar;
  readonly turn: number;
  readonly messages: string[];
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

  constructor(props: GameStateProps) {
    this.map = props.map;
    this.player = props.player;
    this.turn = props.turn;
    this.messages = props.messages;
  }

  /**
   * 创建初始游戏状态
   */
  static create(map: GameMap, player: Avatar): GameState {
    return new GameState({
      map,
      player,
      turn: 0,
      messages: ['欢迎来到 Cataclysm-DDA TypeScript 版本！'],
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
      z: this.player.position.z + dz,
    });

    // 克隆玩家以保持不可变性
    // 直接创建新玩家实例而不是使用 moveTo（避免修改原对象）
    const updatedPlayer = new Avatar(
      this.player.id,
      newPos, // 直接使用新位置
      this.player.name,
      { ...this.player.stats } // 克隆属性
    );

    // 更新地图中的生物
    const updatedMap = this.map.updateCreaturePosition(this.player.id, newPos);

    // 检查新位置是否有效（可选警告）
    const tile = this.map.getTile(newPos);
    if (!tile) {
      // 移动到未知区域，添加警告消息
      return new GameState({
        map: updatedMap,
        player: updatedPlayer,
        turn: this.turn + 1,
        messages: [...this.messages, '警告：进入未知区域'],
      });
    }

    return new GameState({
      map: updatedMap,
      player: updatedPlayer,
      turn: this.turn + 1,
      messages: this.messages,
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
    });
  }

  /**
   * 添加消息
   */
  addMessage(message: string): GameState {
    const maxMessages = 100; // 最多保存 100 条消息
    const newMessages = [...this.messages, message].slice(-maxMessages);

    return new GameState({
      map: this.map,
      player: this.player,
      turn: this.turn,
      messages: newMessages,
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
   * 更新所有生物的 AI、效果等
   */
  processTurn(): GameState {
    let newState = this;

    // 处理所有 NPC 的 AI
    for (const creature of this.map.getAllCreatures()) {
      if (creature.isNPC()) {
        // TODO: 实现 NPC AI
        // newState = this.processNPCAI(creature, newState);
      }
    }

    // 处理玩家效果（饥饿、疲劳等）
    // TODO: 实现效果处理

    return newState;
  }
}
