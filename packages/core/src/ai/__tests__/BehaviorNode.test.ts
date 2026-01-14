/**
 * BehaviorNode 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorNode, check, action, selector, sequence } from '../BehaviorNode';
import { BehaviorStatus, BehaviorNodeType, ParallelPolicy } from '../types';
import type { AIContext } from '../types';

describe('BehaviorNode', () => {
  let mockContext: AIContext;

  beforeEach(() => {
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
  });

  describe('condition', () => {
    it('should create condition node', () => {
      const node = BehaviorNode.condition(
        'test_condition',
        '测试条件',
        (ctx: AIContext) => ctx.npc.currentHP > 50
      );

      expect(node.id).toBe('test_condition');
      expect(node.name).toBe('测试条件');
      expect(node.type).toBe(BehaviorNodeType.CONDITION);
      expect(node.isLeaf()).toBe(true);
    });

    it('should return SUCCESS when condition is true', () => {
      const node = BehaviorNode.condition(
        'test_condition',
        '测试条件',
        (ctx: AIContext) => ctx.npc.currentHP > 50
      );

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should return FAILURE when condition is false', () => {
      const node = BehaviorNode.condition(
        'test_condition',
        '测试条件',
        (ctx: AIContext) => ctx.npc.currentHP > 150
      );

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
    });
  });

  describe('action', () => {
    it('should create action node', () => {
      let executed = false;
      const node = BehaviorNode.action(
        'test_action',
        '测试动作',
        (ctx: AIContext) => {
          executed = true;
          return BehaviorStatus.SUCCESS;
        }
      );

      expect(node.id).toBe('test_action');
      expect(node.name).toBe('测试动作');
      expect(node.type).toBe(BehaviorNodeType.ACTION);
    });

    it('should execute action and return status', () => {
      let executed = false;
      const node = BehaviorNode.action(
        'test_action',
        '测试动作',
        (ctx: AIContext) => {
          executed = true;
          return BehaviorStatus.SUCCESS;
        }
      );

      const status = node.execute(mockContext);
      expect(executed).toBe(true);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should return RUNNING for long-running actions', () => {
      const node = BehaviorNode.action(
        'test_action',
        '测试动作',
        (ctx: AIContext) => BehaviorStatus.RUNNING
      );

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.RUNNING);
    });
  });

  describe('selector', () => {
    it('should create selector node', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => false),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.selector('test_selector', '测试选择器', children);

      expect(node.id).toBe('test_selector');
      expect(node.type).toBe(BehaviorNodeType.SELECTOR);
      expect(node.getChildCount()).toBe(2);
    });

    it('should return SUCCESS when first child succeeds', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => false),
      ];
      const node = BehaviorNode.selector('test_selector', '测试选择器', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should return FAILURE when all children fail', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => false),
        BehaviorNode.condition('c2', '条件2', () => false),
      ];
      const node = BehaviorNode.selector('test_selector', '测试选择器', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
    });

    it('should try all children until one succeeds', () => {
      let executionOrder: string[] = [];
      const children = [
        BehaviorNode.action('a1', '动作1', () => {
          executionOrder.push('a1');
          return BehaviorStatus.FAILURE;
        }),
        BehaviorNode.action('a2', '动作2', () => {
          executionOrder.push('a2');
          return BehaviorStatus.SUCCESS;
        }),
        BehaviorNode.action('a3', '动作3', () => {
          executionOrder.push('a3');
          return BehaviorStatus.SUCCESS;
        }),
      ];
      const node = BehaviorNode.selector('test_selector', '测试选择器', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
      expect(executionOrder).toEqual(['a1', 'a2']);
    });
  });

  describe('sequence', () => {
    it('should create sequence node', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.sequence('test_sequence', '测试序列', children);

      expect(node.id).toBe('test_sequence');
      expect(node.type).toBe(BehaviorNodeType.SEQUENCE);
      expect(node.getChildCount()).toBe(2);
    });

    it('should return SUCCESS when all children succeed', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.sequence('test_sequence', '测试序列', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should return FAILURE when any child fails', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => false),
      ];
      const node = BehaviorNode.sequence('test_sequence', '测试序列', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
    });

    it('should execute all children in order', () => {
      let executionOrder: string[] = [];
      const children = [
        BehaviorNode.action('a1', '动作1', () => {
          executionOrder.push('a1');
          return BehaviorStatus.SUCCESS;
        }),
        BehaviorNode.action('a2', '动作2', () => {
          executionOrder.push('a2');
          return BehaviorStatus.SUCCESS;
        }),
        BehaviorNode.action('a3', '动作3', () => {
          executionOrder.push('a3');
          return BehaviorStatus.SUCCESS;
        }),
      ];
      const node = BehaviorNode.sequence('test_sequence', '测试序列', children);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
      expect(executionOrder).toEqual(['a1', 'a2', 'a3']);
    });
  });

  describe('parallel', () => {
    it('should create parallel node', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.parallel('test_parallel', '测试并行', children, ParallelPolicy.REQUIRE_ALL);

      expect(node.id).toBe('test_parallel');
      expect(node.type).toBe(BehaviorNodeType.PARALLEL);
      expect(node.getChildCount()).toBe(2);
    });

    it('should return SUCCESS when all children succeed (REQUIRE_ALL)', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.parallel('test_parallel', '测试并行', children, ParallelPolicy.REQUIRE_ALL);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should return FAILURE when any child fails (REQUIRE_ALL)', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => false),
      ];
      const node = BehaviorNode.parallel('test_parallel', '测试并行', children, ParallelPolicy.REQUIRE_ALL);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
    });

    it('should return SUCCESS when one child succeeds (REQUIRE_ONE)', () => {
      const children = [
        BehaviorNode.condition('c1', '条件1', () => false),
        BehaviorNode.condition('c2', '条件2', () => true),
      ];
      const node = BehaviorNode.parallel('test_parallel', '测试并行', children, ParallelPolicy.REQUIRE_ONE);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });
  });

  describe('inverter', () => {
    it('should create inverter node', () => {
      const child = BehaviorNode.condition('c1', '条件1', () => true);
      const node = BehaviorNode.inverter('test_inverter', '测试反转', child);

      expect(node.id).toBe('test_inverter');
      expect(node.type).toBe(BehaviorNodeType.INVERTER);
      expect(node.getChildCount()).toBe(1);
    });

    it('should invert SUCCESS to FAILURE', () => {
      const child = BehaviorNode.condition('c1', '条件1', () => true);
      const node = BehaviorNode.inverter('test_inverter', '测试反转', child);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
    });

    it('should invert FAILURE to SUCCESS', () => {
      const child = BehaviorNode.condition('c1', '条件1', () => false);
      const node = BehaviorNode.inverter('test_inverter', '测试反转', child);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
    });

    it('should keep RUNNING unchanged', () => {
      const child = BehaviorNode.action('a1', '动作1', () => BehaviorStatus.RUNNING);
      const node = BehaviorNode.inverter('test_inverter', '测试反转', child);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.RUNNING);
    });
  });

  describe('repeater', () => {
    it('should create repeater node', () => {
      const child = BehaviorNode.action('a1', '动作1', () => BehaviorStatus.SUCCESS);
      const node = BehaviorNode.repeater('test_repeater', '测试重复', child, 3);

      expect(node.id).toBe('test_repeater');
      expect(node.type).toBe(BehaviorNodeType.REPEATER);
      expect(node.config.count).toBe(3);
    });

    it('should repeat child node specified times', () => {
      let count = 0;
      const child = BehaviorNode.action('a1', '动作1', () => {
        count++;
        return BehaviorStatus.SUCCESS;
      });
      const node = BehaviorNode.repeater('test_repeater', '测试重复', child, 3);

      node.execute(mockContext);
      expect(count).toBe(3);
    });

    it('should repeat infinitely when count is -1', () => {
      let count = 0;
      const child = BehaviorNode.action('a1', '动作1', () => {
        count++;
        return count >= 100 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
      });
      const node = BehaviorNode.repeater('test_repeater', '测试重复', child, -1);

      node.execute(mockContext);
      expect(count).toBe(100);
    });
  });

  describe('retry', () => {
    it('should create retry node', () => {
      const child = BehaviorNode.action('a1', '动作1', () => BehaviorStatus.FAILURE);
      const node = BehaviorNode.retry('test_retry', '测试重试', child, 3);

      expect(node.id).toBe('test_retry');
      expect(node.type).toBe(BehaviorNodeType.RETRY);
      expect(node.config.maxRetries).toBe(3);
    });

    it('should retry on failure', () => {
      let attempts = 0;
      const child = BehaviorNode.action('a1', '动作1', () => {
        attempts++;
        return attempts >= 3 ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
      });
      const node = BehaviorNode.retry('test_retry', '测试重试', child, 3);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.SUCCESS);
      expect(attempts).toBe(3);
    });

    it('should return FAILURE after max retries', () => {
      let attempts = 0;
      const child = BehaviorNode.action('a1', '动作1', () => {
        attempts++;
        return BehaviorStatus.FAILURE;
      });
      const node = BehaviorNode.retry('test_retry', '测试重试', child, 2);

      const status = node.execute(mockContext);
      expect(status).toBe(BehaviorStatus.FAILURE);
      expect(attempts).toBe(3); // 初始 + 2 次重试
    });
  });

  describe('cooldown', () => {
    it('should create cooldown node', () => {
      const child = BehaviorNode.action('a1', '动作1', () => BehaviorStatus.SUCCESS);
      const node = BehaviorNode.cooldown('test_cooldown', '测试冷却', child, 1000);

      expect(node.id).toBe('test_cooldown');
      expect(node.type).toBe(BehaviorNodeType.COOLDOWN);
      expect(node.config.cooldownMs).toBe(1000);
    });

    it('should execute child after cooldown', () => {
      let executed = false;
      const child = BehaviorNode.action('a1', '动作1', () => {
        executed = true;
        return BehaviorStatus.SUCCESS;
      });
      const node = BehaviorNode.cooldown('test_cooldown', '测试冷却', child, 1000);

      // 第一次执行
      const status1 = node.execute(mockContext);
      expect(status1).toBe(BehaviorStatus.SUCCESS);
      expect(executed).toBe(true);

      executed = false;

      // 冷却期内
      const status2 = node.execute(mockContext);
      expect(status2).toBe(BehaviorStatus.FAILURE);
      expect(executed).toBe(false);
    });
  });

  describe('helper functions', () => {
    it('should create condition using check helper', () => {
      const node = check('test_check', '检查', (ctx: AIContext) => true);

      expect(node.type).toBe(BehaviorNodeType.CONDITION);
      expect(node.execute(mockContext)).toBe(BehaviorStatus.SUCCESS);
    });

    it('should create action using action helper', () => {
      let executed = false;
      const node = action('test_action', '动作', () => {
        executed = true;
      });

      expect(node.type).toBe(BehaviorNodeType.ACTION);
      node.execute(mockContext);
      expect(executed).toBe(true);
    });

    it('should create selector using selector helper', () => {
      const node = selector('test_sel', '选择器',
        BehaviorNode.condition('c1', '条件1', () => false),
        BehaviorNode.condition('c2', '条件2', () => true)
      );

      expect(node.type).toBe(BehaviorNodeType.SELECTOR);
      expect(node.execute(mockContext)).toBe(BehaviorStatus.SUCCESS);
    });

    it('should create sequence using sequence helper', () => {
      const node = sequence('test_seq', '序列',
        BehaviorNode.condition('c1', '条件1', () => true),
        BehaviorNode.condition('c2', '条件2', () => true)
      );

      expect(node.type).toBe(BehaviorNodeType.SEQUENCE);
      expect(node.execute(mockContext)).toBe(BehaviorStatus.SUCCESS);
    });
  });

  describe('query methods', () => {
    it('should check if node is leaf', () => {
      const leafNode = BehaviorNode.condition('c1', '条件1', () => true);
      expect(leafNode.isLeaf()).toBe(true);

      const compositeNode = BehaviorNode.selector('sel', '选择器', [
        BehaviorNode.condition('c1', '条件1', () => true),
      ]);
      expect(compositeNode.isLeaf()).toBe(false);
    });

    it('should check if node is composite', () => {
      const compositeNode = BehaviorNode.selector('sel', '选择器', []);
      expect(compositeNode.isComposite()).toBe(true);

      const leafNode = BehaviorNode.condition('c1', '条件1', () => true);
      expect(leafNode.isComposite()).toBe(false);
    });

    it('should check if node is decorator', () => {
      const child = BehaviorNode.condition('c1', '条件1', () => true);
      const decoratorNode = BehaviorNode.inverter('inv', '反转', child);
      expect(decoratorNode.isDecorator()).toBe(true);

      expect(child.isDecorator()).toBe(false);
    });

    it('should get node description', () => {
      const node = BehaviorNode.condition('c1', '测试条件', () => true);
      expect(node.getDescription()).toBe('测试条件 (condition)');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const child = BehaviorNode.condition('c1', '条件1', () => true);
      const node = BehaviorNode.selector('sel', '选择器', [child]);

      const json = node.toJson();
      expect(json.id).toBe('sel');
      expect(json.name).toBe('选择器');
      expect(json.type).toBe(BehaviorNodeType.SELECTOR);
      expect(json.children).toHaveLength(1);
    });
  });
});
