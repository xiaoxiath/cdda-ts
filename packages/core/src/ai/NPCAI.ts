/**
 * NPCAI - NPC AI 控制器
 *
 * 整合所有 AI 子系统，提供高层 AI 决策接口
 *
 * 负责：
 * - 管理行为树执行
 * - 协调感知系统
 * - 调用寻路系统
 * - 执行 AI 决策
 */

import { BehaviorTree } from './BehaviorTree';
import { Oracle } from './Oracle';
import { Pathfinding } from './Pathfinding';
import type { Tripoint } from '../coordinates/Tripoint';
import type { GameMap } from '../map/GameMap';
import type {
  AIDecision,
  AIDecisionId,
  AIAction,
  AIActionType,
  AIState,
  AIStateData,
  AIContext,
  Path,
} from './types';
import {
  AIState as AIStateEnum,
  AIActionType as AIActionTypeEnum,
  createAIDecisionId,
  DEFAULT_AI_CONFIG,
} from './types';

/**
 * NPCAI 属性（内部）
 */
interface NPCAIProps {
  readonly npc: any; // NPC
  readonly behaviorTree: BehaviorTree;
  readonly oracle: any; // Oracle instance
  readonly pathfinding: Pathfinding;
  readonly state: AIStateData;
  readonly config: {
    perceptionRange: number;
    hearingRange: number;
    memoryDuration: number;
    reactionTime: number;
    pathfindingCacheSize: number;
  };
}

/**
 * NPCAI - NPC AI 控制器
 *
 * 使用不可变数据结构
 */
export class NPCAI {
  readonly npc!: any; // NPC
  readonly behaviorTree!: BehaviorTree;
  readonly oracle!: any; // Oracle instance
  readonly pathfinding!: Pathfinding;
  readonly state!: AIStateData;
  readonly config!: {
    perceptionRange: number;
    hearingRange: number;
    memoryDuration: number;
    reactionTime: number;
    pathfindingCacheSize: number;
  };

  private constructor(props: NPCAIProps) {
    this.npc = props.npc;
    this.behaviorTree = props.behaviorTree;
    this.oracle = props.oracle;
    this.pathfinding = props.pathfinding;
    this.state = props.state;
    this.config = props.config;
  }

  // ========== 工厂方法 ==========

  /**
   * 创建 NPC AI
   * @param npc NPC 实例
   * @param behaviorTree 行为树
   * @param config AI 配置
   */
  static create(
    npc: any, // NPC
    behaviorTree: BehaviorTree,
    config?: Partial<{
      perceptionRange: number;
      hearingRange: number;
      memoryDuration: number;
      reactionTime: number;
      pathfindingCacheSize: number;
    }>
  ): NPCAI {
    const aiConfig = { ...DEFAULT_AI_CONFIG, ...config };

    // 创建一个临时 map 用于 pathfinding（如果 npc.map 不存在）
    const tempMap = (npc.map as any) ?? { creatures: new Map() };

    return new NPCAI({
      npc,
      behaviorTree,
      oracle: (Oracle as any).create(npc, aiConfig),
      pathfinding: Pathfinding.create(tempMap),
      state: {
        state: AIStateEnum.IDLE,
        currentDecision: null,
        lastUpdate: Date.now(),
      },
      config: aiConfig as {
        perceptionRange: number;
        hearingRange: number;
        memoryDuration: number;
        reactionTime: number;
        pathfindingCacheSize: number;
      },
    });
  }

  // ========== 核心更新方法 ==========

  /**
   * 更新 AI（每帧调用）
   * @param map 游戏地图
   * @param currentTime 当前时间
   * @param deltaTime 时间增量
   * @returns 更新后的 AI 和决策列表
   */
  update(
    map: GameMap,
    currentTime: number,
    deltaTime: number
  ): { ai: NPCAI; actions: AIDecision[] } {
    // 更新感知系统
    const updatedOracle = this.oracle.update(map, currentTime, deltaTime);

    // 创建 AI 上下文
    const context = this.createContext(map, currentTime, deltaTime);

    // 执行行为树
    const status = this.behaviorTree.update(context);

    // 根据行为树结果制定决策
    const decisions = this.makeDecision(map);
    const currentDecision = decisions.length > 0 ? decisions[0] : null;

    // 创建更新的 AI 实例
    const updatedAI = new NPCAI({
      npc: this.npc,
      behaviorTree: this.behaviorTree,
      oracle: updatedOracle,
      pathfinding: this.pathfinding,
      state: {
        ...this.state,
        lastUpdate: currentTime,
        currentDecision,
      },
      config: this.config,
    });

    return { ai: updatedAI, actions: decisions };
  }

