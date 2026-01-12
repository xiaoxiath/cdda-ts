import { FieldTypeId } from '../coordinates/types';
import { IntensityLevel, FieldPhase, FieldTypeFlags } from './types';
import { FieldEntry } from './FieldEntry';

/**
 * 场类型属性
 */
export interface FieldTypeProps {
  id: FieldTypeId;
  name: string;
  description: string;
  intensityLevels: IntensityLevel[];
  halfLife: number;
  phase: FieldPhase;
  acceleratedDecay: boolean;
  displayField: boolean;
  displayPriority: number;
  transparent: boolean;
  dangerLevel: number;
  fireSpreadChance: number;
  fireIgnitionChance: number;
  lightEmitted: number;
  lightConsumed: number;
  flags: FieldTypeFlags;
  /** 水下年龄加速（turn数），匹配 CDDA field_type::underwater_age_speedup */
  underwaterAgeSpeedup?: number;
  /** 户外年龄加速（turn数），匹配 CDDA field_type::outdoor_age_speedup */
  outdoorAgeSpeedup?: number;
  /** 衰减数量因子，匹配 CDDA field_type::decay_amount_factor */
  decayAmountFactor?: number;
  /** 传播百分比，匹配 CDDA field_type::percent_spread */
  percentSpread?: number;
}

/**
 * 场类型
 *
 * 定义某种场的行为和属性
 */
export class FieldType {
  private readonly _props: FieldTypeProps;

  readonly id!: FieldTypeId;
  readonly name!: string;
  readonly description!: string;
  readonly intensityLevels!: IntensityLevel[];
  readonly halfLife!: number;
  readonly phase!: FieldPhase;
  readonly acceleratedDecay!: boolean;
  readonly displayField!: boolean;
  readonly displayPriority!: number;
  readonly transparent!: boolean;
  readonly dangerLevel!: number;
  readonly fireSpreadChance!: number;
  readonly fireIgnitionChance!: number;
  readonly lightEmitted!: number;
  readonly lightConsumed!: number;
  readonly flags!: FieldTypeFlags;
  readonly underwaterAgeSpeedup!: number;
  readonly outdoorAgeSpeedup!: number;
  readonly decayAmountFactor!: number;
  readonly percentSpread!: number;

