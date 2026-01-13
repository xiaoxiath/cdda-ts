/**
 * Resistances 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Resistances, LIGHT_ARMOR_RESISTANCES, HEAVY_ARMOR_RESISTANCES } from '../Resistances';
import {
  createDamageTypeId,
  createBodyPartId,
} from '../types';
import { Map } from 'immutable';

describe('Resistances', () => {
  describe('create', () => {
    it('should create empty resistances', () => {
      const resistances = Resistances.create();

      expect(resistances.resistances.isEmpty()).toBe(true);
      expect(resistances.getResistance(createDamageTypeId('BASH'))).toBe(0);
    });
  });

  describe('fromObject', () => {
    it('should create resistances from object', () => {
      const resistances = Resistances.fromObject({
        BASH: 10,
        CUT: 15,
        HEAT: 5,
      });

      expect(resistances.getResistance(createDamageTypeId('BASH'))).toBe(10);
      expect(resistances.getResistance(createDamageTypeId('CUT'))).toBe(15);
      expect(resistances.getResistance(createDamageTypeId('HEAT'))).toBe(5);
    });
  });

  describe('setResistance', () => {
    it('should set resistance value', () => {
      const resistances = Resistances.create()
        .setResistance(createDamageTypeId('BASH'), 20);

      expect(resistances.getResistance(createDamageTypeId('BASH'))).toBe(20);
    });

    it('should not allow negative resistance', () => {
      const resistances = Resistances.create()
        .setResistance(createDamageTypeId('BASH'), -10);

      expect(resistances.getResistance(createDamageTypeId('BASH'))).toBe(0);
    });
  });

  describe('addResistance', () => {
    it('should add resistance value', () => {
      const resistances = Resistances.create()
        .setResistance(createDamageTypeId('BASH'), 10)
        .addResistance(createDamageTypeId('BASH'), 5);

      expect(resistances.getResistance(createDamageTypeId('BASH'))).toBe(15);
    });
  });

  describe('body part resistances', () => {
    it('should set body part resistance', () => {
      const resistances = Resistances.create()
        .setBodyPartResistance(
          createBodyPartId('HEAD'),
          createDamageTypeId('BASH'),
          30
        );

      expect(resistances.getBodyPartResistance(
        createBodyPartId('HEAD'),
        createDamageTypeId('BASH')
      )).toBe(30);
    });

    it('should fall back to base resistance for body part', () => {
      const resistances = Resistances.create()
        .setResistance(createDamageTypeId('BASH'), 20);

      expect(resistances.getBodyPartResistance(
        createBodyPartId('HEAD'),
        createDamageTypeId('BASH')
      )).toBe(20);
    });

    it('should get effective resistance (max of base and part)', () => {
      const resistances = Resistances.create()
        .setResistance(createDamageTypeId('BASH'), 10)
        .setBodyPartResistance(
          createBodyPartId('HEAD'),
          createDamageTypeId('BASH'),
          30
        );

      // 头部有更高抗性
      expect(resistances.getEffectiveResistance(
        createBodyPartId('HEAD'),
        createDamageTypeId('BASH')
      )).toBe(30);

      // 躯干使用基础抗性
      expect(resistances.getEffectiveResistance(
        createBodyPartId('TORSO'),
        createDamageTypeId('BASH')
      )).toBe(10);
    });
  });

  describe('merge', () => {
    it('should merge resistances (max)', () => {
      const r1 = Resistances.fromObject({ BASH: 10, CUT: 15 });
      const r2 = Resistances.fromObject({ BASH: 20, HEAT: 5 });
      const merged = r1.merge(r2);

      expect(merged.getResistance(createDamageTypeId('BASH'))).toBe(20); // max
      expect(merged.getResistance(createDamageTypeId('CUT'))).toBe(15);
      expect(merged.getResistance(createDamageTypeId('HEAT'))).toBe(5);
    });
  });

  describe('add', () => {
    it('should add resistances (sum)', () => {
      const r1 = Resistances.fromObject({ BASH: 10, CUT: 15 });
      const r2 = Resistances.fromObject({ BASH: 20, HEAT: 5 });
      const sum = r1.add(r2);

      expect(sum.getResistance(createDamageTypeId('BASH'))).toBe(30); // sum
      expect(sum.getResistance(createDamageTypeId('CUT'))).toBe(15);
      expect(sum.getResistance(createDamageTypeId('HEAT'))).toBe(5);
    });
  });

  describe('hasResistance', () => {
    it('should check if has resistance', () => {
      const resistances = Resistances.fromObject({ BASH: 10 });

      expect(resistances.hasResistance(createDamageTypeId('BASH'))).toBe(true);
      expect(resistances.hasResistance(createDamageTypeId('CUT'))).toBe(false);
    });
  });

  describe('isImmuneTo', () => {
    it('should check immunity', () => {
      const resistances = Resistances.fromObject({ BASH: 1000 });

      expect(resistances.isImmuneTo(createDamageTypeId('BASH'))).toBe(true);
      expect(resistances.isImmuneTo(createDamageTypeId('CUT'))).toBe(false);
    });
  });

  describe('fromArmor', () => {
    it('should create resistances from armor with coverage', () => {
      const baseResistances = Map<ReturnType<typeof createDamageTypeId>, number>({
        BASH: 50,
        CUT: 60,
      });

      const armorResistances = Resistances.fromArmor(baseResistances as any, 0.5);

      expect(armorResistances.getResistance(createDamageTypeId('BASH'))).toBe(25);
      expect(armorResistances.getResistance(createDamageTypeId('CUT'))).toBe(30);
    });

    it('should use full coverage by default', () => {
      const baseResistances = Map<ReturnType<typeof createDamageTypeId>, number>({
        BASH: 50,
      });

      const armorResistances = Resistances.fromArmor(baseResistances as any);

      expect(armorResistances.getResistance(createDamageTypeId('BASH'))).toBe(50);
    });
  });

  describe('predefined resistances', () => {
    it('should have light armor resistances', () => {
      expect(LIGHT_ARMOR_RESISTANCES.getResistance(createDamageTypeId('BASH'))).toBe(10);
      expect(LIGHT_ARMOR_RESISTANCES.getResistance(createDamageTypeId('CUT'))).toBe(15);
    });

    it('should have heavy armor resistances', () => {
      expect(HEAVY_ARMOR_RESISTANCES.getResistance(createDamageTypeId('BASH'))).toBe(50);
      expect(HEAVY_ARMOR_RESISTANCES.getResistance(createDamageTypeId('CUT'))).toBe(60);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = Resistances.fromObject({
        BASH: 10,
        CUT: 15,
      });

      const json = original.toJson();
      const restored = Resistances.fromJson(json);

      expect(restored.getResistance(createDamageTypeId('BASH'))).toBe(10);
      expect(restored.getResistance(createDamageTypeId('CUT'))).toBe(15);
    });
  });
});
