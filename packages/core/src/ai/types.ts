/**
 * AI 系统类型定义
 *
 * 参考 Cataclysm-DDA 的 NPC AI 系统
 * 包含行为树、感知系统、寻路算法和 AI 控制器的核心类型
 */

// ============================================================================
// AI 核心类型
// ============================================================================

/**
 * AI 决策 ID (Brand Type)
 */
export type AIDecisionId = string & { readonly __brand: unique symbol };

/**
 * 创建 AI 决策 ID
 */
export function createAIDecisionId(id: string): AIDecisionId {
  return id as AIDecisionId;
}

// ============================================================================
// 行为树相关类型
// ============================================================================

/**
 * 行为状态
 */
export enum BehaviorStatus {
  /** 执行成功 */
  SUCCESS = 'success',
  /** 执行失败 */
  FAILURE = 'failure',
  /** 正在执行 */
  RUNNING = 'running',
  /** 状态无效 */
  INVALID = 'invalid',
}

/**
 * 行为节点类型
 */
export enum BehaviorNodeType {
  // 复合节点
  /** 选择器：依次执行子节点，直到成功 */
  SELECTOR = 'selector',
  /** 序列：依次执行子节点，全部成功才成功 */
  SEQUENCE = 'sequence',
  /** 并行：同时执行子节点 */
  PARALLEL = 'parallel',

  // 装饰器节点
  /** 反转：反转子节点结果 */
  INVERTER = 'inverter',
  /** 重复：重复执行子节点 */
  REPEATER = 'repeater',
  /** 重试：失败时重试 */
  RETRY = 'retry',
  /** 冷却：时间间隔执行 */
  COOLDOWN = 'cooldown',

  // 条件节点
  /** 条件检查 */
  CONDITION = 'condition',

  // 动作节点
  /** 动作执行 */
  ACTION = 'action',
}

/**
 * 并行策略
 */
export enum ParallelPolicy {
  /** 任一成功即成功 */
  REQUIRE_ONE = 'require_one',
  /** 全部成功才成功 */
  REQUIRE_ALL = 'require_all',
  /** 按成功比例 */
  REQUIRE_SUCCESS = 'require_success',
}

/**
 * 行为树统计
 */
export interface BehaviorTreeStats {
  /** 总执行次数 */
  readonly totalExecutions: number;
  /** 成功次数 */
  readonly successCount: number;
  /** 失败次数 */
  readonly failureCount: number;
  /** 平均执行时间（毫秒） */
  readonly averageExecutionTime: number;
}

// ============================================================================
// 感知系统类型
// ============================================================================

/**
 * 感知类型
 */
export enum PerceptionType {
  /** 视觉 */
  VISION = 'vision',
  /** 听觉 */
  HEARING = 'hearing',
  /** 嗅觉 */
  SMELL = 'smell',
  /** 记忆 */
  MEMORY = 'memory',
}

/**
 * 威胁等级
 */
export enum ThreatLevel {
  /** 无威胁 */
  NONE = 0,
  /** 低威胁 */
  LOW = 1,
  /** 中等威胁 */
  MEDIUM = 2,
  /** 高威胁 */
  HIGH = 3,
  /** 致命威胁 */
  CRITICAL = 4,
}

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** 记忆 ID */
  readonly id: string;
  /** 感知类型 */
  readonly type: PerceptionType;
  /** 目标 ID */
  readonly targetId: string;
  /** 位置 */
  readonly position: any; // Tripoint - 前向声明避免循环引用
  /** 时间戳 */
  readonly timestamp: number;
  /** 置信度 (0-1) */
  readonly confidence: number;
  /** 重要性 (0-1) */
  readonly importance: number;
}

/**
 * 感知数据
 */
export interface PerceptionData {
  /** 感知类型 */
  readonly type: PerceptionType;
  /** 来源 ID */
  readonly sourceId: string;
  /** 目标 ID */
  readonly targetId?: string;
  /** 位置 */
  readonly position: any; // Tripoint
  /** 强度 */
  readonly intensity: number;
  /** 时间戳 */
  readonly timestamp: number;
}

// ============================================================================
// 寻路系统类型
// ============================================================================

/**
 * 路径节点
 */
export interface PathNode {
  /** 位置 */
  readonly position: any; // Tripoint
  /** 从起点到当前节点的代价 */
  readonly gCost: number;
  /** 从当前节点到终点的启发式代价 */
  readonly hCost: number;
  /** gCost + hCost */
  readonly fCost: number;
  /** 父节点 */
  readonly parent?: PathNode;
}

/**
 * 路径类型
 */
export type Path = any[]; // Tripoint[]

/**
 * 寻路请求
 */
export interface PathfindingRequest {
  /** 起点位置 */
  readonly start: any; // Tripoint
  /** 终点位置 */
  readonly end: any; // Tripoint
  /** 是否允许对角线移动 */
  readonly allowDiagonal: boolean;
  /** 最大代价 */
  readonly maxCost: number;
  /** 是否忽略生物 */
  readonly ignoreCreatures: boolean;
}

/**
 * 寻路结果
 */
export interface PathfindingResult {
  /** 路径 */
  readonly path: Path;
  /** 总代价 */
  readonly cost: number;
  /** 是否成功 */
  readonly success: boolean;
  /** 失败原因 */
  readonly reason?: string;
}

/**
 * 路径缓存条目
 */
export interface PathCacheEntry {
  /** 起点 */
  readonly start: any; // Tripoint
  /** 终点 */
  readonly end: any; // Tripoint
  /** 路径 */
  readonly path: Path;
  /** 时间戳 */
  readonly timestamp: number;
  /** 命中次数 */
  readonly hitCount: number;
}

