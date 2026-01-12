import { TerrainId } from '../coordinates/types';
import { TerrainFlags, TerrainFlag } from './types';
import { ItemSpawn } from '../types/common';

/**
 * 场效果数据
 * 匹配 CDDA std::pair<field_type_str_id, int>
 */
export interface FieldEffectData {
  type: string; // field_type_str_id
  intensity: number;
}

/**
 * 射击数据
 * 匹配 CDDA map_shoot_info
 */
export interface ShootData {
  // 基础命中概率（默认 100%）
  chanceToHit?: number;
  // 最小伤害减免
  reduceDamageMin?: number;
  // 最大伤害减免
  reduceDamageMax?: number;
  // 激光最小伤害减免
  reduceDamageMinLaser?: number;
  // 激光最大伤害减免
  reduceDamageMaxLaser?: number;
  // 摧毁所需最小伤害
  destroyDamageMin?: number;
  // 摧毁所需最大伤害
  destroyDamageMax?: number;
  // 激光是否无法摧毁
  noLaserDestroy?: boolean;
}

/**
 * 拆解技能数据
 * 匹配 CDDA map_deconstruct_skill
 */
export interface DeconstructSkillData {
  id: string; // skill_id
  min: number;
  max: number;
  multiplier: number;
}

/**
 * 破坏信息
 * 匹配 CDDA map_ter_bash_info (继承自 map_common_bash_info)
 */
export interface BashInfo {
  // 声音相关
  sound?: string; // 破坏成功的声音
  soundVol?: number; // 破坏成功的音量
  soundFail?: string; // 破坏失败的声音
  soundFailVol?: number; // 破坏失败的音量
  soundChance?: number; // 声音触发概率

  // 力量需求
  strMin: number; // 最小力量需求
  strMax: number; // 最大力量需求（随机值在此范围）
  strMinBlocked?: number; // 有相邻家具时的最小力量
  strMaxBlocked?: number; // 有相邻家具时的最大力量
  strMinSupported?: number; // 有支撑时的最小力量
  strMaxSupported?: number; // 有支撑时的最大力量

  // 破坏结果
  ter?: TerrainId; // 破坏后变成的地形
  terBashedFromAbove?: TerrainId; // 从上方破坏时变成的地形
  furniture?: string[]; // 破坏后生成的家具
  items?: ItemSpawn[]; // 破坏后掉落的物品
  dropGroup?: string; // item_group_id

  // 场效果
  hitField?: FieldEffectData; // 被击中时产生的场
  destroyedField?: FieldEffectData; // 被摧毁时产生的场

  // 消息
  successMsg?: string; // 成功消息
  failMsg?: string; // 失败消息
  quiet?: string; // 静音破坏时的消息

  // 特殊属性
  explosive?: number; // 爆炸威力
  destroyOnly?: boolean; // 只能被摧毁，不能被普通破坏
  bashBelow?: boolean; // 同时破坏下方的地形
  collapseRadius?: number; // 支撑的帐篷半径
  tentCenters?: string[]; // 帐篷中心家具列表

  // 兼容旧数据
  furniture?: string[]; // 已废弃，使用 dropGroup 代替
}

/**
 * 拆解信息
 * 匹配 CDDA map_ter_deconstruct_info (继承自 map_common_deconstruct_info)
 */
export interface DeconstructInfo {
  // 拆解结果
  ter?: TerrainId; // 拆解后变成的地形
  furniture?: string; // 拆解后变成的家具
  items?: ItemSpawn[]; // 拆解获得的物品
  dropGroup?: string; // item_group_id
  time: number; // 拆解所需时间（回合）
  simple?: boolean; // 是否简单拆解（无需工具）

  // 技能奖励
  skill?: DeconstructSkillData;

  // 特殊属性
  deconstructAbove?: boolean; // 需要先拆除上方的屋顶
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
