/**
 * DamageHandler 测试
 *
 * 测试伤害处理器的各种功能
 */

import { describe, it, expect } from 'vitest';
import { Map, List } from 'immutable';
import {
  DamageHandler,
  type DamageableCreature,
  type BodyPartHPData,
  type DamageApplicationResult,
} from '../DamageHandler';
import { DamageInstance } from '../DamageInstance';
import { Resistances } from '../Resistances';
import { createDamageTypeId, createBodyPartId, type BodyPartId } from '../types';

// Mock creature for testing
class MockCreature implements DamageableCreature {
  constructor(
    public readonly id: string,
    private bodyPartHP: Map<BodyPartId, BodyPartHPData>,
    private immunities: Set<DamageTypeId> = new Set()
  ) {}

  getBodyPartHP(): Map<BodyPartId, BodyPartHPData> {
    return this.bodyPartHP;
  }

  isImmuneTo(damageType: DamageTypeId): boolean {
    return this.immunities.has(damageType);
  }

  getResistances(): Resistances {
    return Resistances.fromObject({
      bash: 2,
      cut: 3,
      stab: 2,
      bullet: 1,
    });
  }

  applyDamageEffect?(effectType: string, intensity: number): void {
    // Mock implementation
  }

  onDeath?(): void {
    // Mock implementation
  }

  getDodgeValue?(): number {
    return 5;
  }
}

