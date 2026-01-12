/**
 * ItemType - 物品类型定义
 *
 * 参考 Cataclysm-DDA 的 itype.h
 * 使用插槽式设计模式，不同类型物品使用不同的插槽
 */

import { Record } from 'immutable';
import type {
  ItemTypeId,
  ItemCategory,
  ItemFlagType,
  AmmoTypeId,
  SkillId,
  MaterialId,
  QualityId,
  Mass,
  Volume,
} from './types';

// ============ 插槽类型定义 ============

/**
 * 工具插槽
 */
export interface ToolSlot {
  maximumCharges?: number;
  ammoCapacity?: number;
  rechargeMultiplier?: number;
  sub?: string;
  powerDraw?: number;
}

/**
 * 可消耗物品插槽
 */
export interface ComestibleSlot {
  quota?: { quid: string; units: number }[];
  stim?: number;
  healthy?: number;
  parasiteChance?: number;
  radiationDecay?: number;
  addictionType?: string;
  addictionPotential?: number;
  calories?: number;
  quench?: number;
  fun?: number;
  time?: number;
  saturates?: string;
  materialTypes?: MaterialId[];
  modifiable?: boolean;
  monotony?: number;
  likeFatigue?: number;
  likeFlavor?: boolean;
  favoriteMeal?: boolean;
}

/**
 * 护甲插槽
 */
export interface ArmorSlot {
  coverage?: number;
  covers?: string[];
  encumbrance?: number;
  maxEncumbrance?: number;
  powerArmor?: boolean;
  environmentalProtection?: number;
  thickness?: number;
  materialThickness?: number;
  rigid?: boolean;
  materialId?: string;
  warmth?: number;
  weightCapacityBonus?: number;
  powerDraw?: number;
  coversAll?: boolean;
}

/**
 * 枪械插槽
 */
export interface GunSlot {
  skill?: SkillId;
  ammo?: AmmoTypeId[];
  range?: number;
  rangedDamage?: number;
  dispersion?: number;
  reloadTime?: number;
  reload?: number;
  barrelVolume?: number;
  defaultAmmo?: string;
  magazineSize?: number | string[];
  magazineWell?: string;
  builtInMod?: string;
  modLocations?: string[];
  blackpowder?: boolean;
  useContents?: boolean;
  durability?: number;
  burst?: number;
  reloadNoise?: string;
  reloadNoiseVolume?: number;
  fireNoise?: string;
  fireNoiseVolume?: number;
  fireSound?: string;
  reloadSound?: string;
  ammoToFire?: number;
}

/**
 * 弹药插槽
 */
export interface AmmoSlot {
  type: AmmoTypeId;
  casing?: string;
  drop?: string;
  dropChance?: number;
  dropActive?: boolean;
  shape?: boolean;
  stackSize?: number;
}

/**
 * 书籍插槽
 */
export interface BookSlot {
  level?: number;
  requiredLevel?: number;
  time?: number;
  fun?: number;
  intelligence?: number;
  skill?: SkillId;
  requiredSkills?: { skill: string; level: number }[];
  chapters?: { id: string; name: string; items: string[] }[];
}

/**
 * 改装件插槽
 */
export interface ModSlot {
  ammoModifier?: string;
  capacityBonus?: number;
  dispersionModifier?: number;
  damageModifier?: number;
  rangeModifier?: number;
  reloadTimeModifier?: number;
  loudnessModifier?: number;
  ammoConsumptionModifier?: number;
  magazineSizeModifier?: number;
  speedModifier?: number;
  aimSpeedModifier?: number;
  recoilModifier?: number;
  handlingModifier?: number;
  upsDamageModifier?: number;
  upsChargesMultiplier?: number;
  upsMagSizeBonus?: number;
  targetEncumbrance?: number;
  mode?: string;
  modTargets?: string[];
  addMod?: string[];
  deleteMod?: string[];
  acceptableAmmo?: string[];
  barrelLength?: number;
  rangeModifierBase?: number;
  minStrRequired?: number;
}

/**
 * 义体插槽
 */
