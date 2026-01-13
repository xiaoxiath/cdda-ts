/**
 * Attack 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Attack } from '../Attack';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import {
  AttackType,
  HitResult,
  createDamageTypeId,
  createSkillId,
  createBodyPartId,
} from '../types';

describe('Attack', () => {
  describe('create', () => {
    it('should create a basic attack', () => {
      const damage = DamageInstance.bash(10);
      const attack = Attack.create({
        type: AttackType.MELEE,
        damage,
        toHitBonus: 5,
        dispersion: 0,
        range: 1,
        skill: null,
        skillLevel: 0,
        critMultiplier: 2.0,
        critBonus: 0,
      });

      expect(attack.type).toBe(AttackType.MELEE);
      expect(attack.damage.totalDamage()).toBe(10);
      expect(attack.toHitBonus).toBe(5);
    });
  });

  describe('melee', () => {
    it('should create a melee attack', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 5);

      expect(attack.type).toBe(AttackType.MELEE);
      expect(attack.toHitBonus).toBe(5);
      expect(attack.dispersion).toBe(0);
      expect(attack.range).toBe(1);
    });
  });

  describe('ranged', () => {
    it('should create a ranged attack', () => {
      const attack = Attack.ranged(
        DamageInstance.bash(10),
        30,
        10,
        createSkillId('marksmanship'),
        5
      );

      expect(attack.type).toBe(AttackType.RANGED);
      expect(attack.dispersion).toBe(30);
      expect(attack.range).toBe(10);
      expect(attack.skill).toBe(createSkillId('marksmanship'));
      expect(attack.skillLevel).toBe(5);
    });
  });

  describe('throw', () => {
    it('should create a throw attack', () => {
      const attack = Attack.throw(DamageInstance.bash(10), 5);

      expect(attack.type).toBe(AttackType.THROW);
      expect(attack.dispersion).toBe(30);
      expect(attack.range).toBe(5);
      expect(attack.critMultiplier).toBe(1.5);
    });
  });

  describe('rollHit', () => {
    it('should calculate hit result', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const result = attack.rollHit(10, 5);

      expect(result).toHaveProperty('missedBy');
      expect(result).toHaveProperty('missedByTiles');
      expect(result).toHaveProperty('dispersion');
    });

    it('should affect dispersion with distance for ranged attacks', () => {
      const attack = Attack.ranged(DamageInstance.bash(10), 30, 10);
      const resultNear = attack.rollHit(10, 5, 2);
      const resultFar = attack.rollHit(10, 5, 10);

      expect(resultFar.dispersion).toBeGreaterThan(resultNear.dispersion);
    });
  });

  describe('executeAttack', () => {
    it('should execute a simple attack', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const resistances = Resistances.create();
      const result = attack.executeAttack(10, 5, resistances);

      expect(result).toHaveProperty('hitResult');
      expect(result).toHaveProperty('bodyPart');
      expect(result).toHaveProperty('rawDamage');
      expect(result).toHaveProperty('actualDamage');
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('damageDetails');
    });

    it('should calculate damage against resistances', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const resistances = Resistances.fromObject({ bash: 5 });
      const result = attack.executeAttack(20, 0, resistances);

      // 10 damage - 5 resistance = 5 actual damage
      expect(result.actualDamage).toBeGreaterThanOrEqual(0);
      expect(result.actualDamage).toBeLessThanOrEqual(10);
    });

    it('should select body part from available', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const resistances = Resistances.create();
      const parts = [
        createBodyPartId('HEAD'),
        createBodyPartId('TORSO'),
      ];
      const result = attack.executeAttack(20, 0, resistances, parts);

      expect(parts).toContain(result.bodyPart!);
    });

    it('should handle critical hits', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const resistances = Resistances.create();

      // 高精度攻击增加暴击概率
      for (let i = 0; i < 100; i++) {
        const result = attack.executeAttack(30, 0, resistances);
        if (result.critical) {
          expect(result.rawDamage.totalDamage()).toBe(10 * attack.critMultiplier);
          break;
        }
      }
    });

    it('should handle misses', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 0);
      const resistances = Resistances.create();

      // 低精度 vs 高闪避
      const result = attack.executeAttack(0, 20, resistances);

      if (result.hitResult === HitResult.MISS) {
        expect(result.actualDamage).toBe(0);
      }
    });
  });

  describe('with methods', () => {
    it('should change attack type', () => {
      const attack = Attack.melee(DamageInstance.bash(10));
      const modified = attack.withType(AttackType.RANGED);

      expect(modified.type).toBe(AttackType.RANGED);
    });

    it('should change damage', () => {
      const attack = Attack.melee(DamageInstance.bash(10));
      const modified = attack.withDamage(DamageInstance.cut(15));

      expect(modified.damage.totalDamage()).toBe(15);
    });

    it('should add to-hit bonus', () => {
      const attack = Attack.melee(DamageInstance.bash(10), 5);
      const modified = attack.addToHitBonus(3);

      expect(modified.toHitBonus).toBe(8);
    });

    it('should set skill', () => {
      const attack = Attack.melee(DamageInstance.bash(10));
      const modified = attack.withSkill(createSkillId('melee'), 3);

      expect(modified.skill).toBe(createSkillId('melee'));
      expect(modified.skillLevel).toBe(3);
    });

    it('should set crit multiplier', () => {
      const attack = Attack.melee(DamageInstance.bash(10));
      const modified = attack.withCritMultiplier(3.0);

      expect(modified.critMultiplier).toBe(3.0);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = Attack.melee(DamageInstance.bash(10), 5);
      const json = original.toJson();
      const restored = Attack.fromJson(json);

      expect(restored.type).toBe(original.type);
      expect(restored.toHitBonus).toBe(original.toHitBonus);
      expect(restored.range).toBe(original.range);
    });
  });
});
