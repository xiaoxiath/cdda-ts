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
  copy_from?: string;  // For inheritance
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
 * 匹配 CDDA furn_workbench_info
 */
export interface WorkbenchJson {
  multiplier?: number;
  allowed_mass?: number;
  allowed_volume?: number;
  // 保留旧字段以兼容旧 JSON 格式
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
 * 匹配 CDDA plant_data
 */
export interface PlantJson {
  transform?: string;
  base?: string;
  growth_multiplier?: number;
  harvest_multiplier?: number;
  // 保留旧字段以兼容旧 JSON 格式
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
  // Store all raw JSON objects (including abstract) for inheritance resolution
  private rawDefinitions: Map<string, FurnitureJson> = new Map();

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
   * 匹配 CDDA furn_workbench_info
   */
  private parseWorkbench(obj: WorkbenchJson): WorkbenchInfo {
    return {
      multiplier: obj.multiplier ?? 1.0,
      allowedMass: obj.allowed_mass ?? obj.mass,
      allowedVolume: obj.allowed_volume ?? obj.volume,
    };
  }

  /**
   * 解析植物数据
   * 匹配 CDDA plant_data
   */
  private parsePlant(obj: PlantJson): PlantData {
    return {
      transform: obj.transform || obj.transforms_into_furniture || '',
      base: obj.base || '',
      growthMultiplier: obj.growth_multiplier ?? 1.0,
      harvestMultiplier: obj.harvest_multiplier ?? 1.0,
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

  /**
   * Store raw furniture definitions (including abstract ones) for inheritance
   */
  storeRawDefinitions(jsonArray: FurnitureJson[]): void {
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
   * Resolve copy-from inheritance for a furniture JSON object
   */
  resolveInheritance(obj: FurnitureJson): FurnitureJson {
    const result: FurnitureJson = { ...obj };

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
        console.warn(`Warning: copy-from parent '${copyFrom}' not found for furniture '${obj.id}'`);
      }
    }

    return result;
  }

  /**
   * Merge parent properties into child object (child takes precedence)
   */
  private mergeProperties(child: FurnitureJson, parent: FurnitureJson): void {
    // Merge simple properties (only if child doesn't have them)
    if (!child.name && parent.name) child.name = parent.name;
    if (!child.description && parent.description) child.description = parent.description;
    if (!child.symbol && parent.symbol) child.symbol = parent.symbol;
    if (!child.color && parent.color) child.color = parent.color;
    if (child.move_cost_mod === undefined && parent.move_cost_mod !== undefined) child.move_cost_mod = parent.move_cost_mod;
    if (child.move_cost === undefined && parent.move_cost !== undefined) child.move_cost = parent.move_cost;
    if (child.coverage === undefined && parent.coverage !== undefined) child.coverage = parent.coverage;
    if (child.comfort === undefined && parent.comfort !== undefined) child.comfort = parent.comfort;
    if (child.floor_bedding_warmth === undefined && parent.floor_bedding_warmth !== undefined) child.floor_bedding_warmth = parent.floor_bedding_warmth;
    if (child.required_str === undefined && parent.required_str !== undefined) child.required_str = parent.required_str;
    if (child.mass === undefined && parent.mass !== undefined) child.mass = parent.mass;
    if (child.volume === undefined && parent.volume !== undefined) child.volume = parent.volume;
    if (child.keg_capacity === undefined && parent.keg_capacity !== undefined) child.keg_capacity = parent.keg_capacity;
    if (child.max_volume === undefined && parent.max_volume !== undefined) child.max_volume = parent.max_volume;
    if (child.emitted_light === undefined && parent.emitted_light !== undefined) child.emitted_light = parent.emitted_light;
    if (child.light === undefined && parent.light !== undefined) child.light = parent.light;
    if (child.connecting === undefined && parent.connecting !== undefined) child.connecting = parent.connecting;
    if (!child.skin && parent.skin) child.skin = parent.skin;

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

    if (parent.overlay_layers && parent.overlay_layers.length > 0) {
      if (!child.overlay_layers) child.overlay_layers = [];
      // Add parent layers that aren't already in child
      const childLayerSet = new Set(child.overlay_layers);
      for (const layer of parent.overlay_layers) {
        if (!childLayerSet.has(layer)) {
          child.overlay_layers.push(layer);
        }
      }
    }

    // Merge optional reference fields
    if (!child.open && parent.open) child.open = parent.open;
    if (!child.close && parent.close) child.close = parent.close;
    if (!child.bash && parent.bash) child.bash = parent.bash;
    if (!child.deconstruct && parent.deconstruct) child.deconstruct = parent.deconstruct;
    if (!child.workbench && parent.workbench) child.workbench = parent.workbench;
    if (!child.plant && parent.plant) child.plant = parent.plant;
    if (!child.emitters && parent.emitters) child.emitters = parent.emitters;
  }

  /**
   * Parse with inheritance resolution
   */
  parseWithInheritance(obj: FurnitureJson): Furniture {
    const resolved = this.resolveInheritance(obj);
    return this.parse(resolved);
  }
}
