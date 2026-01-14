/**
 * BehaviorTree - 行为树系统
 *
 * 参考行为树（Behavior Tree）设计模式
 * 管理行为树的执行和状态追踪
 *
 * 行为树是一种分层决策系统，用于 AI 决策
 * 由多个行为节点（BehaviorNode）组成树形结构
 */

import { BehaviorNode } from './BehaviorNode';
import type { AIContext } from './types';
import { BehaviorStatus, BehaviorTreeStats } from './types';

/**
 * 行为树属性（内部）
 */
interface BehaviorTreeProps {
  readonly root: BehaviorNode;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly config: Record<string, any>;
}

/**
 * BehaviorTree - 行为树类
 *
 * 使用不可变数据结构
 * 管理行为树的执行、状态追踪和统计
 */
export class BehaviorTree {
  readonly root!: BehaviorNode;
  readonly name!: string;
  readonly version!: string;
  readonly description!: string;
  readonly config!: Record<string, any>;

  // 执行状态（使用对象包装以便更新）
  private _state: {
    stats: BehaviorTreeStats;
    isAborted: boolean;
    currentNode: BehaviorNode | null;
    lastExecutionTime: number;
    executionHistory: string[];
  };

  private constructor(props: BehaviorTreeProps) {
    this.root = props.root;
    this.name = props.name;
    this.version = props.version;
    this.description = props.description;
    this.config = Object.freeze({ ...props.config });

    // 初始化统计（包装在对象中以便更新）
    this._state = {
      stats: {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
      },
      isAborted: false,
      currentNode: null,
      lastExecutionTime: 0,
      executionHistory: [],
    };

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建行为树
   * @param name 行为树名称
   * @param root 根节点
   * @param config 配置选项
   */
  static create(
    name: string,
    root: BehaviorNode,
    config?: Record<string, any>
  ): BehaviorTree {
    return new BehaviorTree({
      root,
      name,
      version: '1.0.0',
      description: config?.description ?? '',
      config: config ?? {},
    });
  }

  /**
   * 从 JSON 创建行为树
   */
  static fromJson(json: Record<string, any>): BehaviorTree {
    return new BehaviorTree({
      root: BehaviorNode.fromJson(json.root),
      name: json.name as string,
      version: (json.version as string) ?? '1.0.0',
      description: (json.description as string) ?? '',
      config: (json.config as Record<string, any>) ?? {},
    });
  }

  // ========== 核心执行方法 ==========

  /**
   * 更新行为树（每帧调用）
   * @param context AI 上下文
   * @returns 执行状态
   */
  update(context: AIContext): BehaviorStatus {
    if (this._state.isAborted) {
      return BehaviorStatus.FAILURE;
    }

    const startTime = performance.now();

    // 更新统计
    this._state.stats.totalExecutions++;

    // 执行根节点
    const status = this.root.execute(context);

    // 更新执行时间
    const executionTime = performance.now() - startTime;
    this._state.lastExecutionTime = executionTime;
    this._updateAverageExecutionTime(executionTime);

    // 更新成功/失败统计
    if (status === BehaviorStatus.SUCCESS) {
      this._state.stats.successCount++;
    } else if (status === BehaviorStatus.FAILURE) {
      this._state.stats.failureCount++;
    }

    // 记录执行历史
    const statusUpper = status.toUpperCase();
    this._state.executionHistory.push(`${this.name}: ${statusUpper} (${executionTime.toFixed(2)}ms)`);
    if (this._state.executionHistory.length > 100) {
      this._state.executionHistory.shift(); // 限制历史记录数量
    }

    return status;
  }

  /**
   * 中断当前执行
   * @returns 当前行为树实例（已中止）
   */
  abort(): BehaviorTree {
    this._state.isAborted = true;
    return this;
  }

  /**
   * 重置行为树状态
   */
  reset(): BehaviorTree {
    this._state.isAborted = false;
    this._state.currentNode = null;
    return this;
  }

  // ========== 查询方法 ==========

  /**
   * 获取当前执行的节点
   */
  getCurrentNode(): BehaviorNode | null {
    return this._state.currentNode;
  }

  /**
   * 获取执行统计
   */
  getStats(): BehaviorTreeStats {
    return { ...this._state.stats };
  }

  /**
   * 获取最后执行时间（毫秒）
   */
  getLastExecutionTime(): number {
    return this._state.lastExecutionTime;
  }

  /**
   * 获取成功率 (0-1)
   */
  getSuccessRate(): number {
    if (this._state.stats.totalExecutions === 0) return 0;
    return this._state.stats.successCount / this._state.stats.totalExecutions;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): string[] {
    return [...this._state.executionHistory];
  }

  /**
   * 是否已中止
   */
  isAborted(): boolean {
    return this._state.isAborted;
  }

  /**
   * 获取行为树描述
   */
  getDescription(): string {
    return this.description || this.name;
  }

  /**
   * 获取节点总数
   */
  getNodeCount(): number {
    return this._countNodes(this.root);
  }

  /**
   * 递归计算节点数量
   */
  private _countNodes(node: BehaviorNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this._countNodes(child);
    }
    return count;
  }

