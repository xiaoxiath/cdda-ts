import { Furniture } from './Furniture';
import { ItemSpawn } from '../types/common';
import { FurnitureFlags } from './types';
import { FurnitureBashInfo, FurnitureDeconstructInfo, WorkbenchInfo, PlantData, EmissionData } from './Furniture';

/**
 * 家具 JSON 接口
 */
export interface FurnitureJson {
  type: 'furniture' | 'furniture_nested';
  id: string;
  name: string;
  description?: string;
  symbol: string;
  color: string;
  move_cost_mod?: number;
  move_cost?: number;
  coverage?: number;
  flags?: string[];
  comfort?: number;
  floor_bedding_warmth?: number;
  required_str?: number;
  mass?: number;
  volume?: number;
  keg_capacity?: number;
  max_volume?: number;
  open?: string;
  close?: string;
  bash?: FurnitureBashJson;
  deconstruct?: FurnitureDeconstructJson;
  workbench?: WorkbenchJson;
  plant?: PlantJson;
  emitted_light?: number;
  light?: number;
  overlay_layers?: string[];
  emitters?: Record<string, EmissionJson>;
  connecting?: number;
  skin?: string;
}

/**
 * 破坏信息 JSON
 */
export interface FurnitureBashJson {
  sound?: string;
  str_min?: number;
  str_max?: number;
  sound_chance?: number;
  quiet?: string;
  furniture?: string[];
  items?: ItemSpawn[];
  ter?: number | string;
  success_msg?: string;
  fail_msg?: string;
  destroy_only?: boolean;
}

/**
 * 拆解信息 JSON
 */
export interface FurnitureDeconstructJson {
  furniture?: string;
  items?: ItemSpawn[];
  ter?: number | string;
  time?: number;
  simple?: boolean;
  furniture_only?: boolean;
}

/**
 * 工作台 JSON
 */
export interface WorkbenchJson {
  items?: Record<string, number | string>;
  multipliers?: Record<string, number>;
  tile?: boolean;
  requires_light?: boolean;
  requires_power?: boolean;
  requires_flooring?: boolean;
  mass?: number;
  volume?: number;
}

/**
 * 植物数据 JSON
 */
export interface PlantJson {
  transform_age?: number | string;
  transforms_into_furniture?: string;
  transforms_into_item?: string;
  fruit_count?: number;
  fruit_div?: number;
  fruit_type?: string;
  byproducts?: ItemSpawn[];
  seed_type?: string;
  grow?: number;
  harvest?: number;
  harvest_season?: string[];
}

/**
 * 发射场 JSON
 */
export interface EmissionJson {
  field: string;
  density: number | string;
  chance: number | string;
  age_intensity?: boolean;
  min_intensity?: number;
  max_intensity?: number;
}

/**
 * 家具 JSON 解析器
 */
export class FurnitureParser {
  /**
   * 解析家具对象
   */
  parse(obj: FurnitureJson): Furniture {
    // Validate that we have a valid ID
    if (!obj.id || typeof obj.id !== 'string') {
      throw new Error('Invalid furniture object: missing or invalid id');
    }

    const id = this.parseId(obj.id);

    return new Furniture({
      id,
      idString: obj.id,  // 存储原始字符串 ID
      name: obj.name || '',
      description: obj.description || '',
      symbol: obj.symbol || '?',
      color: obj.color || 'white',
      moveCostMod: obj.move_cost_mod ?? 0,
      moveCost: obj.move_cost ?? 0,
      coverage: obj.coverage ?? 0,
      flags: FurnitureFlags.fromJson(obj.flags || []),
      comfort: obj.comfort ?? 0,
      floorBeddingWarmth: obj.floor_bedding_warmth ?? 0,
      requiredStr: obj.required_str ?? 0,
      mass: this.parseOptionalNumber(obj.mass),
      volume: this.parseOptionalNumber(obj.volume),
      kegCapacity: obj.keg_capacity ?? 0,
      maxVolume: obj.max_volume ?? 0,
      open: obj.open ? this.parseId(obj.open) : undefined,
      close: obj.close ? this.parseId(obj.close) : undefined,
      bash: obj.bash ? this.parseBash(obj.bash) : undefined,
      deconstruct: obj.deconstruct ? this.parseDeconstruct(obj.deconstruct) : undefined,
      workbench: obj.workbench ? this.parseWorkbench(obj.workbench) : undefined,
      plant: obj.plant ? this.parsePlant(obj.plant) : undefined,
      emittedLight: obj.emitted_light ?? 0,
      light: obj.light ?? 0,
      overlayLayers: obj.overlay_layers || [],
      emitters: this.parseEmitters(obj.emitters),
      connecting: obj.connecting ?? 0,
      skin: obj.skin || '',
    });
  }

