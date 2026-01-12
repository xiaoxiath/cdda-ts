/**
 * ItemPocket - 物品容器（单个 pocket）
 *
 * 参考 Cataclysm-DDA 的 item_pocket.h
 * 表示物品的一个容器槽位
 */

import { List } from 'immutable';
import type {
  Mass,
  Volume,
  PocketType,
  ContainCode,
  ItemTypeId,
} from './types';
import { Item } from './Item';

// ============ 容器检查结果 ============

/**
 * 容器检查结果
 */
export interface ContainResult {
  code: ContainCode;
  message?: string;
}

// ============ ItemPocket 属性接口 ============

export interface ItemPocketProps {
  // pocket 类型
  type: PocketType;

  // 容量限制
  volumeCapacity: Volume;
  weightCapacity: Mass;

  // 限制条件
  maxSize?: Volume;        // 最大物品体积
  minSize?: Volume;        // 最小物品体积
  allowedItems?: Set<ItemTypeId>;  // 允许的物品类型
  forbiddenItems?: Set<ItemTypeId>; // 禁止的物品类型
  allowedFlags?: Set<string>;      // 允许的物品标志
  requiredFlags?: Set<string>;     // 必需的物品标志

  // 物品数据
  items: List<Item>;

  // 特殊属性
  sealable?: boolean;       // 是否可密封
  sealed?: boolean;         // 是否已密封
  waterproof?: boolean;     // 是否防水
  airtight?: boolean;       // 是否气密
  gasproof?: boolean;       // 是否防气

  // 玩家设置
  favoriteSettings?: {
    allow?: Set<ItemTypeId>;
    forbid?: Set<ItemTypeId>;
  };
}

// ============ ItemPocket 类 ============

/**
 * ItemPocket - 物品容器类
 *
 * 表示物品的一个容器槽位
 */
export class ItemPocket {
  readonly type: PocketType;
  readonly volumeCapacity: Volume;
  readonly weightCapacity: Mass;
  readonly maxSize?: Volume;
  readonly minSize?: Volume;
  readonly allowedItems?: Set<ItemTypeId>;
  readonly forbiddenItems?: Set<ItemTypeId>;
  readonly allowedFlags?: Set<string>;
  readonly requiredFlags?: Set<string>;
  readonly items: List<Item>;
  readonly sealable?: boolean;
  readonly sealed?: boolean;
  readonly waterproof?: boolean;
  readonly airtight?: boolean;
  readonly gasproof?: boolean;
  readonly favoriteSettings?: {
    allow?: Set<ItemTypeId>;
    forbid?: Set<ItemTypeId>;
  };

  constructor(props: ItemPocketProps) {
    this.type = props.type;
    this.volumeCapacity = props.volumeCapacity;
    this.weightCapacity = props.weightCapacity;
    this.maxSize = props.maxSize;
    this.minSize = props.minSize;
    this.allowedItems = props.allowedItems;
    this.forbiddenItems = props.forbiddenItems;
    this.allowedFlags = props.allowedFlags;
    this.requiredFlags = props.requiredFlags;
    this.items = props.items || List();
    this.sealable = props.sealable;
    this.sealed = props.sealed;
    this.waterproof = props.waterproof;
    this.airtight = props.airtight;
    this.gasproof = props.gasproof;
    this.favoriteSettings = props.favoriteSettings;
  }

  // ============ 类型检查 ============

  /**
   * 检查是否为容器
   */
  isContainer(): boolean {
    return this.type === PocketType.CONTAINER;
  }

  /**
   * 检查是否为弹匣
   */
  isMagazine(): boolean {
    return this.type === PocketType.MAGAZINE;
  }

  /**
   * 检查是否为弹匣槽
   */
  isMagazineWell(): boolean {
    return this.type === PocketType.MAGAZINE_WELL;
  }

  /**
   * 检查是否为改装件槽
   */
  isMod(): boolean {
    return this.type === PocketType.MOD;
  }

  /**
   * 检查是否为尸体容器
   */
  isCorpse(): boolean {
    return this.type === PocketType.CORPSE;
  }

  /**
   * 检查是否为软件容器
   */
  isSoftware(): boolean {
    return this.type === PocketType.SOFTWARE;
  }

