/**
 * Item 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemCategory } from '../types';
import { ItemContents } from '../ItemContents';
import {
  createItemTypeId,
  createMaterialId,
  createItemFlagSet,
} from '../types';

describe('Item', () => {
  let itemType: ItemType;

  beforeEach(() => {
    itemType = ItemType.create({
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
  });

  describe('create', () => {
    it('should create a basic Item', () => {
      const item = Item.create(itemType);

      expect(item.id).toBe(createItemTypeId('test_item'));
      expect(item.name).toBe('Test Item');
      expect(item.charges).toBe(0);
      expect(item.damage).toBe(0);
      expect(item.active).toBe(false);
      expect(item.isEmpty()).toBe(true);
    });

    it('should create an Item with charges', () => {
      const item = Item.createWithCharges(itemType, 50);

      expect(item.charges).toBe(50);
      expect(item.isEmpty()).toBe(false); // 有电荷视为非空
    });

    it('should create a damaged Item', () => {
      const item = Item.createDamaged(itemType, 100);

      expect(item.damage).toBe(100);
      expect(item.isDamaged()).toBe(true);
    });
  });

  describe('state changes', () => {
    it('should consume one charge', () => {
      const item = Item.createWithCharges(itemType, 10);
      const consumed = item.consumeOne();

      expect(consumed.charges).toBe(9);
    });

    it('should add damage', () => {
      const item = Item.create(itemType);
      const damaged = item.addDamage(50);

      expect(damaged.damage).toBe(50);
    });

    it('should repair damage', () => {
      const item = Item.createDamaged(itemType, 100);
      const repaired = item.repair(30);

      expect(repaired.damage).toBe(70);
    });

    it('should toggle active state', () => {
      const item = Item.create(itemType);
      const activated = item.toggleActive();

      expect(activated.active).toBe(true);

      const deactivated = activated.toggleActive();
      expect(deactivated.active).toBe(false);
    });

    it('should set temperature', () => {
      const item = Item.create(itemType);
      const heated = item.setTemperature(50);

      expect(heated.temperature).toBe(50);
    });
  });

  describe('item variables', () => {
    it('should set and get item vars', () => {
      const item = Item.create(itemType);
      const modified = item.setItemVar('test_key', 'test_value');

      expect(modified.getItemVar('test_key')).toBe('test_value');
      expect(modified.hasItemVar('test_key')).toBe(true);
      expect(modified.hasItemVar('nonexistent')).toBe(false);
    });
  });

  describe('weight and volume', () => {
    it('should calculate total weight with contents', () => {
      const item = Item.create(itemType);
      const item2 = Item.create(itemType);

      const withContents = item.addItem(item2);
      expect(withContents.getWeight()).toBe(item.type.weight * 2);
    });

    it('should reduce weight when damaged', () => {
      const item = Item.createDamaged(itemType, 500);
      const weight = item.getWeight();

      expect(weight).toBeLessThan(item.type.weight);
    });
  });

  describe('display', () => {
    it('should return correct display name', () => {
      const item = Item.create(itemType);
      expect(item.getDisplayName()).toBe('Test Item');

      const damaged = item.addDamage(50);
      expect(damaged.getDisplayName()).toBe('damaged Test Item');

      const withCharges = Item.createWithCharges(itemType, 10);
      expect(withCharges.getDisplayName()).toBe('Test Item (10)');
    });

    it('should return info string', () => {
      const item = Item.create(itemType);
      const info = item.getInfo();

      expect(info).toContain('Type: MISCELLANEOUS');
      expect(info).toContain('Weight: 100');
      expect(info).toContain('Volume: 250');
    });
  });

  describe('conversion', () => {
    it('should convert to another type', () => {
      const newType = ItemType.create({
        id: createItemTypeId('new_type'),
        name: 'New Type',
        weight: 200,
        volume: 500,
        category: ItemCategory.MISCELLANEOUS,
        material: [createMaterialId('steel')],
        flags: createItemFlagSet(),
        qualities: new Map(),
      });

      const item = Item.create(itemType);
      const converted = item.convertTo(newType);

      expect(converted.id).toBe(createItemTypeId('new_type'));
      expect(converted.name).toBe('New Type');
    });
  });

  describe('contents', () => {
    it('should add items to contents', () => {
      const item = Item.create(itemType);
      const item2 = Item.create(itemType);

      const withContents = item.addItem(item2);

      expect(withContents.contents.isEmpty()).toBe(false);
      expect(withContents.contents.getItemCount()).toBe(1);
    });

    it('should remove items from contents', () => {
      const item = Item.create(itemType);
      const item2 = Item.create(itemType);

      const withContents = item.addItem(item2);
      const withoutContents = withContents.removeItem(item2);

      expect(withoutContents.contents.isEmpty()).toBe(true);
    });

    it('should clear all contents', () => {
      const item = Item.create(itemType);
      const item2 = Item.create(itemType);

      const withContents = item.addItem(item2);
      const cleared = withContents.clearContents();

      expect(cleared.contents.isEmpty()).toBe(true);
    });
  });
});
