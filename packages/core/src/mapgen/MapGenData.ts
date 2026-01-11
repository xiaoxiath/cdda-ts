import { TerrainId } from '../terrain/types';
import { FurnitureId } from '../furniture/types';
import { TrapId } from '../trap/types';
import { FieldEntry } from '../field/FieldEntry';
import { MapTile } from '../map/MapTile';

/**
 * 地图瓦片数据
 *
 * 用于简化地图生成过程中的瓦片创建
 */
export interface MapTileData {
  /** 地形 ID */
  terrain?: TerrainId;
  /** 家具 ID */
  furniture?: FurnitureId | null;
  /** 陷阱 ID */
  trap?: TrapId | null;
  /** 辐射值 */
  radiation?: number;
  /** 场 */
  field?: { type: string; intensity: number; age?: number } | null;
}

/**
 * 地图填充规则
 *
 * 定义如何填充区域的规则
 */
export interface FillRule {
  /** 地形 ID */
  terrain: TerrainId;
  /** 家具 ID（可选） */
  furniture?: FurnitureId;
  /** 陷阱 ID（可选） */
  trap?: TrapId;
  /** 场（可选） */
  field?: { type: string; intensity: number; age?: number };
  /** 权重（用于随机选择） */
  weight?: number;
}

/**
 * 地图生成调色板
 *
 * 定义生成过程中使用的元素集合
 */
export interface MapGenPalette {
  /** 地形集合 */
  terrains: Record<string, TerrainId>;
  /** 家具集合 */
  furniture: Record<string, FurnitureId>;
  /** 陷阱集合 */
  traps: Record<string, TrapId>;
  /** 填充规则 */
  fills: Record<string, FillRule | FillRule[]>;
}

/**
 * 地图生成数据
 *
 * 包含生成 submap 所需的所有数据
 */
export class MapGenData {
  private readonly _data: MapGenDataProps;

  readonly palette!: MapGenPalette;
  readonly alternatePalettes!: Map<string, MapGenPalette>;
  readonly schema!: Record<string, unknown>;

  constructor(props?: Partial<MapGenDataProps>) {
    const defaults: MapGenDataProps = {
      palette: {
        terrains: {},
        furniture: {},
        traps: {},
        fills: {},
      },
      alternatePalettes: new Map(),
      schema: {},
    };

    this._data = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'palette', {
      get: () => this._data.palette,
      enumerable: true,
    });
    Object.defineProperty(this, 'alternatePalettes', {
      get: () => this._data.alternatePalettes,
      enumerable: true,
    });
    Object.defineProperty(this, 'schema', {
      get: () => this._data.schema,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 获取地形 ID
   */
  getTerrain(key: string): TerrainId | undefined {
    return this.palette.terrains[key];
  }

  /**
   * 获取家具 ID
   */
  getFurniture(key: string): FurnitureId | undefined {
    return this.palette.furniture[key];
  }

  /**
   * 获取陷阱 ID
   */
  getTrap(key: string): TrapId | undefined {
    return this.palette.traps[key];
  }

  /**
   * 获取填充规则
   */
  getFill(key: string): FillRule | FillRule[] | undefined {
    return this.palette.fills[key];
  }

  /**
   * 从填充规则创建瓦片
   */
  createTileFromFill(fillKey: string): MapTile {
    const fill = this.getFill(fillKey);
    if (!fill) {
      return new MapTile({ terrain: 0 });
    }

    // 如果是数组，随机选择一个
    const rule = Array.isArray(fill) ? fill[0] : fill;

    // 处理 terrain - 如果是字符串键，需要转换为实际的 ID
    const terrainId =
      typeof rule.terrain === 'string'
        ? (this.getTerrain(rule.terrain) ?? 0)
        : rule.terrain;

    // 处理 furniture - 如果是字符串键，需要转换为实际的 ID
    const furnitureId =
      rule.furniture !== undefined && typeof rule.furniture === 'string'
        ? (this.getFurniture(rule.furniture) ?? null)
        : rule.furniture ?? null;

    // 处理 trap - 如果是字符串键，需要转换为实际的 ID
    const trapId =
      rule.trap !== undefined && typeof rule.trap === 'string'
        ? (this.getTrap(rule.trap) ?? null)
        : rule.trap ?? null;

    return new MapTile({
      terrain: terrainId,
      furniture: furnitureId,
      trap: trapId,
      radiation: 0,
      field: rule.field
        ? new FieldEntry({
            type: rule.field.type,
            intensity: rule.field.intensity,
            age: rule.field.age ?? 0,
          })
        : null,
    });
  }

  /**
   * 获取替代调色板
   */
  getAlternatePalette(name: string): MapGenPalette | undefined {
    return this.alternatePalettes.get(name);
  }

  /**
   * 获取 schema 值
   */
  getSchemaValue<T = unknown>(key: string): T | undefined {
    return this.schema[key] as T;
  }
}

/**
 * MapGenData 属性
 */
export interface MapGenDataProps {
  readonly palette: MapGenPalette;
  readonly alternatePalettes: Map<string, MapGenPalette>;
  readonly schema: Record<string, unknown>;
}

/**
 * 创建空白的生成数据
 */
export function createEmptyMapGenData(): MapGenData {
  return new MapGenData();
}

/**
 * 从 JSON 创建生成数据
 */
export function createMapGenDataFromJson(json: {
  palette?: Partial<MapGenPalette>;
  alternate_palettes?: Record<string, Partial<MapGenPalette>>;
  schema?: Record<string, unknown>;
}): MapGenData {
  const alternatePalettes = new Map<string, MapGenPalette>();

  if (json.alternate_palettes) {
    for (const [name, palette] of Object.entries(json.alternate_palettes)) {
      alternatePalettes.set(name, {
        terrains: palette.terrains ?? {},
        furniture: palette.furniture ?? {},
        traps: palette.traps ?? {},
        fills: palette.fills ?? {},
      });
    }
  }

  return new MapGenData({
    palette: {
      terrains: json.palette?.terrains ?? {},
      furniture: json.palette?.furniture ?? {},
      traps: json.palette?.traps ?? {},
      fills: json.palette?.fills ?? {},
    },
    alternatePalettes,
    schema: json.schema ?? {},
  });
}
