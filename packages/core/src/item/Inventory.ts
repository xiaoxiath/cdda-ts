/**
 * Inventory - 物品栏系统
 *
 * 参考 Cataclysm-DDA 的 inventory.h
 * 管理角色或容器的物品栏
 */

import { List, Map } from 'immutable';
import type { Mass, Volume } from './types';
import type { ItemTypeId } from './types';
import { Item } from './Item';
import { canStackWith, getMaxStackSize, consolidateStacks } from './stacking';

// ============ 物品栈 ============

/**
 * 物品栈 - 相同类型物品的堆叠
 */
export type ItemStack = List<Item>;

// ============ invlet 分配系统 ============

/**
 * InvletAssigner 属性接口
 */
export interface InvletAssignerProps {
  invletsByItem?: Map<ItemTypeId, string>;
  itemsByInvlet?: Map<string, ItemTypeId>;
}

/**
 * invlet 分配器 - 为物品分配快捷键
 */
export class InvletAssigner {
  private readonly invletsByItem: Map<ItemTypeId, string>;
  private readonly itemsByInvlet: Map<string, ItemTypeId>;

  constructor(props?: InvletAssignerProps) {
    this.invletsByItem = props?.invletsByItem || Map();
    this.itemsByInvlet = props?.itemsByInvlet || Map();
  }

  /**
   * 设置物品的 invlet
   */
  set(invlet: string, itemId: ItemTypeId): InvletAssigner {
    return new InvletAssigner({
      invletsByItem: this.invletsByItem.set(itemId, invlet),
      itemsByInvlet: this.itemsByInvlet.set(invlet, itemId),
    });
  }

  /**
   * 获取物品的 invlet
   */
  getInvlet(itemId: ItemTypeId): string | undefined {
    return this.invletsByItem.get(itemId);
  }

  /**
   * 获取 invlet 对应的物品
   */
  getItemId(invlet: string): ItemTypeId | undefined {
    return this.itemsByInvlet.get(invlet);
  }

  /**
   * 清除指定 invlet
   */
  clear(invlet: string): InvletAssigner {
    const itemId = this.itemsByInvlet.get(invlet);
    if (itemId) {
      return new InvletAssigner({
        invletsByItem: this.invletsByItem.remove(itemId),
        itemsByInvlet: this.itemsByInvlet.remove(invlet),
      });
    }
    return this;
  }

  /**
   * 清除所有
   */
  clearAll(): InvletAssigner {
    return new InvletAssigner();
  }

  /**
   * 获取所有已分配的 invlets
   */
  getAssignedInvlets(): string[] {
    return this.itemsByInvlet.keySeq().toArray();
  }

  /**
   * 检查 invlet 是否可用
   */
  isInvletAvailable(invlet: string): boolean {
    return !this.itemsByInvlet.has(invlet);
  }
}

// ============ Inventory 属性接口 ============

export interface InventoryProps {
  // 物品栈列表
  stacks: List<ItemStack>;

  // invlet 分配器
  invletAssigner?: InvletAssigner;

  // 最大物品栏位置数
  maxPositions?: number;
}

// ============ Inventory 类 ============

/**
 * Inventory - 物品栏类
 *
 * 管理角色或容器的物品栏
 */
export class Inventory {
  readonly stacks: List<ItemStack>;
  readonly invletAssigner?: InvletAssigner;
  readonly maxPositions?: number;

  constructor(props?: InventoryProps) {
    this.stacks = props?.stacks || List();
    this.invletAssigner = props?.invletAssigner;
    this.maxPositions = props?.maxPositions;
  }

  // ============ 基础属性 ============

  /**
   * 获取物品栈数量
   */
  getStackCount(): number {
    return this.stacks.size;
  }

  /**
   * 获取总物品数量（包含堆叠）
   */
  getItemCount(): number {
    return this.stacks.reduce((count, stack) => count + stack.size, 0);
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.stacks.every(stack => stack.isEmpty());
  }

  /**
   * 检查是否已满
   */
  isFull(): boolean {
    if (this.maxPositions && this.stacks.size >= this.maxPositions) {
      return true;
    }
    return false;
  }

  // ============ 容量查询 ============

  /**
   * 获取总重量
   */
  getWeight(): Mass {
    return this.stacks.reduce((weight, stack) => {
      return weight + stack.reduce((s, item) => s + item.getWeight(), 0);
    }, 0);
  }

  /**
   * 获取总体积
   */
  getVolume(): Volume {
    return this.stacks.reduce((volume, stack) => {
      return volume + stack.reduce((v, item) => v + item.getVolume(), 0);
    }, 0);
  }

  // ============ 物品查询 ============

  /**
   * 获取指定位置的物品栈
   */
  getStackAt(position: number): ItemStack | undefined {
    return this.stacks.get(position);
  }

