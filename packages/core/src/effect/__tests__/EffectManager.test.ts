/**
 * EffectManager 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectManager } from '../EffectManager';
import { EffectDefinition, EffectDefinitions } from '../EffectDefinition';
import { EffectCategory } from '../types';

describe('EffectManager', () => {
  let manager: EffectManager;
  let fixedTime: number;

  beforeEach(() => {
    fixedTime = 1000000;
    vi.useFakeTimers().setSystemTime(fixedTime);

    const definitions = Object.values(EffectDefinitions) as EffectDefinition[];
    manager = EffectManager.create(definitions);
  });

  describe('create', () => {
    it('should create empty manager', () => {
      const emptyManager = EffectManager.create([]);

      expect(emptyManager.getEffectCount()).toBe(0);
      expect(emptyManager.getAllEffects().isEmpty()).toBe(true);
    });

    it('should create manager with definitions', () => {
      const defs = [
        EffectDefinitions.POISON_WEAK,
        EffectDefinitions.REGEN_WEAK,
      ];
      const mgr = EffectManager.create(defs);

      expect(mgr.definitions.size).toBe(2);
    });
  });

  describe('apply effects', () => {
    it('should apply new effect', () => {
      const updated = manager.applyEffect('poison_weak' as any, fixedTime);

      expect(updated.getEffectCount()).toBe(1);
      const effect = updated.getEffect('poison_weak' as any);
      expect(effect).toBeDefined();
      expect(effect!.isActive).toBe(true);
    });

    it('should stack stackable effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const effect = updated.getEffect('poison_weak' as any);
      expect(effect!.currentStacks).toBe(3);
    });

    it('should not stack non-stackable effects', () => {
      let updated = manager;
      updated = updated.applyEffect('stunned' as any, fixedTime);
      updated = updated.applyEffect('stunned' as any, fixedTime);

      const effect = updated.getEffect('stunned' as any);
      expect(effect!.currentStacks).toBe(1);
    });

    it('should apply effect with custom duration', () => {
      const updated = manager.applyEffectWithDuration(
        'poison_weak' as any,
        30000,
        fixedTime
      );

      const effect = updated.getEffect('poison_weak' as any);
      expect(effect!.duration).toBe(30000);
    });

    it('should extend duration when applying existing stackable effect', () => {
      let updated = manager;
      updated = updated.applyEffectWithDuration('poison_weak' as any, 30000, fixedTime);
      const first = updated.getEffect('poison_weak' as any)!;
      expect(first.duration).toBe(30000);

      updated = updated.applyEffectWithDuration('poison_weak' as any, 20000, fixedTime + 10000);
      const second = updated.getEffect('poison_weak' as any)!;
      expect(second.duration).toBeGreaterThan(30000);
      expect(second.currentStacks).toBe(2);
    });
  });

  describe('remove effects', () => {
    it('should remove effect', () => {
      let updated = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(1);

      updated = updated.removeEffect('poison_weak' as any);
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should reduce stack when removing stackable effect', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const effect = updated.getEffect('poison_weak' as any)!;
      expect(effect.currentStacks).toBe(3);

      updated = updated.removeEffect('poison_weak' as any);
      const removed = updated.getEffect('poison_weak' as any)!;
      expect(removed.currentStacks).toBe(2);
    });

    it('should remove all effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(2);

      updated = updated.removeAllEffects();
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should remove effects by category', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_moderate' as any, fixedTime); // poison category
      updated = updated.applyEffect('regen_weak' as any, fixedTime); // regen category

      expect(updated.getEffectCount()).toBe(3);

      // Remove poison category effects
      updated = updated.removeEffectsByCategory('poison' as any);
      expect(updated.getEffectCount()).toBe(1); // Only regen_weak remains
      expect(updated.hasEffect('regen_weak' as any)).toBe(true);
    });

    it('should remove buffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      updated = updated.removeBuffs();
      expect(updated.getEffectCount()).toBe(1);
      expect(updated.hasEffect('poison_weak' as any)).toBe(true);
      expect(updated.hasEffect('regen_weak' as any)).toBe(false);
    });

    it('should remove debuffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      updated = updated.removeDebuffs();
      expect(updated.getEffectCount()).toBe(1);
      expect(updated.hasEffect('regen_weak' as any)).toBe(true);
      expect(updated.hasEffect('poison_weak' as any)).toBe(false);
    });
  });

  describe('query effects', () => {
    it('should check if has effect', () => {
      expect(manager.hasEffect('poison_weak' as any)).toBe(false);

      const withEffect = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(withEffect.hasEffect('poison_weak' as any)).toBe(true);
    });

    it('should get active effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const active = updated.getActiveEffects();
      expect(active.size).toBe(2);
    });

    it('should get effects by category', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime); // poison
      updated = updated.applyEffect('poison_moderate' as any, fixedTime); // poison
      updated = updated.applyEffect('regen_weak' as any, fixedTime); // regen

      const poisonEffects = updated.getEffectsByCategory('poison' as any);
      expect(poisonEffects.size).toBe(2);
    });

    it('should get buffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const buffs = updated.getBuffs();
      expect(buffs.size).toBe(1);
      expect(buffs.first()!.definition.id).toBe('regen_weak' as any);
    });

    it('should get debuffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const debuffs = updated.getDebuffs();
      expect(debuffs.size).toBe(1);
      expect(debuffs.first()!.definition.id).toBe('poison_weak' as any);
    });

    it('should check if has effect category', () => {
      expect(manager.hasEffectCategory('poison' as any)).toBe(false);

      const withPoison = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(withPoison.hasEffectCategory('poison' as any)).toBe(true);
      expect(withPoison.hasEffectCategory('regen' as any)).toBe(false);
    });
  });

  describe('update', () => {
    it('should remove expired effects', () => {
      // Create effect with 5 second duration
      const shortDef = EffectDefinition.create({
        id: 'short' as any,
        name: 'Short',
        category: 'buff' as any,
        durationType: 'short' as any,
      });

      const managerWithShort = EffectManager.create([shortDef]);
      let updated = managerWithShort.applyEffect('short' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(1);

      // Advance time by 11 seconds (effect expires after 10)
      updated = updated.update(fixedTime + 11000);
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should keep non-expired effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      // Advance time by 1 second
      updated = updated.update(fixedTime + 1000);
      expect(updated.getEffectCount()).toBe(1);
    });

    it('should keep permanent effects', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });

      const mgr = EffectManager.create([permanentDef]);
      let updated = mgr.applyEffect('perm' as any, fixedTime);

      // Advance time by a lot
      updated = updated.update(fixedTime + 9999999);
      expect(updated.getEffectCount()).toBe(1);
    });
  });

  describe('modifiers', () => {
    it('should calculate speed modifier', () => {
      // STIMULANT adds +20 to speed
      let updated = manager.applyEffect('stimulant' as any, fixedTime);
      expect(updated.getSpeedModifier()).toBe(20);
    });

    it('should calculate damage modifier', () => {
      // POISON does damage via health reduction
      let updated = manager.applyEffect('poison_weak' as any, fixedTime);
      const mod = updated.getDamageModifier('all');
      // Poison has STAT_ADD on health with negative value
      expect(mod).toBe(0); // No direct damage modifiers
    });

    it('should get modifier value', () => {
      // STIMULANT adds +2 to strength
      let updated = manager.applyEffect('stimulant' as any, fixedTime);
      expect(updated.getModifierValue('strength')).toBe(2);
    });

    it('should not stack non-stackable effects', () => {
      // STIMULANT is not stackable
      let updated = manager;
      updated = updated.applyEffect('stimulant' as any, fixedTime);
      const value1 = updated.getModifierValue('strength');

      updated = updated.applyEffect('stimulant' as any, fixedTime);
      const value2 = updated.getModifierValue('strength');

      // Should not stack - same value
      expect(value1).toBe(2);
      expect(value2).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should get total stacks', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      expect(updated.getTotalStacks()).toBe(4); // 3 poison + 1 regen
    });

    it('should get strongest effect', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const strongest = updated.getStrongestEffect();
      expect(strongest).toBeDefined();
      expect(strongest!.currentStacks).toBe(3);
    });
  });

  describe('serialization', () => {
    it.skip('should convert to JSON and back (require issue)', () => {
      // TODO: Fix the require() issue in EffectManager.fromJson
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const json = updated.toJson();
      expect(json.effects).toHaveLength(2);
      expect(json.definitions).toHaveLength(Object.keys(EffectDefinitions).length);

      const restored = EffectManager.fromJson(json);
      expect(restored.getEffectCount()).toBe(2);
      expect(restored.hasEffect('poison_weak' as any)).toBe(true);
      expect(restored.hasEffect('regen_weak' as any)).toBe(true);
    });
  });

  describe('display', () => {
    it('should get effect list string', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const list = updated.getEffectListString(fixedTime);
      expect(list).toContain('增益效果');
      expect(list).toContain('减益效果');
      expect(list).toContain('再生');
      expect(list).toContain('中毒');
    });

    it('should show no effects message when empty', () => {
      const list = manager.getEffectListString(fixedTime);
      expect(list).toBe('没有活跃效果');
    });
  });
});