  /**
   * 检查是否为电子文件存储
   */
  isEfileStorage(): boolean {
    return this.type === PocketType.E_FILE_STORAGE;
  }

  /**
   * 检查是否为电子书
   */
  isEbook(): boolean {
    return this.type === PocketType.EBOOK;
  }

  // ============ 容量查询 ============

  /**
   * 获取容量（体积）
   */
  getCapacity(): Volume {
    return this.volumeCapacity;
  }

  /**
   * 获取剩余容量（体积）
   */
  getRemainingCapacity(): Volume {
    const used = this.items.reduce((sum, item) => sum + item.getVolume(), 0);
    return Math.max(this.volumeCapacity - used, 0);
  }

  /**
   * 获取已用容量（体积）
   */
  getUsedCapacity(): Volume {
    return this.items.reduce((sum, item) => sum + item.getVolume(), 0);
  }

  /**
   * 获取重量容量
   */
  getWeightCapacity(): Mass {
    return this.weightCapacity;
  }

  /**
   * 获取剩余重量容量
   */
  getRemainingWeight(): Mass {
    const used = this.getWeight();
    return Math.max(this.weightCapacity - used, 0);
  }

  /**
   * 获取当前内容物重量
   */
  getWeight(): Mass {
    return this.items.reduce((sum, item) => sum + item.getWeight(), 0);
  }

  /**
   * 获取物品数量
   */
  getItemCount(): number {
    return this.items.size;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.items.isEmpty();
  }

  /**
   * 检查是否已满
   */
  isFull(): boolean {
    return this.getRemainingCapacity() <= 0 || this.getRemainingWeight() <= 0;
  }

  // ============ 物品查询 ============

  /**
   * 获取所有物品
   */
  getItems(): Item[] {
    return this.items.toArray();
  }

  /**
   * 获取指定索引的物品
   */
  getItemAt(index: number): Item | undefined {
    return this.items.get(index);
  }

  /**
   * 查找物品
   */
  findItem(predicate: (item: Item) => boolean): Item | undefined {
    return this.items.find(predicate);
  }

  /**
   * 检查是否包含指定物品
   */
  contains(item: Item): boolean {
    return this.items.includes(item);
  }

  /**
   * 统计指定类型物品的数量
   */
  countItem(typeId: string): number {
    return this.items.filter(item => item.id === typeId).size;
  }

  // ============ 容器检查 ============

  /**
   * 检查是否可以容纳指定物品
   */
  canContain(item: Item): ContainResult {
    // 检查体积
    const itemVolume = item.getVolume();
    if (this.maxSize !== undefined && itemVolume > this.maxSize) {
      return { code: ContainCode.ERR_TOO_BIG, message: 'Item too large' };
    }
    if (this.minSize !== undefined && itemVolume < this.minSize) {
      return { code: ContainCode.ERR_TOO_SMALL, message: 'Item too small' };
    }

    // 检查剩余容量
    if (itemVolume > this.getRemainingCapacity()) {
      return { code: ContainCode.ERR_NO_SPACE, message: 'Not enough space' };
    }

    // 检查重量
    const itemWeight = item.getWeight();
    if (itemWeight > this.getRemainingWeight()) {
      return { code: ContainCode.ERR_TOO_HEAVY, message: 'Item too heavy' };
    }

    // 检查类型限制
    if (this.forbiddenItems?.has(item.id)) {
      return { code: ContainCode.ERR_FLAG, message: 'Item type forbidden' };
    }

    if (this.allowedItems && !this.allowedItems.has(item.id)) {
      return { code: ContainCode.ERR_FLAG, message: 'Item type not allowed' };
    }

    // 检查标志限制
    if (this.requiredFlags) {
      for (const flag of this.requiredFlags) {
        if (!item.hasFlag(flag as any)) {
          return { code: ContainCode.ERR_FLAG, message: `Missing required flag: ${flag}` };
        }
      }
    }

    if (this.allowedFlags) {
      let hasAllowedFlag = false;
      for (const flag of this.allowedFlags) {
        if (item.hasFlag(flag as any)) {
          hasAllowedFlag = true;
          break;
        }
      }
      if (!hasAllowedFlag) {
        return { code: ContainCode.ERR_FLAG, message: 'Item does not have required flag' };
      }
    }

    // 检查液体/气体
    if (item.hasFlag('LIQUID' as any) && !this.waterproof && !this.airtight) {
      return { code: ContainCode.ERR_LIQUID, message: 'Container not waterproof' };
    }

    if (item.hasFlag('GAS' as any) && !this.gasproof && !this.airtight) {
      return { code: ContainCode.ERR_GAS, message: 'Container not gasproof' };
    }

    // 检查密封
    if (this.sealed) {
      return { code: ContainCode.ERR_FLAG, message: 'Container is sealed' };
    }

    // 检查玩家设置
    if (this.favoriteSettings?.forbid?.has(item.id)) {
      return { code: ContainCode.ERR_FLAG, message: 'Item is forbidden by user' };
    }

    return { code: ContainCode.SUCCESS };
  }

