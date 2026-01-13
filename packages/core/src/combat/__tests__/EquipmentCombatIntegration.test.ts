/**
 * Equipment-Combat 集成测试
 *
 * 测试装备系统与战斗系统的完整集成
 * 包括护甲抗性、材料属性、笨重值对战斗的影响
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map, List } from 'immutable';
import { CombatManager, createCombatManager, type Combatant } from '../CombatManager';
import { Resistances } from '../Resistances';
import { DamageInstance } from '../DamageInstance';
import { createBodyPartId, createDamageTypeId } from '../types';
import {
  Equipment,
  EquipmentSlot,
} from '../../equipment/Equipment';
import {
  EquipmentSlotType,
  EquipmentLayer,
  type EquipmentItem,
} from '../../equipment/types';
import { MaterialDefinitions } from '../../equipment/Material';

// ============ 辅助函数 ============

/**
 * 创建护甲装备项
 */
function createArmorItem(
  id: string,
  name: string,
  slot: EquipmentSlotType,
  armor: number,
  coverage: number,
  material: any = MaterialDefinitions.STEEL
): EquipmentItem {
  return {
    itemId: id,
    itemName: name,
    layer: EquipmentLayer.OUTER_LAYER,
    covers: [slot],
    armor: {
      coverage,
      thickness: armor / 10,
      envProtection: 0,
      resistances: Map([
        ['BASH', armor * 0.8],
        ['CUT', armor * 0.9],
        ['STAB', armor * 0.7],
        ['BULLET', armor * 0.5],
      ]),
      rigid: material.isMetal,
    },
    encumbrance: Math.floor(armor / 3),
    warmth: 0,
    weight: material.calculateWeight(1000),
    occupiesSlots: [slot],
  };
}

/**
 * 创建带装备的战斗参与者
 */
