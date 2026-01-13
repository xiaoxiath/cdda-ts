/**
 * Equipment 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Equipment } from '../Equipment';
import { EquipmentSlotType, EquipmentLayer, EquipmentItem } from '../types';
import { EquipmentSlots } from '../EquipmentSlot';

describe('Equipment', () => {
  let equipment: Equipment;
  let testItem: EquipmentItem;

  beforeEach(() => {
    equipment = Equipment.create();

    // 创建测试装备
    testItem = {
      itemId: 'test_armor',
      itemName: '测试护甲',
      layer: EquipmentLayer.OUTER_LAYER,
      covers: [EquipmentSlotType.TORSO_OUTER],
      armor: {
        coverage: 80,
        thickness: 2,
        envProtection: 10,
        resistances: new Map([
          ['bash', 10],
          ['cut', 8],
        ]),
        rigid: true,
      },
      encumbrance: 5,
      warmth: 20,
      weight: 1000,
      maxCapacity: 0,
      occupiesSlots: [EquipmentSlotType.TORSO_OUTER],
    };
  });

  describe('create', () => {
    it('should create empty equipment', () => {
      expect(equipment.getTotalEquipmentCount()).toBe(0);
      expect(equipment.stats.totalWeight).toBe(0);
      expect(equipment.stats.totalWarmth).toBe(0);
    });

    it('should have all slots', () => {
      expect(equipment.slots.size).toBe(17);
    });
  });

  describe('equipment query', () => {
    it('should get equipped items for slot', () => {
      const items = equipment.getEquippedItems(EquipmentSlots.TORSO_OUTER.id);

      expect(items.isEmpty()).toBe(true);
    });

    it('should get equipped count', () => {
      expect(equipment.getEquippedCount(EquipmentSlots.TORSO_OUTER.id)).toBe(0);
    });

    it('should check if slot is full', () => {
      expect(equipment.isSlotFull(EquipmentSlots.TORSO_OUTER.id)).toBe(false);
    });

    it('should get all equipment', () => {
      const all = equipment.getAllEquipment();

      expect(all.isEmpty()).toBe(true);
    });

    it('should get total equipment count', () => {
      expect(equipment.getTotalEquipmentCount()).toBe(0);
    });
  });

  describe('equip', () => {
    it('should equip item to valid slot', () => {
      const equipped = equipment.equip(testItem);

      expect(equipped.getTotalEquipmentCount()).toBe(1);
      expect(equipped.getEquippedCount(EquipmentSlots.TORSO_OUTER.id)).toBe(1);
    });

    it('should update stats after equipping', () => {
      const equipped = equipment.equip(testItem);

      expect(equipped.stats.totalWarmth).toBe(20);
      expect(equipped.stats.totalWeight).toBe(1000);
      expect(equipped.stats.envProtection).toBe(10);
      expect(equipped.getEncumbranceForBodyPart(EquipmentSlotType.TORSO_OUTER)).toBe(5);
      expect(equipped.getArmorForBodyPart(EquipmentSlotType.TORSO_OUTER)).toBe(160); // 80 * 2
    });

    it('should throw if slot is full', () => {
      const once = equipment.equip(testItem);

      expect(() => {
        // Directly specify the slot to test "slot full" error
        once.equip(testItem, EquipmentSlots.TORSO_OUTER.id);
      }).toThrow('已满');
    });

    it('should throw if layer is invalid', () => {
      const invalidItem: EquipmentItem = {
        ...testItem,
        layer: EquipmentLayer.BASE_LAYER, // Wrong layer for TORSO_OUTER
      };

      expect(() => {
        equipment.equip(invalidItem, EquipmentSlots.TORSO_OUTER.id);
      }).toThrow('不适用于槽位');
    });

    it('should equip to specified slot', () => {
      const equipped = equipment.equip(testItem, EquipmentSlots.TORSO_OUTER.id);

      expect(equipped.getEquippedCount(EquipmentSlots.TORSO_OUTER.id)).toBe(1);
    });

    it('should find best slot automatically', () => {
      const autoEquipped = equipment.equip(testItem);

      expect(autoEquipped.getTotalEquipmentCount()).toBe(1);
    });
  });

  describe('unequip', () => {
    it('should unequip item', () => {
      const equipped = equipment.equip(testItem);
      expect(equipped.getTotalEquipmentCount()).toBe(1);

      const unequipped = equipped.unequip(
        testItem.itemId,
        EquipmentSlots.TORSO_OUTER.id
      );

      expect(unequipped.getTotalEquipmentCount()).toBe(0);
    });

    it('should throw if item not found', () => {
      expect(() => {
        equipment.unequip('nonexistent', EquipmentSlots.TORSO_OUTER.id);
      }).toThrow('未在槽位');
    });

    it('should update stats after unequipping', () => {
      const equipped = equipment.equip(testItem);
      expect(equipped.stats.totalWarmth).toBe(20);

      const unequipped = equipped.unequip(
        testItem.itemId,
        EquipmentSlots.TORSO_OUTER.id
      );

      expect(unequipped.stats.totalWarmth).toBe(0);
      expect(unequipped.stats.totalWeight).toBe(0);
    });

    it('should unequip all items', () => {
      let current = equipment;

      // Equip multiple items
      const item1: EquipmentItem = {
        ...testItem,
        itemId: 'item1',
        itemName: 'Item 1',
      };
      const item2: EquipmentItem = {
        ...testItem,
        itemId: 'item2',
        itemName: 'Item 2',
        occupiesSlots: [EquipmentSlotType.HEAD],
        covers: [EquipmentSlotType.HEAD],
      };

      current = current.equip(item1);
      current = current.equip(item2, EquipmentSlots.HEAD.id);

      expect(current.getTotalEquipmentCount()).toBe(2);

      const unequipped = current.unequipAll();

      expect(unequipped.getTotalEquipmentCount()).toBe(0);
      expect(unequipped.stats.totalWarmth).toBe(0);
    });

    it('should unequip by body part', () => {
      let current = equipment;

      const headItem: EquipmentItem = {
        ...testItem,
        itemId: 'helmet',
        itemName: '头盔',
        occupiesSlots: [EquipmentSlotType.HEAD],
        covers: [EquipmentSlotType.HEAD],
        warmth: 5,
      };

      const torsoItem: EquipmentItem = {
        ...testItem,
        itemId: 'armor',
        itemName: '护甲',
        warmth: 15,
      };

      current = current.equip(headItem, EquipmentSlots.HEAD.id);
      current = current.equip(torsoItem);

      expect(current.getTotalEquipmentCount()).toBe(2);
      expect(current.stats.totalWarmth).toBe(20); // 5 + 15

      const unequipped = current.unequipByBodyPart(EquipmentSlotType.HEAD);

      expect(unequipped.getTotalEquipmentCount()).toBe(1);
      expect(unequipped.stats.totalWarmth).toBe(15); // Only torso item remains
    });
  });

  describe('slot finding', () => {
    it('should find slot by type', () => {
      const slot = equipment.findSlotByType(EquipmentSlotType.HEAD);

      expect(slot).toBeDefined();
      expect(slot!.type).toBe(EquipmentSlotType.HEAD);
    });

    it('should return null for unknown slot type', () => {
      const slot = equipment.findSlotByType('UNKNOWN' as EquipmentSlotType);

      expect(slot).toBeNull();
    });

    it('should find best slot for item', () => {
      const slotId = equipment.findBestSlot(testItem);

      expect(slotId).toBeDefined();
      expect(slotId).toBe(EquipmentSlots.TORSO_OUTER.id);
    });
  });

  describe('stats calculation', () => {
    it('should calculate speed penalty', () => {
      const heavyItem: EquipmentItem = {
        ...testItem,
        encumbrance: 20, // High encumbrance
      };

      const equipped = equipment.equip(heavyItem);

      // 20 encumbrance / 10 = 2 speed penalty
      expect(equipped.stats.speedPenalty).toBe(2);
    });

    it('should calculate hit penalty', () => {
      const glovesItem: EquipmentItem = {
        ...testItem,
        itemId: 'gloves',
        itemName: '手套',
        occupiesSlots: [EquipmentSlotType.HANDS],
        covers: [EquipmentSlotType.HANDS],
        encumbrance: 15,
      };

      const equipped = equipment.equip(glovesItem, EquipmentSlots.HANDS.id);

      // 15 hand encumbrance / 5 = 3 hit penalty
      expect(equipped.stats.hitPenalty).toBe(3);
    });

    it('should accumulate capacity', () => {
      const bagItem: EquipmentItem = {
        ...testItem,
        itemId: 'backpack',
        itemName: '背包',
        occupiesSlots: [EquipmentSlotType.BACK],
        covers: [EquipmentSlotType.BACK],
        maxCapacity: 10000,
      };

      const equipped = equipment.equip(bagItem, EquipmentSlots.BACK.id);

      expect(equipped.stats.totalCapacity).toBe(10000);
    });

    it('should accumulate armor by body part', () => {
      const helmetItem: EquipmentItem = {
        ...testItem,
        itemId: 'helmet',
        itemName: '头盔',
        occupiesSlots: [EquipmentSlotType.HEAD],
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 60,
          thickness: 1,
          envProtection: 5,
          resistances: new Map(),
          rigid: true,
        },
      };

      const equipped = equipment.equip(helmetItem, EquipmentSlots.HEAD.id);

      // 60 * 1 = 60 armor for HEAD
      expect(equipped.getArmorForBodyPart(EquipmentSlotType.HEAD)).toBe(60);
    });
  });

  describe('display methods', () => {
    it('should show no equipment message when empty', () => {
      const list = equipment.getEquipmentListString();

      expect(list).toBe('未装备任何物品');
    });

    it('should get equipment list string', () => {
      const equipped = equipment.equip(testItem);
      const list = equipped.getEquipmentListString();

      expect(list).toContain('躯干外层');
      expect(list).toContain('测试护甲');
      expect(list).toContain('笨重: 5');
      expect(list).toContain('保暖: 20');
    });

    it('should get stats string', () => {
      const equipped = equipment.equip(testItem);
      const stats = equipped.getStatsString();

      expect(stats).toContain('=== 装备统计 ===');
      expect(stats).toContain('总保暖值: 20');
      expect(stats).toContain('总重量: 1000');
      expect(stats).toContain('=== 身体部位护甲 ===');
    });
  });

  describe('serialization', () => {
    it('should convert to state', () => {
      const equipped = equipment.equip(testItem);
      const state = equipped.toState();

      expect(state.equippedItems).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(state.equippedItems.get(EquipmentSlots.TORSO_OUTER.id)).toBeDefined();
      expect(state.equippedItems.get(EquipmentSlots.TORSO_OUTER.id)?.size).toBe(1);
    });

    it('should convert to JSON', () => {
      const equipped = equipment.equip(testItem);
      const json = equipped.toJson();

      expect(json.slots).toBeDefined();
      expect(json.equippedItems).toBeDefined();
      expect(json.stats).toBeDefined();
    });

    it('should create from state', () => {
      const equipped = equipment.equip(testItem);
      const state = equipped.toState();

      const restored = Equipment.fromState(state);

      expect(restored.getTotalEquipmentCount()).toBe(1);
      expect(restored.stats.totalWarmth).toBe(20);
    });

    it('should create from JSON', () => {
      const equipped = equipment.equip(testItem);
      const json = equipped.toJson();

      const restored = Equipment.fromJson(json);

      expect(restored.getTotalEquipmentCount()).toBe(1);
    });
  });
});
