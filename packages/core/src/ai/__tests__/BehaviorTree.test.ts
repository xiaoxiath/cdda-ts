/**
 * BehaviorTree 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorTree, BehaviorTreeBuilder, buildTree, createSequenceTree } from '../BehaviorTree';
import { BehaviorNode } from '../BehaviorNode';
import { BehaviorStatus } from '../types';
import type { AIContext } from '../types';

describe('BehaviorTree', () => {
  let mockContext: AIContext;
  let mockNode: BehaviorNode;

  beforeEach(() => {
    vi.useFakeTimers();

    // 创建模拟的 AI 上下文
    mockContext = {
      npc: {
        id: 'test_npc',
        position: { x: 0, y: 0, z: 0 },
        currentHP: 100,
        maxHP: 100,
      },
      map: {},
      oracle: {
        getPerceivedEnemies: () => [],
        getPerceivedEntityCount: () => 0,
      },
      pathfinding: {},
      currentTime: Date.now(),
      deltaTime: 100,
      blackboard: new Map(),
    };

    // 创建模拟节点
    mockNode = BehaviorNode.condition(
      'test_condition',
      '测试条件',
      (ctx: AIContext) => ctx.npc.currentHP > 50
    );
  });

  describe('create', () => {
    it('should create behavior tree', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      expect(tree.name).toBe('test_tree');
      expect(tree.version).toBe('1.0.0');
      expect(tree.root).toBe(mockNode);
    });

    it('should create with config', () => {
      const tree = BehaviorTree.create('test_tree', mockNode, {
        description: '测试行为树',
        customOption: 'value',
      });

      expect(tree.name).toBe('test_tree');
      expect(tree.getDescription()).toBe('测试行为树');
      expect(tree.config.customOption).toBe('value');
    });

    it('should initialize with empty stats', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);
      const stats = tree.getStats();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
    });
  });

  describe('update', () => {
    it('should execute root node', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);
      const status = tree.update(mockContext);

      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should update stats after execution', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const stats = tree.getStats();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    it('should track execution time', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const executionTime = tree.getLastExecutionTime();

      expect(executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should update average execution time', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      tree.update(mockContext);

      const stats = tree.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should count failures', () => {
      const failNode = BehaviorNode.condition('fail', '失败', () => false);
      const tree = BehaviorTree.create('test_tree', failNode);

      tree.update(mockContext);
      const stats = tree.getStats();

      expect(stats.failureCount).toBe(1);
    });

    it('should record execution history', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const history = tree.getExecutionHistory();

      expect(history.length).toBe(1);
      expect(history[0]).toContain('test_tree');
      expect(history[0]).toContain('SUCCESS');
    });

    it('should limit history size', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      // 执行超过限制次数
      for (let i = 0; i < 150; i++) {
        tree.update(mockContext);
      }

      const history = tree.getExecutionHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('abort', () => {
    it('should abort execution', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.abort();
      expect(tree.isAborted()).toBe(true);
    });

    it('should reset after abort', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.abort();
      tree.reset();

      expect(tree.isAborted()).toBe(false);
    });

    it('should return FAILURE when aborted', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.abort();
      const status = tree.update(mockContext);

      expect(status).toBe(BehaviorStatus.FAILURE);
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      tree.reset();

      expect(tree.getCurrentNode()).toBe(null);
    });
  });

  describe('query methods', () => {
    it('should get current node', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      const currentNode = tree.getCurrentNode();
      // 初始时应该为 null
      expect(currentNode).toBe(null);
    });

    it('should get success rate', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const successRate = tree.getSuccessRate();

      expect(successRate).toBe(1.0);
    });

    it('should calculate success rate correctly', () => {
      const failNode = BehaviorNode.condition('fail', '失败', () => false);
      const tree = BehaviorTree.create('test_tree', failNode);

      tree.update(mockContext);
      tree.update(mockContext);
      tree.update(mockContext);

      const successRate = tree.getSuccessRate();
      expect(successRate).toBe(0.0);
    });

    it('should return 0 success rate when no executions', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      const successRate = tree.getSuccessRate();
      expect(successRate).toBe(0);
    });
  });

  describe('node counting', () => {
    it('should count single node', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      expect(tree.getNodeCount()).toBe(1);
    });

    it('should count complex tree', () => {
      const complexNode = BehaviorNode.selector('sel', '选择器', [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.sequence('seq', '序列', [
          BehaviorNode.condition('c2', '条件2', () => true),
          BehaviorNode.condition('c3', '条件3', () => true),
        ]),
      ]);

      const tree = BehaviorTree.create('test_tree', complexNode);

      // 根节点(1) + 选择器子节点(2) + 序列子节点(2) = 5
      expect(tree.getNodeCount()).toBe(5);
    });
  });

  describe('toString', () => {
    it('should convert to string', () => {
      const tree = BehaviorTree.create('test_tree', mockNode, {
        description: '测试描述',
      });

      const str = tree.toString();

      expect(str).toContain('test_tree');
      expect(str).toContain('v1.0.0');
      expect(str).toContain('测试描述');
      expect(str).toContain('Nodes: 1');
    });

    it('should show statistics', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const str = tree.toString();

      expect(str).toContain('Executions: 1');
      expect(str).toContain('Success Rate:');
    });
  });

  describe('printTree', () => {
    it('should print tree structure', () => {
      const complexNode = BehaviorNode.selector('sel', '选择器', [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.sequence('seq', '序列', [
          BehaviorNode.condition('c2', '条件2', () => true),
        ]),
      ]);

      const tree = BehaviorTree.create('test_tree', complexNode);
      const printed = tree.printTree();

      expect(printed).toContain('选择器 (selector)');
      expect(printed).toContain('条件1 (condition)');
      expect(printed).toContain('序列 (sequence)');
      expect(printed).toContain('条件2 (condition)');
    });
  });

  describe('BehaviorTreeBuilder', () => {
    it('should build tree using builder', () => {
      const tree = buildTree('builder_test')
        .description('构建器测试')
        .config({ custom: 'value' })
        .root(mockNode)
        .build();

      expect(tree.name).toBe('builder_test');
      expect(tree.getDescription()).toBe('构建器测试');
      expect(tree.config.custom).toBe('value');
    });

    it('should throw error without root', () => {
      const builder = buildTree('invalid_tree');

      expect(() => builder.build()).toThrow('Cannot build BehaviorTree without root node');
    });

    it('should support method chaining', () => {
      const tree = buildTree('chain_test')
        .description('描述')
        .config({ key: 'value' })
        .root(mockNode)
        .build();

      expect(tree).toBeDefined();
    });
  });

  describe('factory functions', () => {
    it('should create sequence tree', () => {
      const tree = createSequenceTree('seq_test', [
        { id: 'a1', name: '动作1', action: () => BehaviorStatus.SUCCESS },
        { id: 'a2', name: '动作2', action: () => BehaviorStatus.SUCCESS },
      ]);

      expect(tree.name).toBe('seq_test');
      expect(tree.getNodeCount()).toBe(3); // 根节点 + 2 个动作节点
    });

    it('should execute sequence tree', () => {
      let count = 0;
      const tree = createSequenceTree('seq_test', [
        { id: 'a1', name: '动作1', action: () => { count++; return BehaviorStatus.SUCCESS; } },
        { id: 'a2', name: '动作2', action: () => { count++; return BehaviorStatus.SUCCESS; } },
      ]);

      tree.update(mockContext);
      expect(count).toBe(2);
    });
  });

  describe('fromJson', () => {
    it('should create from JSON', () => {
      const originalTree = BehaviorTree.create('test_tree', mockNode);
      const json = originalTree.toJson();

      const restoredTree = BehaviorTree.fromJson(json);

      expect(restoredTree.name).toBe('test_tree');
      expect(restoredTree.version).toBe('1.0.0');
    });
  });

  describe('toJson', () => {
    it('should convert to JSON', () => {
      const tree = BehaviorTree.create('test_tree', mockNode, {
        description: '测试描述',
      });

      const json = tree.toJson();

      expect(json.name).toBe('test_tree');
      expect(json.version).toBe('1.0.0');
      expect(json.description).toBe('测试描述');
      expect(json.root).toBeDefined();
      expect(json.config).toBeDefined();
      expect(json.stats).toBeDefined();
    });

    it('should include stats in JSON', () => {
      const tree = BehaviorTree.create('test_tree', mockNode);

      tree.update(mockContext);
      const json = tree.toJson();

      expect(json.stats.totalExecutions).toBe(1);
      expect(json.stats.successCount).toBe(1);
    });
  });
});
