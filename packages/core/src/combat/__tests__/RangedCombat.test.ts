/**
 * RangedCombat 测试
 *
 * 测试远程战斗系统
 */

import { describe, it, expect } from 'vitest';
import { Map, List } from 'immutable';
import {
  RangedCombat,
  FireMode,
  PREDEFINED_GUNS,
  type RangedAttackResult,
  type ShotResult,
  type AimState,
  type RangedCombatCharacter,
  type GunData,
} from '../RangedCombat';
import { Attack } from '../Attack';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import { createBodyPartId, createSkillId, type BodyPartId } from '../types';

// Mock ranged combat character
class MockRangedCharacter implements RangedCombatCharacter {
  constructor(
    public readonly id: string,
    private accuracy: number = 10,
    private skillLevels: Map<string, number> = Map()
  ) {}

  getRangedAccuracy(): number {
    return this.accuracy;
  }

  getSkillLevel(skill: string): number {
    return this.skillLevels.get(skill) ?? 0;
  }

  getWeaponName?(): string {
    return 'rifle';
  }

  getTargetableBodyParts?(): BodyPartId[] {
    return ['TORSO' as BodyPartId, 'HEAD' as BodyPartId];
  }
}

describe('RangedCombat', () => {
  describe('create attack methods', () => {
    it('should create gun attack', () => {
      const attack = RangedCombat.createGunAttack(25, 5, 45, 30, 'rifle' as any, 3);

      expect(attack.type).toBe('RANGED' as any);
      expect(attack.damage.totalDamage()).toBe(25);
      expect(attack.dispersion).toBe(45);
      expect(attack.range).toBe(30);
      expect(attack.skill).toBe('rifle' as any);
      expect(attack.skillLevel).toBe(3);
    });

    it('should create bow attack', () => {
      const attack = RangedCombat.createBowAttack(15, 3, 30, 20, 'archery' as any, 2);

      expect(attack.damage.totalDamage()).toBe(15);
      expect(attack.dispersion).toBe(30);
    });

    it('should create throw attack', () => {
      const attack = RangedCombat.createThrowAttack(8, 5);

      expect(attack.type).toBe('THROW' as any);
      expect(attack.damage.totalDamage()).toBe(8);
      expect(attack.range).toBe(5);
    });
  });

  describe('executeRangedAttack', () => {
    it('should execute single shot', () => {
      const attacker = new MockRangedCharacter('sniper', 20, Map<string, number>({ rifle: 5 }));
      const target = {
        id: 'target',
        getBodyPartHP: () => Map<string, any>({
          TORSO: {
            bodyPart: 'TORSO' as BodyPartId,
            currentHP: 50,
            maxHP: 50,
            baseHP: 50,
          },
        }),
        isImmuneTo: () => false,
        getResistances: () => Resistances.fromObject({ bullet: 5 }),
        getDodgeValue: () => 5,
      };
      const attack = RangedCombat.createGunAttack(20, 5, 30, 25, 'rifle' as any, 3);

      const result = RangedCombat.executeRangedAttack(
        attacker,
        target,
        attack,
        15,
        FireMode.SINGLE,
        null
      );

      expect(result.attackerId).toBe('sniper');
      expect(result.targetId).toBe('target');
      expect(result.weaponUsed).toBe('rifle');
      expect(result.shotsFired).toBe(1);
      expect(result.distance).toBe(15);
      expect(result.fireMode).toBe(FireMode.SINGLE);
      expect(result.shotResults.size).toBe(1);
    });

    it('should execute burst fire', () => {
      const attacker = new MockRangedCharacter('soldier', 15);
      const target = {
        id: 'target',
        getBodyPartHP: () => Map<string, any>({
          TORSO: {
            bodyPart: 'TORSO' as BodyPartId,
            currentHP: 50,
            maxHP: 50,
            baseHP: 50,
          },
        }),
        isImmuneTo: () => false,
        getResistances: () => Resistances.create(),
        getDodgeValue: () => 5,
      };
      const attack = RangedCombat.createGunAttack(15, 2, 60, 20, 'smg' as any, 2);

      const result = RangedCombat.executeRangedAttack(
        attacker,
        target,
        attack,
        10,
        FireMode.BURST,
        null
      );

      expect(result.shotsFired).toBe(3); // Burst mode
      expect(result.shotResults.size).toBe(3);
    });

    it('should execute auto fire', () => {
      const attacker = new MockRangedCharacter('machine_gunner', 12);
      const target = {
        id: 'target',
        getBodyPartHP: () => Map<string, any>({
          TORSO: {
            bodyPart: 'TORSO' as BodyPartId,
            currentHP: 50,
            maxHP: 50,
            baseHP: 50,
          },
        }),
        isImmuneTo: () => false,
        getResistances: () => Resistances.create(),
        getDodgeValue: () => 5,
      };
      const attack = RangedCombat.createGunAttack(12, 1, 120, 15, 'rifle' as any, 1);

      const result = RangedCombat.executeRangedAttack(
        attacker,
        target,
        attack,
        8,
        FireMode.AUTO,
        null
      );

      expect(result.shotsFired).toBeGreaterThanOrEqual(5); // Auto mode
      expect(result.shotsFired).toBeLessThanOrEqual(10);
      expect(result.shotResults.size).toBe(result.shotsFired);
    });

    it('should apply aim bonus', () => {
      const attacker = new MockRangedCharacter('sniper', 15);
      const target = {
        id: 'target',
        getBodyPartHP: () => Map<string, any>({
          TORSO: {
            bodyPart: 'TORSO' as BodyPartId,
            currentHP: 50,
            maxHP: 50,
            baseHP: 50,
          },
        }),
        isImmuneTo: () => false,
        getResistances: () => Resistances.create(),
        getDodgeValue: () => 5,
      };
      const attack = RangedCombat.createGunAttack(20, 5, 15, 30, 'rifle' as any, 2);

      const aimState: AimState = {
        targetId: 'target',
        targetPart: 'TORSO' as BodyPartId,
        aimTurns: 3,
        accuracyBonus: 6,
        aimQuality: 0.45,
      };

      const result = RangedCombat.executeRangedAttack(
        attacker,
        target,
        attack,
        20,
        FireMode.SINGLE,
        aimState
      );

      // Aim bonus should improve hit rate
      expect(result.shotsFired).toBe(1);
    });
  });

  describe('calculateHitChance', () => {
    it('should calculate hit chance', () => {
      const accuracy = 20;
      const dodge = 5;
      const distance = 5;
      const dispersion = 30;

      const chance = RangedCombat.calculateHitChance(
        accuracy,
        dodge,
        distance,
        dispersion
      );

      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(100);
    });

    it('should reduce hit chance with distance', () => {
      const accuracy = 20;
      const dodge = 5;
      const dispersion = 30;

      const closeChance = RangedCombat.calculateHitChance(accuracy, dodge, 5, dispersion);
      const farChance = RangedCombat.calculateHitChance(accuracy, dodge, 20, dispersion);

      expect(farChance).toBeLessThan(closeChance);
    });

    it('should reduce hit chance with dispersion', () => {
      const accuracy = 20;
      const dodge = 5;
      const distance = 10;

      const preciseChance = RangedCombat.calculateHitChance(accuracy, dodge, distance, 15);
      const inaccurateChance = RangedCombat.calculateHitChance(accuracy, dodge, distance, 90);

      expect(inaccurateChance).toBeLessThan(preciseChance);
    });
  });

  describe('calculateDispersionAtDistance', () => {
    it('should increase dispersion with distance', () => {
      const baseDispersion = 30;

      const closeDispersion = RangedCombat.calculateDispersionAtDistance(baseDispersion, 5);
      const farDispersion = RangedCombat.calculateDispersionAtDistance(baseDispersion, 20);

      expect(farDispersion).toBeGreaterThan(closeDispersion);
    });

    it('should calculate dispersion correctly', () => {
      const baseDispersion = 45;
      const distance = 10;

      const dispersion = RangedCombat.calculateDispersionAtDistance(baseDispersion, distance);

      // dispersion * (1 + distance * 0.1) = 45 * (1 + 10 * 0.1) = 45 * 2 = 90
      expect(dispersion).toBe(90);
    });
  });

  describe('aiming system', () => {
    it('should start aiming', () => {
      const aimState = RangedCombat.startAiming('target-123', 'HEAD' as BodyPartId);

      expect(aimState.targetId).toBe('target-123');
      expect(aimState.targetPart).toBe('HEAD' as BodyPartId);
      expect(aimState.aimTurns).toBe(0);
      expect(aimState.accuracyBonus).toBe(0);
      expect(aimState.aimQuality).toBe(0);
    });

    it('should continue aiming and increase bonus', () => {
      let aimState = RangedCombat.startAiming('target-123', 'HEAD' as BodyPartId);

      aimState = RangedCombat.continueAiming(aimState, 10);
      expect(aimState.aimTurns).toBe(1);
      expect(aimState.accuracyBonus).toBe(2); // 1 * 2
      expect(aimState.aimQuality).toBe(0.15); // 1 * 0.15

      aimState = RangedCombat.continueAiming(aimState, 10);
      expect(aimState.aimTurns).toBe(2);
      expect(aimState.accuracyBonus).toBe(4); // 2 * 2
      expect(aimState.aimQuality).toBe(0.3); // 2 * 0.15
    });

    it('should cap accuracy bonus at max', () => {
      let aimState = RangedCombat.startAiming('target-123', 'HEAD' as BodyPartId);

      // Aim many times to hit the cap
      for (let i = 0; i < 20; i++) {
        aimState = RangedCombat.continueAiming(aimState, 10);
      }

      expect(aimState.accuracyBonus).toBeLessThanOrEqual(10); // Max bonus
    });

    it('should cap aim quality at 1.0', () => {
      let aimState = RangedCombat.startAiming('target-123', 'HEAD' as BodyPartId);

      // Aim many times
      for (let i = 0; i < 20; i++) {
        aimState = RangedCombat.continueAiming(aimState, 100);
      }

      expect(aimState.aimQuality).toBeLessThanOrEqual(1.0);
    });
  });

  describe('formatAttackResult', () => {
    it('should format single shot result', () => {
      const result: RangedAttackResult = {
        attackerId: 'sniper',
        targetId: 'enemy',
        weaponUsed: 'sniper_rifle',
        distance: 50,
        fireMode: FireMode.SINGLE,
        shotsFired: 1,
        hits: 1,
        totalDamage: 25,
        shotResults: List([
          {
            hit: true,
            bodyPart: 'TORSO' as BodyPartId,
            rawDamage: 25,
            actualDamage: 20,
            penetrated: true,
            ricocheted: false,
            offset: { x: 0, y: 0 },
          },
        ]),
        ammoConsumed: 1,
        moveCost: 80,
        dispersion: 15,
      };

      const formatted = RangedCombat.formatAttackResult(result);

      expect(formatted).toContain('=== 远程攻击结果 ===');
      expect(formatted).toContain('sniper');
      expect(formatted).toContain('enemy');
      expect(formatted).toContain('sniper_rifle');
      expect(formatted).toContain('50 格');
      expect(formatted).toContain('发射 1 发');
      expect(formatted).toContain('命中 1 发');
      expect(formatted).toContain('20 伤害');
    });

    it('should format burst fire result', () => {
      const result: RangedAttackResult = {
        attackerId: 'soldier',
        targetId: 'enemy',
        weaponUsed: 'assault_rifle',
        distance: 15,
        fireMode: FireMode.BURST,
        shotsFired: 3,
        hits: 2,
        totalDamage: 40,
        shotResults: List([
          {
            hit: true,
            bodyPart: 'TORSO' as BodyPartId,
            rawDamage: 20,
            actualDamage: 18,
            penetrated: true,
            ricocheted: false,
            offset: { x: 0, y: 1 },
          },
          {
            hit: true,
            bodyPart: 'TORSO' as BodyPartId,
            rawDamage: 20,
            actualDamage: 22,
            penetrated: true,
            ricocheted: false,
            offset: { x: 1, y: 0 },
          },
          {
            hit: false,
            bodyPart: null,
            rawDamage: 0,
            actualDamage: 0,
            penetrated: false,
            ricocheted: false,
            offset: { x: 2, y: 2 },
          },
        ]),
        ammoConsumed: 3,
        moveCost: 150,
        dispersion: 45,
      };

      const formatted = RangedCombat.formatAttackResult(result);

      expect(formatted).toContain('发射 3 发');
      expect(formatted).toContain('命中 2 发');
      expect(formatted).toContain('总计 40 伤害');
    });
  });

  describe('PREDEFINED_GUNS', () => {
    it('should have pistol_9mm defined', () => {
      const gun = PREDEFINED_GUNS.pistol_9mm;

      expect(gun).toBeDefined();
      expect(gun.name).toBe('9mm 手枪');
      expect(gun.damage).toBe(15);
      expect(gun.dispersion).toBe(180);
      expect(gun.magazineSize).toBe(12);
      expect(gun.fireModes).toContain(FireMode.SINGLE);
    });

    it('should have rifle_assault defined', () => {
      const gun = PREDEFINED_GUNS.rifle_assault;

      expect(gun).toBeDefined();
      expect(gun.name).toBe('突击步枪');
      expect(gun.damage).toBe(25);
      expect(gun.magazineSize).toBe(30);
      expect(gun.fireModes).toContain(FireMode.SINGLE);
      expect(gun.fireModes).toContain(FireMode.BURST);
      expect(gun.fireModes).toContain(FireMode.AUTO);
    });

    it('should have shotgun_pump defined', () => {
      const gun = PREDEFINED_GUNS.shotgun_pump;

      expect(gun).toBeDefined();
      expect(gun.name).toBe('泵动式霰弹枪');
      expect(gun.damage).toBe(80);
      expect(gun.dispersion).toBe(600);
      expect(gun.magazineSize).toBe(6);
    });

    it('should have sniper_rifle defined', () => {
      const gun = PREDEFINED_GUNS.sniper_rifle;

      expect(gun).toBeDefined();
      expect(gun.name).toBe('狙击步枪');
      expect(gun.damage).toBe(60);
      expect(gun.dispersion).toBe(15);
      expect(gun.magazineSize).toBe(5);
      expect(gun.effectiveRange).toBe(60);
    });
  });
});