  // ========== 私有方法 ==========

  /**
   * 更新平均执行时间
   */
  private _updateAverageExecutionTime(newTime: number): void {
    const total = this._state.stats.averageExecutionTime * (this._state.stats.totalExecutions - 1);
    this._state.stats.averageExecutionTime = (total + newTime) / this._state.stats.totalExecutions;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      root: this.root.toJson(),
      config: { ...this.config },
      stats: { ...this._state.stats },
    };
  }

  /**
   * 转换为可读的字符串
   */
  toString(): string {
    const stats = this.getStats();
    return `
BehaviorTree: ${this.name} (v${this.version})
Description: ${this.description}
Nodes: ${this.getNodeCount()}
Executions: ${stats.totalExecutions}
Success Rate: ${(this.getSuccessRate() * 100).toFixed(1)}%
Avg Time: ${stats.averageExecutionTime.toFixed(2)}ms
    `.trim();
  }

  /**
   * 打印行为树结构（调试用）
   */
  printTree(indent: string = ''): string {
    let result = '';
    result += `${indent}${this.root.getDescription()}\n`;

    const printNode = (node: BehaviorNode, depth: string): void => {
      result += `${depth}${node.getDescription()}\n`;
      for (const child of node.children) {
        printNode(child, depth + '  ');
      }
    };

    for (const child of this.root.children) {
      printNode(child, indent + '  ');
    }

    return result;
  }
}

// ============================================================================
// 行为树构建器（Builder Pattern）
// ============================================================================

/**
 * BehaviorTreeBuilder - 行为树构建器
 * 提供流式 API 构建行为树
 */
export class BehaviorTreeBuilder {
  private _name: string;
  private _description: string;
  private _root?: BehaviorNode;
  private _config: Record<string, any>;

  constructor(name: string) {
    this._name = name;
    this._description = '';
    this._config = {};
  }

  /**
   * 设置描述
   */
  description(desc: string): BehaviorTreeBuilder {
    this._description = desc;
    return this;
  }

  /**
   * 设置配置
   */
  config(cfg: Record<string, any>): BehaviorTreeBuilder {
    this._config = { ...this._config, ...cfg };
    return this;
  }

  /**
   * 设置根节点
   */
  root(node: BehaviorNode): BehaviorTreeBuilder {
    this._root = node;
    return this;
  }

  /**
   * 构建行为树
   */
  build(): BehaviorTree {
    if (!this._root) {
      throw new Error('Cannot build BehaviorTree without root node');
    }

    return BehaviorTree.create(this._name, this._root, {
      description: this._description,
      ...this._config,
    });
  }
}

/**
 * 创建行为树构建器
 */
export function buildTree(name: string): BehaviorTreeBuilder {
  return new BehaviorTreeBuilder(name);
}

// ============================================================================
// 预设行为树
// ============================================================================

/**
 * 创建简单的顺序行为树
 */
export function createSequenceTree(
  name: string,
  actions: Array<{ id: string; name: string; action: (ctx: AIContext) => BehaviorStatus }>
): BehaviorTree {
  const children = actions.map(({ id, name, action }) =>
    BehaviorNode.action(id, name, action)
  );

  const root = BehaviorNode.sequence(`${name}_root`, `${name} Sequence`, children);

  return BehaviorTree.create(name, root);
}

/**
 * 创建简单的选择行为树
 */
export function createSelectorTree(
  name: string,
  options: Array<{ id: string; name: string; check: (ctx: AIContext) => BehaviorStatus }>
): BehaviorTree {
  const children = options.map(({ id, name, check }) =>
    BehaviorNode.action(id, name, check)
  );

  const root = BehaviorNode.selector(`${name}_root`, `${name} Selector`, children);

  return BehaviorTree.create(name, root);
}
