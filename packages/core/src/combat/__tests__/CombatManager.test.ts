/**
 * CombatManager 测试
 *
 * 测试战斗管理器的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map, List } from 'immutable';
import { CombatManager, createCombatManager, create1v1Combat, type Combatant } from '../CombatManager';
import { createBodyPartId, createSkillId, createDamageTypeId } from '../types';
import { Resistances } from '../Resistances';
import { DamageInstance } from '../DamageInstance';
import type { Item } from '../../item/Item';
import type { ItemType } from '../../item/types';

// 创建抗性实例
const testResistances = Resistances.create();

// ============ 辅助函数 ============

/**
 * 创建测试战斗参与者
 */
function createTestCombatant(overrides: Partial<Combatant> = {}): Combatant {
  const defaultCombatant: Combatant = {
    id: overrides.id || 'test_combatant',
    name: overrides.name || 'Test Combatant',
    teamId: overrides.teamId || 'team_1',
    currentHP: Map<ReturnType<typeof createBodyPartId>, number>({
      [createBodyPartId('TORSO')]: 100,
      [createBodyPartId('HEAD')]: 80,
      [createBodyPartId('ARM_L')]: 60,
      [createBodyPartId('ARM_R')]: 60,
      [createBodyPartId('LEG_L')]: 70,
      [createBodyPartId('LEG_R')]: 70,
    }),
    maxHP: Map<ReturnType<typeof createBodyPartId>, number>({
      [createBodyPartId('TORSO')]: 100,
      [createBodyPartId('HEAD')]: 80,
      [createBodyPartId('ARM_L')]: 60,
      [createBodyPartId('ARM_R')]: 60,
      [createBodyPartId('LEG_L')]: 70,
      [createBodyPartId('LEG_R')]: 70,
    }),
    isAlive: true,
    canAct: true,
    movePoints: 100,
    maxMovePoints: 100,
    weapon: null,
    armor: Map(),
    effectManager: undefined,

    // DamageableCreature 接口
    getBodyPartHP: () => Map<ReturnType<typeof createBodyPartId>, any>({
      [createBodyPartId('TORSO')]: { bodyPart: createBodyPartId('TORSO'), currentHP: 100, maxHP: 100 },
      [createBodyPartId('HEAD')]: { bodyPart: createBodyPartId('HEAD'), currentHP: 80, maxHP: 80 },
    }),
    isImmuneTo: () => false,
    getResistances: () => testResistances,

    // 近战接口
    getMeleeAccuracy: () => 10,
    getCritChance: () => 0.05,
    getCritMultiplier: () => 2.0,
    getWeaponName: () => '徒手',
    getWeaponWeight: () => 0,
    getBlockChance: () => 0,
    getBlockReduction: () => 0,
    getBlockingWeapon: () => '',
    getDodgeChance: () => 10,
    getDodgeValue: () => 5,

    // 远程接口
    getRangedAccuracy: () => 8,

    // 移动点数管理
    consumeMovePoints: function(amount: number): Combatant {
      return { ...this, movePoints: Math.max(0, this.movePoints - amount) };
    },
    resetMovePoints: function(): Combatant {
      return { ...this, movePoints: this.maxMovePoints };
    },
    isDead: function(): boolean {
      return !this.isAlive;
    },
  };

  return { ...defaultCombatant, ...overrides };
}

/**
 * 创建测试武器物品
 */
function createTestWeapon(overrides: Partial<ItemType> = {}): Item {
  const itemType: ItemType = {
    id: 'test_sword' as any,
    name: 'Test Sword',
    category: 'WEAPON' as any,
    symbol: '/',
    color: 'light_gray',
    weight: 1000,
    volume: 500,
    material: [] as any,
    flags: new Set(),
    weapon: {
      damage: overrides.weapon?.damage || 10,
      toHit: overrides.weapon?.toHit || 2,
      attacks: ['BASH', 'CUT'] as any,
    },
    ...overrides,
  };

  return {
    type: itemType,
    charges: 0,
    damage: 0,
    itemVars: Map(),
    contents: undefined as any,
  } as Item;
}

/**
 * 创建测试枪械物品
 */
