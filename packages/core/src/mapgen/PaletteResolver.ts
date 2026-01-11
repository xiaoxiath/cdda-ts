import { ParsedMapGenData, PaletteData, PaletteReference } from './CataclysmMapGenParser';
import { CataclysmMapGenLoader } from './CataclysmMapGenParser';

/**
 * 参数定义
 */
export interface ParameterDefinition {
  /** 参数类型 */
  type: string;
  /** 作用域 */
  scope?: string;
  /** 默认值（可能是加权分布） */
  default?: {
    distribution?: Array<[string, number]>;
  } | string;
}

/**
 * 调色板解析选项
 */
export interface PaletteResolverOptions {
  /** 随机种子（用于可重复的加权选择） */
  seed?: number;
  /** 是否启用调试输出 */
  debug?: boolean;
  /** 参数值覆盖（用于测试） */
  parameterOverrides?: Map<string, string>;
}

/**
 * 调色板解析器
 *
 * 解析 mapgen 中的调色板引用，将调色板的映射合并到 mapgen 数据中
 * 支持参数化调色板和加权分布
 */
export class PaletteResolver {
  private readonly visited = new Set<string>(); // 用于检测循环引用
  private readonly options: PaletteResolverOptions;

  constructor(
    private readonly mapgenLoader: CataclysmMapGenLoader,
    options: PaletteResolverOptions = {}
  ) {
    this.options = {
      seed: options.seed ?? Date.now(),
      debug: options.debug ?? false,
      parameterOverrides: options.parameterOverrides ?? new Map(),
    };
  }

  /**
   * 解析 mapgen 的调色板引用
   *
   * @param mapgenData - 原始 mapgen 数据
   * @returns 合并调色板后的新 mapgen 数据
   */
  resolve(mapgenData: ParsedMapGenData): ParsedMapGenData {
    // 如果没有调色板引用，直接返回
    if (!mapgenData.palettes || mapgenData.palettes.length === 0) {
      return mapgenData;
    }

    // 重置访问记录
    this.visited.clear();

    // 创建合并后的数据，先复制 mapgen 自己的映射
    const resolvedTerrain = new Map(mapgenData.terrain);
    const resolvedFurniture = new Map(mapgenData.furniture);
    const resolvedItems = new Map(mapgenData.items);
    const resolvedNested = new Map(mapgenData.nested);

    // 记录 mapgen 自己定义的字符（这些不应该被调色板覆盖）
    const mapgenOwnTerrain = new Set(mapgenData.terrain.keys());
    const mapgenOwnFurniture = new Set(mapgenData.furniture.keys());
    const mapgenOwnItems = new Set(mapgenData.items.keys());
    const mapgenOwnNested = new Set(mapgenData.nested.keys());

    // 解析调色板引用（支持参数化和加权分布）
    const resolvedPaletteIds = this.resolvePaletteReferences(mapgenData.palettes);

    if (this.options.debug) {
      console.log(`PaletteResolver: Resolved ${mapgenData.palettes.length} palette references to ${resolvedPaletteIds.length} palettes`);
      console.log(`  Original: ${JSON.stringify(mapgenData.palettes)}`);
      console.log(`  Resolved: ${JSON.stringify(resolvedPaletteIds)}`);
    }

    // 按顺序合并调色板
    for (const paletteId of resolvedPaletteIds) {
      this.mergePalette(
        paletteId,
        resolvedTerrain,
        resolvedFurniture,
        resolvedItems,
        resolvedNested,
        mapgenOwnTerrain,
        mapgenOwnFurniture,
        mapgenOwnItems,
        mapgenOwnNested
      );
    }

    // 返回合并后的数据
    return {
      ...mapgenData,
      terrain: resolvedTerrain,
      furniture: resolvedFurniture,
      items: resolvedItems,
      nested: resolvedNested,
    };
  }

  /**
   * 解析调色板引用（支持参数化和加权分布）
   *
   * @param paletteRefs - 调色板引用列表
   * @returns 解析后的调色板 ID 列表
   */
  private resolvePaletteReferences(paletteRefs: PaletteReference[]): string[] {
    const resolvedIds: string[] = [];

    for (const ref of paletteRefs) {
      if (typeof ref === 'string') {
        // 直接引用
        resolvedIds.push(ref);
      } else if (ref.param) {
        // 参数引用
        const paramPaletteId = this.resolveParameter(ref.param);
        if (paramPaletteId) {
          resolvedIds.push(paramPaletteId);
        }
      }
    }

    return resolvedIds;
  }

  /**
   * 解析参数引用
   *
   * @param paramName - 参数名称
   * @returns 解析后的调色板 ID
   */
  private resolveParameter(paramName: string): string | null {
    // 检查是否有覆盖值
    if (this.options.parameterOverrides?.has(paramName)) {
      return this.options.parameterOverrides.get(paramName)!;
    }

    // 需要从当前上下文获取参数定义
    // 由于参数定义在调色板本身，我们需要查找当前正在处理的调色板
    // 这里先实现一个简化版本：查找所有调色板，找到定义该参数的

    const allPalettes = this.mapgenLoader.getAllPalettes();
    for (const palette of allPalettes.values()) {
      const params = palette.parameters;
      if (params && params[paramName]) {
        const paramDef = params[paramName] as ParameterDefinition;
        return this.selectFromParameterDefinition(paramDef, paramName);
      }
    }

    console.warn(`Parameter not found: ${paramName}`);
    return null;
  }

