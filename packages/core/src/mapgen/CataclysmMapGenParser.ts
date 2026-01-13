/**
 * Cataclysm-DDA MapGen JSON 解析器
 *
 * 解析 Cataclysm-DDA 的 mapgen JSON 格式
 * 这种格式使用 ASCII 字符网格来定义地图布局
 */

/**
 * 加权选项
 */
export type WeightedOption = [string, number] | [string, number, number];

/**
 * 地形映射值
 * 可以是单个地形 ID，或者加权选项列表
 */
export type TerrainMapping = string | WeightedOption[];

/**
 * 家具映射值
 * 可以是单个家具 ID，家具 ID 数组，或者加权选项列表
 */
export type FurnitureMapping = string | string[] | WeightedOption[];

/**
 * 物品放置配置
 */
export interface ItemPlacementConfig {
  /** 物品 ID 或物品组 ID */
  item: string;
  /** 放置位置（可以是单个坐标或范围） */
  x?: number | [number, number];
  /** 放置位置（可以是单个坐标或范围） */
  y?: number | [number, number];
  /** 生成概率 (0-100) */
  chance?: number;
  /** 物品数量范围 */
  count?: [number, number];
  /** 物品的状态（如电荷） */
  charges?: [number, number];
}

/**
 * 怪物放置配置
 */
export interface MonsterPlacementConfig {
  /** 怪物 ID 或怪物组 ID */
  monster: string;
  /** 放置位置（可以是单个坐标或范围） */
  x?: number | [number, number];
  /** 放置位置（可以是单个坐标或范围） */
  y?: number | [number, number];
  /** 生成概率 (0-100) */
  chance?: number;
  /** 密度 */
  density?: number;
  /** 重复次数 */
  repeat?: number;
}

/**
 * 嵌套地图配置
 */
export interface NestedMapConfig {
  /** 嵌套的 chunk 列表（可以是字符串或加权选项） */
  chunks?: (string | WeightedOption)[];
  /** 目标地图生成 ID */
  chunk?: string;
  /** 目标地图生成 ID 列表 */
  chunks_list?: string[];
  /** 位置偏移 */
  x_delta?: number;
  y_delta?: number;
  /** z 层级 */
  z?: number;
  /** 位置 */
  x?: number;
  y?: number;
}

/**
 * 战利品放置配置（增强版，支持 repeat）
 */
export interface LootPlacementConfig {
  /** 物品 ID */
  item?: string;
  /** 物品组 ID */
  group?: string;
  /** 放置位置 */
  x?: number | [number, number];
  y?: number | [number, number];
  /** 生成概率 (0-100) */
  chance?: number;
  /** 物品数量范围 */
  count?: [number, number];
  /** 物品的状态（如电荷） */
  charges?: [number, number];
  /** 重复次数范围 */
  repeat?: [number, number];
}

/**
 * 区域放置配置
 */
export interface ZonePlacementConfig {
  /** 区域类型 */
  type: string;
  /** 阵营 ID */
  faction?: string;
  /** 区域范围 */
  x?: number | [number, number];
  y?: number | [number, number];
}

/**
 * 自动售货机配置（字符映射）
 */
export interface VendingMachineConfig {
  /** 物品组 ID */
  item_group?: string;
  /** 是否可掠夺 */
  lootable?: boolean;
}

/**
 * 计算机配置（字符映射）
 */
export interface ComputerConfig {
  /** 计算机名称 */
  name?: string;
  /** 访问拒绝消息 */
  access_denied?: string;
  /** 安全等级 */
  security?: number;
  /** 事件触发器列表 */
  eocs?: string[];
  /** 聊天话题列表 */
  chat_topics?: string[];
}

/**
 * 放置的自动售货机配置
 */
export interface PlacedVendingMachineConfig {
  /** 物品组 ID */
  item_group: string;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 是否可掠夺 */
  lootable?: boolean;
}

/**
 * 封印物品配置
 */
export interface SealedItemConfig {
  /** 物品配置 */
  items?: ItemPlacementConfig | { item: string; chance?: number };
  /** 家具 ID */
  furniture?: string;
  /** 生成概率 */
  chance?: number;
}

/**
 * 阵营所有者配置
 */
export interface FactionOwnerConfig {
  /** 阵营 ID */
  id: string;
  /** 区域范围 */
  x?: number | [number, number];
  y?: number | [number, number];
}