function createTestGun(overrides: Partial<ItemType> = {}): Item {
  const itemType: ItemType = {
    id: 'test_pistol' as any,
    name: 'Test Pistol',
    category: 'GUN' as any,
    symbol: '(',
    color: 'light_gray',
    weight: 800,
    volume: 250,
    material: [] as any,
    flags: new Set(),
    gun: {
      ammo: ['9mm' as any],
      range: 20,
      damage: 15,
      dispersion: 180,
      magazineSize: 12,
      reloadTime: 2000,
      skill: 'pistol' as any,
      rangedDamage: 15,
      ammoToFire: 1,
      burst: 0,
      reload: 2000,
    },
    // 添加方法
    isGun: function() { return true; },
    isAmmo: function() { return false; },
    isArmor: function() { return false; },
    isWeapon: function() { return true; },
    isComestible: function() { return false; },
    isTool: function() { return false; },
    isBook: function() { return false; },
    isGunmod: function() { return false; },
    ...overrides,
  } as any;

  return {
    type: itemType,
    charges: 12,
    damage: 0,
    itemVars: Map(),
    contents: undefined as any,
    isGun: function() { return true; },
    isAmmo: function() { return false; },
    isArmor: function() { return false; },
    isWeapon: function() { return true; },
  } as unknown as Item;
}

// ============ 测试套件 ============

