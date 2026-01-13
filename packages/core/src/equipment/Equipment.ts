/**
 * Equipment - 装备管理类
 *
 * 参考 Cataclysm-DDA 的 worn 结构
 * 管理角色的所有装备和装备相关计算
 */

import { Map, List } from 'immutable';
import type {
  EquipmentSlotId,
  EquipmentItem,
  EquipmentState,
  EquipResult,
  EquipmentStats,
  SlotConflictResult,
  EquipmentSlotType,
} from './types';
import { EquipmentSlot, AllEquipmentSlots } from './EquipmentSlot';
import { createEquipmentSlotId, EquipmentSlotType as EST } from './types';

/**
 * Equipment - 装备管理类
 *
 * 管理角色的装备槽和已装备的物品
 */
export class Equipment {
  /** 装备槽映射 */
  readonly slots!: Map<EquipmentSlotId, EquipmentSlot>;
  /** 已装备物品（槽位 ID -> 装备列表） */
  readonly equippedItems!: Map<EquipmentSlotId, List<EquipmentItem>>;
  /** 装备统计 */
  readonly stats!: EquipmentStats;

  private constructor(
    slots: Map<EquipmentSlotId, EquipmentSlot>,
    equippedItems: Map<EquipmentSlotId, List<EquipmentItem>>,
    stats: EquipmentStats
  ) {
    this.slots = slots;
    this.equippedItems = equippedItems;
    this.stats = stats;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建空装备管理器
   */
  static create(): Equipment {
    const slots = Map(
      AllEquipmentSlots.map(slot => [slot.id, slot] as [EquipmentSlotId, EquipmentSlot])
    );

    const equippedItems = Map<EquipmentSlotId, List<EquipmentItem>>(
      AllEquipmentSlots.map(slot => [slot.id, List<EquipmentItem>()])
    );

    const stats = Equipment.calculateStats(slots, equippedItems);

    return new Equipment(slots, equippedItems, stats);
  }

  /**
   * 从状态创建
   */
  static fromState(state: EquipmentState): Equipment {
    const slots = Map(
      AllEquipmentSlots.map(slot => [slot.id, slot] as [EquipmentSlotId, EquipmentSlot])
    );

    // state.equippedItems 已经是 Map<EquipmentSlotId, List<EquipmentItem>>
    const equippedItems = state.equippedItems;

    const stats = state.stats;

    return new Equipment(slots, equippedItems, stats);
  }

  // ========== 装备查询 ==========

  /**
   * 获取指定槽位的装备
   */
  getEquippedItems(slotId: EquipmentSlotId): List<EquipmentItem> {
    return this.equippedItems.get(slotId) || List();
  }

  /**
   * 获取指定槽位的装备数量
   */
  getEquippedCount(slotId: EquipmentSlotId): number {
    return this.getEquippedItems(slotId).size;
  }

  /**
   * 检查槽位是否已满
   */
  isSlotFull(slotId: EquipmentSlotId): boolean {
    const slot = this.slots.get(slotId);
    const count = this.getEquippedCount(slotId);
    return slot ? slot.isFull(count) : true;
  }

  /**
   * 获取所有装备
   */
  getAllEquipment(): List<EquipmentItem> {
    return this.equippedItems.valueSeq().flatMap(items => items).toList();
  }

  /**
   * 获取装备总数
   */
  getTotalEquipmentCount(): number {
    return this.getAllEquipment().size;
  }

  // ========== 装备操作 ==========

  /**
   * 装备物品
   */
  equip(item: EquipmentItem, targetSlotId?: EquipmentSlotId): Equipment {
    // 确定目标槽位
    const slotId = targetSlotId || this.findBestSlot(item);
    if (!slotId) {
      throw new Error('无法找到合适的装备槽');
    }

    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error(`装备槽不存在: ${slotId}`);
    }

    // 检查槽位有效性
    if (!slot.isValidLayer(item.layer)) {
      throw new Error(`装备层 ${item.layer} 不适用于槽位 ${slot.name}`);
    }

    // 检查容量
    const currentCount = this.getEquippedCount(slotId);
    if (slot.isFull(currentCount)) {
      throw new Error(`槽位 ${slot.name} 已满`);
    }

    // 装备物品
    const newEquipped = this.equippedItems.update(
      slotId,
      List(),
      items => items.push(item)
    );

    // 重新计算统计
    const newStats = Equipment.calculateStats(this.slots, newEquipped);

    return new Equipment(this.slots, newEquipped, newStats);
  }

