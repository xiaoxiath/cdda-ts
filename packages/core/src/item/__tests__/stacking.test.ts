/**
 * stacking 测试
 *
 * 测试物品堆叠系统的各种功能
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemContents } from '../ItemContents';
import {
  canStackWith,
  isStackable,
  getMaxStackSize,
  getCurrentStackSize,
  calculateMergeAmount,
  mergeStacks,
  splitStack,
  takeFromStack,
  isStackFull,
  isStackEmpty,
  getStackSpace,
  isSingleItem,
  addToStack,
  removeFromStack,
  setStackCount,
  groupStackableItems,
  consolidateStacks,
  type StackMergeResult,
  type StackSplitResult,
} from '../stacking';
import { createItemTypeId } from '../types';

// Helper function to create a test item
function createTestItem(props: {
  id: string;
  name?: string;
  stackable?: boolean;
  stackSize?: number;
  charges?: number;
  damage?: number;
  temperature?: number;
  tempSpecific?: boolean;
  itemVars?: Map<string, any>;
}): Item {
  const itemType = new ItemType({
    id: createItemTypeId(props.id),
    name: props.name || props.id,
    description: 'Test item',
    stackable: props.stackable ?? true,
    stackSize: props.stackSize ?? 10,
    category: 'misc' as any,
    weight: 1 as any,
    volume: 1 as any,
    material: ['flesh' as any],
    symbol: '?',
    color: 'white',
  });

  return new Item({
    type: itemType,
    charges: props.charges ?? 1,
    damage: props.damage ?? 0,
    itemVars: props.itemVars ?? Map(),
    contents: new ItemContents(),
    temperature: props.temperature ?? 20,
    tempSpecific: props.tempSpecific ?? false,
  });
}

describe('stacking - 堆叠兼容性检查', () => {
  describe('canStackWith', () => {
    it('should return true for identical stackable items', () => {
      const item1 = createTestItem({ id: 'stone', stackable: true, charges: 5 });
      const item2 = createTestItem({ id: 'stone', stackable: true, charges: 3 });

      expect(canStackWith(item1, item2)).toBe(true);
    });

    it('should return false for different item types', () => {
      const item1 = createTestItem({ id: 'stone' });
      const item2 = createTestItem({ id: 'wood' });

      expect(canStackWith(item1, item2)).toBe(false);
    });

    it('should return false if either item is not stackable', () => {
      const item1 = createTestItem({ id: 'sword', stackable: false });
      const item2 = createTestItem({ id: 'sword', stackable: false });

      expect(canStackWith(item1, item2)).toBe(false);
    });

    it('should return false if items have different damage', () => {
      const item1 = createTestItem({ id: 'stone', damage: 0 });
      const item2 = createTestItem({ id: 'stone', damage: 100 });

      expect(canStackWith(item1, item2)).toBe(false);
    });

    it('should return false if items have different specific temperatures', () => {
      const item1 = createTestItem({ id: 'soup', temperature: 50, tempSpecific: true });
      const item2 = createTestItem({ id: 'soup', temperature: 60, tempSpecific: true });

      expect(canStackWith(item1, item2)).toBe(false);
    });

    it('should return true if items have different temperatures but not tempSpecific', () => {
      const item1 = createTestItem({ id: 'stone', temperature: 20, tempSpecific: false });
      const item2 = createTestItem({ id: 'stone', temperature: 30, tempSpecific: false });

      expect(canStackWith(item1, item2)).toBe(true);
    });

    it('should return false if item vars differ', () => {
      const item1 = createTestItem({
        id: 'custom',
        itemVars: Map({ custom_prop: 'value1' }),
      });
      const item2 = createTestItem({
        id: 'custom',
        itemVars: Map({ custom_prop: 'value2' }),
      });

      expect(canStackWith(item1, item2)).toBe(false);
    });

    it('should return true if item vars are the same', () => {
      const item1 = createTestItem({
        id: 'custom',
        itemVars: Map({ custom_prop: 'same_value' }),
      });
      const item2 = createTestItem({
        id: 'custom',
        itemVars: Map({ custom_prop: 'same_value' }),
      });

      expect(canStackWith(item1, item2)).toBe(true);
    });
  });

  describe('isStackable', () => {
    it('should return true for stackable items', () => {
      const item = createTestItem({ id: 'stone', stackable: true });
      expect(isStackable(item)).toBe(true);
    });

    it('should return false for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      expect(isStackable(item)).toBe(false);
    });
  });

  describe('getMaxStackSize', () => {
    it('should return the stack size from item type', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 20 });
      expect(getMaxStackSize(item)).toBe(20);
    });

    it('should return 1 for items without stack size', () => {
      const item = createTestItem({ id: 'sword', stackable: false, stackSize: 0 });
      expect(getMaxStackSize(item)).toBe(1);
    });
  });

  describe('getCurrentStackSize', () => {
    it('should return the charges for stackable items', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 7 });
      expect(getCurrentStackSize(item)).toBe(7);
    });

    it('should return 1 for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false, charges: 0 });
      expect(getCurrentStackSize(item)).toBe(1);
    });

    it('should return at least 1 even with zero charges', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 0 });
      expect(getCurrentStackSize(item)).toBe(1);
    });
  });
});

describe('stacking - 堆叠操作', () => {
  describe('calculateMergeAmount', () => {
    it('should calculate how many items can be merged', () => {
      const target = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      const source = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 5 });

      expect(calculateMergeAmount(target, source)).toBe(7); // Can add 7 more to reach 10
    });

    it('should return 0 if items cannot stack', () => {
      const target = createTestItem({ id: 'stone' });
      const source = createTestItem({ id: 'wood' });

      expect(calculateMergeAmount(target, source)).toBe(0);
    });

    it('should return 0 if target is full', () => {
      const target = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 10 });
      const source = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      expect(calculateMergeAmount(target, source)).toBe(0);
    });
  });

  describe('mergeStacks', () => {
    it('should fully merge when target has space', () => {
      const target = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 5 });
      const source = createTestItem({ id: 'stone', stackable: true, charges: 3 });

      const result: StackMergeResult = mergeStacks(target, source);

      expect(result.fullyMerged).toBe(true);
      expect(getCurrentStackSize(result.merged)).toBe(8);
      expect(result.remaining).toBeUndefined();
    });

    it('should partially merge when target has limited space', () => {
      const target = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 8 });
      const source = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      const result: StackMergeResult = mergeStacks(target, source);

      expect(result.fullyMerged).toBe(false);
      expect(getCurrentStackSize(result.merged)).toBe(10); // Target is now full
      expect(result.remaining).toBeDefined();
      expect(getCurrentStackSize(result.remaining!)).toBe(3); // 5 - 2 transferred
    });

    it('should not merge incompatible items', () => {
      const target = createTestItem({ id: 'stone' });
      const source = createTestItem({ id: 'wood' });

      const result: StackMergeResult = mergeStacks(target, source);

      expect(result.fullyMerged).toBe(false);
      expect(result.merged).toBe(target);
      expect(result.remaining).toBe(source);
    });

    it('should not merge when target is full', () => {
      const target = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 10 });
      const source = createTestItem({ id: 'stone', stackable: true, charges: 3 });

      const result: StackMergeResult = mergeStacks(target, source);

      expect(result.fullyMerged).toBe(false);
      expect(getCurrentStackSize(result.merged)).toBe(10);
      expect(result.remaining).toBeDefined();
      expect(getCurrentStackSize(result.remaining!)).toBe(3);
    });
  });

  describe('splitStack', () => {
    it('should split a stack into two parts', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 10 });

      const result: StackSplitResult = splitStack(item, 4);

      expect(result.split).toBeDefined();
      expect(getCurrentStackSize(result.split!)).toBe(4);
      expect(getCurrentStackSize(result.main)).toBe(6);
    });

    it('should not split non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });

      const result: StackSplitResult = splitStack(item, 1);

      expect(result.split).toBeNull();
      expect(result.main).toBe(item);
    });

    it('should not split when amount >= current size', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      const result: StackSplitResult = splitStack(item, 5);

      expect(result.split).toBeNull();
      expect(result.main).toBe(item);
    });

    it('should not split when amount <= 0', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      const result: StackSplitResult = splitStack(item, 0);

      expect(result.split).toBeNull();
      expect(result.main).toBe(item);
    });

    it('should not split when amount is negative', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      const result: StackSplitResult = splitStack(item, -1);

      expect(result.split).toBeNull();
      expect(result.main).toBe(item);
    });
  });

  describe('takeFromStack', () => {
    it('should return a new item with the specified amount', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 10 });

      const taken = takeFromStack(item, 3);

      expect(taken).toBeDefined();
      expect(getCurrentStackSize(taken!)).toBe(3);
    });

    it('should return the full item when amount equals current size', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      const taken = takeFromStack(item, 5);

      expect(taken).toBe(item);
    });

    it('should return null for non-stackable items when amount != 1', () => {
      const item = createTestItem({ id: 'sword', stackable: false });

      const taken = takeFromStack(item, 2);

      expect(taken).toBeNull();
    });

    it('should return the single item for non-stackable when amount == 1', () => {
      const item = createTestItem({ id: 'sword', stackable: false });

      const taken = takeFromStack(item, 1);

      expect(taken).toBe(item);
    });

    it('should return null when amount is invalid', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });

      expect(takeFromStack(item, 0)).toBeNull();
      expect(takeFromStack(item, -1)).toBeNull();
      expect(takeFromStack(item, 10)).toBeNull(); // More than current size
    });
  });
});

describe('stacking - 堆叠状态查询', () => {
  describe('isStackFull', () => {
    it('should return true for full stacks', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 10 });
      expect(isStackFull(item)).toBe(true);
    });

    it('should return false for non-full stacks', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 5 });
      expect(isStackFull(item)).toBe(false);
    });

    it('should return true for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      expect(isStackFull(item)).toBe(true);
    });
  });

  describe('isStackEmpty', () => {
    it('should return false for items with charges', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });
      expect(isStackEmpty(item)).toBe(false);
    });

    it('should return false for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      expect(isStackEmpty(item)).toBe(false);
    });

    it('should return true for items with zero charges', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 0 });
      expect(isStackEmpty(item)).toBe(true);
    });
  });

  describe('getStackSpace', () => {
    it('should calculate remaining space', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      expect(getStackSpace(item)).toBe(7);
    });

    it('should return 0 for full stacks', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 10 });
      expect(getStackSpace(item)).toBe(0);
    });

    it('should return 0 for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      expect(getStackSpace(item)).toBe(0);
    });
  });

  describe('isSingleItem', () => {
    it('should return true for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      expect(isSingleItem(item)).toBe(true);
    });

    it('should return true for stack of 1', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 1 });
      expect(isSingleItem(item)).toBe(true);
    });

    it('should return false for stacks larger than 1', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });
      expect(isSingleItem(item)).toBe(false);
    });
  });
});

describe('stacking - 堆叠计数操作', () => {
  describe('addToStack', () => {
    it('should add to stack count', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      const result = addToStack(item, 2);

      expect(getCurrentStackSize(result)).toBe(5);
    });

    it('should cap at max stack size', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 8 });
      const result = addToStack(item, 5);

      expect(getCurrentStackSize(result)).toBe(10);
    });

    it('should return unchanged item for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      const result = addToStack(item, 5);

      expect(result).toBe(item);
    });
  });

  describe('removeFromStack', () => {
    it('should remove from stack count', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });
      const result = removeFromStack(item, 2);

      expect(getCurrentStackSize(result)).toBe(3);
    });

    it('should not go below 1', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 2 });
      const result = removeFromStack(item, 5);

      expect(getCurrentStackSize(result)).toBe(1);
    });

    it('should return unchanged item for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      const result = removeFromStack(item, 5);

      expect(result).toBe(item);
    });
  });

  describe('setStackCount', () => {
    it('should set stack count', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      const result = setStackCount(item, 7);

      expect(getCurrentStackSize(result)).toBe(7);
    });

    it('should cap at max stack size', () => {
      const item = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      const result = setStackCount(item, 15);

      expect(getCurrentStackSize(result)).toBe(10);
    });

    it('should not go below 1', () => {
      const item = createTestItem({ id: 'stone', stackable: true, charges: 5 });
      const result = setStackCount(item, 0);

      expect(getCurrentStackSize(result)).toBe(1);
    });

    it('should return unchanged item for non-stackable items', () => {
      const item = createTestItem({ id: 'sword', stackable: false });
      const result = setStackCount(item, 5);

      expect(result).toBe(item);
    });
  });
});

describe('stacking - 堆叠分组', () => {
  describe('groupStackableItems', () => {
    it('should group compatible items together', () => {
      const item1 = createTestItem({ id: 'stone', charges: 3 });
      const item2 = createTestItem({ id: 'wood', charges: 2 });
      const item3 = createTestItem({ id: 'stone', charges: 4 });
      const item4 = createTestItem({ id: 'stone', charges: 1 });

      const groups = groupStackableItems([item1, item2, item3, item4]);

      expect(groups.length).toBe(2);

      // Find stone group and wood group
      const stoneGroup = groups.find(g => g[0].id === 'stone');
      const woodGroup = groups.find(g => g[0].id === 'wood');

      expect(stoneGroup).toBeDefined();
      expect(woodGroup).toBeDefined();
      expect(stoneGroup!.length).toBe(3);
      expect(woodGroup!.length).toBe(1);
    });

    it('should handle empty list', () => {
      const groups = groupStackableItems([]);
      expect(groups.length).toBe(0);
    });

    it('should not group incompatible items', () => {
      const item1 = createTestItem({ id: 'stone', damage: 0 });
      const item2 = createTestItem({ id: 'stone', damage: 100 });

      const groups = groupStackableItems([item1, item2]);

      expect(groups.length).toBe(2);
    });
  });

  describe('consolidateStacks', () => {
    it('should merge all compatible items', () => {
      const item1 = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 3 });
      const item2 = createTestItem({ id: 'stone', stackable: true, stackSize: 10, charges: 4 });
      const item3 = createTestItem({ id: 'wood', stackable: true, stackSize: 10, charges: 2 });

      const result = consolidateStacks([item1, item2, item3]);

      expect(result.length).toBe(2);

      const stoneStack = result.find(i => i.id === 'stone');
      const woodStack = result.find(i => i.id === 'wood');

      expect(getCurrentStackSize(stoneStack!)).toBe(7);
      expect(getCurrentStackSize(woodStack!)).toBe(2);
    });

    it('should create multiple stacks when exceeding max size', () => {
      const item1 = createTestItem({ id: 'stone', stackable: true, stackSize: 5, charges: 3 });
      const item2 = createTestItem({ id: 'stone', stackable: true, stackSize: 5, charges: 4 });
      const item3 = createTestItem({ id: 'stone', stackable: true, stackSize: 5, charges: 2 });

      const result = consolidateStacks([item1, item2, item3]);

      // Should create two stacks: one full (5) and one partial (4)
      expect(result.length).toBe(2);

      const total = result.reduce((sum, i) => sum + getCurrentStackSize(i), 0);
      expect(total).toBe(9); // 3 + 4 + 2
    });

    it('should handle empty list', () => {
      const result = consolidateStacks([]);
      expect(result.length).toBe(0);
    });

    it('should preserve non-stackable items', () => {
      const item1 = createTestItem({ id: 'stone', stackable: true, charges: 3 });
      const item2 = createTestItem({ id: 'sword', stackable: false });

      const result = consolidateStacks([item1, item2]);

      expect(result.length).toBe(2);
    });
  });
});

describe('stacking - 边界情况', () => {
  it('should handle zero stack size gracefully', () => {
    const item = createTestItem({ id: 'special', stackable: true, stackSize: 0, charges: 1 });

    expect(getMaxStackSize(item)).toBe(1);
    expect(isStackFull(item)).toBe(true);
  });

  it('should handle very large stack sizes', () => {
    const item = createTestItem({ id: 'money', stackable: true, stackSize: 999999, charges: 500 });

    expect(getStackSpace(item)).toBe(999999 - 500);
  });

  it('should handle items with no charges field as 0', () => {
    const itemType = new ItemType({
      id: createItemTypeId('test'),
      name: 'Test',
      description: 'Test',
      stackable: true,
      stackSize: 10,
      category: 'misc' as any,
      weight: 1 as any,
      volume: 1 as any,
      material: ['flesh' as any],
      symbol: '?',
      color: 'white',
    });

    const item = new Item({
      type: itemType,
      // charges not specified
      contents: new ItemContents(),
    });

    expect(getCurrentStackSize(item)).toBe(1);
  });
});
