/**
 * Item - 物品实例类
 *
 * 参考 Cataclysm-DDA 的 item.h
 * 代表游戏中的实际物品对象，每个物品都有一个 ItemType
 */

import type { TimePoint } from '../field/FieldEntry';
import type {
  ItemTypeId,
  ItemVars,
  ItemFlagType,
  Mass,
  Volume,
  SpoilageData,
} from './types';
import { ItemType } from './ItemType';
import { ItemContents } from './ItemContents';
import {
  calculateSpoilState,
  createSpoilageData,
  getRemainingTime,
  isFresh,
  isRotten,
  isSpoiled,
  isWilting,
  getSpoilageProgress,
  updateSpoilageEnvironment,
  SpoilState,
} from './spoilage';
import {
  EnchantmentManager,
  type ItemVariant,
} from './enchantments';
import {
  WetnessData,
  createWetnessData,
  updateWetness,
  addWetness,
  calculateWetnessEffect,
  isWet,
  isSoaked,
  getWetnessDescription,
  getMaterialDryFactor,
  Wetness,
} from './wetness';

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

  // 腐烂系统
  spoilage?: SpoilageData;    // 腐烽数据

  // 潮湿系统
  wetness?: WetnessData;      // 潮湿数据

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

  // 附魔和变体
  enchantmentManager?: EnchantmentManager;  // 附魔管理器
  variant?: ItemVariant;                    // 物品变体
}

// ============ Item 类 ============

/**
 * Item - 物品实例类
 *
 * 使用不可变数据结构（类似 Terrain.ts 的实现模式）
 */
export class Item {
  private readonly _props: ItemProps;

  readonly type!: ItemType;
  readonly charges!: number;
  readonly damage!: number;
  readonly bday!: TimePoint;
  readonly itemVars!: ItemVars;
  readonly contents!: ItemContents;
  readonly tag?: number;
  readonly active!: boolean;
  readonly frequency?: number;
  readonly temperature!: number;
  readonly tempSpecific?: boolean;
  readonly burnt?: number;
  readonly frozen?: number;
  readonly spoilage?: SpoilageData;
  readonly wetness?: WetnessData;
  readonly owned?: boolean;
  readonly missionOwner?: boolean;
  readonly snip?: string;
  readonly corpse?: {
    id: string;
    name: string;
    transformTime?: number;
  };
  readonly enchantmentManager?: EnchantmentManager;
  readonly variant?: ItemVariant;