export interface BionicSlot {
  powerCapacity?: number;
  powerTrigger?: number;
  time?: number;
  activated?: boolean;
  fakeWeapon?: string;
  enchantment?: string;
  martialArt?: string[];
  occupiedBodyparts?: string[];
  encumbrance?: { bodypart: string; encumbrance: number }[];
  upgradable?: boolean;
  downgradeable?: boolean;
  passivePower?: number;
  activePower?: number;
}

/**
 * 引擎插槽
 */
export interface EngineSlot {
  displacement?: number;
  fuelOptions?: string[];
  power?: number;
  noise?: number;
  noiseModifier?: number;
  m2c?: number;
  damaged_power_factor?: number;
  backfireThreshold?: number;
  backfireFreq?: number;
  rpsFromDisplacement?: (disp: number) => number;
}

/**
 * 轮子插槽
 */
export interface WheelSlot {
  diameter?: number;
  width?: number;
  rollingResistance?: number;
  type?: string;
  omniDirectional?: boolean;
}

/**
 * 家具插槽
 */
export interface FurnitureSlot {
  moveCostMod?: number;
  requiredStr?: number;
  emmitsLight?: boolean;
  maxVolume?: Volume;
  comfort?: number;
  floorBedding?: boolean;
  cheering?: number;
  kegCapacity?: Volume;
}

/**
 * 宠物护甲插槽
 */
export interface PetArmorSlot {
  covers?: string[];
  coverage?: number;
  encumbrance?: number;
  maxEncumbrance?: number;
  warmth?: number;
  environmentalProtection?: number;
  materialThickness?: number;
  powerArmor?: boolean;
}

/**
 * 通用插槽
 */
export interface GenericSlot {
  bash?: number;
  cut?: number;
  toHit?: number;
  techniques?: string[];
  threw?: number;
}

// ============ ItemType 属性接口 ============

export interface ItemTypeProps {
  // 基础属性
  id: ItemTypeId;
  name: string;
  description?: string;
  symbol?: string;
  color?: string;

  // 物理属性
  weight: Mass;
  volume: Volume;
  price?: number;
  stackable?: boolean;
  stackSize?: number;

  // 分类
  category: ItemCategory;
  subcategory?: string;
  material: MaterialId[];
  flags: Set<ItemFlagType>;
  qualities?: Map<QualityId, number>;

  // 插槽（使用可选的插槽类型）
  tool?: ToolSlot;
  comestible?: ComestibleSlot;
  armor?: ArmorSlot;
  gun?: GunSlot;
  ammo?: AmmoSlot;
  book?: BookSlot;
  mod?: ModSlot;
  bionic?: BionicSlot;
  engine?: EngineSlot;
  wheel?: WheelSlot;
  furniture?: FurnitureSlot;
  petArmor?: PetArmorSlot;
  generic?: GenericSlot;
}

// ============ ItemType 类 ============

/**
 * ItemType - 物品类型定义类
 *
 * 使用 Immutable.js Record 实现不可变数据结构
 * 使用插槽式设计模式，不同类型物品使用不同的插槽
 */
export class ItemType extends Record<ItemTypeProps> {
  // ============ 基础属性访问器 ============

  get id(): ItemTypeId {
    return this.get('id');
  }

  get name(): string {
    return this.get('name');
  }

  get description(): string {
    return this.get('description') || '';
  }

  get symbol(): string {
    return this.get('symbol') || '?';
  }

  get color(): string {
    return this.get('color') || 'white';
  }

  get weight(): Mass {
    return this.get('weight');
  }

  get volume(): Volume {
    return this.get('volume');
  }

  get price(): number {
    return this.get('price') || 0;
  }

  get stackable(): boolean {
    return this.get('stackable') ?? true;
  }

  get stackSize(): number {
    return this.get('stackSize') || 1;
  }

  get category(): ItemCategory {
    return this.get('category');
  }

  get material(): MaterialId[] {
    return this.get('material');
  }

  get flags(): Set<ItemFlagType> {
    return this.get('flags');
  }

  get qualities(): Map<QualityId, number> {
    return this.get('qualities') || new Map();
  }

  // ============ 插槽访问器 ============

