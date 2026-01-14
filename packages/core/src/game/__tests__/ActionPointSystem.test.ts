/**
 * ActionPointSystem Tests - 行动点系统测试
 *
 * 测试基于速度的行动点系统
 * 参考 CDDA 速度-移动点机制
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionPointSystem, ActionType, DEFAULT_ACTION_COST } from '../ActionPointSystem';
import { Tripoint } from '../../coordinates/Tripoint';

// Mock Creature 类
class MockCreature {
  constructor(
    public readonly id: string,
    public readonly position: Tripoint,
    public readonly name: string,
    public readonly speed: number = 100
  ) {}
}

describe('ActionPointSystem', () => {
  let creature: MockCreature;
  let aps: ActionPointSystem;

  beforeEach(() => {
    creature = new MockCreature(
      'creature_001',
      new Tripoint({ x: 0, y: 0, z: 0 }),
      'Test Creature',
      100
    );
    aps = ActionPointSystem.create(creature);
  });

  describe('创建和初始化', () => {
    it('应该使用默认配置创建行动点系统', () => {
      expect(aps.creature).toBe(creature);
      expect(aps.config.baseMoveCost).toBe(DEFAULT_ACTION_COST.baseMoveCost);
      expect(aps.config.diagonalMoveMultiplier).toBe(DEFAULT_ACTION_COST.diagonalMoveMultiplier);
      expect(aps.currentTurn).toBe(0);
      expect(aps.actionHistory).toEqual([]);
    });

    it('应该根据速度计算初始预算', () => {
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        150
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      expect(fastAPS.currentBudget.totalBudget).toBe(150);
      expect(fastAPS.currentBudget.remaining).toBe(150);
    });

    it('应该支持自定义配置', () => {
      const customAPS = ActionPointSystem.create(creature, {
        baseMoveCost: 150,
        attackCost: 120,
      });

      expect(customAPS.config.baseMoveCost).toBe(150);
      expect(customAPS.config.attackCost).toBe(120);
      expect(customAPS.config.diagonalMoveMultiplier).toBe(1.414);
    });

    it('应该是不可变的', () => {
      const oldBudget = aps.currentBudget;
      const oldHistory = aps.actionHistory;

      aps.startTurn(1);

      expect(aps.currentBudget).toBe(oldBudget);
      expect(aps.actionHistory).toBe(oldHistory);
    });
  });

  describe('行动预算', () => {
    it('应该返回正确的预算信息', () => {
      const budget = aps.getBudget();

      expect(budget.totalBudget).toBe(100);
      expect(budget.spent).toBe(0);
      expect(budget.remaining).toBe(100);
      expect(budget.canAct).toBe(true);
    });

    it('应该返回已消耗的点数', () => {
      expect(aps.getSpent()).toBe(0);

      const newAPS = aps.performAction(ActionType.MOVE);
      expect(newAPS.getSpent()).toBe(100);
    });

    it('应该返回剩余点数', () => {
      expect(aps.getRemaining()).toBe(100);

      const newAPS = aps.performAction(ActionType.WAIT);
      expect(newAPS.getRemaining()).toBe(0);
    });

    it('应该检查是否还有行动能力', () => {
      expect(aps.canAct()).toBe(true);

      const exhausted = aps.performAction(ActionType.MOVE);
      expect(exhausted.canAct()).toBe(false);
    });

    it('应该检查是否已耗尽', () => {
      expect(aps.isExhausted()).toBe(false);

      const exhausted = aps.performAction(ActionType.MOVE);
      expect(exhausted.isExhausted()).toBe(true);
    });

    it('应该计算行动效率', () => {
      expect(aps.getEfficiency()).toBe(0);

      const halfUsed = aps.performAction(ActionType.MOVE);
      expect(halfUsed.getEfficiency()).toBe(1);
    });
  });

  describe('回合管理', () => {
    it('应该开始新回合并重置预算', () => {
      const turn1APS = aps.performAction(ActionType.MOVE);
      expect(turn1APS.getRemaining()).toBe(0);

      const turn2APS = turn1APS.startTurn(1);
      expect(turn2APS.currentTurn).toBe(1);
      expect(turn2APS.getRemaining()).toBe(100);
    });

    it('应该清除上一回合的行动历史', () => {
      // 使用速度更高的生物，以便执行多个行动
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        200
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      const turn1APS = fastAPS
        .performAction(ActionType.MOVE)
        .performAction(ActionType.WAIT);

      expect(turn1APS.actionHistory.length).toBe(2);

      const turn2APS = turn1APS.startTurn(1);
      expect(turn2APS.actionHistory.length).toBe(0);
    });

    it('同一回合不应重复初始化', () => {
      const turn1APS = aps.startTurn(0);
      expect(turn1APS).toBe(aps);
    });

    it('应该根据新速度更新预算', () => {
      const slowCreature = new MockCreature(
        'slow_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Slow Creature',
        80
      );
      const slowAPS = ActionPointSystem.create(slowCreature);

      slowAPS.performAction(ActionType.MOVE);
      const newTurn = slowAPS.startTurn(1);

      expect(newTurn.currentBudget.totalBudget).toBe(80);
      expect(newTurn.currentBudget.remaining).toBe(80);
    });
  });

  describe('行动检查', () => {
    it('应该检查是否可以执行行动', () => {
      expect(aps.canPerformAction(ActionType.MOVE)).toBe(true);
      expect(aps.canPerformAction(ActionType.ATTACK)).toBe(true);
    });

    it('行动点不足时应返回 false', () => {
      const exhausted = aps.performAction(ActionType.MOVE);
      expect(exhausted.canPerformAction(ActionType.ATTACK)).toBe(false);
    });

    it('应该支持自定义行动消耗', () => {
      expect(aps.canPerformAction(ActionType.MOVE, 50)).toBe(true);
      expect(aps.canPerformAction(ActionType.MOVE, 150)).toBe(false);
    });
  });

  describe('行动执行', () => {
    it('应该执行移动行动', () => {
      const newAPS = aps.performAction(ActionType.MOVE);

      expect(newAPS.getRemaining()).toBe(0);
      expect(newAPS.actionHistory.length).toBe(1);
      expect(newAPS.actionHistory[0].type).toBe(ActionType.MOVE);
    });

    it('应该执行攻击行动', () => {
      const creature2 = new MockCreature(
        'creature_002',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Test Creature 2',
        200
      );
      const fastAPS = ActionPointSystem.create(creature2);

      const newAPS = fastAPS.performAction(ActionType.ATTACK);

      expect(newAPS.getRemaining()).toBe(100);
      expect(newAPS.actionHistory[0].type).toBe(ActionType.ATTACK);
    });

    it('应该记录行动位置', () => {
      const position = new Tripoint({ x: 5, y: 10, z: 0 });
      const newAPS = aps.performAction(ActionType.MOVE, undefined, position);

      expect(newAPS.actionHistory[0].position).toEqual(position);
    });

    it('行动点不足时不执行行动', () => {
      const exhausted = aps.performAction(ActionType.MOVE);
      const attempt = exhausted.performAction(ActionType.ATTACK);

      expect(attempt.getRemaining()).toBe(0);
      expect(attempt.actionHistory.length).toBe(1);
    });

    it('应该支持自定义行动消耗', () => {
      const newAPS = aps.performAction(ActionType.MOVE, 50);

      expect(newAPS.getRemaining()).toBe(50);
      expect(newAPS.getSpent()).toBe(50);
    });
  });

  describe('行动消耗计算', () => {
    it('应该返回正确的移动消耗', () => {
      expect(aps.getActionCost(ActionType.MOVE)).toBe(100);
    });

    it('应该计算对角移动消耗', () => {
      const cost = aps.getActionCost(ActionType.MOVE_DIAGONAL);
      expect(cost).toBe(Math.floor(100 * 1.414)); // 141
    });

    it('上下楼梯应该消耗更多', () => {
      const upCost = aps.getActionCost(ActionType.MOVE_UP);
      const downCost = aps.getActionCost(ActionType.MOVE_DOWN);

      expect(upCost).toBe(200);
      expect(downCost).toBe(200);
    });

    it('攻击消耗应该是 100', () => {
      expect(aps.getActionCost(ActionType.ATTACK)).toBe(100);
    });

    it('等待消耗应该是 100', () => {
      expect(aps.getActionCost(ActionType.WAIT)).toBe(100);
    });

    it('装弹消耗应该是 150', () => {
      expect(aps.getActionCost(ActionType.RELOAD)).toBe(150);
    });

    it('瞄准消耗应该是 50', () => {
      expect(aps.getActionCost(ActionType.AIM)).toBe(50);
    });

    it('物品交互消耗应该是 50', () => {
      expect(aps.getActionCost(ActionType.PICKUP)).toBe(50);
      expect(aps.getActionCost(ActionType.DROP)).toBe(50);
    });

    it('制作消耗应该是 200', () => {
      expect(aps.getActionCost(ActionType.CRAFT)).toBe(200);
    });
  });

  describe('移动消耗计算', () => {
    it('应该计算基础移动消耗', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 1, y: 0, z: 0 });

      // 需要一个 mock GameMap
      const mockMap = {
        getTile: () => ({ passable: true }),
      } as any;

      const cost = aps.calculateMoveCost(from, to, mockMap);
      expect(cost).toBe(100);
    });

    it('应该计算对角移动消耗', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 1, y: 1, z: 0 });

      const mockMap = {
        getTile: () => ({ passable: true }),
      } as any;

      const cost = aps.calculateMoveCost(from, to, mockMap);
      expect(cost).toBe(Math.floor(100 * 1.414)); // 141
    });

    it('z 轴移动应该消耗更多', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 0, y: 0, z: 1 });

      const mockMap = {
        getTile: () => ({ passable: true }),
      } as any;

      const cost = aps.calculateMoveCost(from, to, mockMap);
      expect(cost).toBe(200); // 100 * (1 + 1)
    });
  });

  describe('移动点计算', () => {
    it('速度 100 应该有 1 移动点', () => {
      expect(aps.getMoves()).toBe(1);
    });

    it('速度 150 应该有 1.5 移动点', () => {
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        150
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      expect(fastAPS.getMoves()).toBe(1);
    });

    it('速度 50 应该有 0.5 移动点', () => {
      const slowCreature = new MockCreature(
        'slow_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Slow Creature',
        50
      );
      const slowAPS = ActionPointSystem.create(slowCreature);

      expect(slowAPS.getMoves()).toBe(0);
    });
  });

  describe('行动历史', () => {
    it('应该记录所有行动', () => {
      // 使用高速度生物以便执行多个行动
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        300
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      const newAPS = fastAPS
        .performAction(ActionType.MOVE)
        .performAction(ActionType.WAIT)
        .performAction(ActionType.ATTACK);

      expect(newAPS.actionHistory.length).toBe(3);
    });

    it('应该返回行动历史的副本', () => {
      const history1 = aps.getActionHistory();
      const history2 = aps.getActionHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it('行动记录应该包含时间戳', () => {
      const before = Date.now();
      const newAPS = aps.performAction(ActionType.MOVE);
      const after = Date.now();

      const record = newAPS.actionHistory[0];
      expect(record.timestamp).toBeGreaterThanOrEqual(before);
      expect(record.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('重置回合', () => {
    it('应该重置当前回合', () => {
      const usedAPS = aps.performAction(ActionType.MOVE);
      expect(usedAPS.getRemaining()).toBe(0);

      const resetAPS = usedAPS.resetCurrentTurn();
      expect(resetAPS.getRemaining()).toBe(100);
    });

    it('重置应该清除行动历史', () => {
      const usedAPS = aps
        .performAction(ActionType.MOVE)
        .performAction(ActionType.WAIT);

      const resetAPS = usedAPS.resetCurrentTurn();
      expect(resetAPS.actionHistory).toEqual([]);
    });

    it('重置不应改变回合数', () => {
      const turn1APS = aps.startTurn(1);
      const resetAPS = turn1APS.resetCurrentTurn();

      expect(resetAPS.currentTurn).toBe(1);
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const json = aps.toJson();

      expect(json).toHaveProperty('creatureId');
      expect(json).toHaveProperty('creatureSpeed');
      expect(json).toHaveProperty('moves');
      expect(json).toHaveProperty('currentBudget');
      expect(json).toHaveProperty('currentTurn');
      expect(json).toHaveProperty('actionHistory');
    });

    it('JSON 应该包含正确的数据', () => {
      const json = aps.toJson();

      expect(json.creatureId).toBe(creature.id);
      expect(json.creatureSpeed).toBe(100);
      expect(json.moves).toBe(1);
      expect(json.currentTurn).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('速度为 0 应该没有行动点', () => {
      const zeroCreature = new MockCreature(
        'zero_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Zero Creature',
        0
      );
      const zeroAPS = ActionPointSystem.create(zeroCreature);

      expect(zeroAPS.getMoves()).toBe(0);
      expect(zeroAPS.canAct()).toBe(false);
    });

    it('极高速度应该有相应的行动点', () => {
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        200
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      expect(fastAPS.currentBudget.totalBudget).toBe(200);
      expect(fastAPS.getMoves()).toBe(2);
    });

    it('应该处理多个行动', () => {
      const fastCreature = new MockCreature(
        'fast_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Fast Creature',
        300
      );
      const fastAPS = ActionPointSystem.create(fastCreature);

      const newAPS = fastAPS
        .performAction(ActionType.MOVE)
        .performAction(ActionType.ATTACK)
        .performAction(ActionType.WAIT);

      expect(newAPS.getRemaining()).toBe(0);
      expect(newAPS.actionHistory.length).toBe(3);
    });
  });

  describe('不可变性', () => {
    it('startTurn 应该返回新实例', () => {
      const newAPS = aps.startTurn(1);
      expect(newAPS).not.toBe(aps);
    });

    it('performAction 应该返回新实例', () => {
      const newAPS = aps.performAction(ActionType.MOVE);
      expect(newAPS).not.toBe(aps);
    });

    it('resetCurrentTurn 应该返回新实例', () => {
      const usedAPS = aps.performAction(ActionType.MOVE);
      const resetAPS = usedAPS.resetCurrentTurn();
      expect(resetAPS).not.toBe(usedAPS);
    });
  });
});
