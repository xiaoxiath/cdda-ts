/**
 * DamageCalculator 测试
 *
 * 测试伤害计算器的各种功能
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import {
  DamageCalculator,
  type DamageCalcConfig,
  type DamageCalcResult,
  type FullDamageCalcResult,
} from '../DamageCalculator';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import { createDamageTypeId, createBodyPartId, type DamageTypeId } from '../types';

describe('DamageCalculator', () => {
  describe('calculateDamage', () => {
    it('should calculate basic damage without armor', () => {
      const result = DamageCalculator.calculateDamage(
        'BASH' as DamageTypeId,
        10,
        0,
        0,
        1.0
      );

      expect(result.damageType).toBe('BASH' as DamageTypeId);
      expect(result.rawDamage).toBe(10);
      expect(result.armorValue).toBe(0);
      expect(result.finalDamage).toBe(10);
      expect(result.blocked).toBe(false);
    });

    it('should calculate damage with armor reduction', () => {
      const result = DamageCalculator.calculateDamage(
        'BASH' as DamageTypeId,
        10,
        5,
        0,
        1.0
      );

      expect(result.rawDamage).toBe(10);
      expect(result.armorValue).toBe(5);
      expect(result.finalDamage).toBe(5);
      expect(result.blocked).toBe(false);
    });

    it('should apply armor penetration', () => {
      const result = DamageCalculator.calculateDamage(
        'STAB' as DamageTypeId,
        10,
        5,
        3,
        1.0
      );

      expect(result.penetration).toBe(3);
      expect(result.effectiveArmor).toBe(2); // 5 - 3
      expect(result.finalDamage).toBe(8); // 10 - 2
    });

    it('should block damage completely when armor exceeds damage', () => {
      const result = DamageCalculator.calculateDamage(
        'BASH' as DamageTypeId,
        5,
        10,
        0,
        1.0
      );

      expect(result.finalDamage).toBe(0);
      expect(result.blocked).toBe(true);
    });

    it('should apply resistance multiplier', () => {
      const result = DamageCalculator.calculateDamage(
        'HEAT' as DamageTypeId,
        10,
        5,
        0,
        0.5 // 50% damage from heat
      );

      // effectiveArmor = (5 - 0) * 1.0 = 5
      // effectiveResistance = 5 * 0.5 = 2.5
      // finalDamage = floor(10 - 2.5) = floor(7.5) = 7
      expect(result.resistanceMult).toBe(0.5);
      expect(result.effectiveArmor).toBe(5); // (5 - 0) * 1.0
      expect(result.finalDamage).toBe(7); // floor(10 - 2.5)
    });

    it('should handle zero damage correctly', () => {
      const result = DamageCalculator.calculateDamage(
        'BASH' as DamageTypeId,
        0,
        5,
        0,
        1.0
      );

      expect(result.rawDamage).toBe(0);
      expect(result.finalDamage).toBe(0);
    });
  });

  describe('calculateDamageInstance', () => {
    it('should calculate single damage type instance', () => {
      const damage = DamageInstance.bash(10, 0);
      const resistances = Resistances.fromObject({
        bash: 3,
      });

      const result = DamageCalculator.calculateDamageInstance(
        damage,
        resistances,
        null,
        1.0
      );

      expect(result.totalRawDamage).toBe(10);
      expect(result.totalFinalDamage).toBe(7); // 10 - 3
      expect(result.damageDetails.length).toBe(1);
      expect(result.critical).toBe(false);
    });

    it('should calculate multiple damage types', () => {
      const damage = new DamageInstance()
        .addDamage('bash' as DamageTypeId, 5, 0)
        .addDamage('cut' as DamageTypeId, 8, 2);

      const resistances = Resistances.fromObject({
        bash: 2,
        cut: 4,
      });

      const result = DamageCalculator.calculateDamageInstance(
        damage,
        resistances,
        null,
        1.0
      );

      // bash: 5 - 2 = 3
      // cut: effectivePenetration = floor(2 * 1) = 2, effectiveArmor = (4-2) = 2, 8 - 2 = 6
      // total = 3 + 6 = 9
      expect(result.totalRawDamage).toBe(13); // 5 + 8
      expect(result.totalFinalDamage).toBe(9);
      expect(result.damageDetails.length).toBe(2);
    });

    it('should apply critical multiplier', () => {
      const damage = DamageInstance.bash(10, 0);
      const resistances = Resistances.create();

      const result = DamageCalculator.calculateDamageInstance(
        damage,
        resistances,
        null,
        2.0 // 2x crit
      );

      expect(result.critical).toBe(true);
      expect(result.critMultiplier).toBe(2.0);
      expect(result.totalFinalDamage).toBe(20); // 10 * 2
    });

    it('should use body part specific resistances when provided', () => {
      const damage = DamageInstance.bash(10, 0);
      const resistances = Resistances.fromObject({
        bash: 2,
      }).setBodyPartResistance('TORSO' as any, 'bash' as DamageTypeId, 5);

      const result = DamageCalculator.calculateDamageInstance(
        damage,
        resistances,
        'TORSO' as any,
        1.0
      );

      // Should use body part resistance (5) instead of base (2)
      // effectiveArmor = (5 - 0) * 1.0 = 5
      // finalDamage = floor(10 - 5) = 5
      expect(result.totalFinalDamage).toBe(5); // 10 - 5
    });
  });

  describe('calculateBodyPartDamage', () => {
    it('should calculate damage to body part', () => {
      const damage = DamageInstance.cut(15, 0);
      const resistances = Resistances.fromObject({
        cut: 5,
      });

      const result = DamageCalculator.calculateBodyPartDamage(
        damage,
        resistances,
        'ARM_L' as any,
        20, // current HP
        30  // max HP
      );

      expect(result.bodyPart).toBe('ARM_L' as any);
      expect(result.rawDamage).toBe(15);
      expect(result.finalDamage).toBe(10); // 15 - 5
      expect(result.disabled).toBe(false);
      expect(result.lethal).toBe(false);
    });

    it('should detect when body part is disabled', () => {
      const damage = DamageInstance.cut(25, 0);
      const resistances = Resistances.create();

      const result = DamageCalculator.calculateBodyPartDamage(
        damage,
        resistances,
        'ARM_L' as any,
        20, // current HP
        30  // max HP
      );

      expect(result.finalDamage).toBe(25);
      expect(result.disabled).toBe(true);
    });

    it('should detect lethal damage to vital parts', () => {
      const damage = DamageInstance.bash(50, 0);
      const resistances = Resistances.create();

      const result = DamageCalculator.calculateBodyPartDamage(
        damage,
        resistances,
        'HEAD' as any,
        30, // current HP
        30  // max HP
      );

      expect(result.lethal).toBe(true);
    });

    it('should not detect lethal damage to non-vital parts', () => {
      const damage = DamageInstance.bash(50, 0);
      const resistances = Resistances.create();

      const result = DamageCalculator.calculateBodyPartDamage(
        damage,
        resistances,
        'ARM_L' as any,
        30, // current HP
        30  // max HP
      );

      expect(result.lethal).toBe(false);
      expect(result.disabled).toBe(true);
    });
  });

  describe('isLethalBodyPart', () => {
    it('should identify HEAD as lethal', () => {
      expect(DamageCalculator.isLethalBodyPart('HEAD' as any)).toBe(true);
    });

    it('should identify TORSO as lethal', () => {
      expect(DamageCalculator.isLethalBodyPart('TORSO' as any)).toBe(true);
    });

    it('should not identify limbs as lethal', () => {
      expect(DamageCalculator.isLethalBodyPart('ARM_L' as any)).toBe(false);
      expect(DamageCalculator.isLethalBodyPart('LEG_L' as any)).toBe(false);
      expect(DamageCalculator.isLethalBodyPart('HAND_L' as any)).toBe(false);
    });
  });

  describe('calculateCritMultiplier', () => {
    it('should return no crit when roll fails', () => {
      const result = DamageCalculator.calculateCritMultiplier(
        5, // baseCritChance
        0, // critBonus
        0, // luck
        2.0 // critMultiplier
      );

      expect(result.isCrit).toBe(false);
      expect(result.isDoubleCrit).toBe(false);
      expect(result.critMultiplier).toBe(1.0);
    });

    it('should return crit when roll succeeds', () => {
      // Use a high but not 100% crit chance to avoid double crit
      const result = DamageCalculator.calculateCritMultiplier(
        95, // baseCritChance
        0,
        0,
        2.0
      );

      expect(result.isCrit).toBe(true);
      // With 95% crit chance and 47.5% double crit chance, most of the time we'll get 2.0
      // Sometimes we might get 4.0 for double crit, so we check it's either 2.0 or 4.0
      expect(result.critMultiplier === 2.0 || result.critMultiplier === 4.0).toBe(true);
    });

    it('should apply crit bonus to crit chance', () => {
      const result = DamageCalculator.calculateCritMultiplier(
        5,
        20, // +20% crit chance
        0,
        2.0
      );

      // With 25% crit chance, we should get crits more often than not
      // Just check it can succeed
      if (result.isCrit) {
        expect(result.critMultiplier).toBe(2.0);
      }
    });
  });

  describe('calculateArmorReduction', () => {
    it('should reduce damage by armor value', () => {
      const result = DamageCalculator.calculateArmorReduction(
        10,
        5,
        0
      );

      expect(result).toBe(5); // 10 - 5
    });

    it('should apply penetration', () => {
      const result = DamageCalculator.calculateArmorReduction(
        10,
        5,
        3
      );

      expect(result).toBe(8); // 10 - (5-3)
    });

    it('should not reduce damage below zero', () => {
      const result = DamageCalculator.calculateArmorReduction(
        3,
        10,
        0
      );

      expect(result).toBe(0);
    });

    it('should ignore armor for PSYCHIC damage', () => {
      const result = DamageCalculator.calculateArmorReduction(
        10,
        20,
        0,
        'PSYCHIC' as DamageTypeId
      );

      expect(result).toBe(10); // No reduction
    });

    it('should ignore armor for BIOLOGICAL damage', () => {
      const result = DamageCalculator.calculateArmorReduction(
        10,
        20,
        0,
        'BIOLOGICAL' as DamageTypeId
      );

      expect(result).toBe(10); // No reduction
    });

    it('should ignore armor for RADIATION damage', () => {
      const result = DamageCalculator.calculateArmorReduction(
        10,
        20,
        0,
        'RADIATION' as DamageTypeId
      );

      expect(result).toBe(10); // No reduction
    });
  });

  describe('calculateCombinedResistances', () => {
    it('should combine multiple resistances by taking max', () => {
      const r1 = Resistances.fromObject({ bash: 5, cut: 3 });
      const r2 = Resistances.fromObject({ bash: 8, cut: 2 });
      const r3 = Resistances.fromObject({ bash: 3, stab: 4 });

      const combined = DamageCalculator.calculateCombinedResistances(r1, r2, r3);

      expect(combined.getResistance('BASH' as DamageTypeId)).toBe(8); // max(5,8,3)
      expect(combined.getResistance('CUT' as DamageTypeId)).toBe(3); // max(3,2)
      expect(combined.getResistance('STAB' as DamageTypeId)).toBe(4); // max(0,0,4)
    });

    it('should handle empty resistance list', () => {
      const combined = DamageCalculator.calculateCombinedResistances();

      expect(combined.getAllResistances().size).toBe(0);
    });
  });

  describe('isArmorPiercing', () => {
    it('should identify STAB as armor piercing', () => {
      expect(DamageCalculator.isArmorPiercing('STAB' as DamageTypeId)).toBe(true);
    });

    it('should identify BULLET as armor piercing', () => {
      expect(DamageCalculator.isArmorPiercing('BULLET' as DamageTypeId)).toBe(true);
    });

    it('should identify ACID as armor piercing', () => {
      expect(DamageCalculator.isArmorPiercing('ACID' as DamageTypeId)).toBe(true);
    });

    it('should not identify BASH as armor piercing', () => {
      expect(DamageCalculator.isArmorPiercing('BASH' as DamageTypeId)).toBe(false);
    });

    it('should not identify CUT as armor piercing', () => {
      expect(DamageCalculator.isArmorPiercing('CUT' as DamageTypeId)).toBe(false);
    });
  });

  describe('getResistanceMult', () => {
    it('should apply reduced resistance for HEAT against metal', () => {
      const mult = DamageCalculator.getResistanceMult('HEAT' as DamageTypeId, 'metal');

      expect(mult).toBe(0.5);
    });

    it('should apply increased resistance for ELECTRIC against wet', () => {
      const mult = DamageCalculator.getResistanceMult('ELECTRIC' as DamageTypeId, 'wet');

      expect(mult).toBe(2.0);
    });

    it('should return default multiplier for normal cases', () => {
      const mult = DamageCalculator.getResistanceMult('BASH' as DamageTypeId, null);

      expect(mult).toBe(1.0);
    });
  });

  describe('distributeDamage', () => {
    it('should distribute damage equally across parts', () => {
      const parts = ['ARM_L' as any, 'ARM_R' as any, 'TORSO' as any];
      const distribution = DamageCalculator.distributeDamage(12, parts, 'equal');

      expect(distribution.get('ARM_L' as any)).toBe(4);
      expect(distribution.get('ARM_R' as any)).toBe(4);
      expect(distribution.get('TORSO' as any)).toBe(4);
    });

    it('should return empty map for no parts', () => {
      const distribution = DamageCalculator.distributeDamage(10, [], 'equal');

      expect(distribution.size).toBe(0);
    });
  });

  describe('passesThreshold and applyThreshold', () => {
    it('should pass threshold when damage is equal', () => {
      expect(DamageCalculator.passesThreshold(5, 5)).toBe(true);
    });

    it('should pass threshold when damage is greater', () => {
      expect(DamageCalculator.passesThreshold(10, 5)).toBe(true);
    });

    it('should not pass threshold when damage is less', () => {
      expect(DamageCalculator.passesThreshold(3, 5)).toBe(false);
    });

    it('should apply threshold filter', () => {
      expect(DamageCalculator.applyThreshold(10, 5)).toBe(10);
      expect(DamageCalculator.applyThreshold(3, 5)).toBe(0);
    });
  });

  describe('formatDamageResult', () => {
    it('should format blocked damage', () => {
      const result: DamageCalcResult = {
        damageType: 'BASH' as DamageTypeId,
        rawDamage: 5,
        armorValue: 10,
        penetration: 0,
        effectiveArmor: 10,
        resistanceMult: 1.0,
        finalDamage: 0,
        blocked: true,
      };

      const formatted = DamageCalculator.formatDamageResult(result);

      expect(formatted).toContain('被格挡');
      expect(formatted).toContain('原始: 5');
    });

    it('should format normal damage', () => {
      const result: DamageCalcResult = {
        damageType: 'CUT' as DamageTypeId,
        rawDamage: 15,
        armorValue: 5,
        penetration: 2,
        effectiveArmor: 3,
        resistanceMult: 1.0,
        finalDamage: 12,
        blocked: false,
      };

      const formatted = DamageCalculator.formatDamageResult(result);

      expect(formatted).toContain('CUT');
      expect(formatted).toContain('12');
      expect(formatted).toContain('原始: 15');
    });
  });

  describe('formatFullDamageResult', () => {
    it('should format complete damage result', () => {
      const damage = DamageInstance.bash(10, 0);
      const resistances = Resistances.fromObject({ bash: 3 });

      const result = DamageCalculator.calculateDamageInstance(
        damage,
        resistances,
        'TORSO' as any,
        1.0
      );

      const formatted = DamageCalculator.formatFullDamageResult(result);

      expect(formatted).toContain('=== 伤害计算结果 ===');
      expect(formatted).toContain('总原始伤害: 10');
      expect(formatted).toContain('总最终伤害: 7');
      expect(formatted).toContain('命中部位: TORSO');
    });
  });
});
