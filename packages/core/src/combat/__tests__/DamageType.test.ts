/**
 * DamageType 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Set } from 'immutable';
import { DamageType, DamageTypes } from '../DamageType';
import { DamageCategory } from '../types';
import {
  createDamageTypeId,
  createSkillId,
} from '../types';

describe('DamageType', () => {
  describe('create', () => {
    it('should create a basic DamageType', () => {
      const type = DamageType.create({
        id: createDamageTypeId('test_damage'),
        name: 'Test Damage',
        description: 'A test damage type',
        category: DamageCategory.PHYSICAL,
        physical: true,
        edged: false,
        heat: false,
        immuneFlags: new Set(),
        skill: null,
      });

      expect(type.id).toBe(createDamageTypeId('test_damage'));
      expect(type.name).toBe('Test Damage');
      expect(type.description).toBe('A test damage type');
      expect(type.category).toBe(DamageCategory.PHYSICAL);
    });

    it('should create a physical edged damage type', () => {
      const type = DamageType.create({
        id: createDamageTypeId('slash'),
        name: 'Slash',
        category: DamageCategory.PHYSICAL,
        physical: true,
        edged: true,
        heat: false,
        immuneFlags: new Set(),
        skill: createSkillId('cutting'),
      });

      expect(type.isPhysical()).toBe(true);
      expect(type.isEdged()).toBe(true);
      expect(type.isHeat()).toBe(false);
    });
  });

  describe('copyFrom', () => {
    it('should copy attributes from another DamageType', () => {
      const original = DamageTypes.CUT;
      const copy = DamageType.copyFrom(original, {
        name: 'Sharp Cut',
      });

      expect(copy.id).toBe(original.id);
      expect(copy.name).toBe('Sharp Cut');
      expect(copy.category).toBe(original.category);
      expect(copy.edged).toBe(original.edged);
    });
  });

  describe('type checks', () => {
    it('should identify damage types correctly', () => {
      expect(DamageTypes.BASH.isPhysical()).toBe(true);
      expect(DamageTypes.BASH.isEdged()).toBe(false);
      expect(DamageTypes.BASH.isHeat()).toBe(false);

      expect(DamageTypes.CUT.isPhysical()).toBe(true);
      expect(DamageTypes.CUT.isEdged()).toBe(true);

      expect(DamageTypes.HEAT.isHeat()).toBe(true);
      expect(DamageTypes.HEAT.isPhysical()).toBe(false);

      expect(DamageTypes.ELECTRIC.isElectric()).toBe(true);
      expect(DamageTypes.COLD.isCold()).toBe(true);
      expect(DamageTypes.ACID.isAcid()).toBe(true);
      expect(DamageTypes.BIOLOGICAL.isBiological()).toBe(true);
    });
  });

  describe('immune flags', () => {
    it('should check immune flags correctly', () => {
      const type = DamageType.create({
        id: createDamageTypeId('fire'),
        name: 'Fire',
        category: DamageCategory.HEAT,
        physical: false,
        edged: false,
        heat: true,
        immuneFlags: new Set(['FIRE_IMMUNE', 'HEAT_IMMUNE']),
        skill: null,
      });

      expect(type.hasImmuneFlag('FIRE_IMMUNE')).toBe(true);
      expect(type.hasImmuneFlag('COLD_IMMUNE')).toBe(false);
      expect(type.hasAnyImmuneFlag('FIRE_IMMUNE', 'COLD_IMMUNE')).toBe(true);
      expect(type.hasAllImmuneFlags('FIRE_IMMUNE', 'HEAT_IMMUNE')).toBe(true);
      expect(type.hasAllImmuneFlags('FIRE_IMMUNE', 'COLD_IMMUNE')).toBe(false);
    });
  });

  describe('skill association', () => {
    it('should manage skill association correctly', () => {
      expect(DamageTypes.CUT.hasSkill()).toBe(true);
      expect(DamageTypes.CUT.getSkill()).toBe(createSkillId('cutting'));

      expect(DamageTypes.BASH.hasSkill()).toBe(false);
      expect(DamageTypes.BASH.getSkill()).toBe(null);
    });
  });

  describe('utility methods', () => {
    it('should get display name correctly', () => {
      expect(DamageTypes.CUT.getDisplayName()).toBe('Cut');
    });

    it('should get description correctly', () => {
      const withDesc = DamageType.create({
        id: createDamageTypeId('test'),
        name: 'Test',
        description: 'Custom description',
        category: DamageCategory.PHYSICAL,
        physical: true,
        edged: false,
        heat: false,
        immuneFlags: new Set(),
        skill: null,
      });
      expect(withDesc.getDescription()).toBe('Custom description');

      const withoutDesc = DamageType.create({
        id: createDamageTypeId('test2'),
        name: 'Test2',
        category: DamageCategory.PHYSICAL,
        physical: true,
        edged: false,
        heat: false,
        immuneFlags: new Set(),
        skill: null,
      });
      expect(withoutDesc.getDescription()).toBe('A test2 damage type.');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = DamageTypes.CUT;
      const json = original.toJson();
      const restored = DamageType.fromJson(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.category).toBe(original.category);
      expect(restored.physical).toBe(original.physical);
      expect(restored.edged).toBe(original.edged);
    });
  });

  describe('predefined types', () => {
    it('should have all predefined damage types', () => {
      expect(DamageTypes.BASH).toBeDefined();
      expect(DamageTypes.CUT).toBeDefined();
      expect(DamageTypes.STAB).toBeDefined();
      expect(DamageTypes.HEAT).toBeDefined();
      expect(DamageTypes.ELECTRIC).toBeDefined();
      expect(DamageTypes.COLD).toBeDefined();
      expect(DamageTypes.BIOLOGICAL).toBeDefined();
      expect(DamageTypes.ACID).toBeDefined();
      expect(DamageTypes.OXYGEN).toBeDefined();
      expect(DamageTypes.RADIATION).toBeDefined();
    });
  });
});