  /**
   * 查找物品
   */
  findItem(predicate: (item: Item) => boolean): Item | undefined {
    for (const stack of this.stacks) {
      const found = stack.find(predicate);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * 查找所有匹配的物品
   */
  findAllItems(predicate: (item: Item) => boolean): Item[] {
    const results: Item[] = [];
    this.stacks.forEach(stack => {
      stack.forEach(item => {
        if (predicate(item)) {
          results.push(item);
        }
      });
    });
    return results;
  }

  /**
   * 统计指定类型物品的数量
   */
  countItem(typeId: string): number {
    return this.stacks.reduce((count, stack) => {
      return count + stack.filter(item => item.id === typeId).size;
    }, 0);
  }

  /**
   * 统计指定类型的总 charges
   */
  countCharges(typeId: string): number {
    return this.stacks.reduce((count, stack) => {
      return count + stack.reduce((c, item) => {
        return item.id === typeId ? c + item.charges : c;
      }, 0);
    }, 0);
  }

  // ============ 物品位置查询 ============

  /**
   * 查找物品的位置
   */
  findPosition(item: Item): number | undefined {
    for (let i = 0; i < this.stacks.size; i++) {
      const stack = this.stacks.get(i);
      if (stack && stack.includes(item)) {
        return i;
      }
    }
    return undefined;
  }

  /**
   * 获取物品的位置
   */
  getPosition(item: Item): number {
    const pos = this.findPosition(item);
    return pos !== undefined ? pos : -1;
  }

  // ============ 物品操作 ============

  /**
   * 添加物品
   */
  addItem(item: Item): Inventory {
    // 尝试堆叠到现有栈
    for (let i = 0; i < this.stacks.size; i++) {
      const stack = this.stacks.get(i);
      if (stack && stack.size > 0) {
        const topItem = stack.first();
        if (topItem && canStackWith(topItem, item)) {
          // 检查是否有空间堆叠
          const currentSize = topItem.getStackSize();
          const maxSize = getMaxStackSize(topItem);

          if (currentSize < maxSize) {
            // 可以堆叠，添加到栈中
            return new Inventory({
              ...this.getState(),
              stacks: this.stacks.set(i, stack.push(item)),
            });
          }
        }
      }
    }

    // 创建新栈
    if (this.isFull()) {
      throw new Error('Inventory is full');
    }

    return new Inventory({
      ...this.getState(),
      stacks: this.stacks.push(List([item])),
    });
  }

  /**
   * 移除物品
   */
  removeItem(item: Item): Inventory {
    const pos = this.findPosition(item);
    if (pos === undefined) {
      return this;
    }

    const stack = this.stacks.get(pos)!;
    const index = stack.indexOf(item);

    if (stack.size === 1) {
      // 移除整个栈
      return new Inventory({
        ...this.getState(),
        stacks: this.stacks.remove(pos),
      });
    }

    // 从栈中移除
    return new Inventory({
      ...this.getState(),
      stacks: this.stacks.set(pos, stack.remove(index)),
    });
  }

  /**
   * 移除指定位置的物品
   */
  removeItemAt(position: number, index?: number): Inventory {
    const stack = this.stacks.get(position);
    if (!stack) return this;

    if (index === undefined) {
      // 移除整个栈
      return new Inventory({
        ...this.getState(),
        stacks: this.stacks.remove(position),
      });
    }

    if (stack.size === 1) {
      return new Inventory({
        ...this.getState(),
        stacks: this.stacks.remove(position),
      });
    }

    return new Inventory({
      ...this.getState(),
      stacks: this.stacks.set(position, stack.remove(index)),
    });
  }

  /**
   * 清空所有物品
   */
  clear(): Inventory {
    return new Inventory({
      ...this.getState(),
      stacks: List(),
    });
  }

  // ============ 整理物品栏 ============

  /**
   * 重新整理物品栏（堆叠相同物品）
   */
  restack(): Inventory {
    // 收集所有物品
    const allItems: Item[] = [];
    this.stacks.forEach(stack => {
      stack.forEach(item => {
        allItems.push(item);
      });
    });

    // 使用 consolidateStacks 合并堆叠
    const consolidated = consolidateStacks(allItems);

    // 创建新的栈
    let newStacks = List<ItemStack>();
    consolidated.forEach(item => {
      newStacks = newStacks.push(List([item]));
    });

    return new Inventory({
      ...this.getState(),
      stacks: newStacks,
    });
  }

  // ============ 访问者模式 ============

  /**
   * 访问所有物品
   */
  visitItems(visitor: (item: Item) => void): void {
    this.stacks.forEach(stack => {
      stack.forEach(visitor);
    });
  }

  // ============ 内部状态 ============

  /**
   * 获取当前状态（用于创建新实例）
   */
  private getState(): InventoryProps {
    return {
      stacks: this.stacks,
      invletAssigner: this.invletAssigner,
      maxPositions: this.maxPositions,
    };
  }

  // ============ 工厂方法 ============

  /**
   * 创建空的物品栏
   */
  static create(maxPositions?: number): Inventory {
    return new Inventory({
      stacks: List(),
      maxPositions,
    });
  }

  /**
   * 从物品列表创建物品栏
   */
  static fromItems(items: Item[]): Inventory {
    let inventory = Inventory.create();
    for (const item of items) {
      inventory = inventory.addItem(item);
    }
    return inventory;
  }

  /**
   * 从 JSON 创建物品栏
   */
  static fromJson(json: any[], factory: any): Inventory {
    let inventory = Inventory.create();

    for (const itemJson of json) {
      try {
        const item = factory.createItem(itemJson.id);
        if (item) {
          inventory = inventory.addItem(item);
        }
      } catch (error) {
        console.error('Failed to load item:', error);
      }
    }

    return inventory;
  }

  // ============ 集成功能 ============

  /**
   * 使用物品栏中的物品
   *
   * @param item 要使用的物品
   * @param context 使用上下文
   * @returns 新的物品栏和使用结果
   */
  useItem(
    item: Item,
    context: any
  ): { inventory: Inventory; result: any; consumedItem?: Item } {
    // 动态导入 use-methods 避免循环依赖
    const { executeUseMethod, getAvailableUseMethods } = require('./use-methods');

    const methods = getAvailableUseMethods(item, context);
    if (methods.length === 0) {
      return {
        inventory: this,
        result: { success: false, error: 'NO_USE_METHOD', message: '此物品没有可用的使用方法' },
      };
    }

    // 执行第一个可用方法
    const result = methods[0].use(item, context);

    // 如果物品被消耗（resultingItem 为 undefined），从物品栏移除
    if (result.resultingItem === undefined) {
      return {
        inventory: this.removeItem(item),
        result,
        consumedItem: item,
      };
    }

    // 否则更新物品栏中的物品
    const pos = this.findPosition(item);
    if (pos !== undefined) {
      const stack = this.stacks.get(pos);
      const index = stack?.indexOf(item);
      if (index !== undefined && index >= 0) {
        const newStack = stack?.set(index, result.resultingItem);
        const newInventory = new Inventory({
          ...this.getState(),
          stacks: this.stacks.set(pos, newStack!),
        });
        return {
          inventory: newInventory,
          result,
        };
      }
    }

    return {
      inventory: this,
      result,
    };
  }

  /**
   * 消耗指定数量的物品
   *
   * @param typeId 物品类型 ID
   * @param count 要消耗的数量
   * @returns 新的物品栏和消耗的物品
   */
  consumeItems(typeId: string, count: number): {
    inventory: Inventory;
    consumed: Item[];
    remaining: number;
  } {
    const consumed: Item[] = [];
    let inventory: Inventory = this;
    let remaining = count;

    // 查找所有匹配的物品
    const items = this.findAllItems(item => item.id === typeId);

    for (const item of items) {
      if (remaining <= 0) break;

      inventory = inventory.removeItem(item);
      consumed.push(item);
      remaining--;
    }

    return {
      inventory,
      consumed,
      remaining,
    };
  }

  /**
   * 查找可用的弹药用于装填
   *
   * @param gun 枪械
   * @returns 找到的弹药物品，如果没有则返回 undefined
   */
  findAmmoFor(gun: Item): Item | undefined {
    // 动态导入 weapon 模块
    const { isAmmoCompatible } = require('./weapon');

    for (const stack of this.stacks) {
      for (const item of stack) {
        if (isAmmoCompatible(gun, item)) {
          return item;
        }
      }
    }
    return undefined;
  }

  /**
   * 使用物品栏中的弹药装填枪械
   *
   * @param gun 枪械
   * @returns 新的物品栏和装填结果
   */
  reloadGun(gun: Item): {
    inventory: Inventory;
    gun: Item;
    ammo?: Item;
    success: boolean;
  } {
    const ammo = this.findAmmoFor(gun);

    if (!ammo) {
      return {
        inventory: this,
        gun,
        success: false,
      };
    }

    // 动态导入 weapon 模块
    const { reloadGun: reloadGunFunc, calculateReloadAmount } = require('./weapon');

    const reloadResult = reloadGunFunc(gun, ammo);
    const amount = calculateReloadAmount(gun, ammo);

    // 消耗弹药物品
    const consumeResult = this.consumeItems(ammo.id, 1);

    return {
      inventory: consumeResult.inventory,
      gun: reloadResult.gun,
      ammo: consumeResult.consumed[0],
      success: true,
    };
  }

  /**
   * 获取物品栏摘要信息
   */
  getSummary(): {
    itemCount: number;
    stackCount: number;
    weight: number;
    volume: number;
    isFull: boolean;
  } {
    return {
      itemCount: this.getItemCount(),
      stackCount: this.getStackCount(),
      weight: this.getWeight(),
      volume: this.getVolume(),
      isFull: this.isFull(),
    };
  }
}