  /**
   * 从参数定义中选择调色板 ID
   *
   * @param paramDef - 参数定义
   * @param paramName - 参数名称（用于调试）
   * @returns 选择的调色板 ID
   */
  private selectFromParameterDefinition(
    paramDef: ParameterDefinition,
    paramName: string
  ): string | null {
    if (!paramDef.default) {
      console.warn(`Parameter ${paramName} has no default value`);
      return null;
    }

    // 如果是字符串，直接返回
    if (typeof paramDef.default === 'string') {
      return paramDef.default;
    }

    // 如果是对象，检查是否有分布
    const defaultObj = paramDef.default as { distribution?: Array<[string, number]> };
    if (defaultObj.distribution && defaultObj.distribution.length > 0) {
      // 从加权分布中选择
      return this.selectFromDistribution(defaultObj.distribution, paramName);
    }

    console.warn(`Parameter ${paramName} default is not a string or distribution`);
    return null;
  }

  /**
   * 从加权分布中选择
   *
   * @param distribution - 加权分布数组 [[id, weight], ...]
   * @param paramName - 参数名称（用于调试）
   * @returns 选择的调色板 ID
   */
  private selectFromDistribution(distribution: Array<[string, number]>, paramName: string): string {
    // 计算总权重
    const totalWeight = distribution.reduce((sum, [, weight]) => sum + weight, 0);

    if (totalWeight <= 0) {
      console.warn(`Invalid distribution for parameter ${paramName}: total weight is ${totalWeight}`);
      return distribution[0][0]; // 返回第一个
    }

    // 使用简单随机选择（可以使用更好的随机数生成器）
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (const [id, weight] of distribution) {
      cumulative += weight;
      if (random <= cumulative) {
        if (this.options.debug) {
          console.log(`PaletteResolver: Selected ${id} from distribution for ${paramName}`);
        }
        return id;
      }
    }

    // 兜底：返回最后一个
    return distribution[distribution.length - 1][0];
  }

  /**
   * 合并调色板映射
   *
   * @param paletteId - 调色板 ID
   * @param terrain - 地形映射（会被修改）
   * @param furniture - 家具映射（会被修改）
   * @param items - 物品映射（会被修改）
   * @param nested - 嵌套映射（会被修改）
   * @param mapgenOwnTerrain - mapgen 自己定义的地形字符集合
   * @param mapgenOwnFurniture - mapgen 自己定义的家具字符集合
   * @param mapgenOwnItems - mapgen 自己定义的物品字符集合
   * @param mapgenOwnNested - mapgen 自己定义的嵌套字符集合
   */
  private mergePalette(
    paletteId: string,
    terrain: Map<string, unknown>,
    furniture: Map<string, unknown>,
    items: Map<string, unknown>,
    nested: Map<string, unknown>,
    mapgenOwnTerrain: Set<string>,
    mapgenOwnFurniture: Set<string>,
    mapgenOwnItems: Set<string>,
    mapgenOwnNested: Set<string>
  ): void {
    // 检测循环引用
    if (this.visited.has(paletteId)) {
      console.warn(`Circular palette reference detected: ${paletteId}`);
      return;
    }
    this.visited.add(paletteId);

    // 查找调色板
    const palette = this.mapgenLoader.getPalette(paletteId);
    if (!palette) {
      console.warn(`Palette not found: ${paletteId}`);
      return;
    }

    // 递归处理调色板的 palettes 数组（这是关键改进！）
    if (palette.palettes && palette.palettes.length > 0) {
      const nestedPaletteRefs = palette.palettes as PaletteReference[];
      const resolvedNestedIds = this.resolvePaletteReferences(nestedPaletteRefs);

      if (this.options.debug) {
        console.log(`PaletteResolver: Recursively resolving ${resolvedNestedIds.length} nested palettes from ${paletteId}`);
      }

      // 先合并嵌套的调色板（这样父调色板可以覆盖子调色板）
      for (const nestedId of resolvedNestedIds) {
        this.mergePalette(
          nestedId,
          terrain,
          furniture,
          items,
          nested,
          mapgenOwnTerrain,
          mapgenOwnFurniture,
          mapgenOwnItems,
          mapgenOwnNested
        );
      }
    }

    // 合并 terrain（只添加未定义的字符，mapgen 自己的定义优先）
    if (palette.terrain) {
      for (const [char, mapping] of Object.entries(palette.terrain)) {
        // 只有当 mapgen 自己没有定义，且当前 map 中还没有这个字符时，才添加
        if (!mapgenOwnTerrain.has(char) && !terrain.has(char)) {
          terrain.set(char, mapping);
        }
      }
    }

    // 合并 furniture
    if (palette.furniture) {
      for (const [char, mapping] of Object.entries(palette.furniture)) {
        if (!mapgenOwnFurniture.has(char) && !furniture.has(char)) {
          furniture.set(char, mapping);
        }
      }
    }

    // 合并 items
    if (palette.items) {
      for (const [char, mapping] of Object.entries(palette.items)) {
        if (!mapgenOwnItems.has(char) && !items.has(char)) {
          items.set(char, mapping);
        }
      }
    }

    // 合并 nested
    if (palette.nested) {
      for (const [char, mapping] of Object.entries(palette.nested)) {
        if (!mapgenOwnNested.has(char) && !nested.has(char)) {
          nested.set(char, mapping);
        }
      }
    }

    // 从访问记录中移除（允许在不同路径中重复访问）
    this.visited.delete(paletteId);
  }

  /**
   * 批量解析多个 mapgen
   *
   * @param mapgenDataArray - mapgen 数据数组
   * @returns 解析后的 mapgen 数据数组
   */
  resolveArray(mapgenDataArray: ParsedMapGenData[]): ParsedMapGenData[] {
    return mapgenDataArray.map((data) => this.resolve(data));
  }
}