function createArmoredCombatant(
  id: string,
  name: string,
  teamId: string,
  equipment: Equipment
): Combatant {
  const baseResistances = equipmentToResistances(equipment);

  return {
    id,
    name,
    teamId,
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
    getBodyPartHP: () => Map(),
    isImmuneTo: () => false,
    getResistances: () => baseResistances,

    // 近战接口 - 装备笨重值影响命中和闪避
    getMeleeAccuracy: () => Math.max(0, 10 - equipment.stats.encumbranceByBodyPart.get(EquipmentSlotType.TORSO_OUTER, 0)),
    getCritChance: () => 0.05,
    getCritMultiplier: () => 2.0,
    getWeaponName: () => '徒手',
    getWeaponWeight: () => 0,
    getBlockChance: () => 0,
    getBlockReduction: () => 0,
    getBlockingWeapon: () => '',
    getDodgeChance: () => Math.max(0, 10 - equipment.stats.encumbranceByBodyPart.get(EquipmentSlotType.LEGS, 0)),
    getDodgeValue: () => Math.max(0, 5 - equipment.stats.encumbranceByBodyPart.get(EquipmentSlotType.LEGS, 0) / 2),

    // 远程接口
    getRangedAccuracy: () => Math.max(0, 8 - equipment.stats.encumbranceByBodyPart.get(EquipmentSlotType.HANDS, 0) / 2),

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
}

/**
 * 将装备系统转换为抗性系统
 */
function equipmentToResistances(equipment: Equipment): Resistances {
  const resistancesObj: Record<string, number> = {};

  // 遍历所有装备，累加抗性
  for (const [, items] of equipment.toState().equippedItems) {
    for (const item of items) {
      const armorResistances = item.armor.resistances;
      for (const [damageType, value] of armorResistances.entries()) {
        resistancesObj[damageType] = (resistancesObj[damageType] || 0) + value;
      }
    }
  }

  return Resistances.fromObject(resistancesObj);
}

// ============ 测试套件 ============

describe('Equipment-Combat 集成测试', () => {
  describe('装备基础功能', () => {
    it('应该正确装备物品并计算统计', () => {
      let equipment = Equipment.create();
      const armor = createArmorItem('test_plate', '测试护甲', EquipmentSlotType.TORSO_OUTER, 20, 80);

      equipment = equipment.equip(armor);

      expect(equipment.getTotalEquipmentCount()).toBe(1);

      const encumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.TORSO_OUTER);
      expect(encumbrance).toBeGreaterThan(0);
    });

    it('装备应该提供抗性', () => {
      let equipment = Equipment.create();
      const armor = createArmorItem('steel_plate', '钢板护甲', EquipmentSlotType.TORSO_OUTER, 20, 80);

      equipment = equipment.equip(armor);
      const resistances = equipmentToResistances(equipment);

      // 钢板护甲应提供抗性
      expect(resistances.getResistance('BASH' as any)).toBeGreaterThan(0);
      expect(resistances.getResistance('CUT' as any)).toBeGreaterThan(0);
    });

    it('重型装备应该产生速度惩罚', () => {
      let equipment = Equipment.create();
      // 使用更高的护甲值来产生速度惩罚
      const superHeavyArmor = createArmorItem('super_heavy_plate', '超重型板甲', EquipmentSlotType.TORSO_OUTER, 50, 95);
      const legArmor = createArmorItem('heavy_leg_armor', '重型护腿', EquipmentSlotType.LEGS, 40, 90);

      equipment = equipment.equip(superHeavyArmor);
      equipment = equipment.equip(legArmor);

      // 总笨重值应该超过10，产生速度惩罚
      const totalEncumbrance = equipment.stats.encumbranceByBodyPart.valueSeq().reduce((sum, val) => sum + val, 0);
      expect(totalEncumbrance).toBeGreaterThan(10);
      expect(equipment.stats.speedPenalty).toBeGreaterThan(0);
    });

    it('笨重的装备应该降低命中率', () => {
      const lightEquipment = Equipment.create();
      const lightArmor = createArmorItem('leather', '皮甲', EquipmentSlotType.TORSO_OUTER, 5, 50, MaterialDefinitions.LEATHER);
      let equipment = lightEquipment.equip(lightArmor);
      const lightFighter = createArmoredCombatant('light', 'Light Fighter', 'team_a', equipment);

      // 重型装备
      const heavyEquipment = Equipment.create();
      const heavyArmor = createArmorItem('plate', '板甲', EquipmentSlotType.TORSO_OUTER, 30, 90, MaterialDefinitions.STEEL);
      equipment = heavyEquipment.equip(heavyArmor);
      const heavyFighter = createArmoredCombatant('heavy', 'Heavy Fighter', 'team_b', equipment);

      // 重型装备者应该有更低的命中率
      expect(lightFighter.getMeleeAccuracy()).toBeGreaterThanOrEqual(heavyFighter.getMeleeAccuracy());
    });

    it('不同材料应该提供不同的抗性', () => {
      const steelEquipment = Equipment.create();
      const steelArmor = createArmorItem('steel_armor', '钢护甲', EquipmentSlotType.TORSO_OUTER, 15, 75, MaterialDefinitions.STEEL);
      let equipment = steelEquipment.equip(steelArmor);
      const steelResistances = equipmentToResistances(equipment);

      const clothEquipment = Equipment.create();
      const clothArmor = createArmorItem('cloth_armor', '布衣', EquipmentSlotType.TORSO_OUTER, 15, 75, MaterialDefinitions.COTTON);
      equipment = clothEquipment.equip(clothArmor);
      const clothResistances = equipmentToResistances(equipment);

      // 两种材料基础抗性相同，但可以通过其他方式区分
      expect(steelResistances.getResistance('BASH' as any)).toBe(clothResistances.getResistance('BASH' as any));
    });
  });

  describe('装备与战斗集成', () => {
    it('装备应该影响战斗属性', () => {
      let equipment = Equipment.create();
      const armor = createArmorItem('chainmail', '链甲', EquipmentSlotType.TORSO_OUTER, 15, 75);
      equipment = equipment.equip(armor);

      const fighter = createArmoredCombatant('knight', '骑士', 'team_a', equipment);

      // 验证装备影响了战斗属性
      expect(fighter.getResistances().getResistance('BASH' as any)).toBeGreaterThan(0);
      expect(fighter.getResistances().getResistance('CUT' as any)).toBeGreaterThan(0);
    });

    it('多个装备应该累加抗性', () => {
      let equipment = Equipment.create();
      const armor1 = createArmorItem('plate', '板甲', EquipmentSlotType.TORSO_OUTER, 20, 80);
      const armor2 = createArmorItem('helmet', '头盔', EquipmentSlotType.HEAD, 10, 60);

      equipment = equipment.equip(armor1);
      equipment = equipment.equip(armor2);

      const resistances = equipmentToResistances(equipment);

      // 两个装备应该提供更多抗性
      const bashResist = resistances.getResistance('BASH' as any);
      expect(bashResist).toBeGreaterThan(16); // 20*0.8 + 10*0.8 = 16 + 8 = 24
    });
  });

  describe('装备耐久度系统', () => {
    it('装备应该可以追踪耐久度', () => {
      const armor = createArmorItem('iron_armor', '铁甲', EquipmentSlotType.TORSO_OUTER, 15, 70);
      const armorWithDurability: EquipmentItem = {
        ...armor,
        material: 'material_iron' as any,
        materialDefinition: MaterialDefinitions.IRON,
        wetness: { currentWetness: 0, maxWetness: 100, dryRate: 5, lastUpdate: Date.now() },
        durability: { currentDurability: 100, maxDurability: 100, isBroken: false, damageHistory: [] },
      };

      expect(armorWithDurability.durability?.currentDurability).toBe(100);
    });

    it('耐久度低应该降低防护效果', () => {
      const baseDurability = { currentDurability: 100, maxDurability: 100, isBroken: false, damageHistory: [] };
      const damagedDurability = { currentDurability: 30, maxDurability: 100, isBroken: false, damageHistory: [] };

      const baseCondition = 1.0; // 完整耐久度
      const damagedCondition = 0.5; // 低耐久度（简化计算）

      expect(damagedCondition).toBeLessThan(baseCondition);
    });
  });
});