describe('DamageHandler', () => {
  describe('applyDamage', () => {
    const createBasicCreature = (): MockCreature => {
      return new MockCreature(
        'test-creature',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 50, maxHP: 50, baseHP: 50 },
          'HEAD' as any: { bodyPart: 'HEAD' as any, currentHP: 30, maxHP: 30, baseHP: 30 },
          'ARM_L' as any: { bodyPart: 'ARM_L' as any, currentHP: 25, maxHP: 25, baseHP: 25 },
        })
      );
    };

    it('should apply damage to creature', () => {
      const creature = createBasicCreature();
      const damage = DamageInstance.bash(10, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      expect(result.hit).toBe(true);
      expect(result.totalRawDamage).toBe(10);
      expect(result.totalActualDamage).toBeGreaterThan(0);
      expect(result.killed).toBe(false);
    });

    it('should target specific body part when specified', () => {
      const creature = createBasicCreature();
      const damage = DamageInstance.cut(15, 0);

      const result = DamageHandler.applyDamage(
        creature,
        damage,
        'ARM_L' as any,
        1.0
      );

      expect(result.hit).toBe(true);
      expect(result.totalActualDamage).toBeGreaterThan(0);
    });

    it('should detect immunity', () => {
      const creature = new MockCreature(
        'immune-creature',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 50, maxHP: 50, baseHP: 50 },
        }),
        new Set(['BIOLICAL' as DamageTypeId])
      );

      const damage = new DamageInstance().addDamage('BIOLICAL' as DamageTypeId, 10, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      expect(result.hit).toBe(false);
      expect(result.totalActualDamage).toBe(0);
    });

    it('should calculate damage with resistances', () => {
      const creature = createBasicCreature();
      const damage = DamageInstance.bash(10, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      // 10 damage - 2 resistance = 8 (approximately)
      expect(result.totalActualDamage).toBeGreaterThan(5);
      expect(result.totalActualDamage).toBeLessThanOrEqual(10);
    });

    it('should apply critical multiplier', () => {
      const creature = createBasicCreature();
      const damage = DamageInstance.bash(10, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 2.0);

      expect(result.totalActualDamage).toBeGreaterThan(15); // ~10 * 2 - resistances
    });

    it('should generate damage events', () => {
      const creature = createBasicCreature();
      const damage = DamageInstance.cut(20, 0);

      const result = DamageHandler.applyDamage(creature, damage, 'ARM_L' as any, 1.0);

      expect(result.events.length).toBeGreaterThan(0);

      const damageEvents = result.events.filter(e => e.type === 'damage');
      expect(damageEvents.length).toBeGreaterThan(0);
    });

    it('should detect killing blow to lethal part', () => {
      const creature = new MockCreature(
        'fragile-creature',
        Map<BodyPartId, BodyPartHPData>({
          'HEAD' as any: { bodyPart: 'HEAD' as any, currentHP: 10, maxHP: 10, baseHP: 10 },
        })
      );
      const damage = DamageInstance.bash(50, 0);

      const result = DamageHandler.applyDamage(creature, damage, 'HEAD' as any, 1.0);

      expect(result.killed).toBe(true);
    });

    it('should not kill when damage is to non-lethal part', () => {
      const creature = new MockCreature(
        'tough-creature',
        Map<BodyPartId, BodyPartHPData>({
          'ARM_L' as any: { bodyPart: 'ARM_L' as any, currentHP: 10, maxHP: 10, baseHP: 10 },
        })
      );
      const damage = DamageInstance.bash(50, 0);

      const result = DamageHandler.applyDamage(creature, damage, 'ARM_L' as any, 1.0);

      expect(result.killed).toBe(false);
      expect(result.disabled).toBe(true);
    });
  });

  describe('applyAoeDamage', () => {
    const createMultiPartCreature = (): MockCreature => {
      return new MockCreature(
        'aoe-test-creature',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 50, maxHP: 50, baseHP: 50 },
          'HEAD' as any: { bodyPart: 'HEAD' as any, currentHP: 30, maxHP: 30, baseHP: 30 },
          'ARM_L' as any: { bodyPart: 'ARM_L' as any, currentHP: 25, maxHP: 25, baseHP: 25 },
          'ARM_R' as any: { bodyPart: 'ARM_R' as any, currentHP: 25, maxHP: 25, baseHP: 25 },
        })
      );
    };

    it('should apply equal distribution AOE damage', () => {
      const creature = createMultiPartCreature();
      const damage = DamageInstance.bash(12, 0);
      const targetParts = ['TORSO' as any, 'HEAD' as any, 'ARM_L' as any];

      const result = DamageHandler.applyAoeDamage(
        creature,
        damage,
        targetParts,
        'equal'
      );

      expect(result.hit).toBe(true);
      expect(result.totalActualDamage).toBeGreaterThan(0);
    });

    it('should apply full damage to all parts with full distribution', () => {
      const creature = createMultiPartCreature();
      const damage = DamageInstance.bash(8, 0);
      const targetParts = ['ARM_L' as any, 'ARM_R' as any];

      const result = DamageHandler.applyAoeDamage(
        creature,
        damage,
        targetParts,
        'full'
      );

      expect(result.hit).toBe(true);
      // Each part takes full damage, so total should be ~2x (minus resistances)
      expect(result.totalActualDamage).toBeGreaterThan(10);
    });

    it('should generate events for all damaged parts', () => {
      const creature = createMultiPartCreature();
      const damage = DamageInstance.bash(10, 0);
      const targetParts = ['TORSO' as any, 'HEAD' as any];

      const result = DamageHandler.applyAoeDamage(
        creature,
        damage,
        targetParts,
        'equal'
      );

      const damageEvents = result.events.filter(e => e.type === 'damage');
      expect(damageEvents.length).toBeGreaterThanOrEqual(2); // At least one per part
    });
  });

  describe('heal', () => {
    const createWoundedCreature = (): MockCreature => {
      return new MockCreature(
        'wounded-creature',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 30, maxHP: 50, baseHP: 50 },
          'HEAD' as any: { bodyPart: 'HEAD' as any, currentHP: 15, maxHP: 30, baseHP: 30 },
        })
      );
    };

    it('should heal specific body part', () => {
      const creature = createWoundedCreature();

      const result = DamageHandler.heal(creature, 10, 'HEAD' as any);

      expect(result.hit).toBe(true);
      expect(result.totalActualDamage).toBe(10); // Healing amount

      const headEvent = result.events.find(e => e.bodyPart === 'HEAD' as any);
      expect(headEvent).toBeDefined();
      expect(headEvent?.type).toBe('heal');
    });

    it('should heal all parts when target is null', () => {
      const creature = createWoundedCreature();

      const result = DamageHandler.heal(creature, 50, null);

      expect(result.hit).toBe(true);
      // Total healing should cover both parts
      expect(result.totalActualDamage).toBeGreaterThan(0);
    });

    it('should not heal beyond max HP', () => {
      const creature = createWoundedCreature();

      const result = DamageHandler.heal(creature, 100, 'HEAD' as any);

      // Can only heal 15 HP (from 15 to 30 max)
      expect(result.totalActualDamage).toBe(15);
    });

    it('should generate healing events', () => {
      const creature = createWoundedCreature();

      const result = DamageHandler.heal(creature, 5, 'TORSO' as any);

      const healEvents = result.events.filter(e => e.type === 'heal');
      expect(healEvents.length).toBeGreaterThan(0);
    });
  });

  describe('getBodyPartStatusDescription', () => {
    it('should return healthy for full HP', () => {
      const desc = DamageHandler.getBodyPartStatusDescription(50, 50);
      expect(desc).toBe('健康');
    });

    it('should return light damage for high HP', () => {
      const desc = DamageHandler.getBodyPartStatusDescription(40, 50);
      expect(desc).toBe('轻伤');
    });

    it('should return moderate damage for medium HP', () => {
      const desc = DamageHandler.getBodyPartStatusDescription(30, 50);
      expect(desc).toBe('受伤');
    });

    it('should return heavy damage for low HP', () => {
      const desc = DamageHandler.getBodyPartStatusDescription(12, 50);
      expect(desc).toBe('重伤');
    });

    it('should return destroyed for zero HP', () => {
      const desc = DamageHandler.getBodyPartStatusDescription(0, 50);
      expect(desc).toBe('已损毁');
    });
  });

  describe('formatDamageResult', () => {
    it('should format damage result with hit', () => {
      const result: DamageApplicationResult = {
        hit: true,
        totalRawDamage: 10,
        totalActualDamage: 7,
        bodyPartResults: Map(),
        killed: false,
        disabled: false,
        triggeredEffects: [],
        events: [
          {
            type: 'damage',
            bodyPart: 'TORSO' as any,
            damageType: 'BASH' as any,
            amount: 7,
            message: 'TORSO 受到 7 点伤害',
          },
        ],
        currentHP: Map(),
      };

      const formatted = DamageHandler.formatDamageResult(result);

      expect(formatted).toContain('=== 伤害应用结果 ===');
      expect(formatted).toContain('命中成功');
      expect(formatted).toContain('总原始伤害: 10');
      expect(formatted).toContain('总实际伤害: 7');
    });

    it('should format damage result with miss', () => {
      const result: DamageApplicationResult = {
        hit: false,
        totalRawDamage: 0,
        totalActualDamage: 0,
        bodyPartResults: Map(),
        killed: false,
        disabled: false,
        triggeredEffects: [],
        events: [
          {
            type: 'miss',
            message: '未命中',
          },
        ],
        currentHP: Map(),
      };

      const formatted = DamageHandler.formatDamageResult(result);

      expect(formatted).toContain('未命中');
    });

    it('should include kill status', () => {
      const result: DamageApplicationResult = {
        hit: true,
        totalRawDamage: 50,
        totalActualDamage: 50,
        bodyPartResults: Map(),
        killed: true,
        disabled: true,
        triggeredEffects: [],
        events: [],
        currentHP: Map(),
      };

      const formatted = DamageHandler.formatDamageResult(result);

      expect(formatted).toContain('目标已死亡');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty damage instance', () => {
      const creature = new MockCreature(
        'test',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 50, maxHP: 50, baseHP: 50 },
        })
      );
      const damage = DamageInstance.create();

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      expect(result.hit).toBe(true);
      expect(result.totalActualDamage).toBe(0);
    });

    it('should handle zero damage', () => {
      const creature = new MockCreature(
        'test',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 50, maxHP: 50, baseHP: 50 },
        })
      );
      const damage = DamageInstance.bash(0, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      expect(result.totalActualDamage).toBe(0);
    });

    it('should handle negative damage (healing)', () => {
      const creature = new MockCreature(
        'test',
        Map<BodyPartId, BodyPartHPData>({
          'TORSO' as any: { bodyPart: 'TORSO' as any, currentHP: 30, maxHP: 50, baseHP: 50 },
        })
      );
      // Negative damage should be handled as zero damage in applyDamage
      const damage = DamageInstance.bash(-10, 0);

      const result = DamageHandler.applyDamage(creature, damage, null, 1.0);

      // Should not cause negative damage
      expect(result.totalActualDamage).toBeGreaterThanOrEqual(0);
    });
  });
});
