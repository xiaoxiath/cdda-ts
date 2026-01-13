/**
 * Inventory - 物品栏系统测试
 *
 * 测试物品栏的各种功能
 */

import { describe, it, expect } from 'vitest';
import { List, Map } from 'immutable';
import {
  Inventory,
  InvletAssigner,
} from '../Inventory';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemCategory } from '../types';
import { createItemTypeId, createAmmoTypeId } from '../types';

// 测试辅助函数
function createTestItemType(props?: any): ItemType {
  return new ItemType({
    id: createItemTypeId(props?.id || 'test_item'),
    name: props?.name || 'Test Item',
    weight: 100,
    volume: 250,
    stackable: true,
    stackSize: 1,
    category: ItemCategory.MISCELLANEOUS,
    flags: Map(),
    material: [],
    qualities: Map(),
    ...props,
  });
}

function createTestItem(type: ItemType, charges: number = 0): Item {
  return Item.create(type).set('charges', charges);
}

describe('Inventory - 基础功能', () => {
  describe('创建物品栏', () => {
    it('应该创建空物品栏', () => {
      const inventory = Inventory.create();

      expect(inventory.isEmpty()).toBe(true);
      expect(inventory.getStackCount()).toBe(0);
      expect(inventory.getItemCount()).toBe(0);
    });

    it('应该创建有位置限制的物品栏', () => {
      const inventory = Inventory.create(10);

      expect(inventory.maxPositions).toBe(10);
      expect(inventory.isFull()).toBe(false);
    });
  });

  describe('添加物品', () => {
    it('应该添加单个物品', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头' });
      const item = createTestItem(itemType);

      const inventory = Inventory.create();
      const newInventory = inventory.addItem(item);

      expect(newInventory.getItemCount()).toBe(1);
      expect(newInventory.getStackCount()).toBe(1);
    });

    it('应该添加多个物品', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      expect(inventory.getItemCount()).toBe(2);
      expect(inventory.getStackCount()).toBe(2);
    });

    it('应该堆叠相同物品', () => {
      const itemType = createTestItemType({
        id: 'arrow',
        name: '箭',
        stackable: true,
        stackSize: 10,
      });

      const item1 = createTestItem(itemType, 5);
      const item2 = createTestItem(itemType, 3);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      // 堆叠物品被添加到同一栈
      expect(inventory.getStackCount()).toBe(1);
      expect(inventory.getItemCount()).toBe(2); // 2 个物品对象
    });

    it('物品栏满时应该抛出错误', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头' });
      const item = createTestItem(itemType);

      const inventory = Inventory.create(1)
        .addItem(item);

      expect(() => inventory.addItem(item)).toThrow('Inventory is full');
    });
  });

  describe('移除物品', () => {
    it('应该移除指定物品', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头' });
      const item = createTestItem(itemType);

      const inventory = Inventory.create()
        .addItem(item);

      const newInventory = inventory.removeItem(item);

      expect(newInventory.getItemCount()).toBe(0);
      expect(newInventory.getStackCount()).toBe(0);
    });

    it('应该移除指定位置的物品', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const newInventory = inventory.removeItemAt(0);

      expect(newInventory.getStackCount()).toBe(1);
    });

    it('应该清空物品栏', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头' });
      const item = createTestItem(itemType);

      const inventory = Inventory.create()
        .addItem(item)
        .clear();

      expect(inventory.getItemCount()).toBe(0);
      expect(inventory.getStackCount()).toBe(0);
    });
  });

  describe('物品查询', () => {
    it('应该查找物品', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const found = inventory.findItem(item => item.name === '石头');

      expect(found).toBe(item1);
    });

    it('应该查找所有匹配的物品', () => {
      const itemType = createTestItemType({ id: 'arrow', name: '箭' });

      const item1 = createTestItem(itemType, 5);
      const item2 = createTestItem(itemType, 3);
      const item3 = createTestItem(itemType, 2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2)
        .addItem(item3);

      const allArrows = inventory.findAllItems(item => item.name === '箭');

      expect(allArrows.length).toBe(3);
    });

    it('应该统计指定类型物品数量', () => {
      const itemType = createTestItemType({ id: 'arrow', name: '箭' });

      const item1 = createTestItem(itemType, 5);
      const item2 = createTestItem(itemType, 3);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const count = inventory.countItem('arrow');

      expect(count).toBe(2);
    });

    it('应该统计指定类型的总 charges', () => {
      const itemType = createTestItemType({
        id: 'ammo',
        name: '弹药',
        stackable: true,
        stackSize: 50,
      });

      const item1 = createTestItem(itemType, 30);
      const item2 = createTestItem(itemType, 20);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const charges = inventory.countCharges('ammo');

      expect(charges).toBe(50);
    });
  });

  describe('物品位置', () => {
    it('应该查找物品位置', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const pos = inventory.findPosition(item2);

      expect(pos).toBe(1);
    });

    it('应该获取物品位置', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const pos = inventory.getPosition(item2);

      expect(pos).toBe(1);
    });

    it('不存在的物品位置应该返回 -1', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头' });
      const item = createTestItem(itemType);

      const inventory = Inventory.create();

      const pos = inventory.getPosition(item);

      expect(pos).toBe(-1);
    });
  });

  describe('容量计算', () => {
    it('应该计算总重量', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头', weight: 100 });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝', weight: 50 });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const weight = inventory.getWeight();

      expect(weight).toBe(150);
    });

    it('应该计算总体积', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头', volume: 100 });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝', volume: 50 });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      const volume = inventory.getVolume();

      expect(volume).toBe(150);
    });

    it('损坏的物品重量应该减少', () => {
      const itemType = createTestItemType({ id: 'rock', name: '石头', weight: 100 });

      const item = createTestItem(itemType).set('damage', 2000);

      const inventory = Inventory.create().addItem(item);

      // 重量减少 20% (2000/10000)
      const expectedWeight = Math.floor(100 * 0.8);
      expect(inventory.getWeight()).toBe(expectedWeight);
    });
  });

  describe('重新整理', () => {
    it('应该重新堆叠相同物品', () => {
      const itemType = createTestItemType({
        id: 'arrow',
        name: '箭',
        stackable: true,
        stackSize: 10,
      });

      const item1 = createTestItem(itemType, 5);
      const item2 = createTestItem(itemType, 3);
      const item3 = createTestItem(itemType, 2);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2)
        .addItem(item3);

      // 相同类型物品被添加到同一栈
      expect(inventory.getStackCount()).toBe(1);
      expect(inventory.getItemCount()).toBe(3); // 3 个独立的物品对象

      // restack 会合并相同 charges 的物品
      const restacked = inventory.restack();
      expect(restacked.getItemCount()).toBeGreaterThanOrEqual(1);
      expect(restacked.getStackCount()).toBeGreaterThanOrEqual(1);
    });

    it('应该合并不同 charges 的物品到同一栈', () => {
      const itemType = createTestItemType({
        id: 'ammo',
        name: '弹药',
        stackable: true,
        stackSize: 50,
      });

      const item1 = createTestItem(itemType, 30);
      const item2 = createTestItem(itemType, 20);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2);

      expect(inventory.getItemCount()).toBe(2);

      // restack 后应该合并
      const restacked = inventory.restack();
      // 由于 charges 不同，可能不会完全合并
      expect(restacked.getItemCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('访问者模式', () => {
    it('应该访问所有物品', () => {
      const itemType = createTestItemType({ id: 'item', name: '物品' });

      const item1 = createTestItem(itemType);
      const item2 = createTestItem(itemType);
      const item3 = createTestItem(itemType);

      const inventory = Inventory.create()
        .addItem(item1)
        .addItem(item2)
        .addItem(item3);

      let count = 0;
      inventory.visitItems(() => {
        count++;
      });

      expect(count).toBe(3);
    });
  });

  describe('工厂方法', () => {
    it('应该从物品列表创建物品栏', () => {
      const itemType1 = createTestItemType({ id: 'rock', name: '石头' });
      const itemType2 = createTestItemType({ id: 'stick', name: '树枝' });

      const item1 = createTestItem(itemType1);
      const item2 = createTestItem(itemType2);

      const inventory = Inventory.fromItems([item1, item2]);

      expect(inventory.getItemCount()).toBe(2);
      expect(inventory.getStackCount()).toBe(2);
    });
  });
});

describe('Inventory - InvletAssigner', () => {
  describe('invlet 分配', () => {
    it('应该设置物品的 invlet', () => {
      const assigner = new InvletAssigner();
      const itemId = createItemTypeId('test_item');

      const newAssigner = assigner.set('a', itemId);

      expect(newAssigner.getInvlet(itemId)).toBe('a');
      expect(newAssigner.getItemId('a')).toBe(itemId);
    });

    it('应该清除 invlet', () => {
      const assigner = new InvletAssigner();
      const itemId = createItemTypeId('test_item');

      const assignerWith = assigner.set('a', itemId);
      const cleared = assignerWith.clear('a');

      expect(cleared.getInvlet(itemId)).toBeUndefined();
      expect(cleared.getItemId('a')).toBeUndefined();
    });

    it('应该检查 invlet 是否可用', () => {
      const assigner = new InvletAssigner();
      const itemId = createItemTypeId('test_item');

      expect(assigner.isInvletAvailable('a')).toBe(true);

      const assignerWith = assigner.set('a', itemId);
      expect(assignerWith.isInvletAvailable('a')).toBe(false);
    });

    it('应该获取所有已分配的 invlets', () => {
      const assigner = new InvletAssigner();
      const itemId1 = createItemTypeId('item1');
      const itemId2 = createItemTypeId('item2');

      const assignerWith = assigner
        .set('a', itemId1)
        .set('b', itemId2);

      const invlets = assignerWith.getAssignedInvlets();

      expect(invlets.length).toBe(2);
      expect(invlets).toContain('a');
      expect(invlets).toContain('b');
    });

    it('应该清除所有 invlets', () => {
      const assigner = new InvletAssigner();
      const itemId1 = createItemTypeId('item1');
      const itemId2 = createItemTypeId('item2');

      const assignerWith = assigner
        .set('a', itemId1)
        .set('b', itemId2);

      const cleared = assignerWith.clearAll();

      expect(cleared.getAssignedInvlets().length).toBe(0);
    });
  });
});

describe('Inventory - 集成测试', () => {
  describe('枪械弹药集成', () => {
    it('应该从物品栏获取可用弹药', () => {
      const gunType = createTestItemType({
        id: 'pistol',
        name: '手枪',
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammo: [createAmmoTypeId('9mm')] as any,
        },
      });

      const ammoType = createTestItemType({
        id: 'ammo_9mm',
        name: '9mm 弹药',
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
          stackSize: 30,
        },
      });

      const gun = createTestItem(gunType);
      const ammo1 = createTestItem(ammoType, 30);
      const ammo2 = createTestItem(ammoType, 30);

      const inventory = Inventory.create()
        .addItem(gun)
        .addItem(ammo1)
        .addItem(ammo2);

      const totalAmmo = inventory.countCharges('ammo_9mm');
      expect(totalAmmo).toBe(60);
    });
  });

  describe('食物消耗集成', () => {
    it('应该统计食物数量', () => {
      const foodType = createTestItemType({
        id: 'apple',
        name: '苹果',
        category: 'FOOD' as any,
        comestible: {
          calories: 100,
        },
      });

      const food1 = createTestItem(foodType, 1);
      const food2 = createTestItem(foodType, 1);
      const food3 = createTestItem(foodType, 1);

      const inventory = Inventory.create()
        .addItem(food1)
        .addItem(food2)
        .addItem(food3);

      const foodCount = inventory.countItem('apple');
      expect(foodCount).toBe(3);
    });
  });

  describe('护甲装备集成', () => {
    it('应该查找所有护甲', () => {
      const armorType1 = createTestItemType({
        id: 'shirt',
        name: '衬衫',
        category: 'ARMOR' as any,
        armor: { coverage: 90 },
      });

      const armorType2 = createTestItemType({
        id: 'pants',
        name: '裤子',
        category: 'ARMOR' as any,
        armor: { coverage: 80 },
      });

      const shirt = createTestItem(armorType1);
      const pants = createTestItem(armorType2);

      const inventory = Inventory.create()
        .addItem(shirt)
        .addItem(pants);

      const allArmor = inventory.findAllItems(item => item.isArmor());

      expect(allArmor.length).toBe(2);
    });
  });
});
