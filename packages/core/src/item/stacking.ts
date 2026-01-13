/**
 * 物品堆叠系统
 *
 * 参考 Cataclysm-DDA 的 item 堆叠逻辑
 * 处理物品的堆叠、合并、分离等操作
 */

import type { Item } from './Item';

// ============ 堆叠结果 ============

/**
 * 堆叠合并结果
 */
export interface StackMergeResult {
  /** 合并后的物品 */
  merged: Item;
  /** 剩余未合并的物品 */
  remaining?: Item;
  /** 是否完全合并 */
  fullyMerged: boolean;
}

/**
 * 堆叠分离结果
 */
export interface StackSplitResult {
  /** 分离后的主物品 */
  main: Item;
  /** 分离出的新物品 */
  split: Item | null;
}

// ============ 堆叠兼容性检查 ============

/**
 * 检查两个物品是否可以堆叠
 *
 * 参考条件：
 * 1. 相同的物品类型 ID
 * 2. 物品类型可堆叠
 * 3. 相同的伤害状态
 * 4. 相同的温度（如果物品有特定温度）
 * 5. 相同的腐烽数据
 * 6. 相同的物品变量
 * 7. 相同的内容物状态
 */
export function canStackWith(item1: Item, item2: Item): boolean {
  // 检查类型 ID 是否相同
  if (item1.id !== item2.id) {
    return false;
  }

  // 检查是否可堆叠
  if (!item1.type.stackable || !item2.type.stackable) {
    return false;
  }

  // 检查伤害状态是否相同
  if (item1.damage !== item2.damage) {
    return false;
  }

  // 如果有特定温度，温度必须相同
  if (item1.tempSpecific && item2.tempSpecific) {
    if (item1.temperature !== item2.temperature) {
      return false;
    }
  }

  // 腐烂物品的腐烤断据必须相同
  if (item1.spoilage || item2.spoilage) {
    if (!item1.spoilage || !item2.spoilage) {
      return false;
    }
    if (item1.spoilage.created !== item2.spoilage.created ||
        item1.spoilage.spoilTime !== item2.spoilage.spoilTime) {
      return false;
    }
  }

  // 物品变量必须相同
  if (item1.itemVars.size !== item2.itemVars.size) {
    return false;
  }
  for (const [key, value] of item1.itemVars) {
    const otherValue = item2.itemVars.get(key);
    if (otherValue !== value) {
      return false;
    }
  }

  // 内容物状态必须相同
  if (item1.contents.isEmpty() !== item2.contents.isEmpty()) {
    return false;
  }

  return true;
}

/**
 * 检查物品是否可堆叠
 */
export function isStackable(item: Item): boolean {
  return item.type.stackable;
}

/**
 * 获取物品的最大堆叠数量
 */
export function getMaxStackSize(item: Item): number {
  return item.type.stackSize || 1;
}

/**
 * 获取物品当前的堆叠数量
 */
export function getCurrentStackSize(item: Item): number {
  if (!isStackable(item)) {
    return 1;
  }
  return Math.max(1, item.charges);
}

// ============ 堆叠操作 ============

/**
 * 计算可以合并的数量
 */
export function calculateMergeAmount(target: Item, source: Item): number {
  if (!canStackWith(target, source)) {
    return 0;
  }

  const maxSize = getMaxStackSize(target);
  const currentSize = getCurrentStackSize(target);
  const available = getCurrentStackSize(source);

  const canAdd = maxSize - currentSize;
  return Math.min(canAdd, available);
}

/**
 * 合并两个物品堆叠
 *
 * @param target 目标物品堆叠
 * @param source 源物品堆叠
 * @returns 合并结果
 */
export function mergeStacks(target: Item, source: Item): StackMergeResult {
  const canMerge = canStackWith(target, source);

  if (!canMerge) {
    return {
      merged: target,
      remaining: source,
      fullyMerged: false,
    };
  }

  const maxSize = getMaxStackSize(target);
  const currentTargetSize = getCurrentStackSize(target);
  const currentSourceSize = getCurrentStackSize(source);

  // 检查是否已经满了
  if (currentTargetSize >= maxSize) {
    return {
      merged: target,
      remaining: source,
      fullyMerged: false,
    };
  }

  const spaceAvailable = maxSize - currentTargetSize;
  const toTransfer = Math.min(spaceAvailable, currentSourceSize);

  // 更新目标物品的 charges
  const newTarget = target.set('charges', currentTargetSize + toTransfer);

  // 检查是否完全合并
  if (toTransfer >= currentSourceSize) {
    return {
      merged: newTarget,
      fullyMerged: true,
    };
  }

  // 部分合并，创建剩余物品
  const remainingAmount = currentSourceSize - toTransfer;
  const remainingSource = source.set('charges', remainingAmount);

  return {
    merged: newTarget,
    remaining: remainingSource,
    fullyMerged: false,
  };
}

