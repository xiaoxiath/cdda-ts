/**
 * Effect 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from '../Effect';
import { EffectDefinition, EffectDefinitions } from '../EffectDefinition';
import { EffectIntensity } from '../types';

describe('Effect', () => {
  let mockDefinition: EffectDefinition;
  let fixedTime: number;

  beforeEach(() => {
    fixedTime = 1000000;
    vi.useFakeTimers().setSystemTime(fixedTime);

    mockDefinition = EffectDefinition.create({
      id: 'test_effect' as any,
      name: 'Test Effect',
      description: 'A test effect',
      category: 'buff' as any,
      intensity: EffectIntensity.MODERATE,
      durationType: 'medium' as any,
      stackable: true,
      maxStacks: 3,
    });
  });

  describe('create', () => {
    it('should create effect with default duration', () => {
      const effect = Effect.create(mockDefinition, fixedTime);

      expect(effect.definition).toBe(mockDefinition);
      expect(effect.startTime).toBe(fixedTime);
      expect(effect.duration).toBe(60000); // MEDIUM duration
      expect(effect.intensity).toBe(EffectIntensity.MODERATE);
      expect(effect.currentStacks).toBe(1);
      expect(effect.isActive).toBe(true);
    });

    it('should create effect with custom duration', () => {
      const effect = Effect.withDuration(mockDefinition, 30000, fixedTime);

      expect(effect.duration).toBe(30000);
    });

    it('should create effect with custom intensity', () => {
      const effect = Effect.withIntensity(mockDefinition, EffectIntensity.SEVERE, fixedTime);

      expect(effect.intensity).toBe(EffectIntensity.SEVERE);
    });
  });

  describe('state queries', () => {
    it('should calculate remaining time correctly', () => {
      const effect = Effect.withDuration(mockDefinition, 60000, fixedTime);

      // At start time
      expect(effect.getRemainingTime(fixedTime)).toBe(60000);

      // After 10 seconds
      expect(effect.getRemainingTime(fixedTime + 10000)).toBe(50000);

      // After duration
      expect(effect.getRemainingTime(fixedTime + 60000)).toBe(0);

      // Past duration
      expect(effect.getRemainingTime(fixedTime + 70000)).toBe(0);
    });

    it('should check expiration correctly', () => {
      const effect = Effect.withDuration(mockDefinition, 60000, fixedTime);

      expect(effect.isExpired(fixedTime)).toBe(false);
      expect(effect.isExpired(fixedTime + 59999)).toBe(false);
      expect(effect.isExpired(fixedTime + 60000)).toBe(true);
      expect(effect.isExpired(fixedTime + 70000)).toBe(true);
    });

    it('should check permanent effect correctly', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });
      const effect = Effect.create(permanentDef, fixedTime);

      expect(effect.isExpired(fixedTime)).toBe(false);
      expect(effect.isExpired(fixedTime + 9999999)).toBe(false);
      expect(effect.getRemainingTime(fixedTime)).toBe(Infinity);
    });

    it('should check periodic tick correctly', () => {
      const periodicDef = EffectDefinition.create({
        id: 'periodic' as any,
        name: 'Periodic',
        category: 'buff' as any,
        applyMode: 'periodic' as any,
        tickInterval: 5000,
      });
      const effect = Effect.create(periodicDef, fixedTime);

      // Just created, no tick needed
      expect(effect.needsTick(fixedTime)).toBe(false);

      // After 3 seconds, still no tick
      expect(effect.needsTick(fixedTime + 3000)).toBe(false);

      // After 5 seconds, tick needed
      expect(effect.needsTick(fixedTime + 5000)).toBe(true);
    });
  });

  describe('progress', () => {
    it('should calculate progress percent correctly', () => {
      const effect = Effect.withDuration(mockDefinition, 60000, fixedTime);

      expect(effect.getProgressPercent(fixedTime)).toBe(0);
      expect(effect.getProgressPercent(fixedTime + 30000)).toBe(50);
      expect(effect.getProgressPercent(fixedTime + 60000)).toBe(100);
    });

    it('should return 100% for permanent effects', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });
      const effect = Effect.create(permanentDef, fixedTime);

      expect(effect.getProgressPercent(fixedTime)).toBe(100);
    });
  });

  describe('stacking', () => {
    it('should add stack when stackable', () => {
      const effect = Effect.create(mockDefinition, fixedTime);
      const stacked = effect.addStack(fixedTime);

      expect(stacked.currentStacks).toBe(2);
    });

    it('should respect max stacks', () => {
      const effect = Effect.create(mockDefinition, fixedTime);
      const stacked1 = effect.addStack(fixedTime);
      const stacked2 = stacked1.addStack(fixedTime);
      const stacked3 = stacked2.addStack(fixedTime);

      expect(stacked1.currentStacks).toBe(2);
      expect(stacked2.currentStacks).toBe(3);
      expect(stacked3.currentStacks).toBe(3); // Max is 3
    });

    it('should not stack when not stackable', () => {
      const notStackableDef = EffectDefinition.create({
        id: 'no_stack' as any,
        name: 'No Stack',
        category: 'buff' as any,
        stackable: false,
      });
      const effect = Effect.create(notStackableDef, fixedTime);
      const stacked = effect.addStack(fixedTime);

      expect(stacked.currentStacks).toBe(1);
    });

    it('should remove stack correctly', () => {
      const effect = Effect.create(mockDefinition, fixedTime)
        .addStack(fixedTime)
        .addStack(fixedTime);

      expect(effect.currentStacks).toBe(3);

      const removed = effect.removeStack();
      expect(removed.currentStacks).toBe(2);

      const removed2 = removed.removeStack();
      expect(removed2.currentStacks).toBe(1);

      // Removing last stack deactivates
      const removed3 = removed2.removeStack();
      expect(removed3.currentStacks).toBe(1);
      expect(removed3.isActive).toBe(false);
    });
  });

  describe('activation', () => {
    it('should deactivate effect', () => {
      const effect = Effect.create(mockDefinition, fixedTime);
      const deactivated = effect.deactivate();

      expect(deactivated.isActive).toBe(false);

      // Deactivating again should return same instance
      const deactivatedAgain = deactivated.deactivate();
      expect(deactivatedAgain === deactivated).toBe(true);
    });
  });

  describe('modification', () => {
    it('should extend duration', () => {
      const effect = Effect.withDuration(mockDefinition, 60000, fixedTime);
      const extended = effect.extendDuration(30000);

      expect(extended.duration).toBe(90000);
    });

    it('should not extend permanent effect', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });
      const effect = Effect.create(permanentDef, fixedTime);
      const extended = effect.extendDuration(30000);

      expect(extended.duration).toBe(Infinity);
    });

    it('should set intensity', () => {
      const effect = Effect.create(mockDefinition, fixedTime);
      const intense = effect.setIntensity(EffectIntensity.SEVERE);

      expect(intense.intensity).toBe(EffectIntensity.SEVERE);
    });

    it('should update tick time', () => {
      const periodicDef = EffectDefinition.create({
        id: 'periodic' as any,
        name: 'Periodic',
        category: 'buff' as any,
        applyMode: 'periodic' as any,
        tickInterval: 5000,
      });
      const effect = Effect.create(periodicDef, fixedTime);

      expect(effect.needsTick(fixedTime + 5000)).toBe(true);

      const updated = effect.updateTick(fixedTime + 5000);
      expect(updated.needsTick(fixedTime + 5000)).toBe(false);
      expect(updated.needsTick(fixedTime + 10000)).toBe(true);
    });
  });

  describe('modifiers', () => {
    it('should calculate modifier with stacks', () => {
      const defWithMods = EffectDefinition.create({
        id: 'test' as any,
        name: 'Test',
        category: 'buff' as any,
        stackable: true,
        maxStacks: 3,
        modifiers: [
          { type: 'STAT_ADD' as any, target: 'strength', value: 5 },
        ],
      });

      const effect = Effect.create(defWithMods, fixedTime)
        .addStack(fixedTime)
        .addStack(fixedTime);

      expect(effect.getModifierValue('strength')).toBe(15); // 5 * 3
    });
  });

  describe('display', () => {
    it('should display name with stacks', () => {
      const effect = Effect.create(mockDefinition, fixedTime)
        .addStack(fixedTime)
        .addStack(fixedTime);

      expect(effect.getDisplayName()).toBe('Test Effect (3x)');
    });

    it('should display name without stacks', () => {
      const effect = Effect.create(mockDefinition, fixedTime);
      expect(effect.getDisplayName()).toBe('Test Effect');
    });

    it('should get remaining time description', () => {
      const effect = Effect.withDuration(mockDefinition, 60000, fixedTime);

      // 60秒显示为"1 分钟" (实现会将>=60秒转换为分钟显示)
      expect(effect.getRemainingTimeDescription(fixedTime)).toBe('1 分钟');
      expect(effect.getRemainingTimeDescription(fixedTime + 30000)).toBe('30 秒');
      expect(effect.getRemainingTimeDescription(fixedTime + 59000)).toBe('1 秒');
      expect(effect.getRemainingTimeDescription(fixedTime + 60000)).toBe('即将结束');
    });

    it('should display permanent effect', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });
      const effect = Effect.create(permanentDef, fixedTime);

      expect(effect.getRemainingTimeDescription(fixedTime)).toBe('永久');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = Effect.create(mockDefinition, fixedTime);
      const json = original.toJson();
      const restored = Effect.fromJson(json, mockDefinition);

      expect(restored.definition).toBe(mockDefinition);
      expect(restored.startTime).toBe(original.startTime);
      expect(restored.duration).toBe(original.duration);
      expect(restored.intensity).toBe(original.intensity);
      expect(restored.currentStacks).toBe(original.currentStacks);
      expect(restored.isActive).toBe(original.isActive);
    });
  });
});
