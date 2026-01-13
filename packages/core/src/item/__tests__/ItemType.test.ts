/**
 * ItemType 单元测试
 */

import { describe, it, expect } from 'vitest';
import { ItemType } from '../ItemType';
import { ItemCategory } from '../types';
import {
  createItemTypeId,
  createMaterialId,
  createSkillId,
  createItemFlagSet,
} from '../types';

describe('ItemType', () => {
  describe('create', () => {
    it('should create a basic ItemType', () => {
      const type = ItemType.create({
        id: createItemTypeId('test_item'),
        name: 'Test Item',
        description: 'A test item',
        weight: 100,
        volume: 250,
        category: ItemCategory.MISCELLANEOUS,
        material: [createMaterialId('steel')],
        flags: createItemFlagSet(),
        qualities: new Map(),
      });

      expect(type.id).toBe(createItemTypeId('test_item'));
      expect(type.name).toBe('Test Item');
      expect(type.description).toBe('A test item');
      expect(type.weight).toBe(100);
      expect(type.volume).toBe(250);
      expect(type.category).toBe(ItemCategory.MISCELLANEOUS);
      expect(type.material).toHaveLength(1);
    });

    it('should create an ItemType with tool slot', () => {
      const type = ItemType.create({
        id: createItemTypeId('hammer'),
        name: 'Hammer',
        weight: 500,
        volume: 500,
        category: ItemCategory.TOOL,
        material: [createMaterialId('steel')],
        flags: createItemFlagSet(),
        qualities: new Map(),
        tool: {
          maximumCharges: 100,
        },
      });

      expect(type.isTool()).toBe(true);
      expect(type.tool?.maximumCharges).toBe(100);
    });

    it('should create an ItemType with gun slot', () => {
      const type = ItemType.create({
        id: createItemTypeId('pistol'),
        name: '9mm Pistol',
        weight: 500,
        volume: 750,
        category: ItemCategory.GUN,
        material: [createMaterialId('steel')],
        flags: createItemFlagSet(),
        qualities: new Map(),
        gun: {
          skill: createSkillId('pistol'),
          ammo: ['9mm'] as any[],
          range: 8,
          dispersion: 120,
        },
      });

      expect(type.isGun()).toBe(true);
      expect(type.gun?.skill).toBe(createSkillId('pistol'));
      expect(type.gun?.range).toBe(8);
    });

    it('should create an ItemType with armor slot', () => {
      const type = ItemType.create({
        id: createItemTypeId('vest'),
        name: 'Bulletproof Vest',
        weight: 2000,
        volume: 1500,
        category: ItemCategory.ARMOR,
        material: [createMaterialId('kevlar')],
        flags: createItemFlagSet(),
        qualities: new Map(),
        armor: {
          coverage: 80,
          encumbrance: 10,
        },
      });

      expect(type.isArmor()).toBe(true);
      expect(type.armor?.coverage).toBe(80);
      expect(type.armor?.encumbrance).toBe(10);
    });
  });

  describe('copyFrom', () => {
    it('should copy attributes from another ItemType', () => {
      const original = ItemType.create({
        id: createItemTypeId('apple'),
        name: 'Apple',
        weight: 100,
        volume: 250,
        category: ItemCategory.FOOD,
        material: [createMaterialId('flesh')],
        flags: createItemFlagSet(),
        qualities: new Map(),
      });

      const copy = ItemType.copyFrom(original, {
        name: 'Red Apple',
      });

      expect(copy.id).toBe(original.id);
      expect(copy.name).toBe('Red Apple');
      expect(copy.weight).toBe(original.weight);
    });
  });

  describe('flag checks', () => {
    it('should check for flags correctly', () => {
      const type = ItemType.create({
        id: createItemTypeId('test'),
        name: 'Test',
        weight: 100,
        volume: 250,
        category: ItemCategory.MISCELLANEOUS,
        material: [],
        flags: createItemFlagSet('EDIBLE' as any, 'PERISHABLE' as any),
        qualities: new Map(),
      });

      expect(type.hasFlag('EDIBLE' as any)).toBe(true);
      expect(type.hasFlag('FLAMMABLE' as any)).toBe(false);
      expect(type.hasAnyFlag('EDIBLE' as any, 'FLAMMABLE' as any)).toBe(true);
      expect(type.hasAllFlags('EDIBLE' as any, 'PERISHABLE' as any)).toBe(true);
      expect(type.hasAllFlags('EDIBLE' as any, 'FLAMMABLE' as any)).toBe(false);
    });
  });

  describe('quality checks', () => {
    it('should get quality levels correctly', () => {
      const type = ItemType.create({
        id: createItemTypeId('test'),
        name: 'Test',
        weight: 100,
        volume: 250,
        category: ItemCategory.TOOL,
        material: [],
        flags: createItemFlagSet(),
        qualities: new Map([
          ['HAMMER' as any, 2],
          ['SAW' as any, 1],
        ]),
      });

      expect(type.getQualityLevel('HAMMER' as any)).toBe(2);
      expect(type.getQualityLevel('SAW' as any)).toBe(1);
      expect(type.getQualityLevel('CUT' as any)).toBe(0);
      expect(type.hasQuality('HAMMER' as any)).toBe(true);
      expect(type.hasQuality('CUT' as any)).toBe(false);
    });
  });

  describe('type checks', () => {
    it('should identify item types correctly', () => {
      const tool = ItemType.create({
        id: createItemTypeId('hammer'),
        name: 'Hammer',
        weight: 500,
        volume: 500,
        category: ItemCategory.TOOL,
        material: [createMaterialId('steel')],
        flags: createItemFlagSet(),
        qualities: new Map(),
        tool: {}, // 添加 tool 插槽使其成为工具
      });

      expect(tool.isTool()).toBe(true);
      expect(tool.isGun()).toBe(false);
      expect(tool.isArmor()).toBe(false);
    });
  });
});