  // ============ 物品操作 ============

  /**
   * 添加物品
   */
  addItem(item: Item): ItemPocket {
    const result = this.canContain(item);
    if (result.code !== ContainCode.SUCCESS) {
      throw new Error(result.message);
    }

    return new ItemPocket({
      ...this,
      items: this.items.push(item),
    });
  }

  /**
   * 移除物品
   */
  removeItem(item: Item): ItemPocket {
    const index = this.items.indexOf(item);
    if (index === -1) {
      return this;
    }

    return new ItemPocket({
      ...this,
      items: this.items.delete(index),
    });
  }

  /**
   * 移除指定索引的物品
   */
  removeItemAt(index: number): ItemPocket {
    return new ItemPocket({
      ...this,
      items: this.items.delete(index),
    });
  }

  /**
   * 清空所有物品
   */
  clear(): ItemPocket {
    return new ItemPocket({
      ...this,
      items: List(),
    });
  }

  // ============ 密封操作 ============

  /**
   * 检查是否可密封
   */
  isSealable(): boolean {
    return this.sealable || false;
  }

  /**
   * 检查是否已密封
   */
  isSealed(): boolean {
    return this.sealed || false;
  }

  /**
   * 密封容器
   */
  seal(): ItemPocket {
    if (!this.sealable) {
      throw new Error('Pocket is not sealable');
    }

    return new ItemPocket({
      ...this,
      sealed: true,
    });
  }

  /**
   * 解封容器
   */
  unseal(): ItemPocket {
    if (!this.sealable) {
      throw new Error('Pocket is not sealable');
    }

    return new ItemPocket({
      ...this,
      sealed: false,
    });
  }

  // ============ 工厂方法 ============

  /**
   * 创建通用容器 pocket
   */
  static createContainer(volume: Volume, weight?: Mass): ItemPocket {
    return new ItemPocket({
      type: PocketType.CONTAINER,
      volumeCapacity: volume,
      weightCapacity: weight || volume * 2, // 默认密度为 2g/ml
      items: List(),
    });
  }

  /**
   * 创建弹匣 pocket
   */
  static createMagazine(volume: Volume, capacity: number): ItemPocket {
    return new ItemPocket({
      type: PocketType.MAGAZINE,
      volumeCapacity: volume,
      weightCapacity: volume * 2,
      maxSize: volume / capacity, // 单发弹药的最大体积
      items: List(),
    });
  }

  /**
   * 创建改装件 pocket
   */
  static createMod(): ItemPocket {
    return new ItemPocket({
      type: PocketType.MOD,
      volumeCapacity: 1000,
      weightCapacity: 2000,
      items: List(),
    });
  }

  /**
   * 创建软件 pocket
   */
  static createSoftware(): ItemPocket {
    return new ItemPocket({
      type: PocketType.SOFTWARE,
      volumeCapacity: 100,
      weightCapacity: 10,
      items: List(),
    });
  }

  /**
   * 创建电子书 pocket
   */
  static createEbook(): ItemPocket {
    return new ItemPocket({
      type: PocketType.EBOOK,
      volumeCapacity: 1000,
      weightCapacity: 500,
      items: List(),
    });
  }

  /**
   * 创建尸体 pocket
   */
  static createCorpse(): ItemPocket {
    return new ItemPocket({
      type: PocketType.CORPSE,
      volumeCapacity: 50000,
      weightCapacity: 100000,
      items: List(),
      sealable: true,
    });
  }
}