  get tool(): ToolSlot | undefined {
    return this.get('tool');
  }

  get comestible(): ComestibleSlot | undefined {
    return this.get('comestible');
  }

  get armor(): ArmorSlot | undefined {
    return this.get('armor');
  }

  get gun(): GunSlot | undefined {
    return this.get('gun');
  }

  get ammo(): AmmoSlot | undefined {
    return this.get('ammo');
  }

  get book(): BookSlot | undefined {
    return this.get('book');
  }

  get mod(): ModSlot | undefined {
    return this.get('mod');
  }

  get bionic(): BionicSlot | undefined {
    return this.get('bionic');
  }

  get engine(): EngineSlot | undefined {
    return this.get('engine');
  }

  get wheel(): WheelSlot | undefined {
    return this.get('wheel');
  }

  get furniture(): FurnitureSlot | undefined {
    return this.get('furniture');
  }

  get petArmor(): PetArmorSlot | undefined {
    return this.get('petArmor');
  }

  get generic(): GenericSlot | undefined {
    return this.get('generic');
  }

  // ============ 类型检查方法 ============

  /**
   * 检查是否为工具
   */
  isTool(): boolean {
    return this.tool !== undefined;
  }

  /**
   * 检查是否为食物/可消耗品
   */
  isComestible(): boolean {
    return this.comestible !== undefined || this.category === ItemCategory.COMESTIBLE;
  }

  /**
   * 检查是否为护甲
   */
  isArmor(): boolean {
    return this.armor !== undefined;
  }

  /**
   * 检查是否为枪械
   */
  isGun(): boolean {
    return this.gun !== undefined;
  }

  /**
   * 检查是否为弹药
   */
  isAmmo(): boolean {
    return this.ammo !== undefined;
  }

  /**
   * 检查是否为书籍
   */
  isBook(): boolean {
    return this.book !== undefined;
  }

  /**
   * 检查是否为改装件
   */
  isMod(): boolean {
    return this.mod !== undefined;
  }

  /**
   * 检查是否为义体
   */
  isBionic(): boolean {
    return this.bionic !== undefined;
  }

  /**
   * 检查是否为引擎
   */
  isEngine(): boolean {
    return this.engine !== undefined;
  }

  /**
   * 检查是否为轮子
   */
  isWheel(): boolean {
    return this.wheel !== undefined;
  }

  /**
   * 检查是否为家具
   */
  isFurniture(): boolean {
    return this.furniture !== undefined;
  }

  /**
   * 检查是否为宠物护甲
   */
  isPetArmor(): boolean {
    return this.petArmor !== undefined;
  }

  // ============ 标志检查方法 ============

  /**
   * 检查是否有指定标志
   */
  hasFlag(flag: ItemFlagType): boolean {
    return this.flags.has(flag);
  }

  /**
   * 检查是否有任意标志
   */
  hasAnyFlag(...flags: ItemFlagType[]): boolean {
    return flags.some(flag => this.flags.has(flag));
  }

  /**
   * 检查是否有所有标志
   */
  hasAllFlags(...flags: ItemFlagType[]): boolean {
    return flags.every(flag => this.flags.has(flag));
  }

  // ============ 品质方法 ============

  /**
   * 获取指定品质的等级
   */
  getQualityLevel(qualityId: QualityId): number {
    return this.qualities.get(qualityId) || 0;
  }

  /**
   * 检查是否有指定品质
   */
  hasQuality(qualityId: QualityId): boolean {
    return this.qualities.has(qualityId);
  }

  // ============ 工厂方法 ============

  /**
   * 创建基础 ItemType
   */
  static create(props: ItemTypeProps): ItemType {
    return new ItemType({
      ...props,
      flags: props.flags || new Set(),
      material: props.material || [],
      qualities: props.qualities || new Map(),
    });
  }

  /**
   * 创建从另一个 ItemType 复制的新实例
   */
  static copyFrom(other: ItemType, overrides?: Partial<ItemTypeProps>): ItemType {
    return new ItemType({
      ...other.toObject(),
      ...(overrides || {}),
    } as ItemTypeProps);
  }
}