/**
 * 分离物品堆叠
 *
 * @param item 要分离的物品
 * @param amount 要分离的数量
 * @returns 分离结果
 */
export function splitStack(item: Item, amount: number): StackSplitResult {
  if (!isStackable(item)) {
    return {
      main: item,
      split: null,
    };
  }

  const currentSize = getCurrentStackSize(item);

  // 不能分离比当前数量更多的物品
  if (amount >= currentSize) {
    return {
      main: item,
      split: null,
    };
  }

  // 不能分离 0 或负数
  if (amount <= 0) {
    return {
      main: item,
      split: null,
    };
  }

  // 创建新物品
  const newItem = item.set('charges', amount);
  const remainingItem = item.set('charges', currentSize - amount);

  return {
    main: remainingItem,
    split: newItem,
  };
}

/**
 * 从物品堆叠中取出指定数量
 *
 * @param item 物品堆叠
 * @param amount 要取出的数量
 * @returns 取出的物品，如果数量无效返回 null
 */
export function takeFromStack(item: Item, amount: number): Item | null {
  if (!isStackable(item)) {
    return amount === 1 ? item : null;
  }

  const currentSize = getCurrentStackSize(item);

  if (amount <= 0 || amount > currentSize) {
    return null;
  }

  if (amount === currentSize) {
    return item;
  }

  return item.set('charges', amount);
}

// ============ 堆叠状态查询 ============

/**
 * 检查物品堆叠是否已满
 */
export function isStackFull(item: Item): boolean {
  if (!isStackable(item)) {
    return true; // 不可堆叠的物品视为"已满"
  }
  return getCurrentStackSize(item) >= getMaxStackSize(item);
}

/**
 * 检查物品堆叠是否为空
 */
export function isStackEmpty(item: Item): boolean {
  if (!isStackable(item)) {
    return false;
  }
  return getCurrentStackSize(item) <= 0;
}

/**
 * 获取堆叠剩余空间
 */
export function getStackSpace(item: Item): number {
  if (!isStackable(item)) {
    return 0;
  }
  return Math.max(0, getMaxStackSize(item) - getCurrentStackSize(item));
}

/**
 * 检查物品是否是单件（不是堆叠）
 */
export function isSingleItem(item: Item): boolean {
  if (!isStackable(item)) {
    return true;
  }
  return getCurrentStackSize(item) === 1;
}

// ============ 堆叠计数操作 ============

/**
 * 增加堆叠计数
 */
export function addToStack(item: Item, amount: number): Item {
  if (!isStackable(item)) {
    return item;
  }

  const currentSize = getCurrentStackSize(item);
  const maxSize = getMaxStackSize(item);
  const newAmount = Math.min(currentSize + amount, maxSize);

  return item.set('charges', newAmount);
}

/**
 * 减少堆叠计数
 */
export function removeFromStack(item: Item, amount: number): Item {
  if (!isStackable(item)) {
    return item;
  }

  const currentSize = getCurrentStackSize(item);
  const newAmount = Math.max(1, currentSize - amount);

  return item.set('charges', newAmount);
}

/**
 * 设置堆叠计数
 */
export function setStackCount(item: Item, count: number): Item {
  if (!isStackable(item)) {
    return item;
  }

  const maxSize = getMaxStackSize(item);
  const validCount = Math.max(1, Math.min(count, maxSize));

  return item.set('charges', validCount);
}

// ============ 堆叠分组 ============

/**
 * 将物品列表按可堆叠性分组
 *
 * @param items 物品列表
 * @returns 分组后的物品列表，每组中的物品可以堆叠
 */
export function groupStackableItems(items: Item[]): Item[][] {
  const groups: Item[][] = [];
  const used = new Set<Item>();

  for (const item of items) {
    if (used.has(item)) {
      continue;
    }

    const group: Item[] = [item];
    used.add(item);

    for (const other of items) {
      if (used.has(other)) {
        continue;
      }

      if (canStackWith(item, other)) {
        group.push(other);
        used.add(other);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * 合并所有可堆叠的物品
 *
 * @param items 物品列表
 * @returns 合并后的物品列表
 */
export function consolidateStacks(items: Item[]): Item[] {
  const groups = groupStackableItems(items);
  const result: Item[] = [];

  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }

    // 按数量排序（大的在前）
    group.sort((a, b) => getCurrentStackSize(b) - getCurrentStackSize(a));

    let current = group[0];
    let maxSize = getMaxStackSize(current);

    for (let i = 1; i < group.length; i++) {
      const next = group[i];
      const mergeResult = mergeStacks(current, next);

      current = mergeResult.merged;

      if (mergeResult.remaining) {
        result.push(mergeResult.remaining);
      }
    }

    result.push(current);
  }

  return result;
}
