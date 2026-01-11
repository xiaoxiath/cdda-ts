import { FurnitureId } from '../coordinates/types';
import { FurnitureFlags, FurnitureFlag } from './types';
import { ItemSpawn } from '../types/common';

/**
 * 家具破坏信息
 */
export interface FurnitureBashInfo {
  sound?: string;
  strMin?: number;
  strMax?: number;
  soundChance?: number;
  quiet?: string;
  furniture?: string[];
  items?: ItemSpawn[];
  ter?: number;
  successMsg?: string;
  failMsg?: string;
  destroyOnly?: boolean;
}

/**
 * 家具拆解信息
 */
export interface FurnitureDeconstructInfo {
  furniture?: string;
  items?: ItemSpawn[];
  ter?: number;
  time?: number;
  simple?: boolean;
  furnitureOnly?: boolean;
}

/**
 * 工作台信息
 */
export interface WorkbenchInfo {
  items: Map<string, number>;
  multipliers?: Map<string, number>;
  tile?: boolean;
  requiresLight?: boolean;
  requiresPower?: boolean;
  requiresFlooring?: boolean;
  mass?: number;
  volume?: number;
}

/**
 * 植物数据
 */
export interface PlantData {
  transformAge: number;
  transformToFurniture: string;
  transformToItem: string;
  fruitCount: number;
  fruitDiv: number;
  fruitType: string;
  byproducts?: ItemSpawn[];
  seedType?: string;
  grow?: number;
  harvest?: number;
  harvestSeason?: string[];
}

/**
 * 发射场数据
 */
export interface EmissionData {
  field: string;
  density: number;
  chance: number;
  ageIntensity?: boolean;
  minIntensity?: number;
  maxIntensity?: number;
}

/**
 * 家具属性
 */
export interface FurnitureProps {
  id: FurnitureId;
  idString?: string;  // 原始字符串 ID，用于查找
  name: string;
  description: string;
  symbol: string;
  color: string;
  moveCostMod: number;
  moveCost: number;
  coverage: number;
  flags: FurnitureFlags;
  comfort: number;
  floorBeddingWarmth: number;
  requiredStr: number;
  mass: number;
  volume: number;
  kegCapacity: number;
  maxVolume: number;
  open?: FurnitureId;
  close?: FurnitureId;
  bash?: FurnitureBashInfo;
  deconstruct?: FurnitureDeconstructInfo;
  workbench?: WorkbenchInfo;
  plant?: PlantData;
  emittedLight: number;
  light: number;
  overlayLayers: string[];
  emitters: Map<string, EmissionData>;
  connecting: number;
  skin: string;
}

/**
 * 家具数据
 *
 * 表示一个家具类型
 */
export class Furniture {
  private readonly _props: FurnitureProps;

  readonly id!: FurnitureId;
  readonly idString?: string;  // 原始字符串 ID，用于查找
  readonly name!: string;
  readonly description!: string;
  readonly symbol!: string;
  readonly color!: string;
  readonly moveCostMod!: number;
  readonly moveCost!: number;
  readonly coverage!: number;
  readonly flags!: FurnitureFlags;
  readonly comfort!: number;
  readonly floorBeddingWarmth!: number;
  readonly requiredStr!: number;
  readonly mass!: number;
  readonly volume!: number;
  readonly kegCapacity!: number;
  readonly maxVolume!: number;
  readonly open?: FurnitureId;
  readonly close?: FurnitureId;
  readonly bash?: FurnitureBashInfo;
  readonly deconstruct?: FurnitureDeconstructInfo;
  readonly workbench?: WorkbenchInfo;
  readonly plant?: PlantData;
  readonly emittedLight!: number;
  readonly light!: number;
  readonly overlayLayers!: string[];
  readonly emitters!: Map<string, EmissionData>;
  readonly connecting!: number;
  readonly skin!: string;

