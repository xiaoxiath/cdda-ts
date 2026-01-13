/**
 * SubBodyPart 系统测试
 *
 * 测试子身体部位（大臂、小臂、大腿、小腿）的装备功能
 * 验证装备可以正确映射到子身体部位
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import { Equipment } from '../Equipment';
import { EquipmentSlot, EquipmentSlots } from '../EquipmentSlot';
import {
  EquipmentSlotType,
  EquipmentLayer,
  type EquipmentItem,
} from '../types';
import { MaterialDefinitions } from '../Material';

describe('SubBodyPart 系统', () => {
  describe('装备槽类型', () => {
    it('应该包含所有子身体部位类型', () => {
      // 大臂
      expect(EquipmentSlotType.UPPER_ARM_L).toBeDefined();
      expect(EquipmentSlotType.UPPER_ARM_R).toBeDefined();
      // 小臂
      expect(EquipmentSlotType.LOWER_ARM_L).toBeDefined();
      expect(EquipmentSlotType.LOWER_ARM_R).toBeDefined();
      // 大腿
      expect(EquipmentSlotType.UPPER_LEG_L).toBeDefined();
      expect(EquipmentSlotType.UPPER_LEG_R).toBeDefined();
      // 小腿
      expect(EquipmentSlotType.LOWER_LEG_L).toBeDefined();
      expect(EquipmentSlotType.LOWER_LEG_R).toBeDefined();
    });

    it('子身体部位类型值应该正确', () => {
      expect(EquipmentSlotType.UPPER_ARM_L).toBe('UPPER_ARM_L');
      expect(EquipmentSlotType.UPPER_ARM_R).toBe('UPPER_ARM_R');
      expect(EquipmentSlotType.LOWER_ARM_L).toBe('LOWER_ARM_L');
      expect(EquipmentSlotType.LOWER_ARM_R).toBe('LOWER_ARM_R');
      expect(EquipmentSlotType.UPPER_LEG_L).toBe('UPPER_LEG_L');
      expect(EquipmentSlotType.UPPER_LEG_R).toBe('UPPER_LEG_R');
      expect(EquipmentSlotType.LOWER_LEG_L).toBe('LOWER_LEG_L');
      expect(EquipmentSlotType.LOWER_LEG_R).toBe('LOWER_LEG_R');
    });
  });

  describe('装备槽工厂方法', () => {
    it('应该创建左大臂槽位', () => {
      const slot = EquipmentSlot.upperArmLeft();

      expect(slot.type).toBe(EquipmentSlotType.UPPER_ARM_L);
      expect(slot.name).toBe('左大臂');
      expect(slot.validLayers.includes(EquipmentLayer.MID_LAYER)).toBe(true);
      expect(slot.validLayers.includes(EquipmentLayer.OUTER_LAYER)).toBe(true);
      expect(slot.capacity).toBe(1);
    });

    it('应该创建右大臂槽位', () => {
      const slot = EquipmentSlot.upperArmRight();

      expect(slot.type).toBe(EquipmentSlotType.UPPER_ARM_R);
      expect(slot.name).toBe('右大臂');
    });

    it('应该创建左小臂槽位', () => {
      const slot = EquipmentSlot.lowerArmLeft();

      expect(slot.type).toBe(EquipmentSlotType.LOWER_ARM_L);
      expect(slot.name).toBe('左小臂');
    });

    it('应该创建右小臂槽位', () => {
      const slot = EquipmentSlot.lowerArmRight();

      expect(slot.type).toBe(EquipmentSlotType.LOWER_ARM_R);
      expect(slot.name).toBe('右小臂');
    });

    it('应该创建左大腿槽位', () => {
      const slot = EquipmentSlot.upperLegLeft();

      expect(slot.type).toBe(EquipmentSlotType.UPPER_LEG_L);
      expect(slot.name).toBe('左大腿');
    });

    it('应该创建右大腿槽位', () => {
      const slot = EquipmentSlot.upperLegRight();

      expect(slot.type).toBe(EquipmentSlotType.UPPER_LEG_R);
      expect(slot.name).toBe('右大腿');
    });

    it('应该创建左小腿槽位', () => {
      const slot = EquipmentSlot.lowerLegLeft();

      expect(slot.type).toBe(EquipmentSlotType.LOWER_LEG_L);
      expect(slot.name).toBe('左小腿');
    });

    it('应该创建右小腿槽位', () => {
      const slot = EquipmentSlot.lowerLegRight();

      expect(slot.type).toBe(EquipmentSlotType.LOWER_LEG_R);
      expect(slot.name).toBe('右小腿');
    });
  });

  describe('装备到子身体部位', () => {
    /**
     * 创建护臂装备
     */
    function createArmGuard(
      id: string,
      name: string,
      slotType: EquipmentSlotType,
      armor: number = 10
    ): EquipmentItem {
      return {
        itemId: id,
        itemName: name,
        layer: EquipmentLayer.MID_LAYER,
        covers: [slotType],
        armor: {
          coverage: 80,
          thickness: armor / 10,
          envProtection: 0,
          resistances: Map([
            ['BASH', armor * 0.8],
            ['CUT', armor * 0.9],
            ['STAB', armor * 0.7],
          ]),
          rigid: true,
        },
        encumbrance: Math.floor(armor / 5),
        warmth: 5,
        weight: MaterialDefinitions.STEEL.calculateWeight(200),
        occupiesSlots: [slotType],
      };
    }

    it('应该装备到左大臂', () => {
      let equipment = Equipment.create();
      const leftArmGuard = createArmGuard(
        'left_upper_arm_guard',
        '左大臂护甲',
        EquipmentSlotType.UPPER_ARM_L
      );

      equipment = equipment.equip(leftArmGuard);

      const items = equipment.getEquippedItems(EquipmentSlots.UPPER_ARM_L.id);
      expect(items.size).toBe(1);
      expect(items.get(0)?.itemId).toBe('left_upper_arm_guard');
    });

    it('应该装备到右小臂', () => {
      let equipment = Equipment.create();
      const rightForearmGuard = createArmGuard(
        'right_lower_arm_guard',
        '右小臂护甲',
        EquipmentSlotType.LOWER_ARM_R
      );

      equipment = equipment.equip(rightForearmGuard);

      const items = equipment.getEquippedItems(EquipmentSlots.LOWER_ARM_R.id);
      expect(items.size).toBe(1);
      expect(items.get(0)?.itemName).toBe('右小臂护甲');
    });

    it('应该装备到左大腿', () => {
      let equipment = Equipment.create();
      const leftThighGuard = createArmGuard(
        'left_upper_leg_guard',
        '左大腿护甲',
        EquipmentSlotType.UPPER_LEG_L
      );

      equipment = equipment.equip(leftThighGuard);

      const items = equipment.getEquippedItems(EquipmentSlots.UPPER_LEG_L.id);
      expect(items.size).toBe(1);
    });

    it('应该装备到右小腿', () => {
      let equipment = Equipment.create();
      const rightShinGuard = createArmGuard(
        'right_lower_leg_guard',
        '右小腿护甲',
        EquipmentSlotType.LOWER_LEG_R
      );

      equipment = equipment.equip(rightShinGuard);

      const items = equipment.getEquippedItems(EquipmentSlots.LOWER_LEG_R.id);
      expect(items.size).toBe(1);
    });

    it('应该同时装备多个子身体部位', () => {
      let equipment = Equipment.create();

      const guards = [
        createArmGuard('guard1', '左大臂护甲', EquipmentSlotType.UPPER_ARM_L),
        createArmGuard('guard2', '右大臂护甲', EquipmentSlotType.UPPER_ARM_R),
        createArmGuard('guard3', '左小臂护甲', EquipmentSlotType.LOWER_ARM_L),
        createArmGuard('guard4', '右小臂护甲', EquipmentSlotType.LOWER_ARM_R),
      ];

      for (const guard of guards) {
        equipment = equipment.equip(guard);
      }

      expect(equipment.getTotalEquipmentCount()).toBe(4);
    });

    it('笨重值应该正确计算到子身体部位', () => {
      let equipment = Equipment.create();
      const armGuard = createArmGuard(
        'heavy_arm_guard',
        '重型护臂',
        EquipmentSlotType.UPPER_ARM_L,
        20 // 高护甲值 = 高笨重值
      );

      equipment = equipment.equip(armGuard);

      // 笨重值应该被计算到对应的子身体部位
      const encumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.UPPER_ARM_L);
      expect(encumbrance).toBeGreaterThan(0);
    });
  });

  describe('不对称装备支持', () => {
    /**
     * 创建不对称的左右手套
     */
    function createAsymmetricGloves(
      leftId: string,
      rightId: string,
      baseEncumbrance: number = 5
    ): [EquipmentItem, EquipmentItem] {
      const leftGlove: EquipmentItem = {
        itemId: leftId,
        itemName: '左手套',
        layer: EquipmentLayer.MID_LAYER,
        covers: [EquipmentSlotType.HAND_L],
        armor: {
          coverage: 90,
          thickness: 1,
          envProtection: 0,
          resistances: Map([
            ['COLD', 2],
          ]),
          rigid: false,
        },
        encumbrance: baseEncumbrance,
        warmth: 10,
        weight: 50,
        occupiesSlots: [EquipmentSlotType.HAND_L],
      };

      const rightGlove: EquipmentItem = {
        itemId: rightId,
        itemName: '右手套',
        layer: EquipmentLayer.MID_LAYER,
        covers: [EquipmentSlotType.HAND_R],
        armor: {
          coverage: 90,
          thickness: 1,
          envProtection: 0,
          resistances: Map([
            ['COLD', 2],
          ]),
          rigid: false,
        },
        encumbrance: baseEncumbrance,
        warmth: 10,
        weight: 50,
        occupiesSlots: [EquipmentSlotType.HAND_R],
      };

      return [leftGlove, rightGlove];
    }

    it('应该分别装备左右手套', () => {
      let equipment = Equipment.create();
      const [leftGlove, rightGlove] = createAsymmetricGloves('glove_l', 'glove_r');

      equipment = equipment.equip(leftGlove);
      equipment = equipment.equip(rightGlove);

      const leftItems = equipment.getEquippedItems(EquipmentSlots.HAND_L.id);
      const rightItems = equipment.getEquippedItems(EquipmentSlots.HAND_R.id);

      expect(leftItems.size).toBe(1);
      expect(rightItems.size).toBe(1);
      expect(leftItems.get(0)?.itemName).toBe('左手套');
      expect(rightItems.get(0)?.itemName).toBe('右手套');
    });

    it('应该只装备左手套', () => {
      let equipment = Equipment.create();
      const [leftGlove] = createAsymmetricGloves('glove_l', 'glove_r');

      equipment = equipment.equip(leftGlove);

      const leftItems = equipment.getEquippedItems(EquipmentSlots.HAND_L.id);
      const rightItems = equipment.getEquippedItems(EquipmentSlots.HAND_R.id);

      expect(leftItems.size).toBe(1);
      expect(rightItems.size).toBe(0);
    });

    it('应该支持不同属性的左右手套', () => {
      let equipment = Equipment.create();

      const leftGlove: EquipmentItem = {
        itemId: 'heavy_glove_l',
        itemName: '重型左手套',
        layer: EquipmentLayer.MID_LAYER,
        covers: [EquipmentSlotType.HAND_L],
        armor: {
          coverage: 95,
          thickness: 3,
          envProtection: 0,
          resistances: Map([
            ['BASH', 5],
            ['CUT', 8],
          ]),
          rigid: true,
        },
        encumbrance: 10,
        warmth: 5,
        weight: 300,
        occupiesSlots: [EquipmentSlotType.HAND_L],
      };

      const rightGlove: EquipmentItem = {
        itemId: 'light_glove_r',
        itemName: '轻型右手套',
        layer: EquipmentLayer.MID_LAYER,
        covers: [EquipmentSlotType.HAND_R],
        armor: {
          coverage: 80,
          thickness: 1,
          envProtection: 0,
          resistances: Map([
            ['COLD', 3],
          ]),
          rigid: false,
        },
        encumbrance: 2,
        warmth: 15,
        weight: 50,
        occupiesSlots: [EquipmentSlotType.HAND_R],
      };

      equipment = equipment.equip(leftGlove);
      equipment = equipment.equip(rightGlove);

      // 左手笨重值应该更高
      const leftEncumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.HAND_L);
      const rightEncumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.HAND_R);

      expect(leftEncumbrance).toBeGreaterThan(rightEncumbrance);
    });
  });

  describe('子身体部位与主身体部位共存', () => {
    it('应该同时装备手臂护甲和护臂', () => {
      let equipment = Equipment.create();

      // 手臂护甲（主身体部位）
      const armArmor: EquipmentItem = {
        itemId: 'arm_armor',
        itemName: '手臂护甲',
        layer: EquipmentLayer.OUTER_LAYER,
        covers: [EquipmentSlotType.HAND_L],
        armor: {
          coverage: 70,
          thickness: 2,
          envProtection: 0,
          resistances: Map([
            ['BASH', 10],
            ['CUT', 12],
          ]),
          rigid: true,
        },
        encumbrance: 5,
        warmth: 5,
        weight: 500,
        occupiesSlots: [EquipmentSlotType.HAND_L],
      };

      // 护臂（子身体部位 - 左小臂）
      const forearmGuard: EquipmentItem = {
        itemId: 'forearm_guard',
        itemName: '小臂护甲',
        layer: EquipmentLayer.MID_LAYER,
        covers: [EquipmentSlotType.LOWER_ARM_L],
        armor: {
          coverage: 85,
          thickness: 1.5,
          envProtection: 0,
          resistances: Map([
            ['CUT', 8],
          ]),
          rigid: true,
        },
        encumbrance: 3,
        warmth: 3,
        weight: 200,
        occupiesSlots: [EquipmentSlotType.LOWER_ARM_L],
      };

      equipment = equipment.equip(armArmor);
      equipment = equipment.equip(forearmGuard);

      // 两个装备应该共存
      expect(equipment.getTotalEquipmentCount()).toBe(2);

      // 笨重值应该分别计算
      const handEncumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.HAND_L);
      const forearmEncumbrance = equipment.getEncumbranceForBodyPart(EquipmentSlotType.LOWER_ARM_L);

      expect(handEncumbrance).toBeGreaterThan(0);
      expect(forearmEncumbrance).toBeGreaterThan(0);
    });
  });
});
