/**
 * ItemContents - 物品内容管理系统
 *
 * 参考 Cataclysm-DDA 的 item_contents.h
 * 管理物品的容器内容，支持嵌套容器
 */

import { List, Map } from 'immutable';
import type {
  Mass,
  Volume,
  ContainCode,
  VisitorFunction,
  VisitResponse,
} from './types';
import { Item } from './Item';
import { ItemPocket } from './ItemPocket';

// ============ ItemContents 属性接口 ============

export interface ItemContentsProps {
  pockets: List<ItemPocket>;
}

// ============ 辅助类型 ============

/**
 * 容器查找结果
 */
export interface PocketMatch {
  pocket: ItemPocket;
  index: number;
  remainingVolume: Volume;
  remainingWeight: Mass;
}

// ============ ItemContents 类 ============

/**
 * ItemContents - 物品内容管理类
 *
 * 管理物品的所有容器（pockets）
 */
export class ItemContents {
  private readonly pockets: List<ItemPocket>;

  constructor(props?: ItemContentsProps) {
    this.pockets = props?.pockets || List();
  }

  // ============ 基础属性 ============

  /**
   * 获取所有 pockets
   */
  getPockets(): List<ItemPocket> {
    return this.pockets;
  }

  /**
   * 获取 pocket 数量
   */
  getPocketCount(): number {
    return this.pockets.size;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.pockets.every(pocket => pocket.isEmpty());
  }

  /**
   * 获取总物品数量
   */
  getItemCount(): number {
    return this.pockets.reduce((count, pocket) => count + pocket.getItemCount(), 0);
  }

  // ============ 容量查询 ============

  /**
   * 获取总容量（体积）
   */
  getTotalCapacity(): Volume {
    return this.pockets.reduce((capacity, pocket) => capacity + pocket.getCapacity(), 0);
  }

  /**
   * 获取剩余容量（体积）
   */
  getRemainingCapacity(): Volume {
    return this.pockets.reduce((capacity, pocket) => capacity + pocket.getRemainingCapacity(), 0);
  }

  /**
   * 获取已用容量（体积）
   */
  getUsedCapacity(): Volume {
    return this.pockets.reduce((capacity, pocket) => capacity + pocket.getUsedCapacity(), 0);
  }

  /**
   * 获取总容量（重量）
   */
  getTotalWeightCapacity(): Mass {
    return this.pockets.reduce((capacity, pocket) => capacity + pocket.getWeightCapacity(), 0);
  }

  /**
   * 获取剩余容量（重量）
   */
  getRemainingWeightCapacity(): Mass {
    return this.pockets.reduce((capacity, pocket) => capacity + pocket.getRemainingWeight(), 0);
  }

  /**
   * 获取内容物总重量
   */
  getWeight(): Mass {
    return this.pockets.reduce((weight, pocket) => weight + pocket.getWeight(), 0);
  }

  // ============ 容器查询 ============

  /**
   * 查找可以容纳指定物品的 pocket
   */
  findPocketFor(item: Item): PocketMatch | null {
    for (let i = 0; i < this.pockets.size; i++) {
      const pocket = this.pockets.get(i)!;
      const result = pocket.canContain(item);

      if (result.code === ContainCode.SUCCESS) {
        return {
          pocket,
          index: i,
          remainingVolume: pocket.getRemainingCapacity(),
          remainingWeight: pocket.getRemainingWeight(),
        };
      }
    }

    return null;
  }

  /**
   * 查找所有包含指定类型物品的 pockets
   */
  findPocketsWith(predicate: (pocket: ItemPocket) => boolean): ItemPocket[] {
    const results: ItemPocket[] = [];

    this.pockets.forEach(pocket => {
      if (predicate(pocket)) {
        results.push(pocket);
      }
    });

    return results;
  }

  // ============ 特定查询方法 ============

  /**
   * 获取所有改装件
   */
  getMods(): Item[] {
    const mods: Item[] = [];
    this.pockets.forEach(pocket => {
      if (pocket.isMod()) {
        pocket.getItems().forEach(item => mods.push(item));
      }
    });
    return mods;
  }

  /**
   * 获取所有电子书
   */
  getEbooks(): Item[] {
    const ebooks: Item[] = [];
    this.pockets.forEach(pocket => {
      if (pocket.isEbook()) {
        pocket.getItems().forEach(item => ebooks.push(item));
      }
    });
    return ebooks;
  }

  /**
   * 获取当前弹匣
   */
  getCurrentMagazine(): Item | null {
    for (const pocket of this.pockets) {
      if (pocket.isMagazine() || pocket.isMagazineWell()) {
        const items = pocket.getItems();
        if (items.length > 0) {
          return items[0];
        }
      }
    }
    return null;
  }

  // ============ 物品操作 ============

  /**
   * 添加物品
   */
  addItem(item: Item): ItemContents {
    // 尝试找到合适的 pocket
    const match = this.findPocketFor(item);

    if (match) {
      const newPockets = this.pockets.set(match.index, match.pocket.addItem(item));
      return new ItemContents({ pockets: newPockets });
    }

    // 没找到合适的 pocket，返回未修改的实例
    return this;
  }

  /**
   * 移除物品
   */
  removeItem(item: Item): ItemContents {
    let newPockets = this.pockets;

    this.pockets.forEach((pocket, index) => {
      if (pocket.contains(item)) {
        newPockets = newPockets.set(index, pocket.removeItem(item));
      }
    });

    return new ItemContents({ pockets: newPockets });
  }

  /**
   * 清空所有物品
   */
  clearAll(): ItemContents {
    const newPockets = this.pockets.map(pocket => pocket.clear());
    return new ItemContents({ pockets: newPockets });
  }

  // ============ 访问者模式 ============

  /**
   * 访问所有物品
   */
  visitItems(visitor: VisitorFunction, parent: Item | null = null): VisitResponse {
    for (const pocket of this.pockets) {
      const items = pocket.getItems();

      for (const item of items) {
        const response = visitor(item, parent);

        if (response === VisitResponse.ABORT) {
          return VisitResponse.ABORT;
        }

        if (response === VisitResponse.SKIP) {
          continue;
        }

        // 递归访问子物品
        const subResponse = item.contents.visitItems(visitor, item);
        if (subResponse === VisitResponse.ABORT) {
          return VisitResponse.ABORT;
        }
      }
    }

    return VisitResponse.NEXT;
  }

  // ============ 序列化 ============

  /**
   * 转换为 JSON 对象
   */
  toJson(): Record<string, any>[] {
    const items: Record<string, any>[] = [];

    this.visitItems((item) => {
      items.push({
        id: item.id,
        charges: item.charges,
        damage: item.damage,
        active: item.active,
        temperature: item.temperature,
      });
      return VisitResponse.NEXT;
    });

    return items;
  }

  // ============ 工厂方法 ============

  /**
   * 创建空的 ItemContents
   */
  static empty(): ItemContents {
    return new ItemContents();
  }

  /**
   * 从 pocket 列表创建
   */
  static fromPockets(pockets: ItemPocket[]): ItemContents {
    return new ItemContents({
      pockets: List(pockets),
    });
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>[], types: Map<string, ItemType>): ItemContents {
    const contents = ItemContents.empty();

    for (const itemJson of json) {
      try {
        const item = Item.fromJson(itemJson, types);
        // TODO: 添加到合适的 pocket
      } catch (error) {
        console.error('Failed to load item:', error);
      }
    }

    return contents;
  }
}
