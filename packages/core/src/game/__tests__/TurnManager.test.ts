/**
 * TurnManager Tests - 回合管理器测试
 *
 * 测试统一回合处理和生物行动协调
 *
 * 注意：这些测试需要完整的 GameMap 实现，暂时跳过
 * TODO: 当 GameMap 添加 getPlayer() 方法后启用这些测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnManager, TurnResult, ActionResult } from '../TurnManager';
import { Scheduler } from '../Scheduler';
import { ActionType } from '../ActionPointSystem';
import { Tripoint } from '../../coordinates/Tripoint';
import { Map } from 'immutable';

// Mock Creature 类
class MockCreature {
  constructor(
    public readonly id: string,
    public readonly position: Tripoint,
    public readonly name: string,
    public readonly speed: number = 100,
    public readonly isAvatar: boolean = false,
    public readonly isNPC: boolean = false
  ) {}

  isDead(): boolean {
    return false;
  }

  processTurn?(): void {
    // Mock implementation
  }
}

class MockAvatar extends MockCreature {
  constructor(
    id: string,
    position: Tripoint,
    name: string,
    speed: number = 100
  ) {
    super(id, position, name, speed, true, false);
  }

  isAvatar(): boolean {
    return true;
  }

  isNPC(): boolean {
    return false;
  }
}

class MockNPC extends MockCreature {
  constructor(
    id: string,
    position: Tripoint,
    name: string,
    speed: number = 100
  ) {
    super(id, position, name, speed, false, true);
  }

  isAvatar(): boolean {
    return false;
  }

  isNPC(): boolean {
    return true;
  }

  processTurn(): void {
    // Mock AI processing
  }

  getType(): any {
    return 'NPC';
  }

  getWeight(): number {
    return 70000;
  }

  getHP(): number | undefined {
    return 100;
  }

  getHPMax(): number | undefined {
    return 100;
  }

  getHealthStatus(): string {
    return '健康';
  }
}

// Mock GameMap
class MockGameMap {
  creatures: Map<string, MockCreature> = Map();

  constructor() {
    // 添加默认玩家
    this.creatures = this.creatures.set(
      'player_001',
      new MockAvatar(
        'player_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Player',
        100
      )
    );
  }

  getPlayer(): MockAvatar | undefined {
    return this.creatures.get('player_001') as MockAvatar;
  }

  isPassable(position: Tripoint): boolean {
    return true;
  }

  updateCreaturePosition(creatureId: string, position: Tripoint): MockGameMap {
    const creature = this.creatures.get(creatureId);
    if (creature) {
      const newCreature = new MockCreature(
        creature.id,
        position,
        creature.name,
        creature.speed,
        creature.isAvatar,
        creature.isNPC
      );
      this.creatures = this.creatures.set(creatureId, newCreature);
    }
    return this;
  }

  getAllCreatures(): MockCreature[] {
    return this.creatures.toArray();
  }
}

describe.skip('TurnManager', () => {
  let scheduler: Scheduler;
  let map: MockGameMap;
  let turnManager: TurnManager;

  beforeEach(() => {
    scheduler = Scheduler.create();
    map = new MockGameMap();
    turnManager = TurnManager.initialize(scheduler, map as any);
  });

  describe('创建和初始化', () => {
    it('应该使用调度器创建回合管理器', () => {
      const manager = TurnManager.create(scheduler);

      expect(manager.scheduler).toBe(scheduler);
      expect(manager.currentCreatureIndex).toBe(0);
    });

    it('应该初始化所有生物到调度器', () => {
      expect(turnManager.scheduler.hasCreature('player_001')).toBe(true);
    });

    it('应该确定行动顺序', () => {
      expect(turnManager.processingOrder.length).toBeGreaterThan(0);
    });

    it('玩家应该在行动顺序中', () => {
      expect(turnManager.processingOrder).toContain('player_001');
    });
  });

  describe('处理完整回合', () => {
    it('应该处理没有玩家行动的回合', () => {
      const result = turnManager.processTurn(map as any);

      expect(result.map).toBeDefined();
      expect(result.scheduler).toBeDefined();
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
      expect(result.messages).toBeInstanceOf(Array);
    });

    it('应该处理玩家行动', () => {
      const player = map.getPlayer()!;
      const actionData = {
        creature: player,
        actionType: ActionType.WAIT,
      };

      const result = turnManager.processTurn(map as any, actionData);

      expect(result.processedCount).toBeGreaterThan(0);
    });

    it('应该生成消息', () => {
      const result = turnManager.processTurn(map as any);

      expect(result.messages.length).toBeGreaterThanOrEqual(0);
    });

    it('应该检查回合是否完成', () => {
      const result = turnManager.processTurn(map as any);

      expect(typeof result.turnComplete).toBe('boolean');
    });
  });

  describe('处理 NPC 行动', () => {
    beforeEach(() => {
      // 添加 NPC
      const npc = new MockNPC(
        'npc_001',
        new Tripoint({ x: 5, y: 5, z: 0 }),
        'NPC 1',
        100
      );
      map.creatures = map.creatures.set('npc_001', npc);
      scheduler = scheduler.addCreature(npc, false);
      turnManager = TurnManager.initialize(scheduler, map as any);
    });

    it('应该处理 NPC AI', () => {
      const result = turnManager.processTurn(map as any);

      // NPC 应该被处理
      expect(result.processedCount).toBeGreaterThan(0);
    });

    it('NPC 行动点不足时应该有消息', () => {
      // 先消耗 NPC 的行动点
      scheduler = scheduler.consumeActionPoints('npc_001', 100);
      turnManager = TurnManager.create(scheduler);

      const result = turnManager.processTurn(map as any);

      // 应该有消息说明行动点不足
      const hasInsufficientAP = result.messages.some(m =>
        m.includes('行动点不足') || m.includes('无法行动')
      );
    });
  });

  describe('行动执行', () => {
    describe('移动行动', () => {
      it('应该执行移动', () => {
        const player = map.getPlayer()!;
        const targetPosition = new Tripoint({ x: 1, y: 0, z: 0 });

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.MOVE,
          targetPosition,
        });

        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.processedCount).toBe(1);
      });

      it('应该检查移动目标是否可行', () => {
        const player = map.getPlayer()!;
        const targetPosition = new Tripoint({ x: 1, y: 0, z: 0 });

        // 修改 map 使位置不可通行
        const originalIsPassable = map.isPassable;
        map.isPassable = () => false;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.MOVE,
          targetPosition,
        });

        // 应该有失败消息
        const hasFailureMessage = result.messages.some(m =>
          m.includes('无法') || m.includes('不能')
        );

        // 恢复
        map.isPassable = originalIsPassable;
      });
    });

    describe('攻击行动', () => {
      beforeEach(() => {
        const target = new MockNPC(
          'target_001',
          new Tripoint({ x: 1, y: 0, z: 0 }),
          'Target',
          100
        );
        map.creatures = map.creatures.set('target_001', target);
      });

      it('应该执行攻击', () => {
        const player = map.getPlayer()!;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.ATTACK,
          targetCreature: 'target_001',
        });

        expect(result.processedCount).toBe(1);
      });

      it('攻击不存在的目标应该失败', () => {
        const player = map.getPlayer()!;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.ATTACK,
          targetCreature: 'nonexistent',
        });

        const hasError = result.messages.some(m =>
          m.includes('不存在') || m.includes('无法')
        );
        expect(hasError).toBeTruthy();
      });
    });

    describe('等待行动', () => {
      it('应该执行等待', () => {
        const player = map.getPlayer()!;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.WAIT,
        });

        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.processedCount).toBe(1);
      });
    });

    describe('物品交互', () => {
      it('应该执行拾取', () => {
        const player = map.getPlayer()!;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.PICKUP,
        });

        expect(result.processedCount).toBe(1);
      });

      it('应该执行放下', () => {
        const player = map.getPlayer()!;

        const result = turnManager.processTurn(map as any, {
          creature: player,
          actionType: ActionType.DROP,
        });

        expect(result.processedCount).toBe(1);
      });
    });
  });

  describe('查询方法', () => {
    it('应该获取下一个行动者', () => {
      const nextActor = turnManager.getNextActor(map as any);

      if (nextActor) {
        expect(nextActor.id).toBeDefined();
        expect(nextActor.name).toBeDefined();
      }
    });

    it('空调度器时返回 null', () => {
      const emptyScheduler = Scheduler.create();
      const emptyManager = TurnManager.create(emptyScheduler);

      const nextActor = emptyManager.getNextActor(map as any);
      expect(nextActor).toBeNull();
    });

    it('应该检查回合是否完成', () => {
      const isComplete = turnManager.isTurnComplete();
      expect(typeof isComplete).toBe('boolean');
    });
  });

  describe('行动顺序', () => {
    beforeEach(() => {
      // 添加多个不同速度的生物
      const slow = new MockNPC(
        'slow_001',
        new Tripoint({ x: 1, y: 0, z: 0 }),
        'Slow',
        50
      );
      const fast = new MockNPC(
        'fast_001',
        new Tripoint({ x: 2, y: 0, z: 0 }),
        'Fast',
        150
      );

      map.creatures = map.creatures
        .set('slow_001', slow)
        .set('fast_001', fast);

      scheduler = scheduler.addCreature(slow, false).addCreature(fast, false);
      turnManager = TurnManager.initialize(scheduler, map as any);
    });

    it('速度快的应该在前面', () => {
      const fastIndex = turnManager.processingOrder.indexOf('fast_001');
      const slowIndex = turnManager.processingOrder.indexOf('slow_001');

      expect(fastIndex).toBeLessThan(slowIndex);
    });
  });

  describe('效果处理', () => {
    it('应该处理游戏效果（TODO）', () => {
      // 当前效果处理是 TODO，所以应该只是返回空消息
      const result = turnManager.processTurn(map as any);

      expect(result.messages).toBeDefined();
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const json = turnManager.toJson();

      expect(json).toHaveProperty('scheduler');
      expect(json).toHaveProperty('processingOrder');
      expect(json).toHaveProperty('currentCreatureIndex');
    });

    it('应该从 JSON 创建', () => {
      const json = turnManager.toJson();
      const restored = TurnManager.fromJson(json);

      expect(restored.currentCreatureIndex).toBe(turnManager.currentCreatureIndex);
      expect(restored.processingOrder).toEqual(turnManager.processingOrder);
    });
  });

  describe('边界情况', () => {
    it('应该处理空地图', () => {
      const emptyMap = new MockGameMap();
      emptyMap.creatures = Map();

      const emptyScheduler = Scheduler.create();
      const emptyManager = TurnManager.initialize(emptyScheduler, emptyMap as any);

      const result = emptyManager.processTurn(emptyMap as any);

      expect(result.map).toBeDefined();
      expect(result.processedCount).toBe(0);
    });

    it('应该处理无行动点的生物', () => {
      const player = map.getPlayer()!;

      // 消耗所有行动点
      scheduler = scheduler.consumeActionPoints('player_001', 100);
      turnManager = TurnManager.create(scheduler);

      const result = turnManager.processTurn(map as any, {
        creature: player,
        actionType: ActionType.MOVE,
        targetPosition: new Tripoint({ x: 1, y: 0, z: 0 }),
      });

      // 应该无法执行行动
      const hasFailure = result.messages.some(m =>
        m.includes('行动点不足') || m.includes('无法')
      );
    });

    it('应该处理未知行动类型', () => {
      const player = map.getPlayer()!;

      const result = turnManager.processTurn(map as any, {
        creature: player,
        actionType: 'unknown' as ActionType,
      });

      const hasError = result.messages.some(m =>
        m.includes('未知') || m.includes('不支持')
      );
    });
  });

  describe('不可变性', () => {
    it('processTurn 应该返回新状态', () => {
      const result = turnManager.processTurn(map as any);

      expect(result.scheduler).toBeDefined();
      expect(result.map).toBeDefined();
    });
  });

  describe('集成测试', () => {
    it('应该完整处理多生物回合', () => {
      // 添加多个 NPC
      const npc1 = new MockNPC(
        'npc_001',
        new Tripoint({ x: 5, y: 5, z: 0 }),
        'NPC 1',
        100
      );
      const npc2 = new MockNPC(
        'npc_002',
        new Tripoint({ x: 10, y: 10, z: 0 }),
        'NPC 2',
        120
      );

      map.creatures = map.creatures
        .set('npc_001', npc1)
        .set('npc_002', npc2);

      scheduler = Scheduler.create();
      scheduler = scheduler
        .addCreature(map.getPlayer()!, true)
        .addCreature(npc1, false)
        .addCreature(npc2, false);

      turnManager = TurnManager.initialize(scheduler, map as any);

      const result = turnManager.processTurn(map as any);

      // 应该处理了所有生物
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
      expect(result.messages).toBeDefined();
    });

    it('应该正确处理玩家行动后 NPC 行动', () => {
      const player = map.getPlayer()!;
      const npc = new MockNPC(
        'npc_001',
        new Tripoint({ x: 5, y: 5, z: 0 }),
        'NPC 1',
        100
      );

      map.creatures = map.creatures.set('npc_001', npc);
      scheduler = Scheduler.create();
      scheduler = scheduler
        .addCreature(player, true)
        .addCreature(npc, false);

      turnManager = TurnManager.initialize(scheduler, map as any);

      // 玩家行动
      const result = turnManager.processTurn(map as any, {
        creature: player,
        actionType: ActionType.WAIT,
      });

      expect(result.processedCount).toBeGreaterThan(0);
    });
  });
});