  /**
   * 处理回合（游戏回合制）
   * @param map 游戏地图
   */
  processTurn(map: GameMap): NPCAI {
    const currentTime = Date.now();
    const deltaTime = 100; // 假设每回合 100ms

    const { ai } = this.update(map, currentTime, deltaTime);

    // 执行第一个决策（executeDecision 返回新的 ai）
    if (ai.state.currentDecision) {
      const { ai: executionAI } = ai.executeDecision(ai.state.currentDecision, map);
      return executionAI;
    }

    return ai;
  }

  // ========== 决策制定 ==========

  /**
   * 制定决策
   * @param map 游戏地图
   */
  makeDecision(map: GameMap): AIDecision[] {
    const decisions: AIDecision[] = [];

    // 检查生存需求
    const survivalNeeds = this.checkSurvivalNeeds();
    if (survivalNeeds.priority) {
      const decision = this.createSurvivalDecision(survivalNeeds.priority, map);
      if (decision) {
        decisions.push(decision);
      }
    }

    // 检查威胁（威胁等级 >= MEDIUM (2)）
    const highestThreat = this.oracle.getHighestThreat();
    if (highestThreat && highestThreat.level >= 2) {
      const decision = this.createCombatDecision(highestThreat.targetId, map);
      if (decision) {
        decisions.push(decision);
      }
    }

    // 如果没有紧急情况，使用行为树决策
    if (decisions.length === 0) {
      const behaviorDecision = this.createBehaviorDecision(map);
      if (behaviorDecision) {
        decisions.push(behaviorDecision);
      }
    }

    return decisions;
  }

  /**
   * 执行决策
   * @param decision AI 决策
   * @param map 游戏地图
   */
  executeDecision(decision: AIDecision, map: GameMap): { ai: NPCAI; result: any } {
    let result: any = null;

    switch (decision.action.type) {
      case AIActionTypeEnum.MOVE:
      case AIActionTypeEnum.MOVE_TO:
        if (decision.position) {
          const moveResult = this.moveTo(decision.position, map);
          result = moveResult;
        }
        break;

      case AIActionTypeEnum.ATTACK:
        if (decision.target) {
          const attackResult = this.attack(decision.target, map);
          result = attackResult;
        }
        break;

      case AIActionTypeEnum.FLEE:
        if (decision.position) {
          const fleeResult = this.flee(decision.position, map);
          result = fleeResult;
        }
        break;

      case AIActionTypeEnum.FOLLOW:
        if (decision.target) {
          const followResult = this.follow(decision.target, map);
          result = followResult;
        }
        break;

      case AIActionTypeEnum.EAT:
      case AIActionTypeEnum.DRINK:
      case AIActionTypeEnum.SLEEP:
        result = { success: true, message: '执行生存动作' };
        break;

      case AIActionTypeEnum.WAIT:
        result = { success: true, message: '等待' };
        break;

      default:
        result = { success: false, message: '未知动作类型' };
    }

    return { ai: this, result };
  }

  // ========== 行为执行方法 ==========

  /**
   * 移动到目标位置
   * @param targetPosition 目标位置
   * @param map 游戏地图
   */
  moveTo(
    targetPosition: Tripoint,
    map: GameMap
  ): { ai: NPCAI; success: boolean; path?: Path } {
    const startPosition = this.npc.position;

    // 使用传入的 map 创建临时 pathfinding
    const pathfinding = Pathfinding.create(map);

    // 查找路径
    const pathfindingResult = pathfinding.findPath({
      start: startPosition,
      end: targetPosition,
      allowDiagonal: true,
      maxCost: 1000,
      ignoreCreatures: false,
    });

    if (!pathfindingResult.success) {
      return { ai: this, success: false };
    }

    // 移动到路径的下一个位置
    const nextPos = pathfinding.getNextPosition(pathfindingResult.path, 0);
    if (nextPos) {
      // 执行移动（假设 NPC 有 moveTo 方法）
      this.npc.moveTo?.(nextPos);
    }

    return {
      ai: this,
      success: true,
      path: pathfindingResult.path,
    };
  }

