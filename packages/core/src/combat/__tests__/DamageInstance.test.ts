/**
 * DamageInstance 单元测试
 */

import { describe, it, expect } from 'vitest';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import {
  createDamageTypeId,
} from '../types';

describe('DamageInstance', () => {
  describe('create', () => {
    it('should create an empty DamageInstance', () => {
      const instance = DamageInstance.create();

      expect(instance.damageUnits.isEmpty()).toBe(true);
      expect(instance.isEmpty()).toBe(true);
      expect(instance.totalDamage()).toBe(0);
    });
  });

  describe('addDamage', () => {
    it('should add damage to instance', () => {
      const instance = DamageInstance.create()
        .addDamage(createDamageTypeId('BASH'), 10);

      expect(instance.isEmpty()).toBe(false);
      expect(instance.totalDamage()).toBe(10);
      expect(instance.hasDamageType(createDamageTypeId('BASH'))).toBe(true);
    });

    it('should merge damage of same type', () => {
      const instance = DamageInstance.create()
        .addDamage(createDamageTypeId('BASH'), 10)
        .addDamage(createDamageTypeId('BASH'), 5);

      expect(instance.totalDamage()).toBe(15);
      expect(instance.damageUnits.size).toBe(1);
    });

    it('should keep different damage types separate', () => {
      const instance = DamageInstance.create()
        .addDamage(createDamageTypeId('BASH'), 10)
        .addDamage(createDamageTypeId('CUT'), 5);

      expect(instance.totalDamage()).toBe(15);
      expect(instance.damageUnits.size).toBe(2);
    });
  });

  describe('static helpers', () => {
    it('should create bash damage', () => {
      const instance = DamageInstance.bash(20);

      expect(instance.totalDamage()).toBe(20);
      expect(instance.getDamageByType('bash' as any)).toBe(20);
    });

    it('should create cut damage', () => {
      const instance = DamageInstance.cut(15);

      expect(instance.totalDamage()).toBe(15);
      expect(instance.getDamageByType('cut' as any)).toBe(15);
    });

    it('should create stab damage', () => {
      const instance = DamageInstance.stab(25);

      expect(instance.totalDamage()).toBe(25);
      expect(instance.getDamageByType('stab' as any)).toBe(25);
    });
  });

  describe('combine', () => {
    it('should combine multiple instances', () => {
      const bash = DamageInstance.bash(10);
      const cut = DamageInstance.cut(15);
      const combined = DamageInstance.combine(bash, cut);

      expect(combined.totalDamage()).toBe(25);
      expect(combined.damageUnits.size).toBe(2);
    });
  });

  describe('multDamage', () => {
    it('should multiply damage pre-armor', () => {
      const instance = DamageInstance.bash(10);
      const multiplied = instance.multDamage(2.0, true);

      expect(multiplied.totalDamage()).toBe(20);
    });

    it('should multiply damage post-armor', () => {
      const instance = DamageInstance.bash(10);
      const multiplied = instance.multDamage(2.0, false);

      expect(multiplied.totalDamage()).toBe(20);
    });
  });

  describe('effects', () => {
    it('should add on-hit effects', () => {
      const instance = DamageInstance.bash(10)
        .addOnHitEffect('BLEED' as any);

      expect(instance.onHitEffects.size).toBe(1);
      expect(instance.onHitEffects.first()).toBe('BLEED' as any);
    });

    it('should add on-damage effects', () => {
      const instance = DamageInstance.bash(10)
        .addOnDamageEffect('BURN' as any);

      expect(instance.onDamageEffects.size).toBe(1);
      expect(instance.onDamageEffects.first()).toBe('BURN' as any);
    });
  });

  describe('getDamageByType', () => {
    it('should return zero for non-existent type', () => {
      const instance = DamageInstance.bash(10);
      expect(instance.getDamageByType('cut' as any)).toBe(0);
    });

    it('should return correct amount for existing type', () => {
      const instance = DamageInstance.bash(10);
      expect(instance.getDamageByType('bash' as any)).toBe(10);
    });
  });

  describe('getDamageTypes', () => {
    it('should return all damage types', () => {
      const instance = DamageInstance.create()
        .addDamage(createDamageTypeId('BASH'), 10)
        .addDamage(createDamageTypeId('CUT'), 5);

      const types = instance.getDamageTypes();
      expect(types).toHaveLength(2);
      expect(types).toContainEqual(createDamageTypeId('BASH'));
      expect(types).toContainEqual(createDamageTypeId('CUT'));
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = DamageInstance.create()
        .addDamage(createDamageTypeId('BASH'), 10)
        .addDamage(createDamageTypeId('CUT'), 5);

      const json = original.toJson();
      const restored = DamageInstance.fromJson(json);

      expect(restored.totalDamage()).toBe(original.totalDamage());
      expect(restored.damageUnits.size).toBe(original.damageUnits.size);
    });
  });
});
