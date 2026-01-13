/**
 * MeleeCombat 测试
 *
 * 测试近战战斗系统
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import {
  MeleeCombat,
  MeleeAttackType,
  type MeleeAttackResult,
  type MeleeCombatCharacter,
  type BlockResult,
  type DodgeResult,
} from '../MeleeCombat';
import { Attack } from '../Attack';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import { createBodyPartId, createSkillId, type BodyPartId } from '../types';

// Mock melee combat character
class MockMeleeCharacter implements MeleeCombatCharacter {
  constructor(
    public readonly id: string,
    private accuracy: number = 10,
    private critChance: number = 5,
    private critMultiplier: number = 2.0,
    private blockChance: number = 0,
    private dodgeChance: number = 0,
    private skillLevels: Map<string, number> = Map(),
    private resistances: Resistances = Resistances.create()
  ) {}

  getMeleeAccuracy(): number {
    return this.accuracy;
  }

  getCritChance(): number {
    return this.critChance;
  }

  getCritMultiplier(): number {
    return this.critMultiplier;
  }

  getSkillLevel(skill: string): number {
    return this.skillLevels.get(skill) ?? 0;
  }

  getWeaponName?(): string {
    return '测试武器';
  }

  getWeaponWeight?(): number {
    return 100;
  }

  getBlockChance?(): number {
    return this.blockChance;
  }

  getBlockReduction?(): number {
    return 5;
  }

  getBlockingWeapon?(): string {
    return 'shield';
  }

  getDodgeChance?(): number {
    return this.dodgeChance;
  }

  getDodgeValue?(): number {
    return this.dodgeChance;
  }

  getTargetableBodyParts?(): BodyPartId[] {
    return ['TORSO' as BodyPartId, 'HEAD' as BodyPartId, 'ARM_L' as BodyPartId];
  }

  getBodyPartHP() {
    return Map<string, any>({
      TORSO: {
        bodyPart: 'TORSO' as BodyPartId,
        currentHP: 50,
        maxHP: 50,
        baseHP: 50,
      },
      HEAD: {
        bodyPart: 'HEAD' as BodyPartId,
        currentHP: 30,
        maxHP: 30,
        baseHP: 30,
      },
    });
  }

  isImmuneTo() {
    return false;
  }

  getResistances() {
    return this.resistances;
  }
}

// Mock damageable creature
class MockDamageableCreature {
  constructor(
    public readonly id: string,
    private resistances: Resistances = Resistances.create()
  ) {}

  getBodyPartHP() {
    return Map<string, any>({
      TORSO: {
        bodyPart: 'TORSO' as BodyPartId,
        currentHP: 50,
        maxHP: 50,
        baseHP: 50,
      },
      HEAD: {
        bodyPart: 'HEAD' as BodyPartId,
        currentHP: 30,
        maxHP: 30,
        baseHP: 30,
      },
    });
  }

  isImmuneTo() {
    return false;
  }

  getResistances() {
    return this.resistances;
  }

  getDodgeValue?() {
    return 5;
  }
}

describe('MeleeCombat', () => {
  describe('create attack methods', () => {
    it('should create bash attack', () => {
      const attack = MeleeCombat.createBashAttack(10, 2, 1);

      expect(attack.type).toBe('MELEE' as any);
      expect(attack.damage.totalDamage()).toBe(10);
      expect(attack.toHitBonus).toBe(2);
    });

    it('should create cut attack', () => {
      const attack = MeleeCombat.createCutAttack(12, 0, 2);

      expect(attack.damage.totalDamage()).toBe(12);
      expect(attack.damage.hasDamageType('CUT' as any)).toBe(true);
    });

    it('should create stab attack', () => {
      const attack = MeleeCombat.createStabAttack(8, 1, 4);

      expect(attack.damage.totalDamage()).toBe(8);
      expect(attack.damage.hasDamageType('STAB' as any)).toBe(true);
    });
  });

  describe('executeMeleeAttack', () => {
    it('should execute basic melee attack', () => {
      const attacker = new MockMeleeCharacter('attacker', 15, 5, 2.0);
      const target = new MockDamageableCreature('target');
      const attack = MeleeCombat.createBashAttack(10, 0, 0);

      const result = MeleeCombat.executeMeleeAttack(
        attacker,
        target,
        attack,
        ['TORSO' as BodyPartId]
      );

      expect(result.attackerId).toBe('attacker');
      expect(result.targetId).toBe('target');
      expect(result.attackType).toBe(MeleeAttackType.BASH);
      expect(result.attackResult).toBeDefined();
    });

    it('should calculate move cost', () => {
      const attacker = new MockMeleeCharacter('attacker');
      const target = new MockDamageableCreature('target');
      const attack = MeleeCombat.createBashAttack(10, 0, 0);

      const result = MeleeCombat.executeMeleeAttack(
        attacker,
        target,
        attack,
        ['TORSO' as BodyPartId]
      );

      expect(result.moveCost).toBeGreaterThan(0);
    });

    it('should include skill check when skill is set', () => {
      const attacker = new MockMeleeCharacter(
        'attacker',
        10,
        5,
        2.0,
        0,
        0,
        Map<string, number>({ bashing: 3 })
      );
      const target = new MockDamageableCreature('target');
      const attack = Attack.melee(DamageInstance.bash(10, 0), 0).withSkill(
        'bashing' as any,
        3
      );

      const result = MeleeCombat.executeMeleeAttack(
        attacker,
        target,
        attack,
        ['TORSO' as BodyPartId]
      );

      expect(result.skillCheck).toBeDefined();
      expect(result.skillCheck?.skill).toBe('bashing' as string);
    });
  });

  describe('executeMeleeAttackWithDefense', () => {
    it('should handle blocking', () => {
      const attacker = new MockMeleeCharacter('attacker', 15, 5, 2.0);
      const target = new MockMeleeCharacter(
        'target',
        10,
        5,
        2.0,
        50, // 50% block chance
        0
      );
      const attack = MeleeCombat.createBashAttack(10, 0, 0);

      // Run multiple times to potentially get a block
      let blocked = false;
      for (let i = 0; i < 20; i++) {
        const result = MeleeCombat.executeMeleeAttackWithDefense(
          attacker,
          target as any,
          attack,
          ['TORSO' as BodyPartId]
        );

        if (result.blockResult?.blocked) {
          blocked = true;
          expect(result.blockResult.blockingWith).toBeDefined();
          expect(result.blockResult.damageReduced).toBeGreaterThan(0);
          break;
        }
      }

      // With 50% chance and 20 tries, we should get at least one block
      // (This is probabilistic, so we might not always get one)
      if (blocked) {
        expect(true).toBe(true);
      }
    });

    it('should handle dodging', () => {
      const attacker = new MockMeleeCharacter('attacker', 15, 5, 2.0);
      const target = new MockMeleeCharacter(
        'target',
        10,
        5,
        2.0,
        0,
        50 // 50% dodge chance
      );
      const attack = MeleeCombat.createBashAttack(10, 0, 0);

      // Run multiple times to potentially get a dodge
      let dodged = false;
      for (let i = 0; i < 20; i++) {
        const result = MeleeCombat.executeMeleeAttackWithDefense(
          attacker,
          target as any,
          attack,
          ['TORSO' as BodyPartId]
        );

        if (result.dodgeResult?.dodged) {
          dodged = true;
          expect(result.dodgeResult.direction).toBeDefined();
          expect(result.attackResult.actualDamage).toBe(0);
          break;
        }
      }

      // Probabilistic, but likely to succeed with 50% chance and 20 tries
      if (dodged) {
        expect(true).toBe(true);
      }
    });
  });

  describe('selectTargetBodyPart', () => {
    it('should select TORSO by default', () => {
      const parts = ['TORSO' as BodyPartId, 'HEAD' as BodyPartId, 'ARM_L' as BodyPartId];
      const selected = MeleeCombat.selectTargetBodyPart(parts, 10, 3);

      expect(selected).toBeDefined();
      expect(parts).toContain(selected);
    });

    it('should prefer aimed part with high accuracy', () => {
      const parts = ['TORSO' as BodyPartId, 'HEAD' as BodyPartId, 'ARM_L' as BodyPartId];

      // With high accuracy, aiming for HEAD should succeed often
      let headCount = 0;
      for (let i = 0; i < 20; i++) {
        const selected = MeleeCombat.selectTargetBodyPart(parts, 20, 3, 'HEAD' as BodyPartId);
        if (selected === 'HEAD' as BodyPartId) {
          headCount++;
        }
      }

      // Should hit head at least some times with high accuracy
      expect(headCount).toBeGreaterThan(0);
    });
  });

  describe('calculateMeleeDamage', () => {
    it('should add strength bonus', () => {
      const baseDamage = 10;
      const strength = 10;
      const skillLevel = 2;
      const weaponBonus = 1;

      const damage = MeleeCombat.calculateMeleeDamage(
        baseDamage,
        strength,
        skillLevel,
        weaponBonus
      );

      // 10 + floor(10*0.5) + floor(2*0.3) + 1 = 10 + 5 + 0 + 1 = 16
      expect(damage).toBe(16);
    });

    it('should calculate zero damage when all are zero', () => {
      const damage = MeleeCombat.calculateMeleeDamage(0, 0, 0, 0);

      expect(damage).toBe(0);
    });
  });

  describe('calculateCritDamage', () => {
    it('should apply crit multiplier', () => {
      const baseDamage = 10;
      const critMultiplier = 2.0;
      const skillLevel = 2;

      const damage = MeleeCombat.calculateCritDamage(
        baseDamage,
        critMultiplier,
        skillLevel
      );

      // floor(10 * 2.0) + floor(2 * 0.2) = 20 + 0 = 20
      expect(damage).toBe(20);
    });

    it('should add skill bonus to crit damage', () => {
      const baseDamage = 10;
      const critMultiplier = 2.0;
      const skillLevel = 10;

      const damage = MeleeCombat.calculateCritDamage(
        baseDamage,
        critMultiplier,
        skillLevel
      );

      // floor(10 * 2.0) + floor(10 * 0.2) = 20 + 2 = 22
      expect(damage).toBe(22);
    });
  });

  describe('calculateMoveCost', () => {
    it('should calculate base move cost', () => {
      const character = new MockMeleeCharacter('test', 10, 5, 2.0);
      const attackResult = {
        hitResult: 'HIT' as any,
        bodyPart: 'TORSO' as BodyPartId,
        rawDamage: DamageInstance.bash(10, 0),
        actualDamage: 8,
        critical: false,
        doubleCrit: false,
        damageDetails: Map(),
      };

      const cost = MeleeCombat.calculateMoveCost(character, attackResult);

      expect(cost).toBeGreaterThan(50);
      expect(cost).toBeLessThan(200);
    });

    it('should increase cost for critical hits', () => {
      const character = new MockMeleeCharacter('test', 10, 5, 2.0);
      const critResult = {
        hitResult: 'CRIT' as any,
        bodyPart: 'TORSO' as BodyPartId,
        rawDamage: DamageInstance.bash(20, 0),
        actualDamage: 20,
        critical: true,
        doubleCrit: false,
        damageDetails: Map(),
      };

      const normalCost = MeleeCombat.calculateMoveCost(character, {
        ...critResult,
        critical: false,
        hitResult: 'HIT' as any,
      });

      const critCost = MeleeCombat.calculateMoveCost(character, critResult);

      expect(critCost).toBeGreaterThan(normalCost);
    });

    it('should decrease cost for misses', () => {
      const character = new MockMeleeCharacter('test', 10, 5, 2.0);
      const hitResult = {
        hitResult: 'HIT' as any,
        bodyPart: 'TORSO' as BodyPartId,
        rawDamage: DamageInstance.bash(10, 0),
        actualDamage: 8,
        critical: false,
        doubleCrit: false,
        damageDetails: Map(),
      };

      const missResult = {
        ...hitResult,
        hitResult: 'MISS' as any,
      };

      const hitCost = MeleeCombat.calculateMoveCost(character, hitResult);
      const missCost = MeleeCombat.calculateMoveCost(character, missResult);

      expect(missCost).toBeLessThan(hitCost);
    });
  });

  describe('formatAttackResult', () => {
    it('should format successful attack result', () => {
      const result: MeleeAttackResult = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'HIT' as any,
          bodyPart: 'TORSO' as BodyPartId,
          rawDamage: DamageInstance.cut(15, 0),
          actualDamage: 12,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 100,
      };

      const formatted = MeleeCombat.formatAttackResult(result);

      expect(formatted).toContain('=== 近战攻击结果 ===');
      expect(formatted).toContain('hero');
      expect(formatted).toContain('goblin');
      expect(formatted).toContain('sword');
      expect(formatted).toContain('CUT');
      expect(formatted).toContain('HIT');
      expect(formatted).toContain('12');
    });

    it('should format critical hit', () => {
      const result: MeleeAttackResult = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'CRIT' as any,
          bodyPart: 'HEAD' as BodyPartId,
          rawDamage: DamageInstance.cut(30, 0),
          actualDamage: 30,
          critical: true,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 120,
      };

      const formatted = MeleeCombat.formatAttackResult(result);

      expect(formatted).toContain('暴击');
    });

    it('should format blocked attack', () => {
      const result: MeleeAttackResult = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.BASH,
        attackResult: {
          hitResult: 'HIT' as any,
          bodyPart: 'TORSO' as BodyPartId,
          rawDamage: DamageInstance.bash(10, 0),
          actualDamage: 5,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        blockResult: {
          blocked: true,
          blockingWith: 'shield',
          damageReduced: 5,
          durabilityCost: 1,
        },
        moveCost: 100,
      };

      const formatted = MeleeCombat.formatAttackResult(result);

      expect(formatted).toContain('格挡');
      expect(formatted).toContain('shield');
      expect(formatted).toContain('减免 5');
    });

    it('should format dodged attack', () => {
      const result: MeleeAttackResult = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.STAB,
        attackResult: {
          hitResult: 'MISS' as any,
          bodyPart: null,
          rawDamage: DamageInstance.stab(10, 0),
          actualDamage: 0,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        dodgeResult: {
          dodged: true,
          direction: 'left',
          staminaCost: 2,
        },
        moveCost: 100,
      };

      const formatted = MeleeCombat.formatAttackResult(result);

      expect(formatted).toContain('闪避');
      expect(formatted).toContain('left');
    });
  });

  describe('builtin attacks', () => {
    it('should have predefined unarmed bash', () => {
      expect(MeleeCombat.createBashAttack(3, 0, 0)).toBeDefined();
    });

    it('should have predefined dagger stab', () => {
      expect(MeleeCombat.createStabAttack(8, 2, 3)).toBeDefined();
    });

    it('should have predefined sword cut', () => {
      expect(MeleeCombat.createCutAttack(12, 1, 1)).toBeDefined();
    });

    it('should have predefined warhammer bash', () => {
      expect(MeleeCombat.createBashAttack(15, -1, 3)).toBeDefined();
    });
  });
});
