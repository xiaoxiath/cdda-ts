import { MapGenFunction, MapGenContext, createMapGenResult } from './MapGenFunction';
import { MapGenData, createMapGenDataFromJson } from './MapGenData';
import { Submap, SUBMAP_SIZE } from '../map/Submap';
import { Tripoint } from '../coordinates/Tripoint';
import { MapTile } from '../map/MapTile';

/**
 * JSON 地图生成配置
 *
 * 定义如何从 JSON 生成地图
 */
export interface MapGenJsonConfig {
  /** 生成器 ID */
  id: string;
  /** 生成器名称 */
  name: string;
  /** 方法类型 */
  method?: 'fill' | 'rows' | 'palette' | 'nested';
  /** 填充配置（method = fill） */
  fill?: {
    /** 地形 ID */
    terrain: string;
    /** 家具 ID（可选） */
    furniture?: string;
    /** 陷阱 ID（可选） */
    trap?: string;
  };
  /** 行配置（method = rows） */
  rows?: Array<{
    /** 行号（从 0 开始） */
    row: number;
    /** 列配置 */
    columns: Array<{
      /** 列号（从 0 开始） */
      column: number;
      /** 地形 ID */
      terrain: string;
      /** 家具 ID（可选） */
      furniture?: string;
      /** 陷阱 ID（可选） */
      trap?: string;
    }>;
  }>;
  /** 调色板名称（method = palette） */
  palette?: string;
  /** 替代调色板 */
  alternatePalettes?: Record<string, string>;
  /** 生成数据 */
  data?: {
    palette?: Record<string, unknown>;
    schema?: Record<string, unknown>;
  };
  /** 权重 */
  weight?: number;
  /** 是否可以应用的条件 */
  conditions?: {
    /** 要求的 z 层级 */
    z?: number;
    /** 要求的地形类型 */
    terrainTypes?: string[];
  };
}

/**
 * JSON 地图生成器
 *
 * 从 JSON 配置生成 submap
 */
export class MapGenJson extends MapGenFunction {
  private readonly _props: MapGenJsonProps;

  readonly id!: string;
  readonly name!: string;
  readonly config!: MapGenJsonConfig;
  readonly data!: MapGenData;

  constructor(props?: Partial<MapGenJsonProps>) {
    super();

    const defaults: MapGenJsonProps = {
      id: 'json_default',
      name: 'Default JSON Generator',
      config: {
        id: 'json_default',
        name: 'Default JSON Generator',
      },
      data: createEmptyMapGenData(),
    };

    this._props = {
      ...defaults,
      ...props,
    };

    Object.defineProperty(this, 'id', {
      get: () => this._props.id,
      enumerable: true,
    });
    Object.defineProperty(this, 'name', {
      get: () => this._props.name,
      enumerable: true,
    });
    Object.defineProperty(this, 'config', {
      get: () => this._props.config,
      enumerable: true,
    });
    Object.defineProperty(this, 'data', {
      get: () => this._props.data,
      enumerable: true,
    });

    Object.freeze(this);
  }

  /**
   * 从 JSON 配置创建生成器
   */
  static fromJson(json: MapGenJsonConfig): MapGenJson {
    const data = createMapGenDataFromJson(json.data || {});

    return new MapGenJson({
      id: json.id,
      name: json.name,
      config: json,
      data,
    });
  }

  /**
   * 生成 submap
   */
  generate(context: MapGenContext): Submap {
    const method = this.config.method || 'fill';

    switch (method) {
      case 'fill':
        return this.generateFill(context);
      case 'rows':
        return this.generateRows(context);
      case 'palette':
        return this.generatePalette(context);
      case 'nested':
        return this.generateNested(context);
      default:
        return this.generateFill(context);
    }
  }

  /**
   * 检查是否可以应用
   */
  canApply(context: MapGenContext): boolean {
    if (!this.config.conditions) {
      return true;
    }

    const { conditions } = this.config;

    // 检查 z 层级
    if (conditions.z !== undefined && context.position.z !== conditions.z) {
      return false;
    }

    // TODO: 添加更多条件检查

    return true;
  }

  /**
   * 获取权重
   */
  getWeight(context: MapGenContext): number {
    return this.config.weight || 1;
  }

  /**
   * 生成填充类型的 submap
   */
  private generateFill(context: MapGenContext): Submap {
    if (!this.config.fill) {
      return Submap.createUniform(0);
    }

    const terrainId = this.data.getTerrain(this.config.fill.terrain) ?? 0;
    return Submap.createUniform(terrainId);
  }

  /**
   * 生成基于行的 submap
   */
  private generateRows(context: MapGenContext): Submap {
    let submap = Submap.createUniform(0);

    if (!this.config.rows) {
      return submap;
    }

    for (const rowConfig of this.config.rows) {
      for (const colConfig of rowConfig.columns) {
        const terrainId = this.data.getTerrain(colConfig.terrain) ?? 0;
        const tile = new MapTile({
          terrain: terrainId,
          furniture: this.data.getFurniture(colConfig.furniture || '') ?? null,
          trap: this.data.getTrap(colConfig.trap || '') ?? null,
        });
        submap = submap.setTile(colConfig.column, rowConfig.row, tile);
      }
    }

    return submap;
  }

  /**
   * 生成基于调色板的 submap
   */
  private generatePalette(context: MapGenContext): Submap {
    const paletteName = this.config.palette || 'default';
    const palette = this.data.getAlternatePalette(paletteName);

    if (!palette) {
      return Submap.createUniform(0);
    }

    // TODO: 实现基于调色板的生成逻辑
    // 这里需要更复杂的逻辑来处理调色板中的填充规则
    return Submap.createUniform(0);
  }

  /**
   * 生成嵌套类型的 submap
   */
  private generateNested(context: MapGenContext): Submap {
    // TODO: 实现嵌套生成逻辑
    // 这需要支持调用其他生成器
    return Submap.createUniform(0);
  }

  /**
   * 克隆生成器
   */
  clone(): MapGenJson {
    return new MapGenJson({
      id: this.id,
      name: this.name,
      config: this.config,
      data: this.data,
    });
  }
}

/**
 * MapGenJson 属性
 */
export interface MapGenJsonProps {
  readonly id: string;
  readonly name: string;
  readonly config: MapGenJsonConfig;
  readonly data: MapGenData;
}

/**
 * 创建空白生成数据（用于默认数据）
 */
function createEmptyMapGenData(): MapGenData {
  return new MapGenData();
}