/**
 * 地形/家具变换配置
 */
export interface TerFurnTransformConfig {
  /** 变换 ID */
  transform: string;
}

/**
 * 液体配置
 */
export interface LiquidConfig {
  /** 液体 ID */
  liquid: string;
  /** 数量范围 */
  amount: [number, number];
}

/**
 * 怪物配置（字符映射）
 */
export interface MonsterCharMapping {
  /** 怪物 ID 或怪物组 ID */
  monster: string;
}

/**
 * 加油站配置
 */
export interface GasPumpConfig {
  /** 燃料类型 */
  fuel?: string;
  /** 数量范围 */
  amount?: [number, number];
}

/**
 * 调色板数据
 *
 * 定义可重用的地形和家具映射
 */
export interface PaletteData {
  /** 调色板 ID */
  id: string;

  /** 字符到地形的映射 */
  terrain?: Record<string, TerrainMapping>;

  /** 字符到家具的映射 */
  furniture?: Record<string, FurnitureMapping>;

  /** 字符到物品的映射 */
  items?: Record<string, ItemPlacementConfig>;

  /** 嵌套定义 */
  nested?: Record<string, NestedMapConfig>;

  /** 嵌套调色板引用（支持参数化引用） */
  palettes?: PaletteReference[];

  /** 参数定义 */
  parameters?: Record<string, unknown>;

  /** 原始 JSON 对象 */
  raw: MapGenObjectConfig;
}

/**
 * Mapgen 对象配置
 */
export interface MapGenObjectConfig {
  /** 地图尺寸 [width, height] */
  mapgensize?: [number, number];

  /** ASCII 字符网格定义 */
  rows?: string[];

  /** 默认填充地形 */
  fill_ter?: string;

  /** 默认填充家具 */
  fill_furn?: string;

  /** 调色板引用列表 */
  palettes?: string[];

  /** 字符到地形的映射 */
  terrain?: Record<string, TerrainMapping>;

  /** 字符到家具的映射 */
  furniture?: Record<string, FurnitureMapping>;

  /** 字符到物品的映射 */
  items?: Record<string, ItemPlacementConfig>;

  /** 物品放置列表 */
  place_items?: ItemPlacementConfig[];

  /** 战利品放置列表（支持 repeat） */
  place_loot?: LootPlacementConfig[];

  /** 怪物放置列表（旧名称） */
  place_monster?: MonsterPlacementConfig[];

  /** 怪物放置列表（新名称） */
  place_monsters?: MonsterPlacementConfig[];

  /** 字符到怪物的映射 */
  monsters?: Record<string, MonsterCharMapping>;

  /** 嵌套地图放置列表 */
  place_nested?: Array<{
    chunks?: (string | WeightedOption)[];
    x?: number;
    y?: number;
    z?: number;
  }>;

  /** 嵌套定义（用于 chunks） */
  nested?: Record<string, NestedMapConfig>;

  /** 标志列表 */
  flags?: string[];

  /** 前驱地图生成器 */
  predecessor_mapgen?: string;

  /** 设置 */
  set?: Record<string, unknown>;

  /** 车辆放置 */
  place_vehicles?: Array<Record<string, unknown>>;

  /** 垃圾放置 */
  place_rubble?: Array<Record<string, unknown>>;

  /** 涂鸦放置 */
  place_graffiti?: Array<Record<string, unknown>>;

  /** NPC 放置 */
  place_npcs?: Array<Record<string, unknown>>;

  /** 区域放置 */
  place_zones?: ZonePlacementConfig[];

  /** 字符到厕所的映射（空对象作为标记） */
  toilets?: Record<string, Record<string, never>>;

  /** 字符到加油站的映射 */
  gaspumps?: Record<string, GasPumpConfig>;

  /** 字符到自动售货机的映射 */
  vendingmachines?: Record<string, VendingMachineConfig>;

  /** 放置的自动售货机列表 */
  place_vendingmachines?: PlacedVendingMachineConfig[];

  /** 字符到计算机的映射 */
  computers?: Record<string, ComputerConfig>;

  /** 字符到封印物品的映射 */
  sealed_item?: Record<string, SealedItemConfig>;

  /** 阵营所有者 */
  faction_owner?: FactionOwnerConfig[];

