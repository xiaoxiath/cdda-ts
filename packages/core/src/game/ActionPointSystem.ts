/**
 * ActionPointSystem - 行动点系统
 *
 * 参考 Cataclysm-DDA 的速度-行动点机制
 *
 * 核心概念：
 * - 速度（Speed）：决定每回合可以行动的次数
 * - 移动点（Moves）：实际可用的行动点数
 * - 行动预算：当前回合剩余的点数
 * - 行动消耗：不同动作消耗不同的点数
 *
 * 速度转换公式（CDDA）：
 * - 移动点 = 速度 / 100
 * - 例如：速度 100 = 1 移动点，速度 150 = 1.5 移动点
 */

import type { Tripoint } from '../coordinates/Tripoint';
import type { Creature } from '../creature/Creature';
import type { GameMap } from '../map/GameMap';

/**
 * 行动类型及其点数消耗
 */
export enum ActionType {
  // 移动相关
  MOVE = 'move',           // 移动一格
  MOVE_DIAGONAL = 'move_diagonal', // 对角移动
  MOVE_UP = 'move_up',     // 上楼梯
  MOVE_DOWN = 'move_down', // 下楼梯
  WAIT = 'wait',           // 等待

  // 战斗相关
  ATTACK = 'attack',       // 攻击
  RELOAD = 'reload',       // 装弹
  AIM = 'aim',             // 瞄准

  // 交互相关
  PICKUP = 'pickup',       // 拾取物品
  DROP = 'drop',           // 放下物品
  USE_ITEM = 'use_item',   // 使用物品
  CRAFT = 'craft',         // 制作

  // 其他
  TALK = 'talk',           // 对话
  SEARCH = 'search',       // 搜索
  SPECIAL = 'special',     // 特殊动作
}

/**
 * 行动点配置
 */
export interface ActionCostConfig {
  /** 基础移动消耗 */
  baseMoveCost: number;
  /** 对角移动消耗倍数 */
  diagonalMoveMultiplier: number;
  /** 攻击消耗 */
  attackCost: number;
  /** 等待消耗 */
  waitCost: number;
  /** 装弹消耗 */
  reloadCost: number;
}

/**
 * 默认行动消耗配置（参考 CDDA）
 */
export const DEFAULT_ACTION_COST: ActionCostConfig = Object.freeze({
  baseMoveCost: 100,      // 移动一格消耗 100 点
  diagonalMoveMultiplier: 1.414, // 对角移动约 141 点（√2）
  attackCost: 100,         // 攻击消耗 100 点
  waitCost: 100,           // 等待消耗 100 点
  reloadCost: 150,         // 装弹消耗 150 点
});

/**
 * 行动记录
 */
export interface ActionRecord {
  /** 行动类型 */
  type: ActionType;
  /** 消耗的点数 */
  cost: number;
  /** 执行时间戳 */
  timestamp: number;
  /** 相关位置（如果是移动动作） */
  position?: Tripoint;
}

/**
 * 行动预算状态
 */
export interface ActionBudget {
  /** 当前回合的总预算（基于速度） */
  totalBudget: number;
  /** 已消耗的点数 */
  spent: number;
  /** 剩余点数 */
  remaining: number;
  /** 是否还有行动能力 */
  canAct: boolean;
}

/**
 * 行动点系统属性（内部）
 */
interface ActionPointSystemProps {
  readonly creature: Creature;
  readonly config: ActionCostConfig;
  readonly currentBudget: ActionBudget;
  readonly currentTurn: number;
  readonly actionHistory: ActionRecord[];
}

/**
 * ActionPointSystem - 行动点系统
 *
 * 使用不可变数据结构
 * 管理生物的行动点数和行动消耗
 */
export class ActionPointSystem {
  readonly creature!: Creature;
  readonly config!: ActionCostConfig;
  readonly currentBudget!: ActionBudget;
  readonly currentTurn!: number;
  readonly actionHistory!: ActionRecord[];

