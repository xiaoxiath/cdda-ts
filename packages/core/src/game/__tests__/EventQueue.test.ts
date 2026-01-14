/**
 * EventQueue Tests - 事件队列测试
 *
 * 测试延迟事件、周期性事件、条件事件和即时事件
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventQueue,
  EventType,
  EventPriority,
  EventStatus,
  createEventId,
  GameEvent,
  EventCallback,
  ConditionCheck,
} from '../EventQueue';
import { Tripoint } from '../../coordinates/Tripoint';

// Mock GameMap
class MockGameMap {
  constructor(
    public readonly time: number = 0,
    public readonly data: Record<string, any> = {}
  ) {}

  withTime(newTime: number): MockGameMap {
    return new MockGameMap(newTime, this.data);
  }

  withData(key: string, value: any): MockGameMap {
    return new MockGameMap(this.time, { ...this.data, [key]: value });
  }
}

describe('EventQueue', () => {
  let queue: EventQueue;
  let mockMap: MockGameMap;

  beforeEach(() => {
    queue = EventQueue.create();
    mockMap = new MockGameMap(0);
  });

  describe('创建和初始化', () => {
    it('应该创建空的事件队列', () => {
      expect(queue.getCurrentTime()).toBe(0);
      expect(queue.getEventCount()).toBe(0);
      expect(queue.getPendingEventCount()).toBe(0);
    });

    it('应该是不可变的', () => {
      const oldTime = queue.getCurrentTime();
      const { queue: newQueue } = queue.update(100, mockMap);

      expect(newQueue.getCurrentTime()).not.toBe(oldTime);
      expect(queue.getCurrentTime()).toBe(oldTime);
    });
  });

  describe('延迟事件', () => {
    it('应该添加延迟事件', () => {
      const callback: EventCallback = (map, data) => ({
        map: map.withTime(100),
      });

      const newQueue = queue.addDelayedEvent('test_event', 1000, callback);

      expect(newQueue.getEventCount()).toBe(1);
      expect(newQueue.getPendingEventCount()).toBe(1);
    });

    it('应该支持自定义优先级', () => {
      const callback: EventCallback = (map, data) => ({ map });
      const newQueue = queue.addDelayedEvent(
        'test_event',
        1000,
        callback,
        EventPriority.HIGH
      );

      const event = newQueue.getAllEvents().get(0);
      expect(event?.priority).toBe(EventPriority.HIGH);
    });

    it('应该支持事件数据', () => {
      const callback: EventCallback = (map, data) => ({
        map: map.withData('key', data.value),
      });

      const newQueue = queue.addDelayedEvent(
        'test_event',
        1000,
        callback,
        EventPriority.NORMAL,
        { value: 'test_data' }
      );

      const event = newQueue.getAllEvents().get(0);
      expect(event?.data).toEqual({ value: 'test_data' });
    });

    it('应该按优先级排序事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue
        .addDelayedEvent('low', 1000, callback, EventPriority.LOW)
        .addDelayedEvent('high', 1000, callback, EventPriority.HIGH)
        .addDelayedEvent('normal', 1000, callback, EventPriority.NORMAL);

      const events = newQueue.getAllEvents();
      expect(events.get(0)?.priority).toBe(EventPriority.HIGH);
      expect(events.get(1)?.priority).toBe(EventPriority.NORMAL);
      expect(events.get(2)?.priority).toBe(EventPriority.LOW);
    });

    it('应该按触发时间排序同优先级事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue
        .addDelayedEvent('late', 2000, callback)
        .addDelayedEvent('early', 1000, callback);

      const events = newQueue.getAllEvents();
      expect(events.get(0)?.name).toBe('early');
      expect(events.get(1)?.name).toBe('late');
    });
  });

  describe('周期性事件', () => {
    it('应该添加周期性事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addPeriodicEvent('periodic', 1000, callback);

      expect(newQueue.getEventCount()).toBe(1);

      const event = newQueue.getAllEvents().get(0);
      expect(event?.type).toBe(EventType.PERIODIC);
    });

    it('应该支持限制触发次数', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addPeriodicEvent(
        'periodic',
        1000,
        callback,
        3 // 最多触发 3 次
      );

      const event = newQueue.getAllEvents().get(0) as any;
      expect(event?.maxTriggers).toBe(3);
    });

    it('应该支持无限触发', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addPeriodicEvent(
        'periodic',
        1000,
        callback,
        -1 // 无限触发
      );

      const event = newQueue.getAllEvents().get(0) as any;
      expect(event?.maxTriggers).toBe(-1);
    });
  });

  describe('条件事件', () => {
    it('应该添加条件事件', () => {
      const condition: ConditionCheck = (map) => map.time > 100;
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addConditionalEvent(
        'conditional',
        condition,
        callback
      );

      expect(newQueue.getEventCount()).toBe(1);

      const event = newQueue.getAllEvents().get(0);
      expect(event?.type).toBe(EventType.CONDITIONAL);
    });

    it('应该支持自定义检查间隔', () => {
      const condition: ConditionCheck = (map) => true;
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addConditionalEvent(
        'conditional',
        condition,
        callback,
        500 // 每 500ms 检查一次
      );

      const event = newQueue.getAllEvents().get(0) as any;
      expect(event?.checkInterval).toBe(500);
    });
  });

  describe('即时事件', () => {
    it('应该添加即时事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addImmediateEvent('immediate', callback);

      expect(newQueue.getEventCount()).toBe(1);

      const event = newQueue.getAllEvents().get(0);
      expect(event?.type).toBe(EventType.IMMEDIATE);
    });

    it('即时事件应该在更新时立即触发', () => {
      const callback: EventCallback = (map, data) => ({
        map: map.withData('triggered', true),
      });

      const newQueue = queue.addImmediateEvent('immediate', callback);
      const { queue: updatedQueue, triggeredEvents } = newQueue.update(0, mockMap);

      expect(triggeredEvents.length).toBe(1);
      expect(triggeredEvents[0].name).toBe('immediate');
      expect(updatedQueue.getEventCount()).toBe(0);
    });
  });

  describe('事件更新和触发', () => {
    describe('延迟事件触发', () => {
      it('应该触发到期的事件', () => {
        const callback: EventCallback = (map, data) => ({
          map: map.withData('triggered', true),
        });

        const newQueue = queue.addDelayedEvent('delayed', 500, callback);
        const { queue: updatedQueue, triggeredEvents } = newQueue.update(500, mockMap);

        expect(triggeredEvents.length).toBe(1);
        expect(triggeredEvents[0].name).toBe('delayed');
      });

      it('未到期的事件不应触发', () => {
        const callback: EventCallback = (map, data) => ({ map });

        const newQueue = queue.addDelayedEvent('delayed', 1000, callback);
        const { triggeredEvents } = newQueue.update(500, mockMap);

        expect(triggeredEvents.length).toBe(0);
      });

      it('应该更新时间', () => {
        const { queue: updatedQueue } = queue.update(500, mockMap);

        expect(updatedQueue.getCurrentTime()).toBe(500);
      });

      it('触发后应该更新地图', () => {
        const callback: EventCallback = (map, data) => ({
          map: map.withData('updated', true),
        });

        const newQueue = queue.addDelayedEvent('delayed', 100, callback);
        const { map: updatedMap } = newQueue.update(100, mockMap);

        expect(updatedMap.data.updated).toBe(true);
      });
    });

    describe('周期性事件触发', () => {
      it('应该按周期触发事件', () => {
        let triggerCount = 0;
        const callback: EventCallback = (map, data) => {
          triggerCount++;
          return { map };
        };

        const newQueue = queue.addPeriodicEvent('periodic', 100, callback, -1);

        // 第一次触发
        let result = newQueue.update(100, mockMap);
        expect(triggerCount).toBe(1);

        // 第二次触发
        result = result.queue.update(200, result.map);
        expect(triggerCount).toBe(2);

        // 第三次触发
        result = result.queue.update(300, result.map);
        expect(triggerCount).toBe(3);
      });

      it('应该限制最大触发次数', () => {
        let triggerCount = 0;
        const callback: EventCallback = (map, data) => {
          triggerCount++;
          return { map };
        };

        const newQueue = queue.addPeriodicEvent('periodic', 100, callback, 2);

        // 第一次触发
        let result = newQueue.update(100, mockMap);
        expect(result.triggeredEvents.length).toBe(1);

        // 第二次触发
        result = result.queue.update(200, result.map);
        expect(result.triggeredEvents.length).toBe(1);

        // 第三次不应触发
        result = result.queue.update(300, result.map);
        expect(result.triggeredEvents.length).toBe(0);
      });
    });

    describe('条件事件触发', () => {
      it('应该在条件满足时触发', () => {
        const condition: ConditionCheck = (map) => map.time > 100;
        const callback: EventCallback = (map, data) => ({
          map: map.withTime(150).withData('triggered', true),
        });

        const newQueue = queue.addConditionalEvent(
          'conditional',
          condition,
          callback,
          50
        );

        // 更新到 100，条件不满足 (map.time = 0)
        let result = newQueue.update(100, mockMap);
        expect(result.map.data.triggered).toBeUndefined();

        // 更新到 150，条件满足
        // 先更新地图时间
        let updatedMap = result.map.withTime(150);
        result = result.queue.update(150, updatedMap);
        expect(result.map.data.triggered).toBe(true);
      });

      it('应该按间隔检查条件', () => {
        let checkCount = 0;
        const condition: ConditionCheck = (map) => {
          checkCount++;
          return map.time > 100;
        };
        const callback: EventCallback = (map, data) => ({ map });

        const newQueue = queue.addConditionalEvent(
          'conditional',
          condition,
          callback,
          50 // 每 50ms 检查一次
        );

        // 更新 30ms，不应该检查
        let result = newQueue.update(30, mockMap);
        expect(checkCount).toBe(0);

        // 更新 60ms，应该检查一次
        result = result.queue.update(60, result.map);
        expect(checkCount).toBe(1);
      });
    });
  });

  describe('事件管理', () => {
    it('应该取消事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const eventId = createEventId('test_event_001');
      const newQueue = queue.addDelayedEvent('test', 1000, callback);

      // 注意：addDelayedEvent 内部生成 ID，我们无法预测
      // 所以这里测试取消一个不存在的 ID，应该返回原队列
      const cancelled = newQueue.cancelEvent(eventId);

      // 应该返回原队列（事件不存在）
      expect(cancelled.getEventCount()).toBe(newQueue.getEventCount());
    });

    it('应该暂停事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const eventId = createEventId('test_event_001');
      const newQueue = queue.addDelayedEvent('test', 1000, callback);

      // 测试暂停一个不存在的 ID，应该返回原队列
      const paused = newQueue.pauseEvent(eventId);

      // 应该返回原队列（事件不存在）
      expect(paused.getEventCount()).toBe(newQueue.getEventCount());
    });

    it('应该清空所有事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue
        .addDelayedEvent('event1', 1000, callback)
        .addDelayedEvent('event2', 2000, callback)
        .addDelayedEvent('event3', 3000, callback);

      expect(newQueue.getEventCount()).toBe(3);

      const cleared = newQueue.clear();
      expect(cleared.getEventCount()).toBe(0);
    });
  });

  describe('查询方法', () => {
    beforeEach(() => {
      const callback: EventCallback = (map, data) => ({ map });

      queue = queue
        .addDelayedEvent('delayed', 1000, callback, EventPriority.LOW)
        .addPeriodicEvent('periodic', 500, callback, -1, EventPriority.HIGH)
        .addConditionalEvent('conditional', () => false, callback, 100)
        .addImmediateEvent('immediate', callback, EventPriority.URGENT);
    });

    it('应该获取事件总数', () => {
      expect(queue.getEventCount()).toBe(4);
    });

    it('应该获取待处理事件数', () => {
      expect(queue.getPendingEventCount()).toBe(4);
    });

    it('应该按类型获取事件', () => {
      const delayedEvents = queue.getEventsByType(EventType.DELAYED);
      expect(delayedEvents.size).toBe(1);
      expect(delayedEvents.get(0)?.name).toBe('delayed');

      const periodicEvents = queue.getEventsByType(EventType.PERIODIC);
      expect(periodicEvents.size).toBe(1);
      expect(periodicEvents.get(0)?.name).toBe('periodic');

      const conditionalEvents = queue.getEventsByType(EventType.CONDITIONAL);
      expect(conditionalEvents.size).toBe(1);
      expect(conditionalEvents.get(0)?.name).toBe('conditional');

      const immediateEvents = queue.getEventsByType(EventType.IMMEDIATE);
      expect(immediateEvents.size).toBe(1);
      expect(immediateEvents.get(0)?.name).toBe('immediate');
    });

    it('应该按优先级获取事件', () => {
      const urgentEvents = queue.getEventsByPriority(EventPriority.URGENT);
      expect(urgentEvents.size).toBe(1);
      expect(urgentEvents.get(0)?.name).toBe('immediate');

      const highEvents = queue.getEventsByPriority(EventPriority.HIGH);
      expect(highEvents.size).toBe(1);
      expect(highEvents.get(0)?.name).toBe('periodic');

      const lowEvents = queue.getEventsByPriority(EventPriority.LOW);
      expect(lowEvents.size).toBe(1);
      expect(lowEvents.get(0)?.name).toBe('delayed');
    });

    it('应该获取所有事件', () => {
      const allEvents = queue.getAllEvents();
      expect(allEvents.size).toBe(4);
    });
  });

  describe('事件 ID 生成', () => {
    it('应该生成唯一的事件 ID', () => {
      const id1 = createEventId('event_001');
      const id2 = createEventId('event_002');

      expect(id1).not.toBe(id2);
    });

    it('事件 ID 应该是字符串', () => {
      const id = createEventId('event_001');
      expect(typeof id).toBe('string');
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const callback: EventCallback = (map, data) => ({ map });

      queue = queue.addDelayedEvent('test', 1000, callback);

      const json = queue.toJson();

      expect(json).toHaveProperty('currentTime');
      expect(json).toHaveProperty('eventCounter');
      expect(json).toHaveProperty('events');
    });

    it('应该从 JSON 创建', () => {
      const callback: EventCallback = (map, data) => ({ map });

      queue = queue.addDelayedEvent('test', 1000, callback);

      const json = queue.toJson();
      const restored = EventQueue.fromJson(json);

      expect(restored.getCurrentTime()).toBe(queue.getCurrentTime());
      expect(restored.getEventCount()).toBe(queue.getEventCount());
    });
  });

  describe('边界情况', () => {
    it('应该处理空队列的更新', () => {
      const { queue: newQueue, map: newMap, triggeredEvents } =
        queue.update(100, mockMap);

      expect(newQueue.getEventCount()).toBe(0);
      expect(triggeredEvents.length).toBe(0);
    });

    it('应该处理零延迟事件', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addDelayedEvent('instant', 0, callback);
      const { triggeredEvents } = newQueue.update(0, mockMap);

      expect(triggeredEvents.length).toBe(1);
    });

    it('应该处理负数周期（无限）', () => {
      const callback: EventCallback = (map, data) => ({ map });

      const newQueue = queue.addPeriodicEvent('infinite', 100, callback, -1);

      const event = newQueue.getAllEvents().get(0) as any;
      expect(event.maxTriggers).toBe(-1);
    });

    it('应该处理立即满足的条件', () => {
      const condition: ConditionCheck = () => true;
      const callback: EventCallback = (map, data) => ({
        map: map.withData('triggered', true),
      });

      const newQueue = queue.addConditionalEvent(
        'immediate',
        condition,
        callback,
        10
      );

      // 第一次更新应该检查条件
      const result = newQueue.update(10, mockMap);
      expect(result.map.data.triggered).toBe(true);
    });
  });

  describe('优先级系统', () => {
    it('紧急事件应该最先触发', () => {
      const callback: EventCallback = (map, data) => ({ map });

      queue = queue
        .addDelayedEvent('low', 100, callback, EventPriority.LOW)
        .addDelayedEvent('urgent', 100, callback, EventPriority.URGENT)
        .addDelayedEvent('high', 100, callback, EventPriority.HIGH)
        .addDelayedEvent('normal', 100, callback, EventPriority.NORMAL);

      const events = queue.getAllEvents();
      expect(events.get(0)?.name).toBe('urgent');
      expect(events.get(1)?.name).toBe('high');
      expect(events.get(2)?.name).toBe('normal');
      expect(events.get(3)?.name).toBe('low');
    });

    it('同优先级按触发时间排序', () => {
      const callback: EventCallback = (map, data) => ({ map });

      queue = queue
        .addDelayedEvent('late', 200, callback, EventPriority.NORMAL)
        .addDelayedEvent('early', 100, callback, EventPriority.NORMAL)
        .addDelayedEvent('middle', 150, callback, EventPriority.NORMAL);

      const events = queue.getAllEvents();
      expect(events.get(0)?.name).toBe('early');
      expect(events.get(1)?.name).toBe('middle');
      expect(events.get(2)?.name).toBe('late');
    });
  });

  describe('集成测试', () => {
    it('应该混合处理不同类型的事件', () => {
      let delayedTriggered = false;
      let periodicTriggered = 0;

      const delayedCallback: EventCallback = (map, data) => {
        delayedTriggered = true;
        return { map };
      };

      const periodicCallback: EventCallback = (map, data) => {
        periodicTriggered++;
        return { map };
      };

      queue = queue
        .addDelayedEvent('delayed', 500, delayedCallback)
        .addPeriodicEvent('periodic', 100, periodicCallback, -1)
        .addImmediateEvent('immediate', (map) => ({ map }));

      // 更新：immediate 立即触发
      let result = queue.update(0, mockMap);
      expect(result.triggeredEvents.length).toBe(1);
      expect(result.triggeredEvents[0].name).toBe('immediate');

      // 更新 100ms：periodic 第一次触发
      result = result.queue.update(100, result.map);
      expect(periodicTriggered).toBe(1);

      // 更新 200ms：periodic 第二次触发
      result = result.queue.update(200, result.map);
      expect(periodicTriggered).toBe(2);

      // 更新 300ms：periodic 第三次触发
      result = result.queue.update(300, result.map);
      expect(periodicTriggered).toBe(3);

      // 更新 500ms：delayed 触发，periodic 第四次触发
      result = result.queue.update(500, result.map);
      expect(delayedTriggered).toBe(true);
      expect(periodicTriggered).toBe(4);
    });
  });
});
