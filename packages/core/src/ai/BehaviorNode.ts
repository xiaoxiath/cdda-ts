/**
 * BehaviorNode - 行为节点系统
 *
 * 参考行为树（Behavior Tree）设计模式
 * 实现可组合的 AI 决策节点
 *
 * 节点类型：
 * - 复合节点（Composite）：Selector, Sequence, Parallel
 * - 装饰器节点（Decorator）：Inverter, Repeater, Retry, Cooldown
 * - 条件节点（Condition）：检查条件
 * - 动作节点（Action）：执行动作
 */

import { List } from 'immutable';
import type { AIContext } from './types';
import {
  BehaviorStatus,
  BehaviorNodeType,
  ParallelPolicy,
} from './types';

/**
 * 行为节点属性（内部）
 */
interface BehaviorNodeProps {
  readonly id: string;
  readonly name: string;
  readonly type: BehaviorNodeType;
  readonly children: List<BehaviorNode>;
  readonly condition?: (context: AIContext) => boolean;
  readonly action?: (context: AIContext) => BehaviorStatus;
  readonly config: Record<string, any>;
}

/**
 * BehaviorNode - 行为节点类
 *
 * 使用不可变数据结构
 * 所有节点都是不可变的，执行后返回新的状态
 */
export class BehaviorNode {
  readonly id!: string;
  readonly name!: string;
  readonly type!: BehaviorNodeType;
  readonly children!: List<BehaviorNode>;
  readonly condition?: (context: AIContext) => boolean;
  readonly action?: (context: AIContext) => BehaviorStatus;
  readonly config!: Record<string, any>;

  // 内部可变状态（用于装饰器节点）
  private _internalState?: Record<string, any>;

  private constructor(props: BehaviorNodeProps) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.children = props.children;
    this.condition = props.condition;
    this.action = props.action;
    this.config = Object.freeze({ ...props.config });