// ============================================================================
// AI 决策和控制类型
// ============================================================================

/**
 * AI 动作类型
 */
export enum AIActionType {
  // 移动动作
  /** 移动 */
  MOVE = 'move',
  /** 移动到 */
  MOVE_TO = 'move_to',
  /** 跟随 */
  FOLLOW = 'follow',
  /** 逃跑 */
  FLEE = 'flee',

  // 战斗动作
  /** 攻击 */
  ATTACK = 'attack',
  /** 防御 */
  DEFEND = 'defend',
  /** 装弹 */
  RELOAD = 'reload',

  // 交互动作
  /** 交互 */
  INTERACT = 'interact',
  /** 交易 */
  TRADE = 'trade',
  /** 对话 */
  TALK = 'talk',

  // 生存动作
  /** 进食 */
  EAT = 'eat',
  /** 饮水 */
  DRINK = 'drink',
  /** 睡眠 */
  SLEEP = 'sleep',
  /** 休息 */
  REST = 'rest',

  // 等待
  /** 等待 */
  WAIT = 'wait',
}

/**
 * AI 动作
 */
export interface AIAction {
  /** 动作类型 */
  readonly type: AIActionType;
  /** 持续时间（毫秒） */
  readonly duration: number;
  /** 行动点消耗 */
  readonly cost: number;
}

/**
 * AI 决策
 */
export interface AIDecision {
  /** 决策 ID */
  readonly id: AIDecisionId;
  /** 动作 */
  readonly action: AIAction;
  /** 目标 ID */
  readonly target?: string;
  /** 目标位置 */
  readonly position?: any; // Tripoint
  /** 优先级 */
  readonly priority: number;
  /** 时间戳 */
  readonly timestamp: number;
}

/**
 * AI 状态
 */
export enum AIState {
  /** 空闲 */
  IDLE = 'idle',
  /** 巡逻 */
  PATROL = 'patrol',
  /** 战斗 */
  COMBAT = 'combat',
  /** 逃跑 */
  FLEEING = 'fleeing',
  /** 交互中 */
  INTERACTING = 'interacting',
  /** 休息 */
  RESTING = 'resting',
  /** 死亡 */
  DEAD = 'dead',
}

/**
 * AI 状态数据
 */
export interface AIStateData {
  /** 当前状态 */
  readonly state: AIState;
  /** 当前决策 */
  readonly currentDecision: AIDecision | null;
  /** 当前目标 ID */
  readonly target?: string;
  /** 当前路径 */
  readonly path?: Path;
  /** 上次更新时间 */
  readonly lastUpdate: number;
}

/**
 * AI 配置
 */
export interface AIConfig {
  /** 感知范围（格） */
  readonly perceptionRange: number;
  /** 听觉范围（格） */
  readonly hearingRange: number;
  /** 记忆持续时间（毫秒） */
  readonly memoryDuration: number;
  /** 反应时间（毫秒） */
  readonly reactionTime: number;
  /** 寻路缓存大小 */
  readonly pathfindingCacheSize: number;
}

/**
 * 默认 AI 配置
 */
export const DEFAULT_AI_CONFIG: AIConfig = Object.freeze({
  perceptionRange: 20,
  hearingRange: 15,
  memoryDuration: 60000, // 60 秒
  reactionTime: 500, // 0.5 秒
  pathfindingCacheSize: 100,
});

// ============================================================================
// 策略系统类型
// ============================================================================

/**
 * 策略类型
 */
export enum StrategyType {
  /** 战斗策略 */
  COMBAT = 'combat',
  /** 生存策略 */
  SURVIVAL = 'survival',
  /** 社交策略 */
  SOCIAL = 'social',
  /** 巡逻策略 */
  PATROL = 'patrol',
  /** 守卫策略 */
  GUARD = 'guard',
  /** 跟随策略 */
  FOLLOW = 'follow',
}

/**
 * 策略优先级结果
 */
export interface StrategyPriority {
  /** 策略类型 */
  readonly strategy: StrategyType;
  /** 优先级 (0-1) */
  readonly priority: number;
  /** 是否适用 */
  readonly applicable: boolean;
}

// ============================================================================
// AI 上下文（用于行为树执行）
// ============================================================================

/**
 * AI 上下文
 * 行为树节点执行时的环境信息
 */
export interface AIContext {
  /** NPC 实例 */
  readonly npc: any; // NPC
  /** 游戏地图 */
  readonly map: any; // GameMap
  /** 感知系统 */
  readonly oracle: any; // Oracle
  /** 寻路系统 */
  readonly pathfinding: any; // Pathfinding
  /** 当前时间 */
  readonly currentTime: number;
  /** 时间增量（毫秒） */
  readonly deltaTime: number;
  /** 黑板数据（节点间共享数据） */
  readonly blackboard: Map<string, any>;
}

// ============================================================================
// NPC 类别（用于预设 AI）
// ============================================================================

/**
 * NPC 类别
 */
export enum NPCClass {
  /** 士兵 */
  SOLDIER = 'NC_SOLDIER',
  /** 暴徒 */
  THUG = 'NC_THUG',
  /** 幸存者 */
  SURVIVOR = 'NC_SURVIVOR',
  /** 商人 */
  MERCHANT = 'NC_MERCHANT',
  /** 医生 */
  DOCTOR = 'NC_DOCTOR',
  /** 农夫 */
  FARMER = 'NC_FARMER',
}
