/**
 * EffectDefinition 单元测试
 */

import { describe, it, expect } from 'vitest';
import { EffectDefinition, EffectDefinitions } from '../EffectDefinition';
import { EffectCategory, EffectIntensity, EffectDurationType, EffectApplyMode } from '../types';
import { createEffectTypeId } from '../types';

describe('EffectDefinition', () => {
  describe('create', () => {
    it('should create a basic effect definition', () => {
      const def = EffectDefinition.create({
        id: createEffectTypeId('test_effect'),
        name: 'Test Effect',
        description: 'A test effect',
        category: EffectCategory.BUFF,
      });

      expect(def.id).toBe(createEffectTypeId('test_effect'));
      expect(def.name).toBe('Test Effect');
      expect(def.description).toBe('A test effect');
      expect(def.category).toBe(EffectCategory.BUFF);
    });

    it('should use default values', () => {
      const def = EffectDefinition.create({
        id: createEffectTypeId('test'),
        name: 'Test',
        category: EffectCategory.BUFF,
      });

      expect(def.intensity).toBe(EffectIntensity.MODERATE);
      expect(def.durationType).toBe(EffectDurationType.MEDIUM);
      expect(def.applyMode).toBe(EffectApplyMode.IMMEDIATE);
      expect(def.cancelable).toBe(true);
      expect(def.stackable).toBe(false);
      expect(def.maxStacks).toBe(1);
    });
  });

  describe('type check methods', () => {
    it('should identify buff effects correctly', () => {
      const buff = EffectDefinition.buff('test_buff' as any, 'Buff');
      expect(buff.isBuff()).toBe(true);
      expect(buff.isDebuff()).toBe(false);
    });

    it('should identify debuff effects correctly', () => {
      const debuff = EffectDefinition.debuff('test_debuff' as any, 'Debuff');
      expect(debuff.isBuff()).toBe(false);
      expect(debuff.isDebuff()).toBe(true);
    });

    it('should identify periodic effects', () => {
      const poison = EffectDefinition.poison('poison' as any, 'Poison');
      expect(poison.isPeriodic()).toBe(true);
    });

    it('should identify permanent effects', () => {
      const permanent = EffectDefinition.create({
        id: createEffectTypeId('perm'),
        name: 'Permanent',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.PERMANENT,
      });
      expect(permanent.isPermanent()).toBe(true);
    });
  });

  describe('stacking', () => {
    it('should check if can stack', () => {
      const stackable = EffectDefinition.create({
        id: createEffectTypeId('stackable'),
        name: 'Stackable',
        category: EffectCategory.BUFF,
        stackable: true,
        maxStacks: 5,
      });
      expect(stackable.canStack()).toBe(true);
      expect(stackable.maxStacks).toBe(5);
    });

    it('should not stack by default', () => {
      const notStackable = EffectDefinition.create({
        id: createEffectTypeId('not_stackable'),
        name: 'Not Stackable',
        category: EffectCategory.BUFF,
      });
      expect(notStackable.canStack()).toBe(false);
    });
  });

  describe('duration', () => {
    it('should get correct default duration', () => {
      const instant = EffectDefinition.create({
        id: createEffectTypeId('instant'),
        name: 'Instant',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.INSTANT,
      });
      expect(instant.getDefaultDuration()).toBe(0);

      const short = EffectDefinition.create({
        id: createEffectTypeId('short'),
        name: 'Short',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.SHORT,
      });
      expect(short.getDefaultDuration()).toBe(10000);

      const medium = EffectDefinition.create({
        id: createEffectTypeId('medium'),
        name: 'Medium',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.MEDIUM,
      });
      expect(medium.getDefaultDuration()).toBe(60000);

      const long = EffectDefinition.create({
        id: createEffectTypeId('long'),
        name: 'Long',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.LONG,
      });
      expect(long.getDefaultDuration()).toBe(300000);

      const permanent = EffectDefinition.create({
        id: createEffectTypeId('permanent'),
        name: 'Permanent',
        category: EffectCategory.BUFF,
        durationType: EffectDurationType.PERMANENT,
      });
      expect(permanent.getDefaultDuration()).toBe(Infinity);
    });
  });

  describe('modifiers', () => {
    it('should calculate modifier value', () => {
      const def = EffectDefinition.create({
        id: createEffectTypeId('test'),
        name: 'Test',
        category: EffectCategory.BUFF,
        modifiers: [
          { type: 'STAT_ADD' as any, target: 'strength', value: 5 },
          { type: 'STAT_ADD' as any, target: 'strength', value: 3 },
          { type: 'STAT_ADD' as any, target: 'dexterity', value: 2 },
        ],
      });

      expect(def.getModifierValue('strength')).toBe(8);
      expect(def.getModifierValue('dexterity')).toBe(2);
      expect(def.getModifierValue('intelligence')).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = EffectDefinition.poison('test_poison' as any, 'Test Poison', 'Test', 3);
      const json = original.toJson();
      const restored = EffectDefinition.fromJson(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.category).toBe(original.category);
      expect(restored.stackable).toBe(true);
    });
  });

  describe('predefined effects', () => {
    it('should have all predefined effects', () => {
      expect(EffectDefinitions.POISON_WEAK).toBeDefined();
      expect(EffectDefinitions.POISON_MODERATE).toBeDefined();
      expect(EffectDefinitions.POISON_SEVERE).toBeDefined();
      expect(EffectDefinitions.REGEN_WEAK).toBeDefined();
      expect(EffectDefinitions.REGEN_STRONG).toBeDefined();
      expect(EffectDefinitions.STUNNED).toBeDefined();
      expect(EffectDefinitions.FATIGUE_TIRED).toBeDefined();
      expect(EffectDefinitions.FATIGUE_EXHAUSTED).toBeDefined();
      expect(EffectDefinitions.STIMULANT).toBeDefined();
      expect(EffectDefinitions.ADRENALINE).toBeDefined();
      expect(EffectDefinitions.COLD).toBeDefined();
      expect(EffectDefinitions.FLU).toBeDefined();
    });

    it('poison effects should stack', () => {
      expect(EffectDefinitions.POISON_WEAK.canStack()).toBe(true);
      expect(EffectDefinitions.POISON_WEAK.maxStacks).toBe(5);
    });

    it('stun should not be cancelable', () => {
      expect(EffectDefinitions.STUNNED.canCancel()).toBe(false);
    });

    it('fatigue should stack', () => {
      expect(EffectDefinitions.FATIGUE_TIRED.canStack()).toBe(true);
      expect(EffectDefinitions.FATIGUE_EXHAUSTED.maxStacks).toBe(3);
    });
  });
});