  /** 字符到地形/家具变换的映射 */
  ter_furn_transforms?: Record<string, TerFurnTransformConfig>;

  /** 字符到液体的映射 */
  liquids?: Record<string, LiquidConfig>;

  /** 其他未处理字段 */
  [key: string]: unknown;
}

/**
 * Cataclysm-DDA Mapgen JSON 顶级对象
 */
export interface CataclysmMapGenJson {
  /** 类型标识 */
  type: 'mapgen' | 'palette';

  /** 对象 ID（用于 palette 类型，也用于某些 mapgen） */
  id?: string;

  /** Overmap terrain ID 或 ID 矩阵 */
  om_terrain?: string | string[] | string[][];

  /** 调色板数据（当 type='palette' 时，数据直接在顶层） */
  terrain?: Record<string, TerrainMapping>;
  furniture?: Record<string, FurnitureMapping>;
  items?: Record<string, ItemPlacementConfig>;
  nested?: Record<string, NestedMapConfig>;
  parameters?: Record<string, unknown>;

  /** 嵌套地图生成 ID */
  nested_mapgen_id?: string;

  /** 更新地图生成 ID */
  update_mapgen_id?: string;

  /** 权重（用于随机选择） */
  weight?: number;

  /** 地图生成对象配置 */
  object: MapGenObjectConfig;

  /** 注释 */
  '//'?: string;

  /** 注释（替代编号） */
  '//1'?: string;
}

/**
 * 调色板引用类型
 * 可以是字符串 ID 或参数引用对象
 */
export type PaletteReference = string | { param: string };

/**
 * 解析后的 Mapgen 数据
 */
export interface ParsedMapGenData {
  /** 地图生成器 ID */
  id: string;

  /** Overmap terrain ID */
  omTerrain?: string | string[] | string[][];

  /** 嵌套地图生成 ID */
  nestedId?: string;

  /** 更新地图生成 ID */
  updateMapgenId?: string;

  /** 调色板引用列表（支持参数化引用） */
  palettes?: PaletteReference[];

  /** 权重 */
  weight?: number;

  /** 地图宽度 */
  width: number;

  /** 地图高度 */
  height: number;

  /** ASCII 字符网格 */
  rows: string[];

  /** 默认填充地形 */
  fillTerrain?: string;

  /** 字符到地形的映射 */
  terrain: Map<string, TerrainMapping>;

  /** 字符到家具的映射 */
  furniture: Map<string, FurnitureMapping>;

  /** 字符到物品的映射 */
  items: Map<string, ItemPlacementConfig>;

  /** 物品放置列表 */
  placeItems: ItemPlacementConfig[];

  /** 战利品放置列表（支持 repeat） */
  placeLoot: LootPlacementConfig[];

  /** 怪物放置列表 */
  placeMonsters: MonsterPlacementConfig[];

  /** 字符到怪物的映射 */
  monsters: Map<string, MonsterCharMapping>;

  /** 嵌套地图放置列表 */
  placeNested: Array<{
    chunks: (string | WeightedOption)[];
    x: number;
    y: number;
    z?: number;
  }>;

  /** 嵌套定义 */
  nested: Map<string, NestedMapConfig>;

  /** 标志 */
  flags: Set<string>;

  /** 区域放置列表 */
  placeZones: ZonePlacementConfig[];

  /** 字符到厕所的映射 */
  toilets: Map<string, Record<string, never>>;

  /** 字符到加油站的映射 */
  gaspumps: Map<string, GasPumpConfig>;

  /** 字符到自动售货机的映射 */
  vendingmachines: Map<string, VendingMachineConfig>;

  /** 放置的自动售货机列表 */
  placeVendingMachines: PlacedVendingMachineConfig[];

  /** 字符到计算机的映射 */
  computers: Map<string, ComputerConfig>;

  /** 字符到封印物品的映射 */
  sealedItem: Map<string, SealedItemConfig>;

  /** 阵营所有者列表 */
  factionOwner: FactionOwnerConfig[];

  /** 字符到地形/家具变换的映射 */
  terFurnTransforms: Map<string, TerFurnTransformConfig>;

  /** 字符到液体的映射 */
  liquids: Map<string, LiquidConfig>;

  /** 前驱地图生成器 */
  predecessorMapgen?: string;

