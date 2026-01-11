import { ParsedMapGenData, PaletteData } from './CataclysmMapGenParser';
import { CataclysmMapGenLoader } from './CataclysmMapGenParser';

/**
 * 调色板解析器
 *
 * 解析 mapgen 中的调色板引用，将调色板的映射合并到 mapgen 数据中
 */
export class PaletteResolver {
  private readonly visited = new Set<string>(); // 用于检测循环引用

  constructor(private readonly mapgenLoader: CataclysmMapGenLoader) {}

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

    // 按顺序合并调色板
    for (const paletteId of mapgenData.palettes) {
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
