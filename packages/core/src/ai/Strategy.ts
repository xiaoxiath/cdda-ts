/**
 * Strategy - 策略模式
 *
 * 定义不同的 AI 策略
 * 包括战斗策略、生存策略和社交策略
 *
 * 策略模式允许 NPC 根据情况选择不同的行为模式
 */

import { List } from 'immutable';
import { BehaviorTree } from './BehaviorTree';
import { BehaviorNode } from './BehaviorNode';
import type { AIContext } from './types';
import {
  StrategyType,
  BehaviorStatus,
  AIActionType,
  AIState,
} from './types';

/**
 * 策略属性（内部）
 */
interface StrategyProps {
  readonly type: StrategyType;
  readonly name: string;
  readonly priority: number;
  readonly conditions: ((context: AIContext) => boolean)[];
  readonly behaviors: BehaviorNode[];
}

/**
 * Strategy - 策略基类
 *
 * 使用不可变数据结构
 */
export abstract class Strategy {
  readonly type!: StrategyType;
  readonly name!: string;
  readonly priority!: number;
  readonly conditions!: ((context: AIContext) => boolean)[];
  readonly behaviors!: BehaviorNode[];

  protected constructor(props: StrategyProps) {
    this.type = props.type;
    this.name = props.name;
    this.priority = props.priority;
    this.conditions = props.conditions;
    this.behaviors = props.behaviors;
  }

  /**
   * 检查策略是否适用
   * @param context AI 上下文
   */
  isApplicable(context: AIContext): boolean {
    return this.conditions.every(check => check(context));
  }

  /**
   * 生成行为树
   */
  abstract getBehaviorTree(): BehaviorTree;

  /**
   * 执行策略
   * @param context AI 上下文
   */
  execute(context: AIContext): BehaviorStatus {
    const tree = this.getBehaviorTree();
    return tree.update(context);
  }

  /**
   * 获取策略描述
   */
  getDescription(): string {
    const typeUpper = this.type.toUpperCase();
    return `${this.name} (${typeUpper}, 优先级: ${this.priority})`;
  }
}

// ============================================================================
// 战斗策略
// ============================================================================

/**
 * CombatStrategy 属性
 */
interface CombatStrategyProps extends StrategyProps {
  readonly aggressiveness: number; // 攻击性 0-1
  readonly preferredRange: number;  // 喜欢的战斗距离
  readonly useCover: boolean;       // 是否利用掩体
  readonly retreatThreshold: number; // 撤退阈值（HP 百分比）
}

/**
 * CombatStrategy - 战斗策略
 *
 * 定义 NPC 的战斗行为
 */
export class CombatStrategy extends Strategy {
  readonly aggressiveness!: number;
  readonly preferredRange!: number;
  readonly useCover!: boolean;
  readonly retreatThreshold!: number;

  private constructor(props: CombatStrategyProps) {
    super(props);
    this.aggressiveness = props.aggressiveness;
    this.preferredRange = props.preferredRange;
    this.useCover = props.useCover;
    this.retreatThreshold = props.retreatThreshold;
    Object.freeze(this);
  }

  /**
   * 创建战斗策略
   */
  static create(config: {
    name?: string;
    aggressiveness?: number;
    preferredRange?: number;
    useCover?: boolean;
    retreatThreshold?: number;
    priority?: number;
  } = {}): CombatStrategy {
    const name = config.name ?? '战斗策略';
    const aggressiveness = config.aggressiveness ?? 0.5;
    const preferredRange = config.preferredRange ?? 5;
    const useCover = config.useCover ?? true;
    const retreatThreshold = config.retreatThreshold ?? 0.3;
    const priority = config.priority ?? 5;

    // 创建战斗行为树
    const behaviors = [
      BehaviorNode.condition(
        'check_retreat',
        '检查是否需要撤退',
        (ctx: AIContext) => {
          const currentHP = (ctx.npc as any).currentHP ?? 100;
          const maxHP = (ctx.npc as any).maxHP ?? 100;
          const hpPercent = currentHP / maxHP;
          return hpPercent < retreatThreshold;
        }
      ),
      BehaviorNode.action(
        'attack',
        '攻击敌人',
        (ctx: AIContext) => {
          // 执行攻击逻辑
          return BehaviorStatus.SUCCESS;
        }
      ),
    ];

    return new CombatStrategy({
      type: StrategyType.COMBAT,
      name,
      priority,
      conditions: [
        (ctx: AIContext) => {
          // 有可见敌人
          const enemyCount = ctx.oracle.getPerceivedEnemies().length;
          return enemyCount > 0;
        },
      ],
      behaviors,
      aggressiveness,
      preferredRange,
      useCover,
      retreatThreshold,
    });
  }