  /**
   * 跟随目标
   * @param targetId 目标 ID
   * @param map 游戏地图
   */
  follow(
    targetId: string,
    map: GameMap
  ): { ai: NPCAI; success: boolean } {
    const target = map.creatures.get(targetId);
    if (!target) {
      return { ai: this, success: false };
    }

    // 移动到目标附近
    return this.moveTo(target.position, map);
  }

  /**
   * 逃跑
   * @param fromPosition 逃离的位置
   * @param map 游戏地图
   */
  flee(
    fromPosition: Tripoint,
    map: GameMap
  ): { ai: NPCAI; success: boolean } {
    // 计算相反方向
    const dx = this.npc.position.x - fromPosition.x;
    const dy = this.npc.position.y - fromPosition.y;

    // 标准化并扩展距离
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fleeDistance = 10;
    const targetX = this.npc.position.x + (dx / distance) * fleeDistance;
    const targetY = this.npc.position.y + (dy / distance) * fleeDistance;

    const targetPosition = {
      x: Math.round(targetX),
      y: Math.round(targetY),
      z: this.npc.position.z,
    } as Tripoint;

    return this.moveTo(targetPosition, map);
  }

  /**
   * 攻击目标
   * @param targetId 目标 ID
   * @param map 游戏地图
   */
  attack(
    targetId: string,
    map: GameMap
  ): { ai: NPCAI; success: boolean; result?: any } {
    const target = map.creatures.get(targetId);
    if (!target) {
      return { ai: this, success: false };
    }

    // 检查距离
    const distance = Math.sqrt(
      Math.pow(target.position.x - this.npc.position.x, 2) +
      Math.pow(target.position.y - this.npc.position.y, 2)
    );

    // 如果距离太远，先靠近
    if (distance > 1.5) {
      const moveResult = this.moveTo(target.position, map);
      if (!moveResult.success) {
        return { ai: this, success: false };
      }
    }

    // 执行攻击（假设有 CombatManager）
    // const CombatManager = require('../combat/CombatManager').CombatManager;
    // const combatResult = CombatManager.executeMeleeAttack({
    //   attackerId: this.npc.id,
    //   targetId: targetId,
    // });

    return { ai: this, success: true };
  }

  // ========== 生存行为 ==========

  /**
   * 检查生存需求
   */
  checkSurvivalNeeds(): {
    needsFood: boolean;
    needsWater: boolean;
    needsRest: boolean;
    priority: AIActionType | null;
  } {
    // 假设 NPC 有 survivalStats 属性
    const stats = this.npc.survivalStats;

    if (!stats) {
      return {
        needsFood: false,
        needsWater: false,
        needsRest: false,
        priority: null,
      };
    }

    const isHungry = stats.isHungry?.() ?? false;
    const isThirsty = stats.isThirsty?.() ?? false;
    const isTired = stats.isTired?.() ?? false;
    const isStarving = stats.isStarving?.() ?? false;
    const isDehydrated = stats.isDehydrated?.() ?? false;
    const isExhausted = stats.isExhausted?.() ?? false;

    // 按优先级返回
    if (isStarving) {
      return { needsFood: true, needsWater: isThirsty, needsRest: isTired, priority: AIActionTypeEnum.EAT };
    }
    if (isDehydrated) {
      return { needsFood: isHungry, needsWater: true, needsRest: isTired, priority: AIActionTypeEnum.DRINK };
    }
    if (isExhausted) {
      return { needsFood: isHungry, needsWater: isThirsty, needsRest: true, priority: AIActionTypeEnum.SLEEP };
    }

    return { needsFood: isHungry, needsWater: isThirsty, needsRest: isTired, priority: null };
  }

  /**
   * 寻找食物
   */
  findFood(map: GameMap): Tripoint | null {
    // 简化版本：从记忆中查找食物位置
    const locations = this.oracle.getKnownResourceLocations('food');
    return locations.length > 0 ? locations[0] : null;
  }

