/**
 * Item - 物品实例类
 *
 * 参考 Cataclysm-DDA 的 item.h
 * 代表游戏中的实际物品对象，每个物品都有一个 ItemType
 */

import { Record } from 'immutable';
import type { Tripoint } from '../coordinates';
import type { TimePoint } from '../types/common';
import type {
  ItemTypeId,
  ItemVars,
  ItemFlagType,
  Mass,
  Volume,
} from './types';
import { ItemType } from './ItemType';
import { ItemContents } from './ItemContents';

// ============ Item 属性接口 ============

export interface ItemProps {
  // 类型引用
  type: ItemType;

  // 实例属性
  charges?: number;           // 可计数的物品（弹药、食物等）
  damage?: number;            // 伤害状态 (0-4000)
  bday?: TimePoint;           // 生日（创建时间）
  itemVars?: ItemVars;        // 物品变量（运行时状态）

  // 内容物
  contents?: ItemContents;

  // 标签
  tag?: number;               // 物品标签（用于追踪）

  // 激活状态
  active?: boolean;           // 是否激活（工具、护甲等）
  frequency?: number;         // 使用频率

  // 温度
  temperature?: number;       // 当前温度
  tempSpecific?: boolean;     // 是否有特定温度
  burnt?: number;            // 烧伤程度
  frozen?: number;           // 冻结程度

  // 其他
  owned?: boolean;           // 是否拥有
  missionOwner?: boolean;    // 任务物品
  light?: number;            // 发光强度
  snip?: string;             // 描述片段
  corpse?: {
    id: string;
    name: string;
    transformTime?: number;
  };
}

// ============ Item 类 ============

/**
 * Item - 物品实例类
 *
 * 使用 Immutable.js Record 实现不可变数据结构
 */
export class Item extends Record<ItemProps> {
  // ============ 基础属性访问器 ============

  get type(): ItemType {
    return this.get('type');
  }

  get id(): ItemTypeId {
    return this.type.id;
  }

  get name(): string {
    return this.type.name;
  }

  get description(): string {
    return this.type.description;
  }

  get charges(): number {
    return this.get('charges') || 0;
  }

  get damage(): number {
    return this.get('damage') || 0;
  }

  get bday(): TimePoint | undefined {
    return this.get('bday');
  }

  get itemVars(): ItemVars {
    return this.get('itemVars') || new Map();
  }

  get contents(): ItemContents {
    return this.get('contents') || new ItemContents();
  }

  get tag(): number | undefined {
    return this.get('tag');
  }

  get active(): boolean {
    return this.get('active') || false;
  }

  get temperature(): number {
    return this.get('temperature') || 20;
  }

  get light(): number {
    return this.get('light') || 0;
  }

  // ============ 类型检查快捷方法 ============

  isTool(): boolean {
    return this.type.isTool();
  }

  isComestible(): boolean {
    return this.type.isComestible();
  }

  isArmor(): boolean {
    return this.type.isArmor();
  }

  isGun(): boolean {
    return this.type.isGun();
  }

  isAmmo(): boolean {
    return this.type.isAmmo();
  }

  isBook(): boolean {
    return this.type.isBook();
  }

  isMod(): boolean {
    return this.type.isMod();
  }

  isBionic(): boolean {
    return this.type.isBionic();
  }

  isEngine(): boolean {
    return this.type.isEngine();
  }

  isWheel(): boolean {
    return this.type.isWheel();
  }

  isFurniture(): boolean {
    return this.type.isFurniture();
  }

  isCorpse(): boolean {
    return this.get('corpse') !== undefined;
  }

  // ============ 标志检查快捷方法 ============

  hasFlag(flag: ItemFlagType): boolean {
    return this.type.hasFlag(flag);
  }

  hasAnyFlag(...flags: ItemFlagType[]): boolean {
    return this.type.hasAnyFlag(...flags);
  }

  hasAllFlags(...flags: ItemFlagType[]): boolean {
    return this.type.hasAllFlags(...flags);
  }

  // ============ 物品状态方法 ============

  /**
   * 检查物品是否损坏
   */
  isDamaged(): boolean {
    return this.damage > 0;
  }

  /**
   * 检查物品是否为空的（无弹药、无电量等）
   */
  isEmpty(): boolean {
    if (this.charges > 0) return false;
    return this.contents.isEmpty();
  }

  /**
   * 检查物品是否有弹药
   */
  hasAmmo(): boolean {
    if (this.charges > 0) return true;
    // TODO: 检查弹匣中的弹药
    return false;
  }

  /**
   * 检查物品是否可用
   */
  isUsable(): boolean {
    return this.type.hasFlag('ALLOWS_REMOTE_USE') ||
           (this.type.isTool() && this.charges > 0);
  }

  /**
   * 检查物品是否已损坏到无法使用
   */
  isBroken(): boolean {
    // TODO: 根据物品类型的最大伤害值判断
    return this.damage >= 4000;
  }

  // ============ 物品操作方法 ============

