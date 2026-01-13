/**
 * ItemFactory - 物品工厂类
 *
 * 参考 Cataclysm-DDA 的 item_factory.h
 * 管理所有物品类型和物品组
 */

import { Map, List, Set } from 'immutable';
import type { ItemFlagType, QualityId } from './types';
import type {
  ItemTypeId,
  ItemGroupId,
  JsonObject,
} from './types';
import { ItemType } from './ItemType';
import { Item } from './Item';

// ============ 迁移数据 ============

/**
 * 版本迁移数据
 */
export interface Migration {
  id: ItemTypeId;           // 旧 ID
  replace: ItemTypeId;      // 新 ID
  variant?: string;         // 变体
  charges?: number;         // 电量
  contents?: any[];         // 内容物
  resetItemVars?: boolean;  // 重置变量
}

// ============ ItemFactory 属性接口 ============

export interface ItemFactoryProps {
  // 物品类型存储
  itemTypes: Map<ItemTypeId, ItemType>;

  // 抽象模板（用于 copy-from）
  abstracts: Map<string, ItemType>;

  // 物品组
  itemGroups: Map<ItemGroupId, ItemGroup>;

  // 版本迁移
  migrations: Map<ItemTypeId, Migration>;

  // 运行时创建的物品类型
  runtimes: Map<ItemTypeId, ItemType>;

  // 版本号（用于缓存失效）
  version: number;
}

// ============ 物品组 ============

/**
 * 物品组类型
 */
export enum ItemGroupType {
  COLLECTION = 'COLLECTION',   // 收集型 - 全部尝试
  DISTRIBUTION = 'DISTRIBUTION', // 分布型 - 选择一个
}

/**
 * 物品组条目
 */
export interface ItemGroupEntry {
  itemId?: ItemTypeId;
  itemGroupId?: ItemGroupId;
  probability?: number;
  count?: number | [number, number];
  charges?: number | [number, number];
  damage?: number | [number, number];
  damageMin?: number;
  damageMax?: number;
  itemIdFilter?: string[];     // ID 过滤器
  itemTagFilter?: string[];     // 标签过滤器
  containerItemId?: string;    // 容器物品 ID
}

/**
 * 物品组
 */
export interface ItemGroup {
  id: ItemGroupId;
  type: ItemGroupType;
  entries: ItemGroupEntry[];
  subtype?: string;
  itemId?: string;             // 单一物品类型的组
}

// ============ ItemFactory 类 ============

/**
 * ItemFactory - 物品工厂类
 *
 * 管理所有物品类型和物品组
 */
export class ItemFactory {
  private itemTypes: Map<ItemTypeId, ItemType>;
  private abstracts: Map<string, ItemType>;
  private itemGroups: Map<ItemGroupId, ItemGroup>;
  private migrations: Map<ItemTypeId, Migration>;
  private runtimes: Map<ItemTypeId, ItemType>;
  private version: number;

  constructor(props?: ItemFactoryProps) {
    this.itemTypes = props?.itemTypes || Map();
    this.abstracts = props?.abstracts || Map();
    this.itemGroups = props?.itemGroups || Map();
    this.migrations = props?.migrations || Map();
    this.runtimes = props?.runtimes || Map();
    this.version = props?.version || 0;
  }

  // ============ 版本管理 ============

  /**
   * 获取当前版本号
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * 增加版本号
   */
  incrementVersion(): void {
    this.version++;
  }

  // ============ 物品类型管理 ============

  /**
   * 检查是否有指定物品类型
   */
  hasType(id: ItemTypeId): boolean {
    return this.itemTypes.has(id) || this.runtimes.has(id);
  }

  /**
   * 获取物品类型
   */
  getType(id: ItemTypeId): ItemType | null {
    return this.itemTypes.get(id) || this.runtimes.get(id) || null;
  }

  /**
   * 获取所有物品类型
   */
  getAllTypes(): ItemType[] {
    return [...this.itemTypes.values(), ...this.runtimes.values()];
  }

  /**
   * 添加物品类型
   */
  addType(type: ItemType): ItemFactory {
    this.incrementVersion();
    return new ItemFactory({
      ...this.getState(),
      itemTypes: this.itemTypes.set(type.id, type),
    });
  }

  /**
   * 批量添加物品类型
   */
  addTypes(types: ItemType[]): ItemFactory {
    let newFactory: ItemFactory = this;
    for (const type of types) {
      newFactory = newFactory.addType(type);
    }
    return newFactory;
  }

  /**
   * 移除物品类型
   */
  removeType(id: ItemTypeId): ItemFactory {
    this.incrementVersion();
    return new ItemFactory({
      ...this.getState(),
      itemTypes: this.itemTypes.delete(id),
    });
  }

  // ============ 抽象模板管理 ============