  /** 原始 JSON 对象（保留用于调试） */
  raw: CataclysmMapGenJson;
}

/**
 * Cataclysm-DDA Mapgen 解析器类
 */
export class CataclysmMapGenParser {
  /**
   * 解析单个 mapgen JSON 对象
   */
  static parse(json: CataclysmMapGenJson): ParsedMapGenData {
    const obj = json.object;

    // 确定地图尺寸
    let width = 24;
    let height = 24;

    if (obj.mapgensize && Array.isArray(obj.mapgensize)) {
      [width, height] = obj.mapgensize;
    } else if (obj.rows && obj.rows.length > 0) {
      height = obj.rows.length;
      width = obj.rows[0].length;
    }

    // 解析 rows
    const rows = obj.rows || [];

    // 解析映射
    const terrain = new Map<string, TerrainMapping>();
    const furniture = new Map<string, FurnitureMapping>();
    const items = new Map<string, ItemPlacementConfig>();
    const nested = new Map<string, NestedMapConfig>();
    const toilets = new Map<string, Record<string, never>>();
    const gaspumps = new Map<string, GasPumpConfig>();
    const vendingmachines = new Map<string, VendingMachineConfig>();
    const computers = new Map<string, ComputerConfig>();
    const sealedItem = new Map<string, SealedItemConfig>();
    const monsters = new Map<string, MonsterCharMapping>();
    const terFurnTransforms = new Map<string, TerFurnTransformConfig>();
    const liquids = new Map<string, LiquidConfig>();

    if (obj.terrain) {
      Object.entries(obj.terrain).forEach(([char, mapping]) => {
        terrain.set(char, mapping);
      });
    }

    if (obj.furniture) {
      Object.entries(obj.furniture).forEach(([char, mapping]) => {
        furniture.set(char, mapping);
      });
    }

    if (obj.items) {
      Object.entries(obj.items).forEach(([char, mapping]) => {
        items.set(char, mapping);
      });
    }

    if (obj.nested) {
      Object.entries(obj.nested).forEach(([char, config]) => {
        nested.set(char, config);
      });
    }

    // 解析新特性映射
    if (obj.toilets) {
      Object.entries(obj.toilets).forEach(([char, config]) => {
        toilets.set(char, config);
      });
    }

    if (obj.gaspumps) {
      Object.entries(obj.gaspumps).forEach(([char, config]) => {
        gaspumps.set(char, config);
      });
    }

    if (obj.vendingmachines) {
      Object.entries(obj.vendingmachines).forEach(([char, config]) => {
        vendingmachines.set(char, config);
      });
    }

    if (obj.computers) {
      Object.entries(obj.computers).forEach(([char, config]) => {
        computers.set(char, config);
      });
    }

    if (obj.sealed_item) {
      Object.entries(obj.sealed_item).forEach(([char, config]) => {
        sealedItem.set(char, config);
      });
    }

    if (obj.monsters) {
      Object.entries(obj.monsters).forEach(([char, config]) => {
        monsters.set(char, config);
      });
    }

    if (obj.ter_furn_transforms) {
      Object.entries(obj.ter_furn_transforms).forEach(([char, config]) => {
        terFurnTransforms.set(char, config);
      });
    }

    if (obj.liquids) {
      Object.entries(obj.liquids).forEach(([char, config]) => {
        liquids.set(char, config);
      });
    }

    // 解析标志
    const flags = new Set<string>(obj.flags || []);

    // 解析调色板引用
    const palettes = obj.palettes || [];

    // 解析物品放置
    const placeItems = obj.place_items || [];

    // 解析战利品放置
    const placeLoot = obj.place_loot || [];

    // 解析怪物放置（合并新旧字段名）
    const placeMonsters = [
      ...(obj.place_monster || []),
      ...(obj.place_monsters || []),
    ];

    // 解析嵌套地图放置
    const placeNested = (obj.place_nested || []).map(n => ({
      chunks: n.chunks || [],
      x: n.x || 0,
      y: n.y || 0,
      z: n.z,
    }));

    // 解析区域放置
    const placeZones = obj.place_zones || [];

    // 解析放置的自动售货机
    const placeVendingMachines = obj.place_vendingmachines || [];

    // 解析阵营所有者
    const factionOwner = obj.faction_owner || [];

    // 生成 ID
    let id = json.nested_mapgen_id;

    if (!id && json.om_terrain) {
      if (typeof json.om_terrain === 'string') {
        id = json.om_terrain;
      } else if (Array.isArray(json.om_terrain) && json.om_terrain.length > 0) {
        // om_terrain 可以是 string[] 或 string[][]
        const first = json.om_terrain[0];
        if (typeof first === 'string') {
          id = first;
        } else if (Array.isArray(first) && first.length > 0) {
          id = first[0];
        }
      }
    }

    if (!id && json.update_mapgen_id) {
      id = json.update_mapgen_id;
    }

    if (!id) {
      id = `mapgen_${Date.now()}_${Math.random()}`;
    }

    return {
      id,
      omTerrain: json.om_terrain,
      nestedId: json.nested_mapgen_id,
      updateMapgenId: json.update_mapgen_id,
      weight: json.weight,
      width,
      height,
      rows,
      fillTerrain: obj.fill_ter,
      terrain,
      furniture,
      items,
      placeItems,
      placeLoot,
      placeMonsters,
      monsters,
      placeNested,
      nested,
      flags,
      placeZones,
      toilets,
      gaspumps,
      vendingmachines,
      placeVendingMachines,
      computers,
      sealedItem,
      factionOwner,
      terFurnTransforms,
      liquids,
      palettes,
      predecessorMapgen: obj.predecessor_mapgen,
      raw: json,
    };
  }

