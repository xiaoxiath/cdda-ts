import { TerrainId } from '../coordinates/types';
import { TerrainFlags, TerrainFlag } from './types';
import { ItemSpawn } from '../types/common';

/**
 * 射击数据
 */
export interface ShootData {
  chanceToHit?: number;
  reduceDamage?: [number, number];
  reduceDamageLaser?: [number, number];
  destroyDamage?: [number, number];
}

/**
 * 破坏信息
 */
export interface BashInfo {
  sound: string;
  strMin: number;
  strMax: number;
  furniture: string[];
  items?: ItemSpawn[];
  ter?: TerrainId;
  successMsg?: string;
  failMsg?: string;
  soundChance?: number;
  quiet?: string;
  strMinSupported?: number;  // 新增：有支撑时的最小力量
  soundVol?: number;  // 新增：音效音量
  soundFail?: string;  // 新增：失败音效
  soundFailVol?: number;  // 新增：失败音效音量
}

/**
 * 拆解信息
 */
export interface DeconstructInfo {
  furniture: string;
  items?: ItemSpawn[];
  ter?: TerrainId;
  time: number;
  simple?: boolean;
}

/**
 * 地形属性
 */
export interface TerrainProps {
  id: TerrainId;
  idString?: string;  // 原始字符串 ID，用于查找
  name: string;
  description: string;
  symbol: string;
  color: string;
  moveCost: number;
  coverage: number;
  flags: TerrainFlags;
  open?: TerrainId;
  close?: TerrainId;
  bash?: BashInfo;
  deconstruct?: DeconstructInfo;
  lockpickResult?: TerrainId;
  transformsInto?: TerrainId;
  roof?: TerrainId;
  trap?: string;
  allowedTemplates: Map<string, boolean>;
  connectGroups: Map<string, boolean>;
  connectsTo: Map<string, boolean>;
  looksLike?: string;  // 新增：渲染替代
  lightEmitted?: number;  // 新增：发光强度
  shoot?: ShootData;  // 新增：射击数据
  comfort?: number;  // 新增：舒适度
}

/**
 * 地形数据
 */
export class Terrain {
  private readonly _props: TerrainProps;

  readonly id!: TerrainId;
  readonly idString?: string;  // 原始字符串 ID，用于查找
  readonly name!: string;
  readonly description!: string;
  readonly symbol!: string;
  readonly color!: string;
  readonly moveCost!: number;
  readonly coverage!: number;
  readonly flags!: TerrainFlags;
  readonly open?: TerrainId;
  readonly close?: TerrainId;
  readonly bash?: BashInfo;
  readonly deconstruct?: DeconstructInfo;
  readonly lockpickResult?: TerrainId;
  readonly transformsInto?: TerrainId;
  readonly roof?: TerrainId;
  readonly trap?: string;
  readonly allowedTemplates!: Map<string, boolean>;
  readonly connectGroups!: Map<string, boolean>;
  readonly connectsTo!: Map<string, boolean>;
  readonly looksLike?: string;  // 新增：渲染替代
  readonly lightEmitted?: number;  // 新增：发光强度
  readonly shoot?: ShootData;  // 新增：射击数据
  readonly comfort?: number;  // 新增：舒适度