  /**
   * 寻找水源
   */
  findWater(map: GameMap): Tripoint | null {
    // 简化版本：从记忆中查找水源位置
    const locations = this.oracle.getKnownResourceLocations('water');
    return locations.length > 0 ? locations[0] : null;
  }

  /**
   * 寻找休息地点
   */
  findRestingSpot(map: GameMap): Tripoint | null {
    // 简化版本：查找安全位置
    const currentPos = this.npc.position;
    if (this.oracle.isLocationSafe(currentPos)) {
      return currentPos;
    }
    return null;
  }

  // ========== 状态管理 ==========

  /**
   * 切换 AI 状态
   */
  switchState(newState: AIState): NPCAI {
    return new NPCAI({
      ...this,
      state: {
        ...this.state,
        state: newState,
      },
    });
  }

  /**
   * 检查是否可以转换到目标状态
   */
  canTransitionTo(targetState: AIState): boolean {
    // 简化版本：所有状态之间都可以转换
    // 实际应该根据当前状态和目标状态判断
    return true;
  }

  // ========== 辅助方法 ==========

  /**
   * 创建 AI 上下文
   */
  private createContext(
    map: GameMap,
    currentTime: number,
    deltaTime: number
  ): AIContext {
    return {
      npc: this.npc,
      map,
      oracle: this.oracle,
      pathfinding: this.pathfinding,
      currentTime,
      deltaTime,
      blackboard: new Map(),
    };
  }

  /**
   * 创建生存决策
   */
  private createSurvivalDecision(
    actionType: AIActionType,
    map: GameMap
  ): AIDecision | null {
    let targetPosition: Tripoint | null = null;

    switch (actionType) {
      case AIActionTypeEnum.EAT:
        targetPosition = this.findFood(map);
        break;
      case AIActionTypeEnum.DRINK:
        targetPosition = this.findWater(map);
        break;
      case AIActionTypeEnum.SLEEP:
        targetPosition = this.findRestingSpot(map);
        break;
    }

    // 即使没有找到目标位置，也创建决策（AI 可以探索）
    return this.createDecision(actionType, {
      position: targetPosition ?? undefined,
      priority: 10, // 高优先级
    });
  }

  /**
   * 创建战斗决策
   */
  private createCombatDecision(
    targetId: string,
    map: GameMap
  ): AIDecision | null {
    return this.createDecision(AIActionTypeEnum.ATTACK, {
      target: targetId,
      priority: 8,
    });
  }

  /**
   * 创建行为决策
   */
  private createBehaviorDecision(map: GameMap): AIDecision | null {
    // 简化版本：返回等待决策
    return this.createDecision(AIActionTypeEnum.WAIT, {
      priority: 1,
    });
  }

  /**
   * 创建决策
   */
  private createDecision(
    actionType: AIActionType,
    options: {
      target?: string;
      position?: Tripoint;
      priority: number;
    }
  ): AIDecision {
    const action: AIAction = {
      type: actionType,
      duration: 1000,
      cost: 1,
    };

    return {
      id: createAIDecisionId(`${this.npc.id}_${actionType}_${Date.now()}`),
      action,
      target: options.target,
      position: options.position,
      priority: options.priority,
      timestamp: Date.now(),
    };
  }

  // ========== 查询方法 ==========

  /**
   * 获取当前状态描述
   */
  getStateDescription(): string {
    const stateUpper = this.state.state.toUpperCase();
    const actionType = this.state.currentDecision?.action.type ?? '无动作';
    return `${stateUpper} - ${actionType}`;
  }

  /**
   * 获取当前目标
   */
  getCurrentTarget(): string | null {
    return this.state.currentDecision?.target ?? null;
  }

  /**
   * 是否有有效目标
   */
  hasValidTarget(map: GameMap): boolean {
    const targetId = this.getCurrentTarget();
    if (!targetId) return false;
    return map.creatures.has(targetId);
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      npcId: this.npc.id,
      state: this.state,
      config: this.config,
      behaviorTree: this.behaviorTree.name,
      oracle: this.oracle.toJson(),
      pathfinding: this.pathfinding.toJson(),
    };
  }
}