  constructor(props?: Partial<FurnitureProps>) {
    const defaults: FurnitureProps = {
      id: 0,
      name: '',
      description: '',
      symbol: '?',
      color: 'white',
      moveCostMod: 0,
      moveCost: 0,
      coverage: 0,
      flags: new FurnitureFlags(),
      comfort: 0,
      floorBeddingWarmth: 0,
      requiredStr: 0,
      mass: 0,
      volume: 0,
      kegCapacity: 0,
      maxVolume: 0,
      emittedLight: 0,
      light: 0,
      overlayLayers: [],
      emitters: new Map(),
      connecting: 0,
      skin: '',
    };

    // Merge props with defaults, ensuring flags is always set
    this._props = {
      ...defaults,
      ...props,
      flags: props?.flags ?? defaults.flags,
      emitters: props?.emitters ?? defaults.emitters,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'id', { get: () => this._props.id, enumerable: true });
    Object.defineProperty(this, 'idString', { get: () => this._props.idString, enumerable: true });
    Object.defineProperty(this, 'name', { get: () => this._props.name, enumerable: true });
    Object.defineProperty(this, 'description', { get: () => this._props.description, enumerable: true });
    Object.defineProperty(this, 'symbol', { get: () => this._props.symbol, enumerable: true });
    Object.defineProperty(this, 'color', { get: () => this._props.color, enumerable: true });
    Object.defineProperty(this, 'moveCostMod', { get: () => this._props.moveCostMod, enumerable: true });
    Object.defineProperty(this, 'moveCost', { get: () => this._props.moveCost, enumerable: true });
    Object.defineProperty(this, 'coverage', { get: () => this._props.coverage, enumerable: true });
    Object.defineProperty(this, 'flags', { get: () => this._props.flags, enumerable: true });
    Object.defineProperty(this, 'comfort', { get: () => this._props.comfort, enumerable: true });
    Object.defineProperty(this, 'floorBeddingWarmth', { get: () => this._props.floorBeddingWarmth, enumerable: true });
    Object.defineProperty(this, 'requiredStr', { get: () => this._props.requiredStr, enumerable: true });
    Object.defineProperty(this, 'mass', { get: () => this._props.mass, enumerable: true });
    Object.defineProperty(this, 'volume', { get: () => this._props.volume, enumerable: true });
    Object.defineProperty(this, 'kegCapacity', { get: () => this._props.kegCapacity, enumerable: true });
    Object.defineProperty(this, 'maxVolume', { get: () => this._props.maxVolume, enumerable: true });
    Object.defineProperty(this, 'emittedLight', { get: () => this._props.emittedLight, enumerable: true });
    Object.defineProperty(this, 'light', { get: () => this._props.light, enumerable: true });
    Object.defineProperty(this, 'overlayLayers', { get: () => this._props.overlayLayers, enumerable: true });
    Object.defineProperty(this, 'emitters', { get: () => this._props.emitters, enumerable: true });
    Object.defineProperty(this, 'connecting', { get: () => this._props.connecting, enumerable: true });
    Object.defineProperty(this, 'skin', { get: () => this._props.skin, enumerable: true });

    // Optional properties
    if (this._props.open !== undefined) {
      Object.defineProperty(this, 'open', { get: () => this._props.open, enumerable: true });
    }
    if (this._props.close !== undefined) {
      Object.defineProperty(this, 'close', { get: () => this._props.close, enumerable: true });
    }
    if (this._props.bash !== undefined) {
      Object.defineProperty(this, 'bash', { get: () => this._props.bash, enumerable: true });
    }
    if (this._props.deconstruct !== undefined) {
      Object.defineProperty(this, 'deconstruct', { get: () => this._props.deconstruct, enumerable: true });
    }
    if (this._props.workbench !== undefined) {
      Object.defineProperty(this, 'workbench', { get: () => this._props.workbench, enumerable: true });
    }
    if (this._props.plant !== undefined) {
      Object.defineProperty(this, 'plant', { get: () => this._props.plant, enumerable: true });
    }

    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof FurnitureProps>(key: K, value: FurnitureProps[K]): Furniture {
    return new Furniture({ ...this._props, [key]: value });
  }

  /**
   * 是否透明
   */
  isTransparent(): boolean {
    return this.flags.isTransparent();
  }

  /**
   * 是否可通行
   */
  isPassable(): boolean {
    return this.moveCost !== 0;
  }

  /**
   * 是否可破坏
   */
  isBashable(): boolean {
    return this.bash !== undefined;
  }

  /**
   * 是否可拆解
   */
  isDeconstructable(): boolean {
    return this.deconstruct !== undefined;
  }

  /**
   * 是否可打开
   */
  canOpen(): boolean {
    return this.open !== undefined;
  }

  /**
   * 是否可关闭
   */
  canClose(): boolean {
    return this.close !== undefined;
  }

  /**
   * 是否可坐
   */
  isSittable(): boolean {
    return this.flags.isSittable() || this.comfort > 0;
  }

  /**
   * 是否是工作台
   */
  isWorkbench(): boolean {
    return this.workbench !== undefined && this.flags.isWorkbench();
  }

  /**
   * 是否是植物
   */
  isPlant(): boolean {
    return this.plant !== undefined;
  }

  /**
   * 是否是容器
   */
  isContainer(): boolean {
    return this.flags.isContainer();
  }

  /**
   * 是否发射场
   */
  emitsField(fieldType: string): boolean {
    return this.emitters.has(fieldType);
  }

  /**
   * 获取破坏难度
   */
  getBashDifficulty(): number {
    if (!this.bash || this.bash.strMin === undefined || this.bash.strMax === undefined) {
      return -1;
    }
    return (this.bash.strMin + this.bash.strMax) / 2;
  }

  /**
   * 获取移动消耗修正
   */
  getMoveCostModifier(): number {
    return this.moveCostMod;
  }

  /**
   * 获取舒适度
   */
  getComfort(): number {
    return this.comfort;
  }

  /**
   * 获取所需力量
   */
  getRequiredStrength(): number {
    return this.requiredStr;
  }

  /**
   * 获取质量
   */
  getMass(): number {
    return this.mass;
  }

  /**
   * 获取体积
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 获取显示信息
   */
  getDisplayInfo(): { symbol: string; color: string; name: string } {
    return {
      symbol: this.symbol,
      color: this.color,
      name: this.name,
    };
  }

  /**
   * 获取光照等级
   */
  getLight(): number {
    return Math.max(this.emittedLight, this.light);
  }

  /**
   * 检查是否发光
   */
  emitsLight(): boolean {
    return this.getLight() > 0;
  }

  /**
   * 检查是否阻挡视线
   */
  blocksVision(): boolean {
    return !this.isTransparent();
  }

  /**
   * 检查是否阻挡移动
   */
  blocksMovement(): boolean {
    return !this.isPassable();
  }

  /**
   * 检查是否可以攀爬
   */
  canClimb(): boolean {
    return this.flags.hasFlag(FurnitureFlag.MOUNTABLE) || this.flags.hasFlag(FurnitureFlag.CLIMBABLE);
  }

  /**
   * 获取工作台信息
   */
  getWorkbenchInfo(): WorkbenchInfo | undefined {
    return this.workbench;
  }

  /**
   * 检查是否支持特定技能
   */
  supportsSkill(skill: string): boolean {
    return this.workbench?.items.has(skill) ?? false;
  }

  /**
   * 获取技能倍率
   */
  getSkillMultiplier(skill: string): number {
    if (!this.workbench) return 1.0;
    return this.workbench.multipliers?.get(skill) ?? this.workbench.items.get(skill) ?? 1.0;
  }

  /**
   * 检查是否需要搬运
   */
  requiresMoving(): boolean {
    return this.requiredStr > 0;
  }

  /**
   * 获取植物数据
   */
  getPlantData(): PlantData | undefined {
    return this.plant;
  }

  /**
   * 检查是否成熟
   */
  isPlantMature(age: number): boolean {
    return this.plant ? age >= this.plant.transformAge : false;
  }

  /**
   * 获取覆盖层
   */
  getOverlayLayers(): string[] {
    return this.overlayLayers;
  }

  /**
   * 检查是否易燃
   */
  isFlammable(): boolean {
    return this.flags.isFlammable();
  }

  /**
   * 获取发射场数据
   */
  getEmitterData(fieldType: string): EmissionData | undefined {
    return this.emitters.get(fieldType);
  }

  /**
   * 检查是否阻挡门
   */
  blocksDoor(): boolean {
    return this.flags.blocksDoor();
  }

  /**
   * 检查是否可以放置物品
   */
  canPlaceItemsOn(): boolean {
    return this.flags.canPlaceItems();
  }

  /**
   * 创建副本
   */
  clone(): Furniture {
    return new Furniture(this._props);
  }
}