  /**
   * 卸下物品
   */
  unequip(itemId: string, slotId: EquipmentSlotId): Equipment {
    const items = this.getEquippedItems(slotId);
    const index = items.findIndex(item => item.itemId === itemId);

    if (index === -1) {
      throw new Error(`物品 ${itemId} 未在槽位 ${slotId} 中`);
    }

    const newEquipped = this.equippedItems.update(
      slotId,
      List(),
      items => items.remove(index)
    );

    // 重新计算统计
    const newStats = Equipment.calculateStats(this.slots, newEquipped);

    return new Equipment(this.slots, newEquipped, newStats);
  }

  /**
   * 卸下所有装备
   */
  unequipAll(): Equipment {
    const emptyEquipped = Map<EquipmentSlotId, List<EquipmentItem>>(
      this.slots.keySeq().map(slotId => [slotId, List()])
    );

    const newStats = Equipment.calculateStats(this.slots, emptyEquipped);

    return new Equipment(this.slots, emptyEquipped, newStats);
  }

  /**
   * 按身体部位卸下装备
   */
  unequipByBodyPart(bodyPart: EquipmentSlotType): Equipment {
    let newEquipped = this.equippedItems;

    for (const [slotId, slot] of this.slots.entries()) {
      if (slot.type === bodyPart) {
        newEquipped = newEquipped.set(slotId, List());
      }
    }

    const newStats = Equipment.calculateStats(this.slots, newEquipped);

    return new Equipment(this.slots, newEquipped, newStats);
  }

  // ========== 槽位查找 ==========

  /**
   * 为物品查找最佳槽位
   */
  findBestSlot(item: EquipmentItem): EquipmentSlotId | null {
    // 首先尝试物品占用的槽位
    for (const slotType of item.occupiesSlots) {
      const slot = this.findSlotByType(slotType);
      if (slot && slot.isValidLayer(item.layer)) {
        const currentCount = this.getEquippedCount(slot.id);
        if (!slot.isFull(currentCount)) {
          return slot.id;
        }
      }
    }

    // 其次尝试覆盖的槽位
    for (const slotType of item.covers) {
      const slot = this.findSlotByType(slotType);
      if (slot && slot.isValidLayer(item.layer)) {
        const currentCount = this.getEquippedCount(slot.id);
        if (!slot.isFull(currentCount)) {
          return slot.id;
        }
      }
    }

    return null;
  }

  /**
   * 按类型查找槽位
   */
  findSlotByType(type: EquipmentSlotType): EquipmentSlot | null {
    for (const slot of this.slots.valueSeq()) {
      if (slot.type === type) {
        return slot;
      }
    }
    return null;
  }

  // ========== 统计计算 ==========

  /**
   * 计算装备统计
   */
  private static calculateStats(
    slots: Map<EquipmentSlotId, EquipmentSlot>,
    equippedItems: Map<EquipmentSlotId, List<EquipmentItem>>
  ): EquipmentStats {
    let armorByBodyPart = Map<EquipmentSlotType, number>();
    let encumbranceByBodyPart = Map<EquipmentSlotType, number>();

    let totalWarmth = 0;
    let totalWeight = 0;
    let totalCapacity = 0;
    let envProtection = 0;
    let speedPenalty = 0;
    let hitPenalty = 0;

    for (const [slotId, items] of equippedItems.entries()) {
      const slot = slots.get(slotId);
      if (!slot) continue;

      for (const item of items) {
        // 累加保暖值
        totalWarmth += item.warmth;

        // 累加重量
        totalWeight += item.weight;

        // 累加容量
        if (item.maxCapacity) {
          totalCapacity += item.maxCapacity;
        }

        // 累加环境保护
        envProtection += item.armor.envProtection;

        // 累加笨重值（按身体部位）
        for (const bodyPart of item.covers) {
          const current = encumbranceByBodyPart.get(bodyPart) || 0;
          encumbranceByBodyPart = encumbranceByBodyPart.set(bodyPart, current + item.encumbrance);
        }

        // 累加护甲值（按身体部位）
        for (const bodyPart of item.covers) {
          const current = armorByBodyPart.get(bodyPart) || 0;
          armorByBodyPart = armorByBodyPart.set(
            bodyPart,
            current + item.armor.coverage * item.armor.thickness
          );
        }
      }
    }

    // 计算速度惩罚（基于总笨重值）
    const totalEncumbrance = encumbranceByBodyPart.valueSeq().reduce((sum, val) => sum + val, 0);
    speedPenalty = Math.floor(totalEncumbrance / 10);

    // 计算命中惩罚（基于手部笨重值）
    const handEncumbrance = encumbranceByBodyPart.get(EST.HANDS) || 0;
    hitPenalty = Math.floor(handEncumbrance / 5);

    return {
      armorByBodyPart,
      encumbranceByBodyPart,
      totalWarmth,
      totalWeight,
      totalCapacity,
      envProtection,
      speedPenalty,
      hitPenalty,
    };
  }