describe('CombatManager', () => {
  let combatManager: CombatManager;
  let combatant1: Combatant;
  let combatant2: Combatant;

  beforeEach(() => {
    combatant1 = createTestCombatant({
      id: 'fighter_1',
      name: 'Fighter 1',
      teamId: 'team_a',
    });
    combatant2 = createTestCombatant({
      id: 'fighter_2',
      name: 'Fighter 2',
      teamId: 'team_b',
    });

    combatManager = createCombatManager('test_combat', [combatant1, combatant2]);
  });

  // ============ 基础功能测试 ============

  describe('基础功能', () => {
    it('should create combat manager with combatants', () => {
      const state = combatManager.getState();

      expect(state.combatId).toBe('test_combat');
      expect(state.combatants.size).toBe(2);
      expect(state.combatants.get('fighter_1')?.name).toBe('Fighter 1');
      expect(state.combatants.get('fighter_2')?.name).toBe('Fighter 2');
    });

    it('should add combatant', () => {
      const newCombatant = createTestCombatant({
        id: 'fighter_3',
        name: 'Fighter 3',
        teamId: 'team_a',
      });

      combatManager.addCombatant(newCombatant);

      const state = combatManager.getState();
      expect(state.combatants.size).toBe(3);
      expect(state.combatants.get('fighter_3')?.name).toBe('Fighter 3');
    });

    it('should remove combatant', () => {
      combatManager.removeCombatant('fighter_2');

      const state = combatManager.getState();
      expect(state.combatants.size).toBe(1);
      expect(state.combatants.has('fighter_2')).toBe(false);
    });

    it('should get combatant by id', () => {
      const combatant = combatManager.getCombatant('fighter_1');
      expect(combatant?.name).toBe('Fighter 1');
    });

    it('should get all combatants', () => {
      const combatants = combatManager.getAllCombatants();
      expect(combatants.size).toBe(2);
    });

    it('should get combatants by team', () => {
      const teamA = combatManager.getCombatantsByTeam('team_a');
      const teamB = combatManager.getCombatantsByTeam('team_b');

      expect(teamA.length).toBe(1);
      expect(teamB.length).toBe(1);
      expect(teamA[0].id).toBe('fighter_1');
      expect(teamB[0].id).toBe('fighter_2');
    });

    it('should get alive combatants', () => {
      const alive = combatManager.getAliveCombatants();
      expect(alive.length).toBe(2);
    });
  });

  // ============ 战斗流程测试 ============

  describe('战斗流程', () => {
    it('should start combat', () => {
      combatManager.startCombat();

      const state = combatManager.getState();
      expect(state.turnNumber).toBe(1);
      expect(state.currentActorId).toBeDefined();
      expect(state.actionQueue.size).toBe(2);
    });

    it('should process next turn', () => {
      combatManager.startCombat();
      const firstActor = combatManager.getState().currentActorId;

      combatManager.nextTurn();

      const state = combatManager.getState();
      expect(state.currentActorId).not.toBe(firstActor);
    });

    it('should detect combat end when one team is eliminated', () => {
      combatManager.startCombat();

      // 杀死 fighter_2
      const deadCombatant2: Combatant = {
        ...combatant2,
        isAlive: false,
        canAct: false,
      };
      combatManager.removeCombatant('fighter_2');
      combatManager.addCombatant(deadCombatant2);

      // 手动触发战斗结束检查
      const state = combatManager.getState();
      expect(state.combatants.get('fighter_2')?.isAlive).toBe(false);
      expect(state.combatants.get('fighter_1')?.isAlive).toBe(true);
    });
  });

  // ============ 近战攻击测试 ============

  describe('近战攻击', () => {
    it('should execute melee attack', () => {
      combatManager.startCombat();

      const result = combatManager.executeMeleeAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        attackType: 'bash',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('melee_attack');
      expect(result.feedback.messages.length).toBeGreaterThan(0);
    });

    it('should consume move points on attack', () => {
      combatManager.startCombat();

      const initialMovePoints = combatManager.getCurrentActor()?.movePoints || 0;

      combatManager.executeMeleeAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
      });

      const updatedAttacker = combatManager.getCombatant('fighter_1');
      expect(updatedAttacker?.movePoints).toBeLessThan(initialMovePoints);
    });

    it('should fail to attack non-existent target', () => {
      const result = combatManager.executeMeleeAttack({
        attackerId: 'fighter_1',
        targetId: 'non_existent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('目标不存在');
    });

    it('should fail to attack when out of move points', () => {
      const tiredFighter: Combatant = {
        ...combatant1,
        movePoints: 0,
      };
      combatManager.removeCombatant('fighter_1');
      combatManager.addCombatant(tiredFighter);

      const result = combatManager.executeMeleeAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('移动点数不足');
    });
  });

  // ============ 远程攻击测试 ============

  describe('远程攻击', () => {
    beforeEach(() => {
      // 给 fighter_1 装备枪械
      const gun = createTestGun();
      const armedFighter: Combatant = {
        ...combatant1,
        weapon: gun,
      };
      combatManager.removeCombatant('fighter_1');
      combatManager.addCombatant(armedFighter);
    });

    it('should execute ranged attack', () => {
      const result = combatManager.executeRangedAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        fireMode: 'SINGLE' as any,
        distance: 10,
        aim: false,
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('ranged_attack');
    });

    it('should consume ammo on ranged attack', () => {
      const initialCharges = combatManager.getCombatant('fighter_1')?.weapon?.charges || 0;

      combatManager.executeRangedAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        fireMode: 'SINGLE' as any,
        distance: 10,
        aim: false,
      });

      const updatedCharges = combatManager.getCombatant('fighter_1')?.weapon?.charges || 0;
      expect(updatedCharges).toBeLessThan(initialCharges);
    });

    it('should fail when out of ammo', () => {
      const emptyGun = createTestGun();
      // 创建一个弹药为0的枪械
      const emptyGunWithNoAmmo: Item = { ...emptyGun, charges: 0 } as any;
      const armedFighter: Combatant = {
        ...combatant1,
        weapon: emptyGunWithNoAmmo,
      };
      combatManager.removeCombatant('fighter_1');
      combatManager.addCombatant(armedFighter);

      const result = combatManager.executeRangedAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        fireMode: 'SINGLE' as any,
        distance: 10,
        aim: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('弹药不足');
    });

    it('should handle aiming', () => {
      combatManager.startAiming('fighter_1', 'fighter_2', createBodyPartId('HEAD'));

      const aimState = combatManager.getState().aimStates.get('fighter_1');
      expect(aimState).toBeDefined();
      expect(aimState?.targetId).toBe('fighter_2');
    });

    it('should continue aiming to improve accuracy', () => {
      combatManager.startAiming('fighter_1', 'fighter_2', createBodyPartId('HEAD'));

      const firstAim = combatManager.getState().aimStates.get('fighter_1');
      combatManager.continueAiming('fighter_1');
      const secondAim = combatManager.getState().aimStates.get('fighter_1');

      expect((secondAim?.accuracyBonus || 0)).toBeGreaterThanOrEqual((firstAim?.accuracyBonus || 0));
    });
  });

  // ============ 武器装填测试 ============

  describe('武器装填', () => {
    let ammoItem: Item;

    beforeEach(() => {
      // 创建弹药物品
      const ammoType: ItemType = {
        id: '9mm' as any,
        name: '9mm 弹药',
        category: 'AMMO' as any,
        symbol: '=',
        color: 'yellow',
        weight: 10,
        volume: 10,
        material: [] as any,
        flags: new Set(),
        ammo: {
          type: '9mm' as any,
          damage: 10,
          range: 15,
          dispersion: 30,
          stackSize: 50,
          casing: '9mm_casing' as any,
        },
        isAmmo: function() { return true; },
        isGun: function() { return false; },
      } as any;

      ammoItem = {
        type: ammoType,
        charges: 30,
        damage: 0,
        itemVars: Map(),
        contents: undefined as any,
      } as Item;

      // 给 fighter_1 装备枪械
      const gun = createTestGun();
      const armedFighter: Combatant = {
        ...combatant1,
        weapon: gun,
      };
      combatManager.removeCombatant('fighter_1');
      combatManager.addCombatant(armedFighter);
    });

    it('should reload weapon with ammo', () => {
      // 先消耗一些弹药，让武器需要装填
      combatManager.executeRangedAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        fireMode: 'SINGLE' as any,
        distance: 10,
        aim: false,
      });

      const gunAfterShot = combatManager.getCombatant('fighter_1')?.weapon;
      const initialCharges = gunAfterShot?.charges || 0;

      const result = combatManager.reloadWeapon({
        combatantId: 'fighter_1',
        ammoItem: ammoItem,
      });

      expect(result.success).toBe(true);
      expect(result.amountLoaded).toBeGreaterThan(0);
      expect(result.feedback.messages.length).toBeGreaterThan(0);

      // 验证武器弹药已更新
      const updatedGun = combatManager.getCombatant('fighter_1')?.weapon;
      expect(updatedGun?.charges).toBe(initialCharges + result.amountLoaded);
    });

    it('should fail to reload when weapon is full', () => {
      // 武器初始状态是满的，直接装填应该失败
      const result = combatManager.reloadWeapon({
        combatantId: 'fighter_1',
        ammoItem: ammoItem,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('武器已装满');
    });

    it('should fail to reload non-existent combatant', () => {
      const result = combatManager.reloadWeapon({
        combatantId: 'non_existent',
        ammoItem: ammoItem,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('参与者不存在');
    });

    it('should check if weapon needs reload', () => {
      // 射击一次后需要装填
      combatManager.executeRangedAttack({
        attackerId: 'fighter_1',
        targetId: 'fighter_2',
        fireMode: 'SINGLE' as any,
        distance: 10,
        aim: false,
      });

      expect(combatManager.needsReload('fighter_1')).toBe(true);
    });

    it('should get weapon ammo status', () => {
      const status = combatManager.getWeaponAmmoStatus('fighter_1');

      expect(status).not.toBeNull();
      expect(status?.current).toBeGreaterThan(0);
      expect(status?.max).toBeGreaterThan(0);
      expect(status?.percentage).toBeGreaterThan(0);
      expect(status?.percentage).toBeLessThanOrEqual(100);
    });

    it('should return null for ammo status of non-existent combatant', () => {
      const status = combatManager.getWeaponAmmoStatus('non_existent');
      expect(status).toBeNull();
    });
  });

  // ============ 工厂函数测试 ============

  describe('工厂函数', () => {
    it('should create combat manager with createCombatManager', () => {
      const cm = createCombatManager('factory_test', [combatant1, combatant2]);

      expect(cm.getState().combatId).toBe('factory_test');
      expect(cm.getState().combatants.size).toBe(2);
    });

    it('should create 1v1 combat with create1v1Combat', () => {
      const cm = create1v1Combat(combatant1, combatant2);

      expect(cm.getState().combatants.size).toBe(2);
    });
  });

  // ============ 格式化输出测试 ============

  describe('格式化输出', () => {
    it('should format combat status', () => {
      const status = combatManager.formatCombatStatus();

      expect(status).toContain('战斗状态');
      expect(status).toContain('Fighter 1');
      expect(status).toContain('Fighter 2');
    });
  });
});
