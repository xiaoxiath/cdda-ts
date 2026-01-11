/**
 * GameLoop - 游戏循环
 *
 * 管理游戏的主循环，处理输入、更新和渲染
 */

import { GameState } from './GameState';

/**
 * 游戏动作类型
 */
export enum GameAction {
  MOVE_N = 'move_n',
  MOVE_NE = 'move_ne',
  MOVE_E = 'move_e',
  MOVE_SE = 'move_se',
  MOVE_S = 'move_s',
  MOVE_SW = 'move_sw',
  MOVE_W = 'move_w',
  MOVE_NW = 'move_nw',
  MOVE_UP = 'move_up',
  MOVE_DOWN = 'move_down',
  WAIT = 'wait',
  QUIT = 'quit',
  DEBUG = 'debug',
}

/**
 * 输入处理函数类型
 */
export type InputHandler = () => Promise<GameAction>;

/**
 * 渲染函数类型
 */
export type RenderHandler = (state: GameState) => void | Promise<void>;

/**
 * 游戏循环配置
 */
export interface GameLoopConfig {
  readonly fps?: number;
  readonly turnBased?: boolean;
}

/**
 * 游戏循环类
 *
 * 管理游戏的主循环
 */
export class GameLoop {
  private state: GameState;
  private running: boolean = false;
  private inputHandler: InputHandler;
  private renderHandler: RenderHandler;
  private config: GameLoopConfig;

  constructor(
    initialState: GameState,
    inputHandler: InputHandler,
    renderHandler: RenderHandler,
    config: GameLoopConfig = {}
  ) {
    this.state = initialState;
    this.inputHandler = inputHandler;
    this.renderHandler = renderHandler;
    this.config = {
      fps: 60,
      turnBased: true,
      ...config,
    };
  }

  /**
   * 启动游戏循环
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('GameLoop is already running');
      return;
    }

    this.running = true;

    // 初始渲染
    await this.renderHandler(this.state);

    // 主循环
    while (this.running && !this.state.isGameOver()) {
      await this.loop();
    }

    // 游戏结束
    if (this.state.isGameOver()) {
      await this.onGameOver();
    }
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 主循环
   */
  private async loop(): Promise<void> {
    if (this.config.turnBased) {
      // 回合制模式：等待输入 -> 更新 -> 渲染
      await this.turnBasedLoop();
    } else {
      // 实时模式：更新 -> 渲染 -> 控制帧率
      await this.realTimeLoop();
    }
  }

  /**
   * 回合制循环
   */
  private async turnBasedLoop(): Promise<void> {
    // 1. 等待输入
    const action = await this.inputHandler();

    // 2. 处理动作
    this.state = this.executeAction(action);

    // 3. 检查退出
    if (action === GameAction.QUIT) {
      this.stop();
      return;
    }

    // 4. 处理回合
    if (!this.state.isGameOver()) {
      this.state = this.state.processTurn();
    }

    // 5. 渲染
    await this.renderHandler(this.state);
  }

  /**
   * 实时循环（未来实现）
   */
  private async realTimeLoop(): Promise<void> {
    // TODO: 实现实时游戏循环
    console.warn('Real-time loop not implemented yet');
    await this.turnBasedLoop();
  }

  /**
   * 执行游戏动作
   */
  private executeAction(action: GameAction): GameState {
    switch (action) {
      case GameAction.MOVE_N:
        return this.state.movePlayer(0, -1, 0);
      case GameAction.MOVE_NE:
        return this.state.movePlayer(1, -1, 0);
      case GameAction.MOVE_E:
        return this.state.movePlayer(1, 0, 0);
      case GameAction.MOVE_SE:
        return this.state.movePlayer(1, 1, 0);
      case GameAction.MOVE_S:
        return this.state.movePlayer(0, 1, 0);
      case GameAction.MOVE_SW:
        return this.state.movePlayer(-1, 1, 0);
      case GameAction.MOVE_W:
        return this.state.movePlayer(-1, 0, 0);
      case GameAction.MOVE_NW:
        return this.state.movePlayer(-1, -1, 0);
      case GameAction.MOVE_UP:
        return this.state.movePlayer(0, 0, 1);
      case GameAction.MOVE_DOWN:
        return this.state.movePlayer(0, 0, -1);
      case GameAction.WAIT:
        return this.state.wait();
      case GameAction.QUIT:
        return this.state.addMessage('游戏结束。');
      case GameAction.DEBUG:
        return this.state.addMessage(`调试信息: 回合 ${this.state.turn}, 位置 (${this.state.player.position.x}, ${this.state.player.position.y})`);
      default:
        return this.state;
    }
  }

  /**
   * 游戏结束处理
   */
  private async onGameOver(): Promise<void> {
    console.log('\n=== 游戏结束 ===');
    console.log(`存活回合: ${this.state.turn}`);
    console.log(`死亡原因: ${this.getDeathMessage()}`);

    // 最后一次渲染
    await this.renderHandler(this.state);
  }

  /**
   * 获取死亡原因
   */
  private getDeathMessage(): string {
    if (this.state.player.isDead()) {
      const headHP = this.state.player.getHP(0); // BodyPartId.HEAD
      const torsoHP = this.state.player.getHP(1); // BodyPartId.TORSO

      if (headHP !== undefined && headHP <= 0) {
        return '头部受到致命伤害';
      }
      if (torsoHP !== undefined && torsoHP <= 0) {
        return '躯干受到致命伤害';
      }
    }

    return '未知原因';
  }

  /**
   * 获取当前游戏状态
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * 更新游戏状态
   */
  setState(state: GameState): void {
    this.state = state;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.running;
  }
}