  constructor(props: ItemProps) {
    const defaults: ItemProps = {
      type: props.type,
      charges: 0,
      damage: 0,
      bday: Date.now() as TimePoint,
      itemVars: new Map(),
      contents: new ItemContents(),
      active: false,
      temperature: 20,
    };

    this._props = {
      ...defaults,
      ...props,
      charges: props.charges ?? defaults.charges,
      damage: props.damage ?? defaults.damage,
      bday: props.bday ?? defaults.bday,
      itemVars: props.itemVars ?? defaults.itemVars,
      contents: props.contents ?? defaults.contents,
      active: props.active ?? defaults.active,
      temperature: props.temperature ?? defaults.temperature,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'type', { get: () => this._props.type, enumerable: true });
    Object.defineProperty(this, 'charges', { get: () => this._props.charges, enumerable: true });
    Object.defineProperty(this, 'damage', { get: () => this._props.damage, enumerable: true });
    Object.defineProperty(this, 'bday', { get: () => this._props.bday, enumerable: true });
    Object.defineProperty(this, 'itemVars', { get: () => this._props.itemVars, enumerable: true });
    Object.defineProperty(this, 'contents', { get: () => this._props.contents, enumerable: true });
    Object.defineProperty(this, 'active', { get: () => this._props.active, enumerable: true });
    Object.defineProperty(this, 'temperature', { get: () => this._props.temperature, enumerable: true });
    Object.defineProperty(this, 'spoilage', { get: () => this._props.spoilage, enumerable: true });
    Object.defineProperty(this, 'wetness', { get: () => this._props.wetness, enumerable: true });

    // Optional properties
    if (this._props.tag !== undefined) {
      Object.defineProperty(this, 'tag', { get: () => this._props.tag, enumerable: true });
    }
    if (this._props.frequency !== undefined) {
      Object.defineProperty(this, 'frequency', { get: () => this._props.frequency, enumerable: true });
    }
    if (this._props.tempSpecific !== undefined) {
      Object.defineProperty(this, 'tempSpecific', { get: () => this._props.tempSpecific, enumerable: true });
    }
    if (this._props.burnt !== undefined) {
      Object.defineProperty(this, 'burnt', { get: () => this._props.burnt, enumerable: true });
    }
    if (this._props.frozen !== undefined) {
      Object.defineProperty(this, 'frozen', { get: () => this._props.frozen, enumerable: true });
    }
    if (this._props.owned !== undefined) {
      Object.defineProperty(this, 'owned', { get: () => this._props.owned, enumerable: true });
    }
    if (this._props.missionOwner !== undefined) {
      Object.defineProperty(this, 'missionOwner', { get: () => this._props.missionOwner, enumerable: true });
    }
    if (this._props.light !== undefined) {
      Object.defineProperty(this, 'light', { get: () => this._props.light, enumerable: true });
    }
    if (this._props.snip !== undefined) {
      Object.defineProperty(this, 'snip', { get: () => this._props.snip, enumerable: true });
    }
    if (this._props.corpse !== undefined) {
      Object.defineProperty(this, 'corpse', { get: () => this._props.corpse, enumerable: true });
    }
    if (this._props.enchantmentManager !== undefined) {
      Object.defineProperty(this, 'enchantmentManager', { get: () => this._props.enchantmentManager, enumerable: true });
    }
    if (this._props.variant !== undefined) {
      Object.defineProperty(this, 'variant', { get: () => this._props.variant, enumerable: true });
    }

    Object.freeze(this);
  }

  // ============ 基础属性访问器（快捷方式） ============

  get id(): ItemTypeId {
    return this.type.id;
  }

  get name(): string {
    return this.type.name;
  }

  get description(): string {
    return this.type.description;
  }