    // 为某些节点类型创建内部状态
    if (props.type === BehaviorNodeType.REPEATER ||
        props.type === BehaviorNodeType.RETRY ||
        props.type === BehaviorNodeType.COOLDOWN) {
      this._internalState = { ...props.config };
    }

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建选择器节点 (Selector)
   * 依次执行子节点，直到有一个成功返回
   * 如果所有子节点都失败，则返回 FAILURE
   */
  static selector(
    id: string,
    name: string,
    children: BehaviorNode[]
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.SELECTOR,
      children: List(children),
      config: {},
    });
  }

  /**
   * 创建序列节点 (Sequence)
   * 依次执行所有子节点，全部成功才返回 SUCCESS
   * 如果有子节点失败，则立即返回 FAILURE
   */
  static sequence(
    id: string,
    name: string,
    children: BehaviorNode[]
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.SEQUENCE,
      children: List(children),
      config: {},
    });
  }

  /**
   * 创建并行节点 (Parallel)
   * 同时执行所有子节点
   * @param policy 并行策略
   * - REQUIRE_ONE: 任一成功即成功
   * - REQUIRE_ALL: 全部成功才成功
   * - REQUIRE_SUCCESS: 按成功比例判断
   */
  static parallel(
    id: string,
    name: string,
    children: BehaviorNode[],
    policy: ParallelPolicy = ParallelPolicy.REQUIRE_ALL
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.PARALLEL,
      children: List(children),
      config: { policy },
    });
  }

  /**
   * 创建条件节点 (Condition)
   * 检查条件是否满足，返回 SUCCESS 或 FAILURE
   */
  static condition(
    id: string,
    name: string,
    check: (context: AIContext) => boolean
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.CONDITION,
      children: List(),
      condition: check,
      config: {},
    });
  }

  /**
   * 创建动作节点 (Action)
   * 执行具体动作，返回执行状态
   */
  static action(
    id: string,
    name: string,
    execute: (context: AIContext) => BehaviorStatus
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.ACTION,
      children: List(),
      action: execute,
      config: {},
    });
  }

  /**
   * 创建反转装饰器 (Inverter)
   * 反转子节点的执行结果
   * SUCCESS -> FAILURE, FAILURE -> SUCCESS
   */
  static inverter(
    id: string,
    name: string,
    child: BehaviorNode
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.INVERTER,
      children: List([child]),
      config: {},
    });
  }

  /**
   * 创建重复装饰器 (Repeater)
   * 重复执行子节点指定次数
   * @param count 重复次数（-1 表示无限重复）
   */
  static repeater(
    id: string,
    name: string,
    child: BehaviorNode,
    count: number = -1
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.REPEATER,
      children: List([child]),
      config: { count, current: 0 },
    });
  }

  /**
   * 创建重试装饰器 (Retry)
   * 子节点失败时重试指定次数
   * @param maxRetries 最大重试次数
   */
  static retry(
    id: string,
    name: string,
    child: BehaviorNode,
    maxRetries: number = 3
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.RETRY,
      children: List([child]),
      config: { maxRetries, currentRetry: 0 },
    });
  }

  /**
   * 创建冷却装饰器 (Cooldown)
   * 节点执行后需要等待一定时间才能再次执行
   * @param cooldownMs 冷却时间（毫秒）
   */
  static cooldown(
    id: string,
    name: string,
    child: BehaviorNode,
    cooldownMs: number
  ): BehaviorNode {
    return new BehaviorNode({
      id,
      name,
      type: BehaviorNodeType.COOLDOWN,
      children: List([child]),
      config: { cooldownMs, lastExecution: 0 },
    });
  }

  // ========== 执行方法 ==========

  /**
   * 执行节点
   * @param context AI 上下文
   * @returns 执行状态
   */
  execute(context: AIContext): BehaviorStatus {
    // 检查条件（如果有）
    if (this.condition && !this.checkCondition(context)) {
      return BehaviorStatus.FAILURE;
    }

    // 根据节点类型执行
    switch (this.type) {
      case BehaviorNodeType.SELECTOR:
        return this.executeSelector(context);
      case BehaviorNodeType.SEQUENCE:
        return this.executeSequence(context);
      case BehaviorNodeType.PARALLEL:
        return this.executeParallel(context);
      case BehaviorNodeType.INVERTER:
        return this.executeInverter(context);
      case BehaviorNodeType.REPEATER:
        return this.executeRepeater(context);
      case BehaviorNodeType.RETRY:
        return this.executeRetry(context);
      case BehaviorNodeType.COOLDOWN:
        return this.executeCooldown(context);
      case BehaviorNodeType.CONDITION:
        return this.condition!(context) ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
      case BehaviorNodeType.ACTION:
        return this.action ? this.action(context) : BehaviorStatus.FAILURE;
      default:
        return BehaviorStatus.INVALID;
    }
  }

  /**
   * 检查条件
   */
  checkCondition(context: AIContext): boolean {
    return this.condition ? this.condition(context) : true;
  }

  // ========== 复合节点执行 ==========

  /**
   * 执行选择器节点
   * 依次执行子节点，直到有成功
   */
  private executeSelector(context: AIContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status === BehaviorStatus.SUCCESS) {
        return BehaviorStatus.SUCCESS;
      }
      if (status === BehaviorStatus.RUNNING) {
        return BehaviorStatus.RUNNING;
      }
    }
    return BehaviorStatus.FAILURE;
  }

  /**
   * 执行序列节点
   * 依次执行所有子节点，全部成功才返回成功
   */
  private executeSequence(context: AIContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status !== BehaviorStatus.SUCCESS) {
        return status;
      }
    }
    return BehaviorStatus.SUCCESS;
  }

  /**
   * 执行并行节点
   * 同时执行所有子节点
   */
  private executeParallel(context: AIContext): BehaviorStatus {
    const policy = this.config.policy as ParallelPolicy;
    const results: BehaviorStatus[] = [];

    // 执行所有子节点
    for (const child of this.children) {
      const status = child.execute(context);
      results.push(status);
    }

    // 根据策略判断结果
    const successCount = results.filter(r => r === BehaviorStatus.SUCCESS).length;
    const failureCount = results.filter(r => r === BehaviorStatus.FAILURE).length;
    const runningCount = results.filter(r => r === BehaviorStatus.RUNNING).length;

    switch (policy) {
      case ParallelPolicy.REQUIRE_ONE:
        // 任一成功即成功
        if (successCount > 0) return BehaviorStatus.SUCCESS;
        if (runningCount > 0) return BehaviorStatus.RUNNING;
        return BehaviorStatus.FAILURE;

      case ParallelPolicy.REQUIRE_ALL:
        // 全部成功才成功
        if (failureCount > 0) return BehaviorStatus.FAILURE;
        if (runningCount > 0) return BehaviorStatus.RUNNING;
        return BehaviorStatus.SUCCESS;

      case ParallelPolicy.REQUIRE_SUCCESS:
        // 按成功比例判断（默认要求 > 50%）
        const successRate = successCount / this.children.size;
        if (successRate > 0.5) return BehaviorStatus.SUCCESS;
        if (runningCount > 0) return BehaviorStatus.RUNNING;
        return BehaviorStatus.FAILURE;

      default:
        return BehaviorStatus.INVALID;
    }
  }

  // ========== 装饰器节点执行 ==========

  /**
   * 执行反转装饰器
   */
  private executeInverter(context: AIContext): BehaviorStatus {
    if (this.children.size !== 1) {
      return BehaviorStatus.INVALID;
    }

    const child = this.children.first();
    if (!child) return BehaviorStatus.INVALID;

    const status = child.execute(context);

    // 反转结果
    if (status === BehaviorStatus.SUCCESS) return BehaviorStatus.FAILURE;
    if (status === BehaviorStatus.FAILURE) return BehaviorStatus.SUCCESS;
    return status; // RUNNING 保持不变
  }

  /**
   * 执行重复装饰器
   */
  private executeRepeater(context: AIContext): BehaviorStatus {
    if (this.children.size !== 1) {
      return BehaviorStatus.INVALID;
    }

    const child = this.children.first();
    if (!child) return BehaviorStatus.INVALID;

    const count = this.config.count as number;
    const current = (this._internalState?.current as number ?? 0);

    // 无限重复 - 循环执行直到子节点返回非 SUCCESS 状态
    if (count === -1) {
      while (true) {
        const status = child.execute(context);
        if (status !== BehaviorStatus.SUCCESS) {
          return status;
        }
      }
    }

    // 有限次数重复
    if (current >= count) {
      return BehaviorStatus.SUCCESS;
    }

    // 执行子节点
    const status = child.execute(context);

    // 如果成功，更新计数并继续执行
    if (status === BehaviorStatus.SUCCESS && this._internalState) {
      this._internalState.current = current + 1;

      // 如果还没达到计数，继续执行
      if (this._internalState.current < count) {
        return this.executeRepeater(context);
      }
    }

    return status;
  }

  /**
   * 执行重试装饰器
   */
  private executeRetry(context: AIContext): BehaviorStatus {
    if (this.children.size !== 1) {
      return BehaviorStatus.INVALID;
    }

    const child = this.children.first();
    if (!child) return BehaviorStatus.INVALID;

    const maxRetries = this.config.maxRetries as number;
    let currentRetry = this._internalState?.currentRetry as number ?? 0;

    while (currentRetry <= maxRetries) {
      const status = child.execute(context);

      if (status === BehaviorStatus.SUCCESS) {
        if (this._internalState) {
          this._internalState.currentRetry = 0; // 重置计数
        }
        return BehaviorStatus.SUCCESS;
      }

      if (status === BehaviorStatus.RUNNING) {
        return BehaviorStatus.RUNNING;
      }

      // 失败，重试
      currentRetry++;
      if (this._internalState) {
        this._internalState.currentRetry = currentRetry;
      }
    }

    return BehaviorStatus.FAILURE;
  }

  /**
   * 执行冷却装饰器
   */
  private executeCooldown(context: AIContext): BehaviorStatus {
    if (this.children.size !== 1) {
      return BehaviorStatus.INVALID;
    }

    const child = this.children.first();
    if (!child) return BehaviorStatus.INVALID;

    const cooldownMs = this.config.cooldownMs as number;
    const lastExecution = this._internalState?.lastExecution as number ?? 0;
    const currentTime = context.currentTime;

    // 检查冷却时间
    if (currentTime - lastExecution < cooldownMs) {
      return BehaviorStatus.FAILURE;
    }

    // 执行子节点
    const status = child.execute(context);

    // 如果执行了，更新最后执行时间
    if ((status === BehaviorStatus.SUCCESS || status === BehaviorStatus.RUNNING) && this._internalState) {
      this._internalState.lastExecution = currentTime;
    }

    return status;
  }

  // ========== 查询方法 ==========

  /**
   * 获取子节点数量
   */
  getChildCount(): number {
    return this.children.size;
  }

  /**
   * 是否为叶子节点
   */
  isLeaf(): boolean {
    return this.children.size === 0;
  }

  /**
   * 是否为复合节点
   */
  isComposite(): boolean {
    return [
      BehaviorNodeType.SELECTOR,
      BehaviorNodeType.SEQUENCE,
      BehaviorNodeType.PARALLEL,
    ].includes(this.type);
  }

  /**
   * 是否为装饰器节点
   */
  isDecorator(): boolean {
    return [
      BehaviorNodeType.INVERTER,
      BehaviorNodeType.REPEATER,
      BehaviorNodeType.RETRY,
      BehaviorNodeType.COOLDOWN,
    ].includes(this.type);
  }

  /**
   * 获取节点描述
   */
  getDescription(): string {
    return `${this.name} (${this.type})`;
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      children: this.children.map(child => child.toJson()).toArray(),
      config: { ...this.config },
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): BehaviorNode {
    // 简化版本，实际应用中需要更完整的反序列化逻辑
    const children = (json.children as Record<string, any>[]).map(childJson =>
      BehaviorNode.fromJson(childJson)
    );

    return new BehaviorNode({
      id: json.id as string,
      name: json.name as string,
      type: json.type as BehaviorNodeType,
      children: List(children),
      config: json.config as Record<string, any> ?? {},
    });
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建简单的条件检查节点
 */
export function check(
  id: string,
  name: string,
  predicate: (context: AIContext) => boolean
): BehaviorNode {
  return BehaviorNode.condition(id, name, predicate);
}

/**
 * 创建简单的动作执行节点
 */
export function action(
  id: string,
  name: string,
  execute: (context: AIContext) => void
): BehaviorNode {
  return BehaviorNode.action(id, name, (context: AIContext) => {
    execute(context);
    return BehaviorStatus.SUCCESS;
  });
}

/**
 * 创建选择器（便捷方法）
 */
export function selector(
  id: string,
  name: string,
  ...children: BehaviorNode[]
): BehaviorNode {
  return BehaviorNode.selector(id, name, children);
}

/**
 * 创建序列（便捷方法）
 */
export function sequence(
  id: string,
  name: string,
  ...children: BehaviorNode[]
): BehaviorNode {
  return BehaviorNode.sequence(id, name, children);
}

/**
 * 创建并行（便捷方法）
 */
export function parallel(
  id: string,
  name: string,
  policy: ParallelPolicy,
  ...children: BehaviorNode[]
): BehaviorNode {
  return BehaviorNode.parallel(id, name, children, policy);
}