  private constructor(props: ActionPointSystemProps) {
    this.creature = props.creature;
    this.config = props.config;
    this.currentBudget = props.currentBudget;
    this.currentTurn = props.currentTurn;
    this.actionHistory = props.actionHistory;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建行动点系统
   * @param creature 生物实例
   * @param config 行动消耗配置
   */
  static create(
    creature: Creature,
    config: Partial<ActionCostConfig> = {}
  ): ActionPointSystem {
    const actionConfig = { ...DEFAULT_ACTION_COST, ...config };

    // 计算初始预算（基于速度）
    const speed = 'speed' in creature ? (creature as any).speed : 100;
    const totalBudget = Math.floor(speed);

    const currentBudget: ActionBudget = {
      totalBudget,
      spent: 0,
      remaining: totalBudget,
      canAct: totalBudget > 0,
    };

    return new ActionPointSystem({
      creature,
      config: actionConfig,
      currentBudget,
      currentTurn: 0,
      actionHistory: [],
    });
  }

  // ========== 核心方法 ==========

  /**
   * 开始新回合
   * @param turn 回合数
   */
  startTurn(turn: number): ActionPointSystem {
    // 如果是同一回合，不重置
    if (turn === this.currentTurn) {
      return this;
    }

    // 计算新回合的预算
    const speed = 'speed' in this.creature ? (this.creature as any).speed : 100;
    const totalBudget = Math.floor(speed);

    const newBudget: ActionBudget = {
      totalBudget,
      spent: 0,
      remaining: totalBudget,
      canAct: totalBudget > 0,
    };

    return new ActionPointSystem({
      ...this,
      currentBudget: newBudget,
      currentTurn: turn,
      actionHistory: [], // 清空历史
    });
  }

  /**
   * 检查是否可以执行行动
   * @param type 行动类型
   * @param cost 自定义消耗（可选）
   */
  canPerformAction(type: ActionType, cost?: number): boolean {
    const actionCost = cost ?? this.getActionCost(type);
    return this.currentBudget.remaining >= actionCost;
  }

  /**
   * 执行行动
   * @param type 行动类型
   * @param cost 自定义消耗（可选）
   * @param position 相关位置（可选）
   */
  performAction(
    type: ActionType,
    cost?: number,
    position?: Tripoint
  ): ActionPointSystem {
    const actionCost = cost ?? this.getActionCost(type);

    if (!this.canPerformAction(type, actionCost)) {
      return this; // 无法执行，返回原状态
    }

    const newSpent = this.currentBudget.spent + actionCost;
    const newRemaining = this.currentBudget.remaining - actionCost;

    const newBudget: ActionBudget = {
      totalBudget: this.currentBudget.totalBudget,
      spent: newSpent,
      remaining: newRemaining,
      canAct: newRemaining > 0,
    };

    const record: ActionRecord = {
      type,
      cost: actionCost,
      timestamp: Date.now(),
      position,
    };

    return new ActionPointSystem({
      ...this,
      currentBudget: newBudget,
      actionHistory: [...this.actionHistory, record],
    });
  }

  /**
   * 重置当前回合（取消所有行动）
   */
  resetCurrentTurn(): ActionPointSystem {
    return new ActionPointSystem({
      ...this,
      currentBudget: {
        totalBudget: this.currentBudget.totalBudget,
        spent: 0,
        remaining: this.currentBudget.totalBudget,
        canAct: true,
      },
      actionHistory: [],
    });
  }

  // ========== 行动消耗计算 ==========

  /**
   * 获取行动消耗
   * @param type 行动类型
   */
  getActionCost(type: ActionType): number {
    switch (type) {
      case ActionType.MOVE:
        return this.config.baseMoveCost;

      case ActionType.MOVE_DIAGONAL:
        return Math.floor(this.config.baseMoveCost * this.config.diagonalMoveMultiplier);

      case ActionType.MOVE_UP:
      case ActionType.MOVE_DOWN:
        return this.config.baseMoveCost * 2; // 上下楼梯消耗更多

      case ActionType.ATTACK:
        return this.config.attackCost;

      case ActionType.RELOAD:
        return this.config.reloadCost;

      case ActionType.WAIT:
        return this.config.waitCost;

      case ActionType.AIM:
        return 50; // 瞄准消耗较少

      case ActionType.PICKUP:
      case ActionType.DROP:
        return 50; // 物品交互消耗较少

      case ActionType.USE_ITEM:
        return 100; // 使用物品消耗

      case ActionType.CRAFT:
        return 200; // 制作消耗较多

      case ActionType.TALK:
        return 50; // 对话消耗较少

      case ActionType.SEARCH:
        return 100; // 搜索消耗

      default:
        return 100; // 默认消耗
    }
  }

  /**
   * 计算移动消耗（考虑地形、状态等）
   * @param from 起点
   * @param to 终点
   * @param map 地图
   */
  calculateMoveCost(from: Tripoint, to: Tripoint, map: GameMap): number {
    let cost = this.config.baseMoveCost;

    // 检查是否是对角移动
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const dz = Math.abs(to.z - from.z);

    if (dx === 1 && dy === 1 && dz === 0) {
      cost = Math.floor(cost * this.config.diagonalMoveMultiplier);
    }

    // z 轴移动消耗更多
    if (dz > 0) {
      cost = cost * (1 + dz); // 每层增加消耗
    }

    // TODO: 考虑地形影响（泥地、雪地等）
    // TODO: 考虑状态影响（负重、受伤等）

    return cost;
  }

  // ========== 查询方法 ==========

  /**
   * 获取当前行动预算
   */
  getBudget(): ActionBudget {
    return this.currentBudget;
  }

  /**
   * 获取已消耗的点数
   */
  getSpent(): number {
    return this.currentBudget.spent;
  }

  /**
   * 获取剩余点数
   */
  getRemaining(): number {
    return this.currentBudget.remaining;
  }

  /**
   * 是否还有行动能力
   */
  canAct(): boolean {
    return this.currentBudget.canAct;
  }

  /**
   * 是否已用完所有行动点
   */
  isExhausted(): boolean {
    return this.currentBudget.remaining <= 0;
  }

  /**
   * 获取行动效率（已用预算 / 总预算）
   */
  getEfficiency(): number {
    if (this.currentBudget.totalBudget === 0) return 1;
    return this.currentBudget.spent / this.currentBudget.totalBudget;
  }

  /**
   * 获取移动点数（基于速度）
   */
  getMoves(): number {
    const speed = 'speed' in this.creature ? (this.creature as any).speed : 100;
    return Math.floor(speed / 100);
  }

  /**
   * 获取当前回合的行动历史
   */
  getActionHistory(): ActionRecord[] {
    return [...this.actionHistory];
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      creatureId: this.creature.id,
      creatureSpeed: 100, // 默认速度
      moves: this.getMoves(),
      currentBudget: this.currentBudget,
      currentTurn: this.currentTurn,
      actionHistory: this.actionHistory,
    };
  }
}