  /**
   * 生成行为树
   */
  getBehaviorTree(): BehaviorTree {
    const root = BehaviorNode.sequence(
      'combat_sequence',
      '战斗序列',
      this.behaviors
    );

    return BehaviorTree.create(this.name, root);
  }

  /**
   * 检查是否应该撤退
   */
  shouldRetreat(context: AIContext): boolean {
    const currentHP = (context.npc as any).currentHP ?? 100;
    const maxHP = (context.npc as any).maxHP ?? 100;
    const hpPercent = currentHP / maxHP;
    return hpPercent < this.retreatThreshold;
  }

  /**
   * 获取战斗位置
   */
  getCombatPosition(context: AIContext): any {
    // 根据策略偏好计算最佳战斗位置
    return context.npc.position;
  }
}

// ============================================================================
// 生存策略
// ============================================================================

/**
 * SurvivalStrategy 属性
 */
interface SurvivalStrategyProps extends StrategyProps {
  readonly foodPriority: number;   // 食物优先级 0-1
  readonly waterPriority: number;  // 水优先级 0-1
  readonly restPriority: number;   // 休息优先级 0-1
  readonly safetyPriority: number; // 安全优先级 0-1
}

/**
 * SurvivalStrategy - 生存策略
 *
 * 定义 NPC 的生存行为
 */
export class SurvivalStrategy extends Strategy {
  readonly foodPriority!: number;
  readonly waterPriority!: number;
  readonly restPriority!: number;
  readonly safetyPriority!: number;

  private constructor(props: SurvivalStrategyProps) {
    super(props);
    this.foodPriority = props.foodPriority;
    this.waterPriority = props.waterPriority;
    this.restPriority = props.restPriority;
    this.safetyPriority = props.safetyPriority;
    Object.freeze(this);
  }

  /**
   * 创建生存策略
   */
  static create(config: {
    name?: string;
    foodPriority?: number;
    waterPriority?: number;
    restPriority?: number;
    safetyPriority?: number;
    priority?: number;
  } = {}): SurvivalStrategy {
    const name = config.name ?? '生存策略';
    const foodPriority = config.foodPriority ?? 0.8;
    const waterPriority = config.waterPriority ?? 0.9;
    const restPriority = config.restPriority ?? 0.6;
    const safetyPriority = config.safetyPriority ?? 0.7;
    const priority = config.priority ?? 8;

    // 创建生存行为树
    const behaviors = [
      BehaviorNode.condition(
        'check_hunger',
        '检查饥饿',
        (ctx: AIContext) => ctx.npc.survivalStats?.isHungry?.() ?? false
      ),
      BehaviorNode.action(
        'find_food',
        '寻找食物',
        (ctx: AIContext) => BehaviorStatus.SUCCESS
      ),
    ];

    return new SurvivalStrategy({
      type: StrategyType.SURVIVAL,
      name,
      priority,
      conditions: [
        (ctx: AIContext) => {
          // 有生存需求
          const stats = ctx.npc.survivalStats;
          return stats && ((stats.isHungry?.() ?? false) || (stats.isThirsty?.() ?? false));
        },
      ],
      behaviors,
      foodPriority,
      waterPriority,
      restPriority,
      safetyPriority,
    });
  }

  /**
   * 生成行为树
   */
  getBehaviorTree(): BehaviorTree {
    const root = BehaviorNode.selector(
      'survival_selector',
      '生存选择器',
      this.behaviors
    );

    return BehaviorTree.create(this.name, root);
  }

  /**
   * 获取最高优先级的生存需求
   */
  getHighestPriorityNeed(context: AIContext): AIActionType | null {
    const stats = context.npc.survivalStats;
    if (!stats) return null;

    if (stats.isStarving?.()) return AIActionType.EAT;
    if (stats.isDehydrated?.()) return AIActionType.DRINK;
    if (stats.isExhausted?.()) return AIActionType.SLEEP;

    return null;
  }
}