  constructor(props?: Partial<FieldTypeProps>) {
    const defaults: FieldTypeProps = {
      id: '' as FieldTypeId,
      name: '',
      description: '',
      intensityLevels: [],
      halfLife: 0,
      phase: FieldPhase.GAS,
      acceleratedDecay: false,
      displayField: true,
      displayPriority: 0,
      transparent: true,
      dangerLevel: 0,
      fireSpreadChance: 0,
      fireIgnitionChance: 0,
      lightEmitted: 0,
      lightConsumed: 0,
      flags: new FieldTypeFlags(),
      underwaterAgeSpeedup: 0,
      outdoorAgeSpeedup: 0,
      decayAmountFactor: 0,
      percentSpread: 0,
    };

    // Merge props with defaults, ensuring flags is always set
    this._props = {
      ...defaults,
      ...props,
      flags: props?.flags ?? defaults.flags,
      intensityLevels: props?.intensityLevels ?? defaults.intensityLevels,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'id', { get: () => this._props.id, enumerable: true });
    Object.defineProperty(this, 'name', { get: () => this._props.name, enumerable: true });
    Object.defineProperty(this, 'description', { get: () => this._props.description, enumerable: true });
    Object.defineProperty(this, 'intensityLevels', { get: () => this._props.intensityLevels, enumerable: true });
    Object.defineProperty(this, 'halfLife', { get: () => this._props.halfLife, enumerable: true });
    Object.defineProperty(this, 'phase', { get: () => this._props.phase, enumerable: true });
    Object.defineProperty(this, 'acceleratedDecay', { get: () => this._props.acceleratedDecay, enumerable: true });
    Object.defineProperty(this, 'displayField', { get: () => this._props.displayField, enumerable: true });
    Object.defineProperty(this, 'displayPriority', { get: () => this._props.displayPriority, enumerable: true });
    Object.defineProperty(this, 'transparent', { get: () => this._props.transparent, enumerable: true });
    Object.defineProperty(this, 'dangerLevel', { get: () => this._props.dangerLevel, enumerable: true });
    Object.defineProperty(this, 'fireSpreadChance', { get: () => this._props.fireSpreadChance, enumerable: true });
    Object.defineProperty(this, 'fireIgnitionChance', { get: () => this._props.fireIgnitionChance, enumerable: true });
    Object.defineProperty(this, 'lightEmitted', { get: () => this._props.lightEmitted, enumerable: true });
    Object.defineProperty(this, 'lightConsumed', { get: () => this._props.lightConsumed, enumerable: true });
    Object.defineProperty(this, 'flags', { get: () => this._props.flags, enumerable: true });
    Object.defineProperty(this, 'underwaterAgeSpeedup', { get: () => this._props.underwaterAgeSpeedup ?? 0, enumerable: true });
    Object.defineProperty(this, 'outdoorAgeSpeedup', { get: () => this._props.outdoorAgeSpeedup ?? 0, enumerable: true });
    Object.defineProperty(this, 'decayAmountFactor', { get: () => this._props.decayAmountFactor ?? 0, enumerable: true });
    Object.defineProperty(this, 'percentSpread', { get: () => this._props.percentSpread ?? 0, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof FieldTypeProps>(key: K, value: FieldTypeProps[K]): FieldType {
    return new FieldType({ ...this._props, [key]: value });
  }

  /**
   * 获取强度等级
   */
  getIntensityLevel(intensity: number): IntensityLevel | undefined {
    if (intensity < 1 || intensity > this.intensityLevels.length) {
      return undefined;
    }
    return this.intensityLevels[intensity - 1];
  }

  /**
   * 获取最大强度
   */
  getMaxIntensity(): number {
    return this.intensityLevels.length;
  }

  /**
   * 是否有效强度
   */
  isValidIntensity(intensity: number): boolean {
    return intensity > 0 && intensity <= this.getMaxIntensity();
  }

  /**
   * 获取强度的显示名称
   */
  getIntensityName(intensity: number): string {
    const level = this.getIntensityLevel(intensity);
    return level?.name || `${this.name} (${intensity})`;
  }

  /**
   * 获取强度的颜色
   */
  getIntensityColor(intensity: number): string {
    const level = this.getIntensityLevel(intensity);
    return level?.color || 'white';
  }

  /**
   * 获取强度的符号
   */
  getIntensitySymbol(intensity: number): string {
    const level = this.getIntensityLevel(intensity);
    return level?.symbol || '*';
  }

  /**
   * 计算衰减时间
   */
  calculateDecayTime(): number {
    // 半衰期衰减：经过 halfLife 后强度减半
    // 简化计算：每个 halfLife 降低 1 级强度
    return this.halfLife * this.getMaxIntensity();
  }

  /**
   * 是否应该加速衰减
   */
  shouldAccelerateDecay(): boolean {
    return this.acceleratedDecay;
  }

  /**
   * 是否显示
   */
  shouldDisplay(): boolean {
    return this.displayField;
  }

  /**
   * 是否透明
   */
  isTransparent(): boolean {
    return this.transparent || this.flags.isTransparent();
  }

  /**
   * 是否阻挡视线
   */
  blocksVision(): boolean {
    return !this.isTransparent();
  }

  /**
   * 是否危险
   */
  isDangerous(): boolean {
    return this.dangerLevel > 0 || this.flags.isDangerous();
  }

  /**
   * 是否可以传播
   */
  canSpread(): boolean {
    return this.fireSpreadChance > 0 || this.flags.spreads();
  }

  /**
   * 是否可以燃烧
   */
  canIgnite(): boolean {
    return this.fireIgnitionChance > 0;
  }

  /**
   * 是否发光
   */
  emitsLight(): boolean {
    return this.lightEmitted > 0;
  }

  /**
   * 是否吸收光
   */
  consumesLight(): boolean {
    return this.lightConsumed > 0;
  }

  /**
   * 获取光照修正
   */
  getLightModifier(): number {
    return this.lightEmitted - this.lightConsumed;
  }

  /**
   * 是否是火
   */
  isFire(): boolean {
    return this.flags.isFire();
  }

  /**
   * 是否是烟雾
   */
  isSmoke(): boolean {
    return this.flags.isSmoke();
  }

  /**
   * 是否有毒
   */
  isToxic(): boolean {
    return this.flags.isToxic();
  }

  /**
   * 是否是酸
   */
  isAcid(): boolean {
    return this.flags.isAcid();
  }

  /**
   * 是否是液体
   */
  isLiquid(): boolean {
    return this.phase === FieldPhase.LIQUID;
  }

  /**
   * 是否是气体
   */
  isGas(): boolean {
    return this.phase === FieldPhase.GAS;
  }

  /**
   * 是否粘滞
   */
  isSticky(): boolean {
    return this.flags.isSticky();
  }

  /**
   * 是否导电
   */
  isConductive(): boolean {
    return this.flags.isConductive();
  }

  /**
   * 获取显示信息
   */
  getDisplayInfo(intensity: number = 1): {
    symbol: string;
    color: string;
    name: string;
    priority: number;
  } {
    const level = this.getIntensityLevel(intensity);

    return {
      symbol: level?.symbol || '*',
      color: level?.color || 'white',
      name: level?.name || this.name,
      priority: this.displayPriority,
    };
  }

  /**
   * 创建场实例
   */
  createEntry(intensity: number = 1): FieldEntry {
    const validIntensity = Math.min(Math.max(1, intensity), this.getMaxIntensity());
    const decayTime = this.calculateDecayTime();

    return new FieldEntry({
      type: this.id,
      intensity: validIntensity,
      age: 0,
      decayTime,
      isAlive: true,
    });
  }

  /**
   * 比较显示优先级
   */
  comparePriority(other: FieldType): number {
    return this.displayPriority - other.displayPriority;
  }

  /**
   * 获取相态
   */
  getPhase(): FieldPhase {
    return this.phase;
  }

  /**
   * 是否是特定相态
   */
  isPhase(phase: FieldPhase): boolean {
    return this.phase === phase;
  }

  /**
   * 获取危险等级
   */
  getDangerLevel(): number {
    return Math.max(this.dangerLevel, this.flags.isDangerous() ? 1 : 0);
  }

  /**
   * 创建副本
   */
  clone(): FieldType {
    return new FieldType(this._props);
  }
}