  get light(): number {
    return this._props.light ?? 0;
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
    return this._props.corpse !== undefined;
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
    return this.type.hasFlag('ALLOWS_REMOTE_USE' as ItemFlagType) ||
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

  // ============ 腐烂系统方法 ============

  /**
   * 检查物品是否有腐烽数据
   */
  hasSpoilage(): boolean {
    return this.spoilage !== undefined;
  }

  /**
   * 检查物品是否会腐烂
   */
  canSpoil(): boolean {
    return this.isComestible() || this.spoilage !== undefined;
  }

  /**
   * 获取当前腐烂状态
   */
  getSpoilState(currentTime: TimePoint = Date.now() as TimePoint): SpoilState | null {
    if (!this.spoilage) {
      return null;
    }
    return calculateSpoilState(this.spoilage, currentTime);
  }

  /**
   * 检查是否新鲜
   */
  isFresh(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    if (!this.spoilage) {
      return true; // 没有腐烘认为是新鲜的
    }
    return isFresh(this.spoilage, currentTime);
  }

  /**
   * 检查是否枯萎
   */
  isWilting(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    if (!this.spoilage) {
      return false;
    }
    return isWilting(this.spoilage, currentTime);
  }

  /**
   * 检查是否腐烂（不可食用）
   */
  isSpoiled(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    if (!this.spoilage) {
      return false;
    }
    return isSpoiled(this.spoilage, currentTime);
  }

  /**
   * 检查是否完全腐烂
   */
  isRotten(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    if (!this.spoilage) {
      return false;
    }
    return isRotten(this.spoilage, currentTime);
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getRemainingTime(currentTime: TimePoint = Date.now() as TimePoint): number {
    if (!this.spoilage) {
      return Infinity;
    }
    return getRemainingTime(this.spoilage, currentTime);
  }

  /**
   * 获取腐烂进度（0-1）
   */
  getSpoilageProgress(currentTime: TimePoint = Date.now() as TimePoint): number {
    if (!this.spoilage) {
      return 0;
    }
    return getSpoilageProgress(this.spoilage, currentTime);
  }

  /**
   * 更新腐烂环境因素
   */
  updateSpoilageEnvironment(
    newTemperature: number,
    newContainerFactor: number,
    updateTime: TimePoint = Date.now() as TimePoint
  ): Item {
    if (!this.spoilage) {
      return this;
    }
    const updatedSpoilage = updateSpoilageEnvironment(
      this.spoilage,
      newTemperature,
      newContainerFactor,
      updateTime
    );
    return this.set('spoilage', updatedSpoilage);
  }

  /**
   * 初始化腐烂数据
   */
  initSpoilage(spoilTime: number, containerFactor: number = 1): Item {
    if (this.spoilage) {
      return this;
    }
    const newSpoilage = createSpoilageData(
      spoilTime,
      this.bday,
      this.temperature,
      containerFactor
    );
    return this.set('spoilage', newSpoilage);
  }

  /**
   * 获取腐烂状态描述
   */
  getSpoilageStateDescription(currentTime: TimePoint = Date.now() as TimePoint): string {
    const state = this.getSpoilState(currentTime);
    if (!state) {
      return '';
    }

    switch (state) {
      case SpoilState.FRESH:
        return '新鲜';
      case SpoilState.WILTING:
        return '枯萎';
      case SpoilState.SPOILED:
        return '腐烂';
      case SpoilState.ROTTEN:
        return '完全腐烂';
    }
  }

  // ============ 潮湿系统方法 ============

  /**
   * 检查物品是否有潮湿数据
   */
  hasWetness(): boolean {
    return this.wetness !== undefined;
  }

  /**
   * 检查物品是否会受潮湿影响
   */
  canGetWet(): boolean {
    return this.isArmor() || this.isComestible();
  }

  /**
   * 获取当前潮湿度
   */
  getWetnessLevel(): number {
    return this.wetness?.current || 0;
  }

  /**
   * 检查是否潮湿
   */
  isWet(): boolean {
    return this.wetness !== undefined && isWet(this.wetness);
  }

  /**
   * 检查是否湿透
   */
  isSoaked(): boolean {
    return this.wetness !== undefined && isSoaked(this.wetness);
  }

  /**
   * 获取潮湿状态描述
   */
  getWetnessDescription(): string {
    if (!this.wetness) {
      return '';
    }
    return getWetnessDescription(this.wetness);
  }

  /**
   * 更新潮湿度（干燥）
   */
  updateWetness(currentTime: TimePoint = Date.now() as TimePoint): Item {
    if (!this.wetness) {
      return this;
    }
    const updatedWetness = updateWetness(this.wetness, currentTime);
    return this.set('wetness', updatedWetness);
  }

  /**
   * 增加潮湿度（淋雨等）
   */
  addWetness(amount: number, currentTime: TimePoint = Date.now() as TimePoint): Item {
    let wetness = this.wetness;

    // 如果没有潮湿数据，创建一个
    if (!wetness) {
      const materialId = this.type.material?.[0];
      wetness = Wetness.create(0, materialId);
    }

    const updatedWetness = addWetness(wetness, amount, currentTime);
    return this.set('wetness', updatedWetness);
  }

  /**
   * 设置潮湿度
   */
  setWetness(newWetness: number, currentTime: TimePoint = Date.now() as TimePoint): Item {
    let wetness = this.wetness;

    // 如果没有潮湿数据，创建一个
    if (!wetness) {
      const materialId = this.type.material?.[0];
      wetness = Wetness.create(0, materialId);
    }

    const updatedWetness = {
      ...wetness,
      current: Math.max(0, Math.min(100, newWetness)),
      lastUpdate: currentTime,
    };
    return this.set('wetness', updatedWetness);
  }

  /**
   * 计算潮湿对保暖值的影响
   */
  getWarmthModifier(): number {
    if (!this.wetness) {
      return 0;
    }
    const effect = calculateWetnessEffect(this.wetness.current);
    return effect.warmthModifier;
  }

  /**
   * 计算潮湿对重量的影响
   */
  getWetWeight(): number {
    if (!this.wetness || this.wetness.current === 0) {
      return this.getWeight();
    }
    const baseWeight = this.getWeight();
    const effect = calculateWetnessEffect(this.wetness.current);
    return baseWeight * (1 + effect.weightModifier);
  }

  // ============ 物品堆叠方法 ============

  /**
   * 检查物品是否可堆叠
   */
  isStackable(): boolean {
    return this.type.stackable;
  }

  /**
   * 获取最大堆叠数量
   */
  getMaxStackSize(): number {
    return this.type.stackSize || 1;
  }

  /**
   * 获取当前堆叠数量
   */
  getStackSize(): number {
    if (!this.isStackable()) {
      return 1;
    }
    return Math.max(1, this.charges);
  }

  /**
   * 检查是否可以与另一个物品堆叠
   */
  canStackWith(other: Item): boolean {
    // 检查类型 ID 是否相同
    if (this.id !== other.id) {
      return false;
    }

    // 检查是否可堆叠
    if (!this.isStackable() || !other.isStackable()) {
      return false;
    }

    // 检查伤害状态是否相同
    if (this.damage !== other.damage) {
      return false;
    }

    // 如果有特定温度，温度必须相同
    if (this.tempSpecific && other.tempSpecific) {
      if (this.temperature !== other.temperature) {
        return false;
      }
    }

    // 腐烂物品的腐烤断据必须相同
    if (this.spoilage || other.spoilage) {
      if (!this.spoilage || !other.spoilage) {
        return false;
      }
      if (this.spoilage.created !== other.spoilage.created ||
          this.spoilage.spoilTime !== other.spoilage.spoilTime) {
        return false;
      }
    }

    // 物品变量必须相同
    if (this.itemVars.size !== other.itemVars.size) {
      return false;
    }
    for (const [key, value] of this.itemVars) {
      const otherValue = other.itemVars.get(key);
      if (otherValue !== value) {
        return false;
      }
    }

    // 内容物状态必须相同
    if (this.contents.isEmpty() !== other.contents.isEmpty()) {
      return false;
    }

    // 潮湿状态必须相同
    if (this.wetness || other.wetness) {
      if (!this.wetness || !other.wetness) {
        return false;
      }
      if (this.wetness.current !== other.wetness.current) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查堆叠是否已满
   */
  isStackFull(): boolean {
    if (!this.isStackable()) {
      return true;
    }
    return this.getStackSize() >= this.getMaxStackSize();
  }

  /**
   * 检查堆叠是否为空
   */
  isStackEmpty(): boolean {
    if (!this.isStackable()) {
      return false;
    }
    return this.charges <= 0;
  }

  /**
   * 获取堆叠剩余空间
   */
  getStackSpace(): number {
    if (!this.isStackable()) {
      return 0;
    }
    return Math.max(0, this.getMaxStackSize() - this.getStackSize());
  }

  /**
   * 检查是否是单件物品
   */
  isSingleItem(): boolean {
    if (!this.isStackable()) {
      return true;
    }
    return this.getStackSize() === 1;
  }

  /**
   * 分离堆叠
   */
  splitStack(amount: number): Item {
    if (!this.isStackable() || amount >= this.getStackSize()) {
      return this;
    }

    const currentSize = this.getStackSize();
    const newAmount = Math.max(1, currentSize - amount);

    return this.set('charges', newAmount);
  }

  /**
   * 设置堆叠数量
   */
  setStackCount(count: number): Item {
    if (!this.isStackable()) {
      return this;
    }

    const maxSize = this.getMaxStackSize();
    const validCount = Math.max(1, Math.min(count, maxSize));

    return this.set('charges', validCount);
  }

  // ============ 附魔和变体方法 ============

  /**
   * 检查物品是否有附魔
   */
  hasEnchantments(): boolean {
    return this.enchantmentManager !== undefined &&
           this.enchantmentManager.getEnchantments().size > 0;
  }

  /**
   * 获取附魔管理器
   */
  getEnchantmentManager(): EnchantmentManager {
    return this.enchantmentManager || EnchantmentManager.create();
  }

  /**
   * 应用附魔到物品
   */
  addEnchantment(enchantment: any): Item {
    const manager = this.getEnchantmentManager().addEnchantment(enchantment);
    return this.set('enchantmentManager', manager);
  }

  /**
   * 检查物品是否有变体
   */
  hasVariant(): boolean {
    return this.variant !== undefined;
  }

  /**
   * 获取变体名称
   */
  getVariantName(): string | undefined {
    return this.variant?.name;
  }

  /**
   * 获取包含变体的显示名称
   */
  getDisplayNameWithVariant(currentTime: TimePoint = Date.now() as TimePoint): string {
    let name = this.getDisplayName(currentTime);

    if (this.variant) {
      const v = this.variant;
      if (v.overrides.namePrefix) {
        name = `${v.overrides.namePrefix} ${name}`;
      }
      if (v.overrides.nameSuffix) {
        name = `${name} ${v.overrides.nameSuffix}`;
      }
    }

    return name;
  }

  /**
   * 检查物品是否有特定抗性
   */
  hasResistance(damageType: string): boolean {
    if (!this.hasEnchantments()) {
      return false;
    }
    return this.getEnchantmentManager().hasResistance(damageType);
  }

  /**
   * 获取附魔伤害加成
   */
  getEnchantmentDamageBonus(): number {
    if (!this.hasEnchantments()) {
      return 0;
    }
    return this.getEnchantmentManager().getDamageBonus();
  }

  /**
   * 获取附魔护甲加成
   */
  getEnchantmentArmorBonus(): number {
    if (!this.hasEnchantments()) {
      return 0;
    }
    return this.getEnchantmentManager().getArmorBonus();
  }

  /**
   * 获取附魔速度加成
   */
  getEnchantmentSpeedBonus(): number {
    if (!this.hasEnchantments()) {
      return 0;
    }
    return this.getEnchantmentManager().getSpeedBonus();
  }

  // ============ 物品使用方法 ============

  /**
   * 检查物品是否可食用
   */
  isEdible(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    if (!this.isComestible()) {
      return false;
    }
    // 不能吃腐烂的食物
    if (this.isSpoiled(currentTime)) {
      return false;
    }
    // 不能吃冷冻的食物
    if (this.frozen && this.frozen > 0) {
      return false;
    }
    return true;
  }

  /**
   * 检查物品是否可饮用
   */
  isDrinkable(currentTime: TimePoint = Date.now() as TimePoint): boolean {
    return this.isEdible(currentTime);
  }

  /**
   * 检查物品是否是武器
   */
  isWeapon(): boolean {
    return this.isGun() || this.type.category === 'WEAPON';
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
  getDisplayName(currentTime: TimePoint = Date.now() as TimePoint): string {
    let name = this.name;

    // 添加损坏修饰
    if (this.isDamaged()) {
      name = `damaged ${name}`;
    }

    // 添加数量修饰（如果有）
    if (this.charges > 1) {
      name = `${name} (${this.charges})`;
    }

    // 添加腐烂状态修饰
    const spoilState = this.getSpoilageStateDescription(currentTime);
    if (spoilState) {
      name = `${spoilState}的${name}`;
    }

    return name;
  }

  /**
   * 获取详细信息
   */
  getInfo(currentTime: TimePoint = Date.now() as TimePoint): string {
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

    // 腐烂信息
    if (this.hasSpoilage()) {
      const spoilState = this.getSpoilageStateDescription(currentTime);
      if (spoilState) {
        info.push(`状态: ${spoilState}`);
      }
      const remaining = this.getRemainingTime(currentTime);
      if (remaining !== Infinity) {
        const minutes = Math.ceil(remaining / 60000);
        if (minutes < 60) {
          info.push(`剩余时间: ${minutes} 分钟`);
        } else {
          const hours = (minutes / 60).toFixed(1);
          info.push(`剩余时间: ${hours} 小时`);
        }
      }
      const progress = this.getSpoilageProgress(currentTime);
      info.push(`腐烂进度: ${(progress * 100).toFixed(1)}%`);
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

  // ============ 修改方法 ============

  /**
   * 创建修改后的副本
   */
  set<K extends keyof ItemProps>(key: K, value: ItemProps[K]): Item {
    return new Item({ ...this._props, [key]: value });
  }

  /**
   * 创建副本
   */
  clone(): Item {
    return new Item(this._props);
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