  constructor(props?: Partial<TerrainProps>) {
    const defaults: TerrainProps = {
      id: 0,
      name: '',
      description: '',
      symbol: '?',
      color: 'white',
      moveCost: 2,
      coverage: 0,
      flags: new TerrainFlags(),
      allowedTemplates: new Map(),
      connectGroups: new Map(),
      connectsTo: new Map(),
    };

    // Merge props with defaults, ensuring flags and maps are always set
    this._props = {
      ...defaults,
      ...props,
      flags: props?.flags ?? defaults.flags,
      allowedTemplates: props?.allowedTemplates ?? defaults.allowedTemplates,
      connectGroups: props?.connectGroups ?? defaults.connectGroups,
      connectsTo: props?.connectsTo ?? defaults.connectsTo,
    };

    // Define getters for all properties
    Object.defineProperty(this, 'id', { get: () => this._props.id, enumerable: true });
    Object.defineProperty(this, 'idString', { get: () => this._props.idString, enumerable: true });
    Object.defineProperty(this, 'name', { get: () => this._props.name, enumerable: true });
    Object.defineProperty(this, 'description', { get: () => this._props.description, enumerable: true });
    Object.defineProperty(this, 'symbol', { get: () => this._props.symbol, enumerable: true });
    Object.defineProperty(this, 'color', { get: () => this._props.color, enumerable: true });
    Object.defineProperty(this, 'moveCost', { get: () => this._props.moveCost, enumerable: true });
    Object.defineProperty(this, 'coverage', { get: () => this._props.coverage, enumerable: true });
    Object.defineProperty(this, 'flags', { get: () => this._props.flags, enumerable: true });
    Object.defineProperty(this, 'allowedTemplates', { get: () => this._props.allowedTemplates, enumerable: true });
    Object.defineProperty(this, 'connectGroups', { get: () => this._props.connectGroups, enumerable: true });
    Object.defineProperty(this, 'connectsTo', { get: () => this._props.connectsTo, enumerable: true });

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
    if (this._props.lockpickResult !== undefined) {
      Object.defineProperty(this, 'lockpickResult', { get: () => this._props.lockpickResult, enumerable: true });
    }
    if (this._props.transformsInto !== undefined) {
      Object.defineProperty(this, 'transformsInto', { get: () => this._props.transformsInto, enumerable: true });
    }
    if (this._props.roof !== undefined) {
      Object.defineProperty(this, 'roof', { get: () => this._props.roof, enumerable: true });
    }
    if (this._props.trap !== undefined) {
      Object.defineProperty(this, 'trap', { get: () => this._props.trap, enumerable: true });
    }
    if (this._props.looksLike !== undefined) {
      Object.defineProperty(this, 'looksLike', { get: () => this._props.looksLike, enumerable: true });
    }
    if (this._props.lightEmitted !== undefined) {
      Object.defineProperty(this, 'lightEmitted', { get: () => this._props.lightEmitted, enumerable: true });
    }
    if (this._props.shoot !== undefined) {
      Object.defineProperty(this, 'shoot', { get: () => this._props.shoot, enumerable: true });
    }
    if (this._props.comfort !== undefined) {
      Object.defineProperty(this, 'comfort', { get: () => this._props.comfort, enumerable: true });
    }

    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof TerrainProps>(key: K, value: TerrainProps[K]): Terrain {
    return new Terrain({ ...this._props, [key]: value });
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
    return this.moveCost > 0;
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
   * 获取连接组
   */
  getConnectGroup(): string | null {
    const groups = Array.from(this.connectGroups.keys());
    return groups.length > 0 ? groups[0] : null;
  }

  /**
   * 检查是否连接到指定组
   */
  connectsToGroup(group: string): boolean {
    return this.connectsTo.has(group);
  }

  /**
   * 获取破坏难度
   */
  getBashDifficulty(): number {
    if (!this.bash) return -1;
    return (this.bash.strMin + this.bash.strMax) / 2;
  }

  /**
   * 检查是否有陷阱
   */
  hasTrap(): boolean {
    return this.trap !== undefined && this.trap !== 'tr_null';
  }

  /**
   * 获取地形显示信息
   */
  getDisplayInfo(): { symbol: string; color: string; name: string } {
    return {
      symbol: this.symbol,
      color: this.color,
      name: this.name,
    };
  }

  /**
   * 检查是否可以建造
   */
  canBuildOn(): boolean {
    return this.flags.isFlat() && !this.flags.isLiquid();
  }

  /**
   * 获取移动消耗
   */
  getMoveCost(): number {
    return this.moveCost;
  }

  /**
   * 检查是否危险地形
   */
  isDangerous(): boolean {
    return (
      this.flags.has(TerrainFlag.LIQUID) ||
      this.flags.has(TerrainFlag.DEEP_WATER) ||
      this.hasTrap()
    );
  }

  /**
   * 创建副本
   */
  clone(): Terrain {
    return new Terrain(this._props);
  }
}