  /**
   * 消耗一个单位（弹药、电量、食物等）
   */
  consumeOne(): Item {
    if (this.charges > 0) {
      return this.set('charges', this.charges - 1);
    }
    return this;
  }

  /**
   * 增加伤害
   */
  addDamage(amount: number): Item {
    return this.set('damage', Math.min(this.damage + amount, 4000));
  }

  /**
   * 修复物品
   */
  repair(amount: number): Item {
    return this.set('damage', Math.max(this.damage - amount, 0));
  }

  /**
   * 激活/关闭物品
   */
  toggleActive(): Item {
    return this.set('active', !this.active);
  }

  /**
   * 设置激活状态
   */
  setActive(active: boolean): Item {
    return this.set('active', active);
  }

  /**
   * 设置温度
   */
  setTemperature(temp: number): Item {
    return this.set('temperature', temp);
  }

  /**
   * 设置物品变量
   */
  setItemVar(key: string, value: string | number | boolean): Item {
    const newVars = new Map(this.itemVars);
    newVars.set(key, value);
    return this.set('itemVars', newVars);
  }

  /**
   * 获取物品变量
   */
  getItemVar(key: string): string | number | boolean | undefined {
    return this.itemVars.get(key);
  }

  /**
   * 检查是否有物品变量
   */
  hasItemVar(key: string): boolean {
    return this.itemVars.has(key);
  }

  // ============ 内容物操作 ============

  /**
   * 添加物品到内容物
   */
  addItem(item: Item): Item {
    return this.set('contents', this.contents.addItem(item));
  }

  /**
   * 移除内容物
   */
  removeItem(item: Item): Item {
    return this.set('contents', this.contents.removeItem(item));
  }

  /**
   * 清空内容物
   */
  clearContents(): Item {
    return this.set('contents', new ItemContents());
  }

  // ============ 计算属性 ============

  /**
   * 计算总质量（包含内容物）
   */
  getWeight(): Mass {
    let weight = this.type.weight;

    // 伤害减少重量
    if (this.damage > 0) {
      weight = Math.floor(weight * (1 - this.damage / 10000));
    }

    // 加上内容物重量
    weight += this.contents.getWeight();

    return Math.max(weight, 1);
  }

  /**
   * 计算总体积（包含内容物）
   */
  getVolume(): Volume {
    return this.type.volume;
  }

  // ============ 显示方法 ============

  /**
   * 获取显示名称（包含数量、伤害等修饰）
   */
  getDisplayName(): string {
    let name = this.name;

    // 添加损坏修饰
    if (this.isDamaged()) {
      name = `damaged ${name}`;
    }

    // 添加数量修饰（如果有）
    if (this.charges > 1) {
      name = `${name} (${this.charges})`;
    }

    return name;
  }

  /**
   * 获取详细信息
   */
  getInfo(): string {
    const info: string[] = [];

    info.push(`Type: ${this.type.category}`);
    info.push(`Weight: ${this.getWeight()}g`);
    info.push(`Volume: ${this.getVolume()}ml`);

    if (this.isDamaged()) {
      info.push(`Damage: ${this.damage}`);
    }

    if (this.charges > 0) {
      info.push(`Charges: ${this.charges}`);
    }

    if (this.type.flags.size > 0) {
      info.push(`Flags: ${Array.from(this.type.flags).join(', ')}`);
    }

    return info.join('\n');
  }

  // ============ 转换方法 ============

  /**
   * 转换为另一个类型
   */
  convertTo(newType: ItemType): Item {
    return this.set('type', newType);
  }

  /**
   * 激活物品
   */
  activate(): Item {
    if (!this.isUsable()) {
      return this;
    }
    return this.set('active', true);
  }

  /**
   * 关闭物品
   */
  deactivate(): Item {
    return this.set('active', false);
  }

  // ============ 工厂方法 ============

  /**
   * 创建基础 Item
   */
  static create(type: ItemType): Item {
    return new Item({
      type,
      charges: 0,
      damage: 0,
      bday: Date.now() as TimePoint,
      itemVars: new Map(),
      contents: new ItemContents(),
      active: false,
      temperature: 20,
    });
  }

  /**
   * 创建带有电荷的 Item
   */
  static createWithCharges(type: ItemType, charges: number): Item {
    const item = Item.create(type);
    return item.set('charges', charges);
  }

  /**
   * 创建损坏的 Item
   */
  static createDamaged(type: ItemType, damage: number): Item {
    const item = Item.create(type);
    return item.set('damage', damage);
  }

  /**
   * 从 JSON 创建 Item
   */
  static fromJson(json: Record<string, any>, types: Map<string, ItemType>): Item {
    const typeId = json['id'] as string;
    const type = types.get(typeId);

    if (!type) {
      throw new Error(`Unknown item type: ${typeId}`);
    }

    const item = Item.create(type);

    return item
      .set('charges', json['charges'] || 0)
      .set('damage', json['damage'] || 0)
      .set('bday', json['bday'] || Date.now())
      .set('active', json['active'] || false)
      .set('temperature', json['temperature'] || 20);
  }
}
