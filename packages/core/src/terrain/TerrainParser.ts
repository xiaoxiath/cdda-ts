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
  /**
   * 解析地形对象
   */
  parse(obj: TerrainJson): Terrain {
    // Skip abstract terrain definitions (templates)
    if ((obj as any).abstract) {
      throw new Error('Abstract terrain definition (template), skipping');
    }

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
}
