import { Terrain } from './Terrain';
import { ItemSpawn } from '../types/common';
import { TerrainFlags } from './types';
import { BashInfo, DeconstructInfo } from './Terrain';

/**
 * 射击数据
 */
export interface ShootData {
  chance_to_hit?: number;
  reduce_damage?: [number, number];
  reduce_damage_laser?: [number, number];
  destroy_damage?: [number, number];
}

/**
 * 地形 JSON 接口
 */
export interface TerrainJson {
  type: 'terrain';
  id: string;
  name: string;
  description?: string;
  symbol: string;
  color: string;
  move_cost?: number;
  coverage?: number;
  flags?: string[];
  open?: string;
  close?: string;
  bash?: BashJson;
  deconstruct?: DeconstructJson;
  lockpick_result?: string;
  transforms_into?: string;
  roof?: string;
  trap?: string;
  connect_groups?: string | string[];
  connects_to?: string | string[];  // 修复：支持字符串或数组
  looks_like?: string;  // 新增
  copy_from?: string;  // 新增（后续实现继承）
  light_emitted?: number;  // 新增
  shoot?: ShootData;  // 新增
  comfort?: number;  // 新增
}

/**
 * 破坏信息 JSON
 */
export interface BashJson {
  sound?: string;
  str_min?: number;
  str_max?: number;
  furniture?: string[];
  items?: ItemSpawn[];
  ter_set?: string;
  success_msg?: string;
  fail_msg?: string;
  sound_chance?: number;
  quiet?: string;
  str_min_supported?: number;  // 新增：有支撑时的最小力量
  sound_vol?: number;  // 新增：音效音量
  sound_fail?: string;  // 新增：失败音效
  sound_fail_vol?: number;  // 新增：失败音效音量
}

/**
 * 拆解信息 JSON
 */
export interface DeconstructJson {
  furniture?: string;
  items?: ItemSpawn[];
  ter_set?: string;
  time?: number;
  simple?: boolean;
}

/**
 * 地形 JSON 解析器
 */
export class TerrainParser {
  // Store all raw JSON objects (including abstract) for inheritance resolution
  private rawDefinitions: Map<string, TerrainJson> = new Map();

  /**
   * 解析地形对象
   */
  parse(obj: TerrainJson): Terrain {
    // Validate that we have a valid ID
    if (!obj.id || typeof obj.id !== 'string') {
      throw new Error('Invalid terrain object: missing or invalid id');
    }

    const id = this.parseId(obj.id);

    return new Terrain({
      id,
      idString: obj.id,  // 存储原始字符串 ID
      name: obj.name || '',
      description: obj.description || '',
      symbol: obj.symbol || '?',
      color: obj.color || 'white',
      moveCost: obj.move_cost ?? 2,
      coverage: obj.coverage ?? 0,
      flags: TerrainFlags.fromJson(obj.flags || []),
      open: obj.open ? this.parseId(obj.open) : undefined,
      close: obj.close ? this.parseId(obj.close) : undefined,
      bash: obj.bash ? this.parseBash(obj.bash) : undefined,
      deconstruct: obj.deconstruct ? this.parseDeconstruct(obj.deconstruct) : undefined,
      lockpickResult: obj.lockpick_result ? this.parseId(obj.lockpick_result) : undefined,
      transformsInto: obj.transforms_into ? this.parseId(obj.transforms_into) : undefined,
      roof: obj.roof ? this.parseId(obj.roof) : undefined,
      trap: obj.trap,
      connectGroups: this.parseConnectGroups(obj.connect_groups),
      connectsTo: this.parseConnectsTo(obj.connects_to),
      allowedTemplates: new Map(),
      looksLike: obj.looks_like,  // 新增
      lightEmitted: obj.light_emitted,  // 新增
      shoot: obj.shoot ? this.parseShoot(obj.shoot) : undefined,  // 新增
      comfort: obj.comfort,  // 新增
    });
  }

  /**
   * 批量解析
   */
  parseMany(jsonArray: TerrainJson[]): Terrain[] {
    return jsonArray.map((obj) => this.parse(obj));
  }