  /**
   * 添加抽象模板（用于 copy-from）
   */
  addAbstract(name: string, type: ItemType): ItemFactory {
    return new ItemFactory({
      ...this.getState(),
      abstracts: this.abstracts.set(name, type),
    });
  }

  /**
   * 获取抽象模板
   */
  getAbstract(name: string): ItemType | null {
    return this.abstracts.get(name) || null;
  }

  // ============ 运行时类型管理 ============

  /**
   * 创建运行时物品类型
   * 注意：这个方法会修改内部状态，返回新的 ItemFactory 实例
   */
  createRuntimeType(
    id: ItemTypeId,
    name: string,
    description?: string
  ): ItemFactory {
    const type = ItemType.create({
      id,
      name,
      description,
      weight: 0,
      volume: 0,
      category: 'MISCELLANEOUS' as any,
      material: [],
      flags: Set<ItemFlagType>(),
      qualities: Map<QualityId, number>(),
    });

    return new ItemFactory({
      ...this.getState(),
      runtimes: this.runtimes.set(id, type),
      version: this.version + 1,
    });
  }

  /**
   * 获取运行时物品类型
   */
  getRuntimeType(id: ItemTypeId): ItemType | null {
    return this.runtimes.get(id) || null;
  }

  // ============ 物品组管理 ============

  /**
   * 添加物品组
   */
  addGroup(group: ItemGroup): ItemFactory {
    return new ItemFactory({
      ...this.getState(),
      itemGroups: this.itemGroups.set(group.id, group),
    });
  }

  /**
   * 获取物品组
   */
  getGroup(id: ItemGroupId): ItemGroup | null {
    return this.itemGroups.get(id) || null;
  }

  /**
   * 从物品组创建物品
   */
  createItemFromGroup(groupId: ItemGroupId): Item | null {
    const group = this.getGroup(groupId);
    if (!group) return null;

    // TODO: 实现随机选择逻辑
    if (group.entries.length === 0) return null;

    const entry = group.entries[0];
    if (entry.itemId) {
      const type = this.getType(entry.itemId);
      if (type) {
        return Item.create(type);
      }
    }

    return null;
  }

  // ============ 迁移管理 ============

  /**
   * 添加迁移
   */
  addMigration(migration: Migration): ItemFactory {
    return new ItemFactory({
      ...this.getState(),
      migrations: this.migrations.set(migration.id, migration),
    });
  }

  /**
   * 迁移物品 ID
   */
  migrateId(id: ItemTypeId): ItemTypeId {
    const migration = this.migrations.get(id);
    return migration ? migration.replace : id;
  }

  /**
   * 迁移物品
   */
  migrateItem(id: ItemTypeId, item: Item): Item {
    const migration = this.migrations.get(id);
    if (!migration) return item;

    let migrated = item;

    if (migration.replace) {
      const newType = this.getType(migration.replace);
      if (newType) {
        migrated = migrated.convertTo(newType);
      }
    }

    if (migration.charges !== undefined) {
      // TODO: 设置 charges
    }

    if (migration.resetItemVars) {
      // TODO: 重置变量
    }

    return migrated;
  }

  // ============ 物品创建 ============

  /**
   * 创建物品实例
   */
  createItem(typeId: ItemTypeId): Item | null {
    // 先尝试迁移 ID
    const migratedId = this.migrateId(typeId);
    const type = this.getType(migratedId);

    if (!type) {
      console.warn(`Unknown item type: ${typeId}`);
      return null;
    }

    return Item.create(type);
  }

  /**
   * 创建带有电荷的物品
   */
  createItemWithCharges(typeId: ItemTypeId, charges: number): Item | null {
    const item = this.createItem(typeId);
    return item ? item.set('charges', charges) : null;
  }

  // ============ 内部状态 ============

  /**
   * 获取当前状态（用于创建新实例）
   */
  private getState(): ItemFactoryProps {
    return {
      itemTypes: this.itemTypes,
      abstracts: this.abstracts,
      itemGroups: this.itemGroups,
      migrations: this.migrations,
      runtimes: this.runtimes,
      version: this.version,
    };
  }

  // ============ 工厂方法 ============

  /**
   * 创建空的 ItemFactory
   */
  static create(): ItemFactory {
    return new ItemFactory();
  }

  /**
   * 从类型列表创建 ItemFactory
   */
  static fromTypes(types: ItemType[]): ItemFactory {
    const factory = ItemFactory.create();
    return factory.addTypes(types);
  }

  /**
   * 从 JSON 数组创建 ItemFactory
   */
  static async fromJsonArray(
    jsonArray: JsonObject[],
    parser: (json: JsonObject) => ItemType | null
  ): Promise<ItemFactory> {
    const factory = ItemFactory.create();
    const types: ItemType[] = [];

    for (const json of jsonArray) {
      try {
        const type = parser(json);
        if (type) {
          types.push(type);
        }
      } catch (error) {
        console.error('Failed to parse item type:', error);
      }
    }

    return factory.addTypes(types);
  }
}