// ============================================================================
// 社交策略
// ============================================================================

/**
 * SocialStrategy 属性
 */
interface SocialStrategyProps extends StrategyProps {
  readonly friendliness: number;     // 友好度 0-1
  readonly tradeInterest: number;    // 交易兴趣 0-1
  readonly cooperationLevel: number; // 合作水平 0-1
}

/**
 * SocialStrategy - 社交策略
 *
 * 定义 NPC 的社交行为
 */
export class SocialStrategy extends Strategy {
  readonly friendliness!: number;
  readonly tradeInterest!: number;
  readonly cooperationLevel!: number;

  private constructor(props: SocialStrategyProps) {
    super(props);
    this.friendliness = props.friendliness;
    this.tradeInterest = props.tradeInterest;
    this.cooperationLevel = props.cooperationLevel;
    Object.freeze(this);
  }

  /**
   * 创建社交策略
   */
  static create(config: {
    name?: string;
    friendliness?: number;
    tradeInterest?: number;
    cooperationLevel?: number;
    priority?: number;
  } = {}): SocialStrategy {
    const name = config.name ?? '社交策略';
    const friendliness = config.friendliness ?? 0.5;
    const tradeInterest = config.tradeInterest ?? 0.5;
    const cooperationLevel = config.cooperationLevel ?? 0.5;
    const priority = config.priority ?? 3;

    // 创建社交行为树
    const behaviors = [
      BehaviorNode.condition(
        'check_friendly',
        '检查友好',
        (ctx: AIContext) => friendliness > 0.5
      ),
      BehaviorNode.action(
        'greet',
        '问候',
        (ctx: AIContext) => BehaviorStatus.SUCCESS
      ),
    ];

    return new SocialStrategy({
      type: StrategyType.SOCIAL,
      name,
      priority,
      conditions: [
        (ctx: AIContext) => {
          // 有友好的 NPC 在附近
          return ctx.oracle.getPerceivedEntityCount() > 0;
        },
      ],
      behaviors,
      friendliness,
      tradeInterest,
      cooperationLevel,
    });
  }

  /**
   * 生成行为树
   */
  getBehaviorTree(): BehaviorTree {
    const root = BehaviorNode.sequence(
      'social_sequence',
      '社交序列',
      this.behaviors
    );

    return BehaviorTree.create(this.name, root);
  }

  /**
   * 检查是否愿意交易
   */
  isWillingToTrade(context: AIContext): boolean {
    return this.tradeInterest > 0.5;
  }

  /**
   * 检查是否愿意合作
   */
  isWillingToCooperate(context: AIContext): boolean {
    return this.cooperationLevel > 0.5;
  }
}

// ============================================================================
// 巡逻策略
// ============================================================================

/**
 * PatrolStrategy - 巡逻策略
 */
export class PatrolStrategy extends Strategy {
  readonly patrolRoute!: any[]; // Tripoint[]
  readonly state!: {
    currentWaypoint: number;
  };

  private constructor(props: StrategyProps & {
    patrolRoute: any[];
    state: { currentWaypoint: number };
  }) {
    super(props);
    this.patrolRoute = props.patrolRoute;
    this.state = Object.freeze({ ...props.state });
    Object.freeze(this);
  }

  static create(config: {
    name?: string;
    patrolRoute?: any[];
    priority?: number;
  } = {}): PatrolStrategy {
    const name = config.name ?? '巡逻策略';
    const patrolRoute = config.patrolRoute ?? [];
    const priority = config.priority ?? 2;

    const behaviors = [
      BehaviorNode.action(
        'move_to_waypoint',
        '移动到巡逻点',
        (ctx: AIContext) => BehaviorStatus.SUCCESS
      ),
    ];

    return new PatrolStrategy({
      type: StrategyType.PATROL,
      name,
      priority,
      conditions: [
        (ctx: AIContext) => patrolRoute.length > 0,
      ],
      behaviors,
      patrolRoute,
      state: { currentWaypoint: 0 },
    });
  }

  getBehaviorTree(): BehaviorTree {
    const root = this.behaviors[0];
    return BehaviorTree.create(this.name, root);
  }

  /**
   * 获取当前巡逻点索引
   */
  get currentWaypoint(): number {
    return this.state.currentWaypoint;
  }

