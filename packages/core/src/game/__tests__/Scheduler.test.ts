/**
 * Scheduler Tests - 调度器测试
 *
 * 测试基于速度的生物调度系统
 * 管理所有生物的行动顺序和优先级
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Scheduler, DEFAULT_SCHEDULER_CONFIG, ScheduleEntry } from '../Scheduler';
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

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = Scheduler.create();
  });

  describe('创建和初始化', () => {
    it('应该使用默认配置创建调度器', () => {
      expect(scheduler.config.baseTimeUnit).toBe(DEFAULT_SCHEDULER_CONFIG.baseTimeUnit);
      expect(scheduler.config.playerPriorityBonus).toBe(DEFAULT_SCHEDULER_CONFIG.playerPriorityBonus);
      expect(scheduler.currentTime).toBe(0);
      expect(scheduler.currentTurn).toBe(0);
      expect(scheduler.entries.size).toBe(0);
    });

    it('应该支持自定义配置', () => {
      const custom = Scheduler.create({
        baseTimeUnit: 200,
        playerPriorityBonus: 2000,
      });

      expect(custom.config.baseTimeUnit).toBe(200);
      expect(custom.config.playerPriorityBonus).toBe(2000);
    });

    it('应该初始化为空队列', () => {
      expect(scheduler.getAvailableActors().size).toBe(0);
      expect(scheduler.getExhaustedActors().size).toBe(0);
    });

    it('应该是不可变的', () => {
      const oldTime = scheduler.currentTime;
      scheduler = scheduler.advanceTime(100);
      expect(scheduler.currentTime).not.toBe(oldTime);
    });
  });

  describe('生物管理', () => {
    let creature1: MockCreature;
    let creature2: MockCreature;

    beforeEach(() => {
      creature1 = new MockCreature(
        'creature_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Creature 1',
        100
      );
      creature2 = new MockCreature(
        'creature_002',
        new Tripoint({ x: 1, y: 0, z: 0 }),
        'Creature 2',
        150
      );
    });

    it('应该添加生物到调度队列', () => {
      const newScheduler = scheduler.addCreature(creature1);

      expect(newScheduler.hasCreature('creature_001')).toBe(true);
      expect(newScheduler.getCreatureBudget('creature_001')).toBe(100);
    });

    it('应该根据速度设置预算', () => {
      const newScheduler = scheduler
        .addCreature(creature1)
        .addCreature(creature2);

      expect(newScheduler.getCreatureBudget('creature_001')).toBe(100);
      expect(newScheduler.getCreatureBudget('creature_002')).toBe(150);
    });

    it('应该给玩家添加优先级加成', () => {
      const playerScheduler = scheduler.addCreature(creature1, true);
      const npcScheduler = scheduler.addCreature(creature2, false);

      const playerEntry = playerScheduler.entries.get('creature_001');
      const npcEntry = npcScheduler.entries.get('creature_002');

      expect(playerEntry?.priority).toBe(DEFAULT_SCHEDULER_CONFIG.playerPriorityBonus);
      expect(npcEntry?.priority).toBe(0);
    });

    it('应该从队列移除生物', () => {
      const withCreature = scheduler.addCreature(creature1);
      const withoutCreature = withCreature.removeCreature('creature_001');

      expect(withoutCreature.hasCreature('creature_001')).toBe(false);
    });

    it('应该更新生物速度', () => {
      const withCreature = scheduler.addCreature(creature1);
      const updated = withCreature.updateCreatureSpeed('creature_001', 120);

      expect(updated.getCreatureBudget('creature_001')).toBe(120);
    });

    it('移除不存在的生物应该返回原调度器', () => {
      const result = scheduler.removeCreature('nonexistent');
      // 由于返回的是新实例，检查内容是否相同
      expect(result.entries.size).toBe(scheduler.entries.size);
      expect(result.currentTime).toBe(scheduler.currentTime);
    });
  });

  describe('核心调度方法', () => {
    let creature1: MockCreature;
    let creature2: MockCreature;

    beforeEach(() => {
      creature1 = new MockCreature(
        'creature_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Creature 1',
        100
      );
      creature2 = new MockCreature(
        'creature_002',
        new Tripoint({ x: 1, y: 0, z: 0 }),
        'Creature 2',
        150
      );
      scheduler = scheduler.addCreature(creature1).addCreature(creature2);
    });

    describe('获取下一个行动者', () => {
      it('应该返回速度最快的生物', () => {
        const nextActor = scheduler.getNextActor();
        expect(nextActor).toBe('creature_002'); // 速度 150
      });

      it('玩家应该优先行动', () => {
        const player = new MockCreature(
          'player_001',
          new Tripoint({ x: 0, y: 0, z: 0 }),
          'Player',
          80
        );
        const withPlayer = scheduler.addCreature(player, true);

        const nextActor = withPlayer.getNextActor();
        expect(nextActor).toBe('player_001'); // 玩家优先
      });

      it('没有可行动生物时返回 null', () => {
        const exhausted = scheduler
          .consumeActionPoints('creature_001', 100)
          .consumeActionPoints('creature_002', 150);

        expect(exhausted.getNextActor()).toBe(null);
      });

      it('正在行动的生物不应该被选择', () => {
        const acting = scheduler.markActing('creature_002');

        // 速度 150 的正在行动，应该选择速度 100 的
        const nextActor = acting.getNextActor();
        expect(nextActor).toBe('creature_001');
      });
    });

    describe('消耗行动点', () => {
      it('应该减少生物的预算', () => {
        const newScheduler = scheduler.consumeActionPoints('creature_001', 50);

        expect(newScheduler.getCreatureBudget('creature_001')).toBe(50);
      });

      it('预算耗尽时标记为不可行动', () => {
        const exhausted = scheduler.consumeActionPoints('creature_001', 100);

        expect(exhausted.canAct('creature_001')).toBe(false);
      });

      it('消耗后应该重置行动标记', () => {
        const acting = scheduler.markActing('creature_001');
        const consumed = acting.consumeActionPoints('creature_001', 100);

        const entry = consumed.entries.get('creature_001');
        expect(entry?.isActing).toBe(false);
      });
    });

    describe('行动能力检查', () => {
      it('预算充足时可以行动', () => {
        expect(scheduler.canAct('creature_001', 100)).toBe(true);
      });

      it('预算不足时不能行动', () => {
        expect(scheduler.canAct('creature_001', 150)).toBe(false);
      });

      it('消耗后的生物不能行动', () => {
        const exhausted = scheduler.consumeActionPoints('creature_001', 100);
        expect(exhausted.canAct('creature_001')).toBe(false);
      });

      it('不存在的生物不能行动', () => {
        expect(scheduler.canAct('nonexistent')).toBe(false);
      });
    });

    describe('标记行动状态', () => {
      it('应该标记生物为正在行动', () => {
        const acting = scheduler.markActing('creature_001');

        const entry = acting.entries.get('creature_001');
        expect(entry?.isActing).toBe(true);
        expect(acting.activeCreatureId).toBe('creature_001');
      });

      it('正在行动的生物不应该被选为下一个行动者', () => {
        const acting = scheduler.markActing('creature_002');
        const nextActor = acting.getNextActor();

        expect(nextActor).toBe('creature_001');
      });
    });
  });

  describe('时间推进', () => {
    it('应该推进时间', () => {
      const advanced = scheduler.advanceTime(500);

      expect(advanced.currentTime).toBe(500);
    });

    it('应该在超过 1000 时间单位时增加回合', () => {
      const advanced = scheduler.advanceTime(1500);

      expect(advanced.currentTurn).toBe(1);
    });

    it('未达到阈值时不增加回合', () => {
      const advanced = scheduler.advanceTime(500);

      expect(advanced.currentTurn).toBe(0);
    });

    describe('开始新回合', () => {
      let creature1: MockCreature;
      let creature2: MockCreature;

      beforeEach(() => {
        creature1 = new MockCreature(
          'creature_001',
          new Tripoint({ x: 0, y: 0, z: 0 }),
          'Creature 1',
          100
        );
        creature2 = new MockCreature(
          'creature_002',
          new Tripoint({ x: 1, y: 0, z: 0 }),
          'Creature 2',
          150
        );
      });

      it('应该重置所有生物的预算', () => {
        let s = scheduler.addCreature(creature1).addCreature(creature2);

        // 消耗所有行动点
        s = s.consumeActionPoints('creature_001', 100)
              .consumeActionPoints('creature_002', 150);

        expect(s.getAvailableActors().size).toBe(0);

        // 开始新回合
        const mockMap = {
          creatures: new Map([
            ['creature_001', creature1],
            ['creature_002', creature2],
          ]),
        } as any;

        const newTurn = s.startNewTurn(mockMap);

        expect(newTurn.currentTurn).toBe(1);
        expect(newTurn.getCreatureBudget('creature_001')).toBe(100);
        expect(newTurn.getCreatureBudget('creature_002')).toBe(150);
      });

      it('应该重置行动标记', () => {
        let s = scheduler.addCreature(creature1);
        s = s.markActing('creature_001');

        const mockMap = {
          creatures: new Map([['creature_001', creature1]]),
        } as any;

        const newTurn = s.startNewTurn(mockMap);
        const entry = newTurn.entries.get('creature_001');

        expect(entry?.isActing).toBe(false);
      });
    });

    describe('推进到下一个行动者', () => {
      it('有可行动生物时不应开始新回合', () => {
        const creature = new MockCreature(
          'creature_001',
          new Tripoint({ x: 0, y: 0, z: 0 }),
          'Creature 1',
          100
        );

        let s = scheduler.addCreature(creature);
        const oldTurn = s.currentTurn;

        const mockMap = {
          creatures: new Map([['creature_001', creature]]),
        } as any;

        const advanced = s.advanceToNextActor(mockMap);

        expect(advanced.currentTurn).toBe(oldTurn);
      });

      it('所有生物耗尽时应该开始新回合', () => {
        const creature = new MockCreature(
          'creature_001',
          new Tripoint({ x: 0, y: 0, z: 0 }),
          'Creature 1',
          100
        );

        let s = scheduler.addCreature(creature);
        s = s.consumeActionPoints('creature_001', 100);

        const mockMap = {
          creatures: new Map([['creature_001', creature]]),
        } as any;

        const advanced = s.advanceToNextActor(mockMap);

        expect(advanced.currentTurn).toBe(1);
        expect(advanced.getCreatureBudget('creature_001')).toBe(100);
      });
    });
  });

  describe('延迟事件', () => {
    it('应该添加延迟事件', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 1000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvent = scheduler.addDelayedEvent(event);

      expect(withEvent.getDelayedEventCount()).toBe(1);
    });

    it('应该按触发时间排序事件', () => {
      const event1 = {
        id: 'event_001' as any,
        triggerTime: 2000,
        type: 'late_event',
        data: {},
        callback: (map: any) => map,
      };

      const event2 = {
        id: 'event_002' as any,
        triggerTime: 1000,
        type: 'early_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvents = scheduler
        .addDelayedEvent(event1)
        .addDelayedEvent(event2);

      expect(withEvents.delayedEvents.get(0)?.id).toBe('event_002');
      expect(withEvents.delayedEvents.get(1)?.id).toBe('event_001');
    });

    it('应该触发到期的事件', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 500,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      let withEvent = scheduler.addDelayedEvent(event);
      // 推进时间到 500
      withEvent = withEvent.advanceTime(500);
      const { scheduler: newScheduler, events } = withEvent.triggerEvents();

      expect(events.length).toBe(1);
      expect(events[0].id).toBe('event_001');
      expect(newScheduler.getDelayedEventCount()).toBe(0);
    });

    it('未到期的事件不应触发', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 5000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvent = scheduler.addDelayedEvent(event);
      const { events } = withEvent.triggerEvents();

      expect(events.length).toBe(0);
    });

    it('应该限制事件数量', () => {
      const maxScheduler = Scheduler.create({
        maxDelayedEvents: 2,
      });

      const event = {
        id: 'event_001' as any,
        triggerTime: 1000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const with2 = maxScheduler
        .addDelayedEvent({ ...event, id: 'event_001' as any })
        .addDelayedEvent({ ...event, id: 'event_002' as any });

      // 第三个事件应该被拒绝
      const with3 = with2.addDelayedEvent({ ...event, id: 'event_003' as any });

      expect(with3.getDelayedEventCount()).toBe(2);
    });

    it('应该清除所有事件', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 1000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvent = scheduler.addDelayedEvent(event);
      const cleared = withEvent.clearDelayedEvents();

      expect(cleared.getDelayedEventCount()).toBe(0);
    });
  });

  describe('查询方法', () => {
    let creature1: MockCreature;
    let creature2: MockCreature;

    beforeEach(() => {
      creature1 = new MockCreature(
        'creature_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Creature 1',
        100
      );
      creature2 = new MockCreature(
        'creature_002',
        new Tripoint({ x: 1, y: 0, z: 0 }),
        'Creature 2',
        150
      );
      scheduler = scheduler.addCreature(creature1).addCreature(creature2);
    });

    it('应该返回当前时间', () => {
      expect(scheduler.getCurrentTime()).toBe(0);

      const advanced = scheduler.advanceTime(500);
      expect(advanced.getCurrentTime()).toBe(500);
    });

    it('应该返回当前回合', () => {
      expect(scheduler.getCurrentTurn()).toBe(0);

      const advanced = scheduler.advanceTime(1500);
      expect(advanced.getCurrentTurn()).toBe(1);
    });

    it('应该返回当前行动的生物', () => {
      expect(scheduler.getActiveCreature()).toBe(null);

      const acting = scheduler.markActing('creature_001');
      expect(acting.getActiveCreature()).toBe('creature_001');
    });

    it('应该获取可行动的生物列表', () => {
      const available = scheduler.getAvailableActors();

      expect(available.size).toBe(2);
      expect(available.includes('creature_001')).toBe(true);
      expect(available.includes('creature_002')).toBe(true);
    });

    it('应该获取已耗尽的生物列表', () => {
      const exhausted = scheduler.consumeActionPoints('creature_001', 100);

      const exhaustedList = exhausted.getExhaustedActors();
      expect(exhaustedList.size).toBe(1);
      expect(exhaustedList.get(0)).toBe('creature_001');
    });

    it('应该检查是否所有生物都耗尽', () => {
      expect(scheduler.isAllExhausted()).toBe(false);

      const exhausted = scheduler
        .consumeActionPoints('creature_001', 100)
        .consumeActionPoints('creature_002', 150);

      expect(exhausted.isAllExhausted()).toBe(true);
    });

    it('应该获取下一个事件', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 1000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvent = scheduler.addDelayedEvent(event);
      const nextEvent = withEvent.getNextEvent();

      expect(nextEvent?.id).toBe('event_001');
    });

    it('应该获取下次事件触发时间', () => {
      const event = {
        id: 'event_001' as any,
        triggerTime: 1000,
        type: 'test_event',
        data: {},
        callback: (map: any) => map,
      };

      const withEvent = scheduler.addDelayedEvent(event);
      expect(withEvent.getNextEventTime()).toBe(1000);
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const json = scheduler.toJson();

      expect(json).toHaveProperty('currentTime');
      expect(json).toHaveProperty('currentTurn');
      expect(json).toHaveProperty('activeCreatureId');
      expect(json).toHaveProperty('entries');
      expect(json).toHaveProperty('delayedEvents');
    });

    it('应该从 JSON 创建', () => {
      const json = scheduler.toJson();
      const restored = Scheduler.fromJson(json);

      expect(restored.currentTime).toBe(scheduler.currentTime);
      expect(restored.currentTurn).toBe(scheduler.currentTurn);
    });
  });

  describe('边界情况', () => {
    it('空调度器应该返回 null', () => {
      expect(scheduler.getNextActor()).toBe(null);
    });

    it('应该处理速度为 0 的生物', () => {
      const zeroCreature = new MockCreature(
        'zero_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Zero Creature',
        0
      );

      const withZero = scheduler.addCreature(zeroCreature);

      expect(withZero.getCreatureBudget('zero_001')).toBe(0);
      expect(withZero.canAct('zero_001')).toBe(false);
    });
  });

  describe('不可变性', () => {
    it('addCreature 应该返回新实例', () => {
      const creature = new MockCreature(
        'creature_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Creature 1',
        100
      );

      const newScheduler = scheduler.addCreature(creature);
      expect(newScheduler).not.toBe(scheduler);
    });

    it('consumeActionPoints 应该返回新实例', () => {
      const creature = new MockCreature(
        'creature_001',
        new Tripoint({ x: 0, y: 0, z: 0 }),
        'Creature 1',
        100
      );
      const withCreature = scheduler.addCreature(creature);

      const newScheduler = withCreature.consumeActionPoints('creature_001', 50);
      expect(newScheduler).not.toBe(withCreature);
    });
  });
});
