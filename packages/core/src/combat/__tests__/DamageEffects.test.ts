/**
 * DamageEffects 测试
 *
 * 测试伤害效果系统
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map, Set, List } from 'immutable';
import {
  DamageEffectsRegistry,
  DamageEffectsManager,
  initializeBuiltinEffects,
  EffectIntensity,
  DamageEffectType,
  type DamageEffectDef,
  type DamageEffectContext,
  type ActiveEffect,
} from '../DamageEffects';
import { createDamageTypeId, createEffectTypeId, type BodyPartId } from '../types';

describe('DamageEffectsRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    (DamageEffectsRegistry as any).effects = Map();
  });

  describe('register and get', () => {
    it('should register and retrieve effect', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('test_effect'),
        type: DamageEffectType.BLEEDING,
        name: 'Test Effect',
        description: 'A test effect',
        condition: {},
        duration: {
          baseDuration: 5,
          durationPerIntensity: 2,
        },
        stackable: true,
        removable: true,
      };

      DamageEffectsRegistry.register(effect);
      const retrieved = DamageEffectsRegistry.get(createEffectTypeId('test_effect'));

      expect(retrieved).toEqual(effect);
    });

    it('should return undefined for non-existent effect', () => {
      const retrieved = DamageEffectsRegistry.get(createEffectTypeId('non_existent'));
      expect(retrieved).toBeUndefined();
    });

    it('should get all registered effects', () => {
      const effect1: DamageEffectDef = {
        id: createEffectTypeId('effect1'),
        type: DamageEffectType.BLEEDING,
        name: 'Effect 1',
        description: 'First effect',
        condition: {},
        duration: { baseDuration: 5, durationPerIntensity: 1 },
        stackable: true,
        removable: true,
      };

      const effect2: DamageEffectDef = {
        id: createEffectTypeId('effect2'),
        type: DamageEffectType.BURNING,
        name: 'Effect 2',
        description: 'Second effect',
        condition: {},
        duration: { baseDuration: 3, durationPerIntensity: 1 },
        stackable: false,
        removable: true,
      };

      DamageEffectsRegistry.register(effect1);
      DamageEffectsRegistry.register(effect2);

      const all = DamageEffectsRegistry.getAll();
      expect(all.size).toBe(2);
    });
  });

  describe('shouldTrigger', () => {
    it('should trigger when damage type matches', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('bleed_on_cut'),
        type: DamageEffectType.BLEEDING,
        name: 'Bleeding',
        description: 'Bleeding effect',
        condition: {
          damageType: 'CUT' as DamageTypeId,
        },
        duration: { baseDuration: 5, durationPerIntensity: 1 },
        stackable: true,
        removable: true,
      };

      DamageEffectsRegistry.register(effect);

      const context: DamageEffectContext = {
        damageType: 'CUT' as DamageTypeId,
        damageAmount: 10,
        bodyPart: 'ARM_L' as BodyPartId,
        critical: false,
      };

      expect(DamageEffectsRegistry.shouldTrigger(effect, context)).toBe(true);
    });

    it('should not trigger when damage type does not match', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('bleed_on_cut'),
        type: DamageEffectType.BLEEDING,
        name: 'Bleeding',
        description: 'Bleeding effect',
        condition: {
          damageType: 'CUT' as DamageTypeId,
        },
        duration: { baseDuration: 5, durationPerIntensity: 1 },
        stackable: true,
        removable: true,
      };

      DamageEffectsRegistry.register(effect);

      const context: DamageEffectContext = {
        damageType: 'BASH' as DamageTypeId,
        damageAmount: 10,
        bodyPart: 'ARM_L' as BodyPartId,
        critical: false,
      };

      expect(DamageEffectsRegistry.shouldTrigger(effect, context)).toBe(false);
    });

    it('should check minimum damage threshold', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('stun_heavy'),
        type: DamageEffectType.STUNNED,
        name: 'Stunned',
        description: 'Stunned effect',
        condition: {
          minDamage: 15,
        },
        duration: { baseDuration: 2, durationPerIntensity: 1 },
        stackable: false,
        removable: false,
      };

      DamageEffectsRegistry.register(effect);

      const lowDamageContext: DamageEffectContext = {
        damageType: 'BASH' as DamageTypeId,
        damageAmount: 10,
        bodyPart: 'HEAD' as BodyPartId,
        critical: false,
      };

      const highDamageContext: DamageEffectContext = {
        damageType: 'BASH' as DamageTypeId,
        damageAmount: 20,
        bodyPart: 'HEAD' as BodyPartId,
        critical: false,
      };

      expect(DamageEffectsRegistry.shouldTrigger(effect, lowDamageContext)).toBe(false);
      expect(DamageEffectsRegistry.shouldTrigger(effect, highDamageContext)).toBe(true);
    });

    it('should check custom condition function', () => {
      let customConditionMet = false;
      const effect: DamageEffectDef = {
        id: createEffectTypeId('custom_effect'),
        type: DamageEffectType.BLINDED,
        name: 'Blinded',
        description: 'Blinded effect',
        condition: {
          customCondition: (ctx: DamageEffectContext) => {
            return ctx.critical === true;
          },
        },
        duration: { baseDuration: 3, durationPerIntensity: 1 },
        stackable: false,
        removable: true,
      };

      DamageEffectsRegistry.register(effect);

      const normalContext: DamageEffectContext = {
        damageType: 'BASH' as DamageTypeId,
        damageAmount: 10,
        bodyPart: 'EYES' as BodyPartId,
        critical: false,
      };

      const critContext: DamageEffectContext = {
        damageType: 'BASH' as DamageTypeId,
        damageAmount: 10,
        bodyPart: 'EYES' as BodyPartId,
        critical: true,
      };

      expect(DamageEffectsRegistry.shouldTrigger(effect, normalContext)).toBe(false);
      expect(DamageEffectsRegistry.shouldTrigger(effect, critContext)).toBe(true);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate base duration', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('test_effect'),
        type: DamageEffectType.POISONED,
        name: 'Poisoned',
        description: 'Poison effect',
        condition: {},
        duration: {
          baseDuration: 10,
          durationPerIntensity: 0,
        },
        stackable: true,
        removable: true,
      };

      const duration = DamageEffectsRegistry.calculateDuration(effect, EffectIntensity.LIGHT);

      expect(duration).toBe(10);
    });

    it('should apply intensity modifier', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('test_effect'),
        type: DamageEffectType.BURNING,
        name: 'Burning',
        description: 'Burn effect',
        condition: {},
        duration: {
          baseDuration: 5,
          durationPerIntensity: 3,
        },
        stackable: false,
        removable: true,
      };

      const lightDuration = DamageEffectsRegistry.calculateDuration(effect, EffectIntensity.LIGHT);
      const severeDuration = DamageEffectsRegistry.calculateDuration(effect, EffectIntensity.SEVERE);

      expect(lightDuration).toBe(5 + 1 * 3); // 5 + 1*3 = 8
      expect(severeDuration).toBe(5 + 3 * 3); // 5 + 3*3 = 14
    });

    it('should respect max duration', () => {
      const effect: DamageEffectDef = {
        id: createEffectTypeId('test_effect'),
        type: DamageEffectType.FROZEN,
        name: 'Frozen',
        description: 'Frozen effect',
        condition: {},
        duration: {
          baseDuration: 3,
          durationPerIntensity: 5,
          maxDuration: 10,
        },
        stackable: false,
        removable: true,
      };

      const criticalDuration = DamageEffectsRegistry.calculateDuration(effect, EffectIntensity.CRITICAL);

      expect(criticalDuration).toBe(10); // Capped at max
    });
  });
});

describe('DamageEffectsManager', () => {
  it('should create empty manager', () => {
    const manager = DamageEffectsManager.create();

    expect(manager.getAllEffects().size).toBe(0);
  });

  it('should apply effect', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('bleeding'),
      type: DamageEffectType.BLEEDING,
      name: 'Bleeding',
      description: 'Losing blood',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: true,
      removable: true,
    };

    const newManager = manager.applyEffect(effect, EffectIntensity.MODERATE, 'ARM_L' as BodyPartId);

    expect(newManager.getAllEffects().size).toBe(1);
    expect(newManager.hasEffect(createEffectTypeId('bleeding'))).toBe(true);
  });

  it('should remove effect', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('burning'),
      type: DamageEffectType.BURNING,
      name: 'Burning',
      description: 'On fire',
      condition: {},
      duration: { baseDuration: 3, durationPerIntensity: 1 },
      stackable: false,
      removable: true,
    };

    const withEffect = manager.applyEffect(effect, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);
    const withoutEffect = withEffect.removeEffect(createEffectTypeId('burning'));

    expect(withoutEffect.getAllEffects().size).toBe(0);
    expect(withoutEffect.hasEffect(createEffectTypeId('burning'))).toBe(false);
  });

  it('should stack stackable effects', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('poison'),
      type: DamageEffectType.POISONED,
      name: 'Poison',
      description: 'Poisoned',
      condition: {},
      duration: { baseDuration: 10, durationPerIntensity: 2 },
      stackable: true,
      removable: true,
    };

    const once = manager.applyEffect(effect, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);
    const twice = once.applyEffect(effect, EffectIntensity.MODERATE, 'TORSO' as BodyPartId);

    const activeEffects = twice.getAllEffects();
    expect(activeEffects.size).toBe(1); // Still one effect entry
    expect(activeEffects.get(0)!.stacks).toBe(2); // But with 2 stacks
    expect(activeEffects.get(0)!.intensity).toBe(EffectIntensity.MODERATE); // Higher intensity
  });

  it('should not stack non-stackable effects', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('stunned'),
      type: DamageEffectType.STUNNED,
      name: 'Stunned',
      description: 'Cannot act',
      condition: {},
      duration: { baseDuration: 2, durationPerIntensity: 1 },
      stackable: false,
      removable: false,
    };

    const once = manager.applyEffect(effect, EffectIntensity.LIGHT, 'HEAD' as BodyPartId);
    const twice = once.applyEffect(effect, EffectIntensity.MODERATE, 'HEAD' as BodyPartId);

    const activeEffects = twice.getAllEffects();
    // Should replace or ignore the second application
    expect(activeEffects.size).toBe(1);
  });

  it('should process turn and reduce duration', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('short_effect'),
      type: DamageEffectType.KNOCKED_DOWN,
      name: 'Knocked Down',
      description: 'Prone',
      condition: {},
      duration: { baseDuration: 1, durationPerIntensity: 0 },
      stackable: false,
      removable: false,
      damagePerTurn: 0,
    };

    const withEffect = manager.applyEffect(effect, EffectIntensity.NONE, 'TORSO' as BodyPartId);
    const processed = withEffect.processTurn();

    expect(processed.effectsToRemove).toContain(createEffectTypeId('short_effect'));
    expect(processed.manager.getAllEffects().size).toBe(0);
  });

  it('should calculate ongoing damage', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('burning_damage'),
      type: DamageEffectType.BURNING,
      name: 'Burning',
      description: 'Taking fire damage',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: false,
      removable: true,
      damagePerTurn: 3,
    };

    const withEffect = manager.applyEffect(effect, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);
    const processed = withEffect.processTurn();

    // damagePerTurn * stacks * (intensity + 1) = 3 * 1 * (1 + 1) = 6
    expect(processed.damage).toBe(6);
  });

  it('should apply damage per turn with stacks', () => {
    const manager = DamageEffectsManager.create();
    const effect: DamageEffectDef = {
      id: createEffectTypeId('bleed_damage'),
      type: DamageEffectType.BLEEDING,
      name: 'Bleeding',
      description: 'Losing blood each turn',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: true,
      removable: true,
      damagePerTurn: 2,
    };

    let managerState = manager;
    managerState = managerState.applyEffect(effect, EffectIntensity.LIGHT, 'ARM_L' as BodyPartId);
    managerState = managerState.applyEffect(effect, EffectIntensity.LIGHT, 'ARM_L' as BodyPartId);

    const processed = managerState.processTurn();

    // damagePerTurn * stacks * (intensity + 1) = 2 * 2 * (1 + 1) = 8
    expect(processed.damage).toBe(8);
  });

  it('should get effects for specific body part', () => {
    const manager = DamageEffectsManager.create();
    const effect1: DamageEffectDef = {
      id: createEffectTypeId('arm_wound'),
      type: DamageEffectType.BLEEDING,
      name: 'Arm Wound',
      description: 'Wounded arm',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: true,
      removable: true,
    };

    const effect2: DamageEffectDef = {
      id: createEffectTypeId('leg_wound'),
      type: DamageEffectType.BLEEDING,
      name: 'Leg Wound',
      description: 'Wounded leg',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: true,
      removable: true,
    };

    let managerState = manager;
    managerState = managerState.applyEffect(effect1, EffectIntensity.LIGHT, 'ARM_L' as BodyPartId);
    managerState = managerState.applyEffect(effect2, EffectIntensity.LIGHT, 'LEG_L' as BodyPartId);

    const armEffects = managerState.getEffectsForBodyPart('ARM_L' as BodyPartId);
    const legEffects = managerState.getEffectsForBodyPart('LEG_L' as BodyPartId);

    expect(armEffects.size).toBe(1);
    expect(legEffects.size).toBe(1);
    expect(armEffects.get(0)!.def.id).toBe(createEffectTypeId('arm_wound'));
    expect(legEffects.get(0)!.def.id).toBe(createEffectTypeId('leg_wound'));
  });

  it('should get effects by type', () => {
    const manager = DamageEffectsManager.create();

    const bleedEffect: DamageEffectDef = {
      id: createEffectTypeId('bleed1'),
      type: DamageEffectType.BLEEDING,
      name: 'Bleeding',
      description: 'Bleeding',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      stackable: true,
      removable: true,
    };

    const burnEffect: DamageEffectDef = {
      id: createEffectTypeId('burn1'),
      type: DamageEffectType.BURNING,
      name: 'Burning',
      description: 'Burning',
      condition: {},
      duration: { baseDuration: 3, durationPerIntensity: 1 },
      stackable: false,
      removable: true,
    };

    let managerState = manager;
    managerState = managerState.applyEffect(bleedEffect, EffectIntensity.LIGHT, 'ARM_L' as BodyPartId);
    managerState = managerState.applyEffect(burnEffect, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);

    const bleedEffects = managerState.getEffectsByType(DamageEffectType.BLEEDING);
    const burnEffects = managerState.getEffectsByType(DamageEffectType.BURNING);

    expect(bleedEffects.size).toBe(1);
    expect(burnEffects.size).toBe(1);
  });

  it('should check if body part is disabled', () => {
    const manager = DamageEffectsManager.create();
    const brokenEffect: DamageEffectDef = {
      id: createEffectTypeId('broken_arm'),
      type: DamageEffectType.BROKEN,
      name: 'Broken Arm',
      description: 'Arm is broken',
      condition: {},
      duration: { baseDuration: 50, durationPerIntensity: 10 },
      stackable: false,
      removable: false,
    };

    const withBroken = manager.applyEffect(brokenEffect, EffectIntensity.SEVERE, 'ARM_L' as BodyPartId);

    expect(withBroken.isBodyPartDisabled('ARM_L' as BodyPartId)).toBe(true);
    expect(withBroken.isBodyPartDisabled('ARM_R' as BodyPartId)).toBe(false);
  });

  it('should calculate total stat penalty', () => {
    const manager = DamageEffectsManager.create();

    const effect1: DamageEffectDef = {
      id: createEffectTypeId('effect1'),
      type: DamageEffectType.BLEEDING,
      name: 'Effect 1',
      description: 'Effect 1',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      statPenalties: Map({ str: -2, dex: -1 }),
      stackable: true,
      removable: true,
    };

    const effect2: DamageEffectDef = {
      id: createEffectTypeId('effect2'),
      type: DamageEffectType.POISONED,
      name: 'Effect 2',
      description: 'Effect 2',
      condition: {},
      duration: { baseDuration: 5, durationPerIntensity: 1 },
      statPenalties: Map({ str: -1, per: -2 }),
      stackable: true,
      removable: true,
    };

    let managerState = manager;
    managerState = managerState.applyEffect(effect1, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);
    managerState = managerState.applyEffect(effect2, EffectIntensity.LIGHT, 'TORSO' as BodyPartId);

    expect(managerState.getTotalStatPenalty('str')).toBe(-3); // -2 + -1
    expect(managerState.getTotalStatPenalty('dex')).toBe(-1);
    expect(managerState.getTotalStatPenalty('per')).toBe(-2);
  });
});

describe('initializeBuiltinEffects', () => {
  beforeEach(() => {
    (DamageEffectsRegistry as any).effects = Map();
  });

  it('should register all builtin effects', () => {
    initializeBuiltinEffects();

    const all = DamageEffectsRegistry.getAll();

    expect(all.size).toBeGreaterThan(0);
    expect(all.has(createEffectTypeId('bleeding'))).toBe(true);
    expect(all.has(createEffectTypeId('burning'))).toBe(true);
    expect(all.has(createEffectTypeId('poisoned'))).toBe(true);
    expect(all.has(createEffectTypeId('stunned'))).toBe(true);
    expect(all.has(createEffectTypeId('knocked_down'))).toBe(true);
    expect(all.has(createEffectTypeId('broken'))).toBe(true);
    expect(all.has(createEffectTypeId('frozen'))).toBe(true);
    expect(all.has(createEffectTypeId('infected'))).toBe(true);
  });

  it('should have properly configured bleeding effect', () => {
    initializeBuiltinEffects();

    const bleeding = DamageEffectsRegistry.get(createEffectTypeId('bleeding'));

    expect(bleeding).toBeDefined();
    expect(bleeding!.type).toBe(DamageEffectType.BLEEDING);
    expect(bleeding!.stackable).toBe(true);
    expect(bleeding!.damagePerTurn).toBe(1);
  });

  it('should have properly configured burning effect', () => {
    initializeBuiltinEffects();

    const burning = DamageEffectsRegistry.get(createEffectTypeId('burning'));

    expect(burning).toBeDefined();
    expect(burning!.type).toBe(DamageEffectType.BURNING);
    expect(burning!.stackable).toBe(false);
    expect(burning!.damagePerTurn).toBe(3);
  });
});