  /**
   * 推进到下一个巡逻点（返回新的 PatrolStrategy）
   */
  advanceWaypoint(): PatrolStrategy {
    return new PatrolStrategy({
      type: this.type,
      name: this.name,
      priority: this.priority,
      conditions: this.conditions,
      behaviors: this.behaviors,
      patrolRoute: this.patrolRoute,
      state: {
        currentWaypoint: this.state.currentWaypoint + 1,
      },
    });
  }

  /**
   * 获取下一个巡逻点
   * 返回当前巡逻点
   */
  getNextWaypoint(): any {
    if (this.patrolRoute.length === 0) return null;
    return this.patrolRoute[this.state.currentWaypoint % this.patrolRoute.length];
  }
}

// ============================================================================
// 策略管理器
// ============================================================================

/**
 * StrategyManager - 策略管理器
 *
 * 管理多个策略并选择最适合的策略
 */
export class StrategyManager {
  private readonly strategies: List<Strategy>;

  constructor(strategies: Strategy[]) {
    this.strategies = List(strategies);
    Object.freeze(this);
  }

  /**
   * 创建策略管理器
   */
  static create(strategies: Strategy[]): StrategyManager {
    return new StrategyManager(strategies);
  }

  /**
   * 获取最适合的策略
   * @param context AI 上下文
   */
  getBestStrategy(context: AIContext): Strategy | null {
    let bestStrategy: Strategy | null = null;
    let highestPriority = -1;

    for (const strategy of this.strategies) {
      if (strategy.isApplicable(context) && strategy.priority > highestPriority) {
        bestStrategy = strategy;
        highestPriority = strategy.priority;
      }
    }

    return bestStrategy;
  }

  /**
   * 添加策略
   */
  addStrategy(strategy: Strategy): StrategyManager {
    return new StrategyManager([...this.strategies.toArray(), strategy]);
  }

  /**
   * 移除策略
   */
  removeStrategy(strategyType: StrategyType): StrategyManager {
    const filtered = this.strategies.filter(s => s.type !== strategyType);
    return new StrategyManager(filtered.toArray());
  }

  /**
   * 获取所有策略
   */
  getAllStrategies(): List<Strategy> {
    return this.strategies;
  }
}

// ============================================================================
// 预设策略
// ============================================================================

/**
 * 预设策略集合
 */
export const PresetStrategies = {
  /**
   * 士兵策略：战斗优先，守卫位置
   */
  SOLDIER: StrategyManager.create([
    CombatStrategy.create({
      name: '士兵战斗',
      aggressiveness: 0.8,
      preferredRange: 10,
      useCover: true,
      priority: 8,
    }),
    PatrolStrategy.create({
      name: '士兵巡逻',
      priority: 3,
    }),
  ]),

  /**
   * 幸存者策略：生存优先
   */
  SURVIVOR: StrategyManager.create([
    SurvivalStrategy.create({
      name: '幸存者生存',
      foodPriority: 0.9,
      waterPriority: 0.95,
      restPriority: 0.7,
      safetyPriority: 0.8,
      priority: 9,
    }),
    CombatStrategy.create({
      name: '幸存者自卫',
      aggressiveness: 0.3,
      preferredRange: 5,
      useCover: true,
      retreatThreshold: 0.5,
      priority: 6,
    }),
  ]),

  /**
   * 商人策略：社交优先
   */
  MERCHANT: StrategyManager.create([
    SocialStrategy.create({
      name: '商人社交',
      friendliness: 0.8,
      tradeInterest: 0.9,
      cooperationLevel: 0.7,
      priority: 7,
    }),
    SurvivalStrategy.create({
      name: '商人生存',
      foodPriority: 0.7,
      waterPriority: 0.7,
      restPriority: 0.6,
      safetyPriority: 0.9,
      priority: 5,
    }),
  ]),

  /**
   * 医生策略：治疗优先
   */
  DOCTOR: StrategyManager.create([
    SocialStrategy.create({
      name: '医生社交',
      friendliness: 0.9,
      tradeInterest: 0.3,
      cooperationLevel: 0.9,
      priority: 6,
    }),
    SurvivalStrategy.create({
      name: '医生生存',
      foodPriority: 0.6,
      waterPriority: 0.6,
      restPriority: 0.8,
      safetyPriority: 0.7,
      priority: 5,
    }),
  ]),
};
