/**
 * ItemType - 物品类型定义
 *
 * 参考 Cataclysm-DDA 的 itype.h
 * 使用插槽式设计模式，不同类型物品使用不同的插槽
 */

import { Set, Map } from 'immutable';
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
 * 使用不可变数据结构（类似 Terrain.ts 的实现模式）
 * 使用插槽式设计模式，不同类型物品使用不同的插槽
 */
export class ItemType {
  private readonly _props: ItemTypeProps;

  readonly id!: ItemTypeId;
  readonly name!: string;
  readonly description!: string;
  readonly symbol!: string;
  readonly color!: string;
  readonly weight!: Mass;
  readonly volume!: Volume;
  readonly price!: number;
  readonly stackable!: boolean;
  readonly stackSize!: number;
  readonly category!: ItemCategory;
  readonly subcategory?: string;
  readonly material!: MaterialId[];
  readonly flags!: Set<ItemFlagType>;
  readonly qualities!: Map<QualityId, number>;
  readonly tool?: ToolSlot;
  readonly comestible?: ComestibleSlot;
  readonly armor?: ArmorSlot;
  readonly gun?: GunSlot;
  readonly ammo?: AmmoSlot;
  readonly book?: BookSlot;
  readonly mod?: ModSlot;
  readonly bionic?: BionicSlot;
  readonly engine?: EngineSlot;
  readonly wheel?: WheelSlot;
  readonly furniture?: FurnitureSlot;
  readonly petArmor?: PetArmorSlot;
  readonly generic?: GenericSlot;

  constructor(props?: Partial<ItemTypeProps>) {
    const defaults: ItemTypeProps = {
      id: '' as ItemTypeId,
      name: '',
      description: '',
      symbol: '?',
      color: 'white',
      weight: 100,
      volume: 250,
      price: 0,
      stackable: true,
      stackSize: 1,
      category: 'MISCELLANEOUS' as ItemCategory,
      material: [],
      flags: Set<ItemFlagType>(),
      qualities: Map<QualityId, number>(),
    };

    this._props = {
      ...defaults,
      ...props,
      description: props?.description ?? defaults.description,
      symbol: props?.symbol ?? defaults.symbol,
      color: props?.color ?? defaults.color,
      price: props?.price ?? defaults.price,
      stackable: props?.stackable ?? defaults.stackable,
      stackSize: props?.stackSize ?? defaults.stackSize,
      flags: props?.flags ?? defaults.flags,
      material: props?.material ?? defaults.material,
      qualities: props?.qualities ?? defaults.qualities,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'id', { get: () => this._props.id, enumerable: true });
    Object.defineProperty(this, 'name', { get: () => this._props.name, enumerable: true });
    Object.defineProperty(this, 'description', { get: () => this._props.description, enumerable: true });
    Object.defineProperty(this, 'symbol', { get: () => this._props.symbol, enumerable: true });
    Object.defineProperty(this, 'color', { get: () => this._props.color, enumerable: true });
    Object.defineProperty(this, 'weight', { get: () => this._props.weight, enumerable: true });
    Object.defineProperty(this, 'volume', { get: () => this._props.volume, enumerable: true });
    Object.defineProperty(this, 'price', { get: () => this._props.price, enumerable: true });
    Object.defineProperty(this, 'stackable', { get: () => this._props.stackable, enumerable: true });
    Object.defineProperty(this, 'stackSize', { get: () => this._props.stackSize, enumerable: true });
    Object.defineProperty(this, 'category', { get: () => this._props.category, enumerable: true });
    Object.defineProperty(this, 'subcategory', { get: () => this._props.subcategory, enumerable: true });
    Object.defineProperty(this, 'material', { get: () => this._props.material, enumerable: true });
    Object.defineProperty(this, 'flags', { get: () => this._props.flags, enumerable: true });
    Object.defineProperty(this, 'qualities', { get: () => this._props.qualities, enumerable: true });

    // Optional slot properties
    if (this._props.tool !== undefined) {
      Object.defineProperty(this, 'tool', { get: () => this._props.tool, enumerable: true });
    }
    if (this._props.comestible !== undefined) {
      Object.defineProperty(this, 'comestible', { get: () => this._props.comestible, enumerable: true });
    }
    if (this._props.armor !== undefined) {
      Object.defineProperty(this, 'armor', { get: () => this._props.armor, enumerable: true });
    }
    if (this._props.gun !== undefined) {
      Object.defineProperty(this, 'gun', { get: () => this._props.gun, enumerable: true });
    }
    if (this._props.ammo !== undefined) {
      Object.defineProperty(this, 'ammo', { get: () => this._props.ammo, enumerable: true });
    }
    if (this._props.book !== undefined) {
      Object.defineProperty(this, 'book', { get: () => this._props.book, enumerable: true });
    }
    if (this._props.mod !== undefined) {
      Object.defineProperty(this, 'mod', { get: () => this._props.mod, enumerable: true });
    }
    if (this._props.bionic !== undefined) {
      Object.defineProperty(this, 'bionic', { get: () => this._props.bionic, enumerable: true });
    }
    if (this._props.engine !== undefined) {
      Object.defineProperty(this, 'engine', { get: () => this._props.engine, enumerable: true });
    }
    if (this._props.wheel !== undefined) {
      Object.defineProperty(this, 'wheel', { get: () => this._props.wheel, enumerable: true });
    }
    if (this._props.furniture !== undefined) {
      Object.defineProperty(this, 'furniture', { get: () => this._props.furniture, enumerable: true });
    }
    if (this._props.petArmor !== undefined) {
      Object.defineProperty(this, 'petArmor', { get: () => this._props.petArmor, enumerable: true });
    }
    if (this._props.generic !== undefined) {
      Object.defineProperty(this, 'generic', { get: () => this._props.generic, enumerable: true });
    }

    Object.freeze(this);
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
    return this.comestible !== undefined || this.category === 'COMESTIBLE';
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
    return this.qualities.get(qualityId) ?? 0;
  }

  /**
   * 检查是否有指定品质
   */
  hasQuality(qualityId: QualityId): boolean {
    return this.qualities.has(qualityId);
  }

  // ============ 修改方法 ============

  /**
   * 创建修改后的副本
   */
  set<K extends keyof ItemTypeProps>(key: K, value: ItemTypeProps[K]): ItemType {
    return new ItemType({ ...this._props, [key]: value });
  }

  /**
   * 获取所有属性
   */
  toObject(): ItemTypeProps {
    return { ...this._props };
  }

  /**
   * 创建副本
   */
  clone(): ItemType {
    return new ItemType(this._props);
  }

  // ============ 工厂方法 ============

  /**
   * 创建基础 ItemType
   */
  static create(props: ItemTypeProps): ItemType {
    return new ItemType(props);
  }

  /**
   * 创建从另一个 ItemType 复制的新实例
   */
  static copyFrom(other: ItemType, overrides?: Partial<ItemTypeProps>): ItemType {
    return new ItemType({
      ...other._props,
      ...(overrides || {}),
    });
  }
}