  /**
   * 获取身体部位护甲值
   */
  getArmorForBodyPart(bodyPart: EquipmentSlotType): number {
    return this.stats.armorByBodyPart.get(bodyPart) || 0;
  }

  /**
   * 获取身体部位笨重值
   */
  getEncumbranceForBodyPart(bodyPart: EquipmentSlotType): number {
    return this.stats.encumbranceByBodyPart.get(bodyPart) || 0;
  }

  // ========== 显示方法 ==========

  /**
   * 获取装备列表字符串
   */
  getEquipmentListString(): string {
    const lines: string[] = [];

    for (const [slotId, slot] of this.slots.entries()) {
      const items = this.getEquippedItems(slotId);
      if (items.isEmpty()) continue;

      lines.push(`\n${slot.name}:`);
      for (const item of items) {
        lines.push(`  - ${item.itemName} (${item.layer})`);
        lines.push(`    护甲: ${item.armor.coverage}% 覆盖, ${item.armor.thickness} 厚度`);
        lines.push(`    笨重: ${item.encumbrance}, 保暖: ${item.warmth}`);
      }
    }

    return lines.join('\n') || '未装备任何物品';
  }

  /**
   * 获取统计信息字符串
   */
  getStatsString(): string {
    const lines: string[] = [
      '=== 装备统计 ===',
      `总保暖值: ${this.stats.totalWarmth}`,
      `总重量: ${this.stats.totalWeight}`,
      `总容量: ${this.stats.totalCapacity}`,
      `环境保护: ${this.stats.envProtection}%`,
      `速度惩罚: -${this.stats.speedPenalty}%`,
      `命中惩罚: -${this.stats.hitPenalty}%`,
      '',
      '=== 身体部位护甲 ===',
    ];

    for (const [bodyPart, armor] of this.stats.armorByBodyPart) {
      const encumbrance = this.stats.encumbranceByBodyPart.get(bodyPart) || 0;
      lines.push(`${bodyPart}: ${Math.floor(armor)} 护甲, ${encumbrance} 笨重`);
    }

    return lines.join('\n');
  }

  // ========== 序列化 ==========

  /**
   * 转换为状态对象
   */
  toState(): EquipmentState {
    return {
      equippedItems: this.equippedItems,
      stats: this.stats,
    };
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    // 将 Immutable.Map 转换为普通对象用于 JSON 序列化
    const equippedObj: Record<string, EquipmentItem[]> = {};
    for (const [slotId, items] of this.equippedItems.entries()) {
      equippedObj[slotId] = items.toArray();
    }

    return {
      slots: this.slots.valueSeq().map(slot => slot.toJson()).toArray(),
      equippedItems: equippedObj,
      stats: this.stats,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): Equipment {
    // 将普通对象转换为 Immutable.Map
    const equippedMap = Map<EquipmentSlotId, List<EquipmentItem>>(
      Object.entries(json.equippedItems).map(([slotId, items]) => [
        slotId as EquipmentSlotId,
        List(items as EquipmentItem[]),
      ])
    );

    const state: EquipmentState = {
      equippedItems: equippedMap,
      stats: json.stats as EquipmentStats,
    };

    return Equipment.fromState(state);
  }
}