  /**
   * 批量解析
   */
  parseMany(jsonArray: FurnitureJson[]): Furniture[] {
    return jsonArray.map((obj) => this.parse(obj));
  }

  /**
   * 解析 ID
   */
  parseId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * 解析可选数字
   */
  private parseOptionalNumber(value: number | string | undefined): number {
    if (value === undefined) return 0;
    if (typeof value === 'number') return value;
    return 0;
  }

  /**
   * 解析破坏信息
   */
  private parseBash(obj: FurnitureBashJson): FurnitureBashInfo {
    return {
      sound: obj.sound,
      strMin: obj.str_min,
      strMax: obj.str_max,
      soundChance: obj.sound_chance,
      quiet: obj.quiet,
      furniture: obj.furniture || [],
      items: obj.items,
      ter: typeof obj.ter === 'number' ? obj.ter : undefined,
      successMsg: obj.success_msg,
      failMsg: obj.fail_msg,
      destroyOnly: obj.destroy_only,
    };
  }

  /**
   * 解析拆解信息
   */
  private parseDeconstruct(obj: FurnitureDeconstructJson): FurnitureDeconstructInfo {
    return {
      furniture: obj.furniture || '',
      items: obj.items,
      ter: typeof obj.ter === 'number' ? obj.ter : undefined,
      time: obj.time,
      simple: obj.simple,
      furnitureOnly: obj.furniture_only,
    };
  }

  /**
   * 解析工作台信息
   */
  private parseWorkbench(obj: WorkbenchJson): WorkbenchInfo {
    const items = new Map<string, number>(
      Object.entries(obj.items || {}).map(([k, v]) => [k, typeof v === 'number' ? v : 1])
    );

    const multipliers = obj.multipliers
      ? new Map<string, number>(Object.entries(obj.multipliers).map(([k, v]) => [k, typeof v === 'number' ? v : 1]))
      : undefined;

    return {
      items,
      multipliers,
      tile: obj.tile,
      requiresLight: obj.requires_light,
      requiresPower: obj.requires_power,
      requiresFlooring: obj.requires_flooring,
      mass: obj.mass,
      volume: obj.volume,
    };
  }

  /**
   * 解析植物数据
   */
  private parsePlant(obj: PlantJson): PlantData {
    return {
      transformAge: typeof obj.transform_age === 'number' ? obj.transform_age : 0,
      transformToFurniture: obj.transforms_into_furniture || '',
      transformToItem: obj.transforms_into_item || '',
      fruitCount: obj.fruit_count || 0,
      fruitDiv: obj.fruit_div || 1,
      fruitType: obj.fruit_type || '',
      byproducts: obj.byproducts,
      seedType: obj.seed_type,
      grow: obj.grow,
      harvest: obj.harvest,
      harvestSeason: obj.harvest_season,
    };
  }

  /**
   * 解析发射场数据
   */
  private parseEmitters(obj: Record<string, EmissionJson> | undefined): Map<string, EmissionData> {
    if (!obj) return new Map();

    const entries = Object.entries(obj).map(([key, value]) => {
      const emission: EmissionData = {
        field: value.field,
        density: typeof value.density === 'number' ? value.density : 1,
        chance: typeof value.chance === 'number' ? value.chance : 1,
        ageIntensity: value.age_intensity,
        minIntensity: value.min_intensity,
        maxIntensity: value.max_intensity,
      };
      return [key, emission] as [string, EmissionData];
    });

    return new Map<string, EmissionData>(entries);
  }
}