  /**
   * 解析 ID
   */
  parseId(id: string): number {
    // 简化版：使用字符串哈希，确保结果在 Uint16 范围内（0-65535）
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;  // Convert to 32-bit integer
    }
    // 确保结果在 Uint16 范围内
    return Math.abs(hash) & 0xFFFF;
  }

  /**
   * 解析破坏信息
   */
  private parseBash(obj: BashJson): BashInfo {
    return {
      sound: obj.sound || '',
      strMin: obj.str_min || 0,
      strMax: obj.str_max || 0,
      furniture: obj.furniture || [],
      items: obj.items,
      ter: obj.ter_set ? this.parseId(obj.ter_set) : undefined,
      successMsg: obj.success_msg,
      failMsg: obj.fail_msg,
      soundChance: obj.sound_chance,
      quiet: obj.quiet,
      strMinSupported: obj.str_min_supported,  // 新增
      soundVol: obj.sound_vol,  // 新增
      soundFail: obj.sound_fail,  // 新增
      soundFailVol: obj.sound_fail_vol,  // 新增
    };
  }

  /**
   * 解析拆解信息
   */
  private parseDeconstruct(obj: DeconstructJson): DeconstructInfo {
    return {
      furniture: obj.furniture || '',
      items: obj.items,
      ter: obj.ter_set ? this.parseId(obj.ter_set) : undefined,
      time: obj.time || 0,
      simple: obj.simple,
    };
  }

  /**
   * 解析连接组
   */
  private parseConnectGroups(groups: string | string[] | undefined): Map<string, boolean> {
    if (!groups) return new Map();
    const groupArray = typeof groups === 'string' ? [groups] : groups;
    return new Map<string, boolean>(groupArray.map((g) => [g, true]));
  }

  /**
   * 解析连接目标
   */
  private parseConnectsTo(connects: string | string[] | undefined): Map<string, boolean> {
    if (!connects) return new Map();
    // 修复：支持字符串或数组
    const connectArray = typeof connects === 'string' ? [connects] : connects;
    return new Map<string, boolean>(connectArray.map((c) => [c, true]));
  }

  /**
   * 解析射击数据
   */
  private parseShoot(obj: any): any {
    return {
      chanceToHit: obj.chance_to_hit,
      reduceDamage: obj.reduce_damage,
      reduceDamageLaser: obj.reduce_damage_laser,
      destroyDamage: obj.destroy_damage,
    };
  }

  /**
   * Store raw terrain definitions (including abstract ones) for inheritance
   */
  storeRawDefinitions(jsonArray: TerrainJson[]): void {
    for (const obj of jsonArray) {
      // Get identifier - could be 'id' or 'abstract'
      const identifier = obj.id || (obj as any).abstract;
      if (identifier) {
        this.rawDefinitions.set(identifier, obj);
      }
    }
  }

  /**
   * Clear stored raw definitions
   */
  clearRawDefinitions(): void {
    this.rawDefinitions.clear();
  }

  /**
   * Resolve copy-from inheritance for a terrain JSON object
   */
  resolveInheritance(obj: TerrainJson): TerrainJson {
    const result: TerrainJson = { ...obj };

    // Handle copy_from field (supports both 'copy-from' and 'copy_from')
    const copyFrom = (obj as any)['copy-from'] || obj.copy_from;
    if (copyFrom) {
      const parent = this.rawDefinitions.get(copyFrom);
      if (parent) {
        // Recursively resolve parent's inheritance first
        const resolvedParent = this.resolveInheritance(parent);
        // Merge parent properties into result (child overrides parent)
        this.mergeProperties(result, resolvedParent);
      } else {
        console.warn(`Warning: copy-from parent '${copyFrom}' not found for terrain '${obj.id}'`);
      }
    }

    return result;
  }

  /**
   * Merge parent properties into child object (child takes precedence)
   */
  private mergeProperties(child: TerrainJson, parent: TerrainJson): void {
    // Merge simple properties (only if child doesn't have them)
    if (!child.name && parent.name) child.name = parent.name;
    if (!child.description && parent.description) child.description = parent.description;
    if (!child.symbol && parent.symbol) child.symbol = parent.symbol;
    if (!child.color && parent.color) child.color = parent.color;
    if (child.move_cost === undefined && parent.move_cost !== undefined) child.move_cost = parent.move_cost;
    if (child.coverage === undefined && parent.coverage !== undefined) child.coverage = parent.coverage;

    // Merge arrays (concatenate)
    if (parent.flags && parent.flags.length > 0) {
      if (!child.flags) child.flags = [];
      // Add parent flags that aren't already in child
      const childFlagSet = new Set(child.flags);
      for (const flag of parent.flags) {
        if (!childFlagSet.has(flag)) {
          child.flags.push(flag);
        }
      }
    }

    // Merge optional reference fields
    if (!child.open && parent.open) child.open = parent.open;
    if (!child.close && parent.close) child.close = parent.close;
    if (!child.bash && parent.bash) child.bash = parent.bash;
    if (!child.deconstruct && parent.deconstruct) child.deconstruct = parent.deconstruct;
    if (!child.lockpick_result && parent.lockpick_result) child.lockpick_result = parent.lockpick_result;
    if (!child.transforms_into && parent.transforms_into) child.transforms_into = parent.transforms_into;
    if (!child.roof && parent.roof) child.roof = parent.roof;
    if (!child.trap && parent.trap) child.trap = parent.trap;
    if (!child.connect_groups && parent.connect_groups) child.connect_groups = parent.connect_groups;
    if (!child.connects_to && parent.connects_to) child.connects_to = parent.connects_to;
    if (!child.looks_like && parent.looks_like) child.looks_like = parent.looks_like;
    if (child.light_emitted === undefined && parent.light_emitted !== undefined) child.light_emitted = parent.light_emitted;
    if (!child.shoot && parent.shoot) child.shoot = parent.shoot;
    if (child.comfort === undefined && parent.comfort !== undefined) child.comfort = parent.comfort;
  }

  /**
   * Parse with inheritance resolution
   */
  parseWithInheritance(obj: TerrainJson): Terrain {
    const resolved = this.resolveInheritance(obj);
    return this.parse(resolved);
  }
}