  /**
   * 从 JSON 数组中提取所有 mapgen 对象并解析
   */
  static parseArray(jsonArray: unknown[]): ParsedMapGenData[] {
    const results: ParsedMapGenData[] = [];

    for (const item of jsonArray) {
      // 确保是 mapgen 类型
      if (
        typeof item === 'object' &&
        item !== null &&
        (item as CataclysmMapGenJson).type === 'mapgen'
      ) {
        try {
          const parsed = this.parse(item as CataclysmMapGenJson);
          results.push(parsed);
        } catch (error) {
          console.error(`Failed to parse mapgen:`, error);
        }
      }
    }

    return results;
  }

  /**
   * 验证 mapgen 对象的完整性
   */
  static validate(parsed: ParsedMapGenData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 特殊类型检查：嵌套地图和更新地图可以没有 rows 或 fill_ter
    const isNestedMapgen = !!parsed.nestedId && !parsed.omTerrain;
    const isUpdateMapgen = !!parsed.updateMapgenId;
    const isSpecialMapgen = isNestedMapgen || isUpdateMapgen;

    // 对于普通 mapgen，检查是否有 rows 或 fill_ter
    if (!isSpecialMapgen && parsed.rows.length === 0 && !parsed.fillTerrain) {
      errors.push('Must have either rows or fill_ter');
    }

    // 检查 rows 的尺寸一致性
    if (parsed.rows.length > 0) {
      const expectedWidth = parsed.width;
      for (let i = 0; i < parsed.rows.length; i++) {
        if (parsed.rows[i].length !== expectedWidth) {
          errors.push(
            `Row ${i} has length ${parsed.rows[i].length}, expected ${expectedWidth}`
          );
        }
      }
    }

    // 检查是否有 ID
    if (!parsed.id) {
      errors.push('Must have an ID (nested_mapgen_id, om_terrain, or update_mapgen_id)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取指定字符对应的地形
   */
  static getTerrainForChar(
    parsed: ParsedMapGenData,
    char: string
  ): TerrainMapping | undefined {
    return parsed.terrain.get(char);
  }

  /**
   * 获取指定字符对应的家具
   */
  static getFurnitureForChar(
    parsed: ParsedMapGenData,
    char: string
  ): FurnitureMapping | undefined {
    return parsed.furniture.get(char);
  }

  /**
   * 获取指定字符对应的物品配置
   */
  static getItemsForChar(
    parsed: ParsedMapGenData,
    char: string
  ): ItemPlacementConfig | undefined {
    return parsed.items.get(char);
  }
}

/**
 * 创建 Cataclysm-DDA mapgen 加载器
 *
 * 用于加载和解析 Cataclysm-DDA 的 mapgen JSON 文件
 */
export class CataclysmMapGenLoader {
  private readonly parsedData: Map<string, ParsedMapGenData> = new Map();
  private readonly palettes: Map<string, PaletteData> = new Map();

  /**
   * 从 JSON 对象加载 mapgen
   */
  load(json: CataclysmMapGenJson): void {
    try {
      const parsed = CataclysmMapGenParser.parse(json);
      this.parsedData.set(parsed.id, parsed);
    } catch (error) {
      console.error(`Failed to load mapgen:`, error);
      throw error;
    }
  }

  /**
   * 从 JSON 数组加载多个 mapgen
   */
  loadArray(jsonArray: unknown[]): void {
    for (const item of jsonArray) {
      // 确保是对象
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const json = item as CataclysmMapGenJson;

      // 处理调色板
      if (json.type === 'palette') {
        this.parsePalette(json);
        continue;
      }

      // 处理 mapgen
      if (json.type === 'mapgen') {
        try {
          const parsed = CataclysmMapGenParser.parse(json);
          this.parsedData.set(parsed.id, parsed);
        } catch (error) {
          console.error(`Failed to load mapgen:`, error);
        }
      }
    }
  }

  /**
   * 解析并存储调色板
   */
  private parsePalette(json: CataclysmMapGenJson): void {
    // 调色板的数据结构：可能直接在顶层，也可能在 object 字段中
    const paletteData = json.object || json;

    const terrain = new Map<string, TerrainMapping>();
    const furniture = new Map<string, FurnitureMapping>();
    const items = new Map<string, ItemPlacementConfig>();
    const nested = new Map<string, NestedMapConfig>();

    // 解析 terrain
    if (paletteData.terrain) {
      Object.entries(paletteData.terrain).forEach(([char, mapping]) => {
        terrain.set(char, mapping);
      });
    }

    // 解析 furniture
    if (paletteData.furniture) {
      Object.entries(paletteData.furniture).forEach(([char, mapping]) => {
        furniture.set(char, mapping);
      });
    }

    // 解析 items
    if (paletteData.items) {
      Object.entries(paletteData.items).forEach(([char, mapping]) => {
        items.set(char, mapping);
      });
    }

    // 解析 nested
    if (paletteData.nested) {
      Object.entries(paletteData.nested).forEach(([char, config]) => {
        nested.set(char, config);
      });
    }

    const palette: PaletteData = {
      id: json.id as string,
      terrain: Object.fromEntries(terrain) as Record<string, TerrainMapping>,
      furniture: Object.fromEntries(furniture) as Record<string, FurnitureMapping>,
      items: Object.fromEntries(items),
      nested: Object.fromEntries(nested),
      palettes: paletteData.palettes as PaletteReference[] | undefined,
      parameters: paletteData.parameters as Record<string, unknown> | undefined,
      raw: paletteData as MapGenObjectConfig,
    };

    this.palettes.set(palette.id, palette);
  }

  /**
   * 从文件路径加载 JSON 文件
   */
  async loadFromFile(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    if (Array.isArray(jsonData)) {
      this.loadArray(jsonData);
    } else if (jsonData.type === 'mapgen') {
      this.load(jsonData);
    }
  }

  /**
   * 获取已加载的 mapgen 数据
   */
  get(id: string): ParsedMapGenData | undefined {
    return this.parsedData.get(id);
  }

  /**
   * 直接注册已解析的 mapgen 数据
   *
   * 用于测试场景，直接添加已解析的数据而不经过 JSON 解析
   */
  register(data: ParsedMapGenData): void {
    this.parsedData.set(data.id, data);
  }

  /**
   * 获取所有已加载的 mapgen 数据
   */
  getAll(): ParsedMapGenData[] {
    return Array.from(this.parsedData.values());
  }

  /**
   * 获取 mapgen 数量
   */
  size(): number {
    return this.parsedData.size;
  }

  /**
   * 清空所有已加载的数据
   */
  clear(): void {
    this.parsedData.clear();
    this.palettes.clear();
  }

  /**
   * 获取调色板
   */
  getPalette(id: string): PaletteData | undefined {
    return this.palettes.get(id);
  }

  /**
   * 获取所有调色板
   */
  getAllPalettes(): PaletteData[] {
    return Array.from(this.palettes.values());
  }

  /**
   * 获取调色板数量
   */
  paletteCount(): number {
    return this.palettes.size;
  }
}
