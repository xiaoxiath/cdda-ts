import { MapGenFunction, MapGenContext, MultiSubmapResult, SubmapResult } from './MapGenFunction';
import { Submap, SUBMAP_SIZE, SpawnPoint } from '../map/Submap';
import { MapTile } from '../map/MapTile';
import { MapTileSoa } from '../map/MapTileSoa';
import { Point } from '../coordinates/Point';
import { Tripoint } from '../coordinates/Tripoint';
import { TerrainLoader } from '../terrain/TerrainLoader';
import { FurnitureLoader } from '../furniture/FurnitureLoader';
import { TrapLoader } from '../trap/TrapLoader';
import {
  ParsedMapGenData,
  TerrainMapping,
  FurnitureMapping,
  WeightedOption,
  ItemPlacementConfig,
  MonsterPlacementConfig,
  NestedMapConfig,
} from './CataclysmMapGenParser';
import { PaletteResolver } from './PaletteResolver';
import { CataclysmMapGenLoader } from './CataclysmMapGenParser';

/**
 * 简单的线性同余随机数生成器
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * 生成 0-1 之间的随机数
   */
  next(): number {
    // 使用简单的线性同余生成器（LCG）
    // 参数来自 glibc: a = 1103515245, c = 12345, m = 2^31
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /**
   * 生成 0 到 max 之间的随机整数（不包括 max）
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /**
   * 生成 min 到 max 之间的随机整数（包括 min 和 max）
   */
  nextIntRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Cataclysm-DDA 地图生成器
 *
 * 将 Cataclysm-DDA 的 mapgen 数据转换为 Submap
 */
export class CataclysmMapGenGenerator extends MapGenFunction {
  readonly id!: string;
  readonly name!: string;

  private readonly terrainCache: Map<string, number> = new Map();
  private readonly furnitureCache: Map<string, number> = new Map();

  // 内部存储解析后的数据（包括调色板合并）
  private readonly resolvedMapgenData: ParsedMapGenData;

  constructor(
    mapgenData: ParsedMapGenData,
    private readonly loaders: {
      terrain: TerrainLoader;
      furniture: FurnitureLoader;
      trap: TrapLoader;
    },
    private readonly options?: {
      paletteResolver?: PaletteResolver;
      mapgenLoader?: CataclysmMapGenLoader;
    }
  ) {
    super();

    // 如果有调色板解析器，先解析调色板
    this.resolvedMapgenData = options?.paletteResolver
      ? options.paletteResolver.resolve(mapgenData)
      : mapgenData;

    this.id = this.resolvedMapgenData.id;
    this.name = this.resolvedMapgenData.omTerrain as string || this.resolvedMapgenData.id;

    Object.freeze(this);
  }

  /**
   * 生成 submap
   *
   * 处理流程：
   * 1. 创建 MapTileSoa
   * 2. 遍历 mapgen rows，填充瓦片
   * 3. 处理物品和怪物放置
   * 4. 返回 Submap
   */
  generate(context: MapGenContext): Submap {
    const result = this.generateMultiple(context);
    // 返回第一个（也是唯一一个）submap
    return result.submaps[0].submap;
  }

  /**
   * 生成多个 submap
   *
   * 对于大型 mapgen（>12x12），生成多个 submap 来覆盖整个区域。
   */
  override generateMultiple(context: MapGenContext): MultiSubmapResult {
    // 创建基于种子的随机数生成器
    const rng = new SeededRandom(context.seed);

    // 计算 submap 网格尺寸
    const submapGridWidth = Math.ceil(this.resolvedMapgenData.width / SUBMAP_SIZE);
    const submapGridHeight = Math.ceil(this.resolvedMapgenData.height / SUBMAP_SIZE);

    const submaps: SubmapResult[] = [];

    // 为每个 submap 生成数据
    for (let gridY = 0; gridY < submapGridHeight; gridY++) {
      for (let gridX = 0; gridX < submapGridWidth; gridX++) {
        const submap = this.generateSubmapAt(context, gridX, gridY, rng);

        // 计算全局位置
        const globalPosition = Tripoint.from(
          context.position.x + gridX * SUBMAP_SIZE,
          context.position.y + gridY * SUBMAP_SIZE,
          context.position.z
        );

        submaps.push({
          submap,
          position: {
            gridX,
            gridY,
            globalPosition,
          },
        });
      }
    }

    return {
      submaps,
      generatorId: this.id,
      mapgenWidth: this.resolvedMapgenData.width,
      mapgenHeight: this.resolvedMapgenData.height,
      submapGridWidth,
      submapGridHeight,
      timestamp: Date.now(),
    };
  }

  /**
   * 生成指定网格位置的 submap
   *
   * @param context 生成上下文
   * @param gridX Submap 在 X 方向的网格索引
   * @param gridY Submap 在 Y 方向的网格索引
   * @param rng 随机数生成器
   * @returns 生成的 Submap
   */
  private generateSubmapAt(
    context: MapGenContext,
    gridX: number,
    gridY: number,
    rng: SeededRandom
  ): Submap {
    // 创建空的 SOA
    let soa = MapTileSoa.createEmpty(SUBMAP_SIZE);

    // 收集生成点
    const spawns: SpawnPoint[] = [];

    // 计算这个 submap 在 mapgen 中的瓦片范围
    const startX = gridX * SUBMAP_SIZE;
    const startY = gridY * SUBMAP_SIZE;
    const endX = Math.min(startX + SUBMAP_SIZE, this.resolvedMapgenData.width);
    const endY = Math.min(startY + SUBMAP_SIZE, this.resolvedMapgenData.height);

    // 遍历这个 submap 的瓦片范围
    for (let mapgenY = startY; mapgenY < endY; mapgenY++) {
      const row = this.resolvedMapgenData.rows[mapgenY];
      if (!row) continue;

      for (let mapgenX = startX; mapgenX < endX; mapgenX++) {
        // 计算在 submap 中的坐标
        const submapX = mapgenX - startX;
        const submapY = mapgenY - startY;

        const char = row[mapgenX] || ' ';

        // 检查是否有嵌套 mapgen
        const nestedConfig = this.resolvedMapgenData.nested.get(char);
        if (nestedConfig && this.options?.mapgenLoader) {
          // 处理嵌套 mapgen
          const tile = this.processNestedMapgen(nestedConfig, mapgenX, mapgenY, context, rng);
          soa = soa.setTile(submapX, submapY, tile);
        } else {
          // 正常处理瓦片
          const tile = this.mapCharToTile(char, context, rng);
          soa = soa.setTile(submapX, submapY, tile);
        }

        // 处理字符映射的物品
        const itemSpawns = this.processItemForChar(char, mapgenX, mapgenY, submapX, submapY, rng);
        spawns.push(...itemSpawns);
      }
    }

    // 处理 place_items 配置（只处理在这个 submap 范围内的）
    const itemSpawns = this.processPlaceItemsForSubmap(startX, startY, endX, endY, rng);
    spawns.push(...itemSpawns);

    // 处理 place_monsters 配置（只处理在这个 submap 范围内的）
    const monsterSpawns = this.processPlaceMonstersForSubmap(startX, startY, endX, endY, rng);
    spawns.push(...monsterSpawns);

    // 创建并返回 Submap
    return new Submap({
      size: SUBMAP_SIZE,
      tiles: soa,
      uniformTerrain: null,
      spawns,
      fieldCount: 0,
      lastTouched: Date.now(),
    });
  }

  /**
   * 将字符映射为瓦片
   *
   * @param char - 字符
   * @param context - 生成上下文
   * @param rng - 随机数生成器
   * @returns MapTile
   */
  private mapCharToTile(char: string, context: MapGenContext, rng: SeededRandom): MapTile {
    const terrainId = this.getTerrainId(char, context, rng);
    const furnitureId = this.getFurnitureId(char, context, rng);

    return new MapTile({
      terrain: terrainId,
      furniture: furnitureId,
      radiation: 0,
      field: null,
      trap: null,
    });
  }

  /**
   * 获取地形 ID
   *
   * @param char - 字符
   * @param context - 生成上下文
   * @param rng - 随机数生成器
   * @returns 地形 ID
   */
  private getTerrainId(char: string, context: MapGenContext, rng: SeededRandom): number {
    const mapping = this.resolvedMapgenData.terrain.get(char);

    // 如果没有映射，使用默认填充地形
    if (!mapping) {
      if (this.resolvedMapgenData.fillTerrain) {
        return this.resolveTerrainName(this.resolvedMapgenData.fillTerrain);
      }
      return 0; // t_null
    }

    // 处理不同类型的映射
    if (typeof mapping === 'string') {
      return this.resolveTerrainName(mapping);
    }

    // 加权选项
    if (Array.isArray(mapping) && mapping.length > 0 && Array.isArray(mapping[0])) {
      const selected = this.selectWeightedOption(mapping as WeightedOption[], rng);
      return this.resolveTerrainName(selected);
    }

    // 默认返回 t_null
    return 0;
  }

  /**
   * 获取家具 ID
   *
   * @param char - 字符
   * @param context - 生成上下文
   * @param rng - 随机数生成器
   * @returns 家具 ID 或 null
   */
  private getFurnitureId(char: string, context: MapGenContext, rng: SeededRandom): number | null {
    const mapping = this.resolvedMapgenData.furniture.get(char);

    // 如果没有映射，返回 null
    if (!mapping) {
      return null;
    }

    // 处理不同类型的映射
    if (typeof mapping === 'string') {
      return this.resolveFurnitureName(mapping);
    }

    // 加权选项
    if (Array.isArray(mapping) && mapping.length > 0 && Array.isArray(mapping[0])) {
      const selected = this.selectWeightedOption(mapping as WeightedOption[], rng);
      return this.resolveFurnitureName(selected);
    }

    // 数组（多个家具，随机选一个）
    if (Array.isArray(mapping) && typeof mapping[0] === 'string') {
      const idx = rng.nextInt(mapping.length);
      return this.resolveFurnitureName(mapping[idx] as string);
    }

    return null;
  }

  /**
   * 解析地形名称为 ID
   *
   * @param name - 地形 ID（如 "t_soil"）
   * @returns 地形 ID
   */
  private resolveTerrainName(name: string): number {
    // 检查缓存
    if (this.terrainCache.has(name)) {
      return this.terrainCache.get(name)!;
    }

    // 从加载器查找（按字符串 ID）
    const terrain = this.loaders.terrain.findByIdString(name);

    if (!terrain) {
      // Terrain not found, return t_null
      return 0;
    }

    const id = terrain.id;
    this.terrainCache.set(name, id);
    return id;
  }

  /**
   * 解析家具名称为 ID
   *
   * @param name - 家具 ID（如 "f_chair"）
   * @returns 家具 ID 或 null
   */
  private resolveFurnitureName(name: string): number | null {
    // 特殊处理 f_null（表示"无家具"）
    if (name === 'f_null' || name === 'null') {
      return null;
    }

    // 检查缓存
    if (this.furnitureCache.has(name)) {
      return this.furnitureCache.get(name)!;
    }

    // 从加载器查找（按字符串 ID）
    const furniture = this.loaders.furniture.findByIdString(name);

    if (!furniture) {
      console.warn(`Furniture not found: ${name}`);
      return null;
    }

    const id = furniture.id;
    this.furnitureCache.set(name, id);
    return id;
  }

  /**
   * 从加权选项中选择
   *
   * @param options - 加权选项数组
   * @param seed - 随机种子
   * @returns 选中的选项名称
   */
  private selectWeightedOption(
    options: WeightedOption[],
    rng: SeededRandom
  ): string {
    const totalWeight = options.reduce((sum, opt) => sum + opt[1], 0);
    let random = (rng.next() * totalWeight);

    for (const [name, weight] of options) {
      random -= weight;
      if (random <= 0) {
        return name;
      }
    }

    return options[0][0];
  }

  /**
   * 处理字符映射的物品
   *
   * @param char - 字符
   * @param mapgenX - 在 mapgen 中的 X 坐标
   * @param mapgenY - 在 mapgen 中的 Y 坐标
   * @param submapX - 在 submap 中的 X 坐标
   * @param submapY - 在 submap 中的 Y 坐标
   * @param rng - 随机数生成器
   * @returns 物品生成点数组
   */
  private processItemForChar(
    char: string,
    mapgenX: number,
    mapgenY: number,
    submapX: number,
    submapY: number,
    rng: SeededRandom
  ): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];
    const itemConfig = this.resolvedMapgenData.items.get(char);

    if (!itemConfig) {
      return spawns;
    }

    // 检查概率
    if (itemConfig.chance !== undefined) {
      if (rng.next() * 100 > itemConfig.chance) {
        return spawns;
      }
    }

    // 确定数量
    let count = 1;
    if (itemConfig.count) {
      const [min, max] = itemConfig.count;
      count = rng.nextIntRange(min, max);
    }

    // 创建物品生成点（使用 submap 坐标）
    for (let i = 0; i < count; i++) {
      const spawn: SpawnPoint = {
        type: 'item',
        position: Point.from(submapX, submapY),
        data: {
          item: itemConfig.item,
          charges: itemConfig.charges,
        },
      };
      spawns.push(spawn);
    }

    return spawns;
  }

  /**
   * 处理 place_items 配置
   *
   * @param context - 生成上下文
   * @returns 物品生成点数组
   */
  private processPlaceItems(context: MapGenContext): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];

    for (const placement of this.resolvedMapgenData.placeItems) {
      // 检查概率
      if (placement.chance !== undefined) {
        if (Math.random() * 100 > placement.chance) {
          continue;
        }
      }

      // 解析位置
      const positions = this.parsePlacementPosition(placement.x, placement.y);

      // 确定数量
      let count = 1;
      if (placement.count) {
        const [min, max] = placement.count;
        count = Math.floor(Math.random() * (max - min + 1)) + min;
      }

      // 在每个位置创建物品生成点
      for (const pos of positions) {
        // 确保在 submap 范围内
        if (pos.x < 0 || pos.x >= SUBMAP_SIZE || pos.y < 0 || pos.y >= SUBMAP_SIZE) {
          // Debug: 跳过超出边界的物品
          if (placement.x !== undefined || placement.y !== undefined) {
            // Only log for items with explicit positions (not character-based)
            continue;
          }
        }

        for (let i = 0; i < count; i++) {
          const spawn: SpawnPoint = {
            type: 'item',
            position: pos,
            data: {
              item: placement.item,
              charges: placement.charges,
            },
          };
          spawns.push(spawn);
        }
      }
    }

    return spawns;
  }

  /**
   * 处理 place_monsters 配置
   *
   * @param context - 生成上下文
   * @return 怪物生成点数组
   */
  private processPlaceMonsters(context: MapGenContext): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];

    for (const placement of this.resolvedMapgenData.placeMonsters) {
      // 检查概率
      if (placement.chance !== undefined) {
        if (Math.random() * 100 > placement.chance) {
          continue;
        }
      }

      // 解析位置
      const positions = this.parsePlacementPosition(placement.x, placement.y);

      // 确定重复次数
      const repeat = placement.repeat || 1;

      // 确定密度
      const density = placement.density || 1;

      // 在每个位置创建怪物生成点
      for (const pos of positions) {
        // 确保在 submap 范围内
        if (pos.x < 0 || pos.x >= SUBMAP_SIZE || pos.y < 0 || pos.y >= SUBMAP_SIZE) {
          continue;
        }

        // 根据密度和重复次数创建多个怪物
        const monsterCount = Math.ceil(repeat * density);

        for (let i = 0; i < monsterCount; i++) {
          const spawn: SpawnPoint = {
            type: 'monster',
            position: pos,
            data: {
              monster: placement.monster,
            },
          };
          spawns.push(spawn);
        }
      }
    }

    return spawns;
  }

  /**
   * 解析放置位置
   *
   * @param x - X 坐标（可以是单个数字或范围）
   * @param y - Y 坐标（可以是单个数字或范围）
   * @returns 位置点数组
   */
  private parsePlacementPosition(
    x: number | [number, number] | undefined,
    y: number | [number, number] | undefined
  ): Point[] {
    const positions: Point[] = [];

    const xValues = x !== undefined
      ? (Array.isArray(x) ? this.range(x[0], x[1]) : [x])
      : [0];

    const yValues = y !== undefined
      ? (Array.isArray(y) ? this.range(y[0], y[1]) : [y])
      : [0];

    for (const xVal of xValues) {
      for (const yVal of yValues) {
        positions.push(Point.from(xVal, yVal));
      }
    }

    return positions;
  }

  /**
   * 生成范围数组
   *
   * @param min - 最小值
   * @param max - 最大值
   * @returns 从 min 到 max 的数组
   */
  private range(min: number, max: number): number[] {
    const result: number[] = [];
    for (let i = min; i <= max; i++) {
      result.push(i);
    }
    return result;
  }

  /**
   * 处理 place_items 配置（仅限指定 submap 范围）
   *
   * @param startX - Mapgen 起始 X 坐标
   * @param startY - Mapgen 起始 Y 坐标
   * @param endX - Mapgen 结束 X 坐标
   * @param endY - Mapgen 结束 Y 坐标
   * @param rng - 随机数生成器
   * @returns 物品生成点数组
   */
  private processPlaceItemsForSubmap(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    rng: SeededRandom
  ): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];

    for (const placement of this.resolvedMapgenData.placeItems) {
      // 检查概率
      if (placement.chance !== undefined) {
        if (rng.next() * 100 > placement.chance) {
          continue;
        }
      }

      // 解析位置（mapgen 坐标）
      const positions = this.parsePlacementPosition(placement.x, placement.y);

      // 确定数量
      let count = 1;
      if (placement.count) {
        const [min, max] = placement.count;
        count = rng.nextIntRange(min, max);
      }

      // 在每个位置创建物品生成点
      for (const pos of positions) {
        // 检查是否在当前 submap 范围内（mapgen 坐标）
        if (pos.x < startX || pos.x >= endX || pos.y < startY || pos.y >= endY) {
          continue;
        }

        // 转换为 submap 坐标
        const submapX = pos.x - startX;
        const submapY = pos.y - startY;

        for (let i = 0; i < count; i++) {
          const spawn: SpawnPoint = {
            type: 'item',
            position: Point.from(submapX, submapY),
            data: {
              item: placement.item,
              charges: placement.charges,
            },
          };
          spawns.push(spawn);
        }
      }
    }

    return spawns;
  }

  /**
   * 处理 place_monsters 配置（仅限指定 submap 范围）
   *
   * @param startX - Mapgen 起始 X 坐标
   * @param startY - Mapgen 起始 Y 坐标
   * @param endX - Mapgen 结束 X 坐标
   * @param endY - Mapgen 结束 Y 坐标
   * @param rng - 随机数生成器
   * @return 怪物生成点数组
   */
  private processPlaceMonstersForSubmap(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    rng: SeededRandom
  ): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];

    for (const placement of this.resolvedMapgenData.placeMonsters) {
      // 检查概率
      if (placement.chance !== undefined) {
        if (rng.next() * 100 > placement.chance) {
          continue;
        }
      }

      // 解析位置（mapgen 坐标）
      const positions = this.parsePlacementPosition(placement.x, placement.y);

      // 确定重复次数
      const repeat = placement.repeat || 1;

      // 确定密度
      const density = placement.density || 1;

      // 在每个位置创建怪物生成点
      for (const pos of positions) {
        // 检查是否在当前 submap 范围内（mapgen 坐标）
        if (pos.x < startX || pos.x >= endX || pos.y < startY || pos.y >= endY) {
          continue;
        }

        // 转换为 submap 坐标
        const submapX = pos.x - startX;
        const submapY = pos.y - startY;

        // 根据密度和重复次数创建多个怪物
        const monsterCount = Math.ceil(repeat * density);

        for (let i = 0; i < monsterCount; i++) {
          const spawn: SpawnPoint = {
            type: 'monster',
            position: Point.from(submapX, submapY),
            data: {
              monster: placement.monster,
            },
          };
          spawns.push(spawn);
        }
      }
    }

    return spawns;
  }

  /**
   * 处理嵌套 mapgen
   *
   * @param nestedConfig 嵌套配置
   * @param mapgenX 在 mapgen 中的 X 坐标
   * @param mapgenY 在 mapgen 中的 Y 坐标
   * @param context 生成上下文
   * @param rng 随机数生成器
   * @returns 瓦片
   */
  private processNestedMapgen(
    nestedConfig: NestedMapConfig,
    mapgenX: number,
    mapgenY: number,
    context: MapGenContext,
    rng: SeededRandom
  ): MapTile {
    const mapgenLoader = this.options!.mapgenLoader!;
    let chunkId: string | undefined;

    // 选择 chunk ID
    if (nestedConfig.chunk) {
      chunkId = nestedConfig.chunk;
    } else if (nestedConfig.chunks && nestedConfig.chunks.length > 0) {
      // 处理加权选项或简单列表
      const firstChunk = nestedConfig.chunks[0];
      if (typeof firstChunk === 'string') {
        chunkId = firstChunk;
      } else if (Array.isArray(firstChunk) && firstChunk.length >= 2) {
        // 加权选项 [id, weight]
        const selected = this.selectWeightedOption(nestedConfig.chunks as WeightedOption[], rng);
        chunkId = selected;
      }
    } else if (nestedConfig.chunks_list && nestedConfig.chunks_list.length > 0) {
      // 从列表中随机选择
      const idx = rng.nextInt(nestedConfig.chunks_list.length);
      chunkId = nestedConfig.chunks_list[idx];
    }

    if (!chunkId || chunkId === 'null') {
      // 没有找到 chunk ID 或 chunk ID 是 "null"，返回空瓦片
      // 不输出警告，因为这是正常的情况（表示"不生成任何嵌套内容"）
      // Fall back to normal character processing
      const originalChar = this.resolvedMapgenData.rows[mapgenY]?.[mapgenX] || ' ';
      return this.mapCharToTile(originalChar, context, rng);
    }

    // 查找 chunk mapgen
    const chunkMapgen = mapgenLoader.get(chunkId);
    if (!chunkMapgen) {
      // 只在 chunk ID 看起来像一个有效的 mapgen ID 时才输出警告
      if (chunkId.includes('_') || chunkId.length > 3) {
        console.warn(`Nested chunk not found: ${chunkId}`);
      }
      // Fall back to normal character processing using the original character
      const originalChar = this.resolvedMapgenData.rows[mapgenY]?.[mapgenX] || ' ';
      return this.mapCharToTile(originalChar, context, rng);
    }

    // 计算 chunk 内的相对坐标（考虑偏移）
    let chunkX = 0;
    let chunkY = 0;

    if (nestedConfig.x_delta !== undefined) {
      chunkX = nestedConfig.x_delta;
    }
    if (nestedConfig.y_delta !== undefined) {
      chunkY = nestedConfig.y_delta;
    }

    // 创建 chunk 生成器
    const chunkGenerator = new CataclysmMapGenGenerator(chunkMapgen, this.loaders, this.options);

    // 生成 chunk（可能包含多个 submap）
    const chunkResult = chunkGenerator.generateMultiple(context);

    // 找到包含我们目标位置的 submap
    // mapgenX 和 mapgenY 是相对于当前 mapgen 的绝对位置
    // 我们需要找到 chunk 中对应这个位置的瓦片

    // 简化处理：使用 chunk 的第一个 submap 的对应位置
    // 更完整的实现需要计算 chunk 的整体布局和偏移

    // 由于 chunk 通常很小（12x12 或更小），我们简化处理：
    // 使用 chunk 在 (chunkX, chunkY) 位置的瓦片
    // 如果超出边界，使用默认瓦片

    const firstSubmap = chunkResult.submaps[0].submap;

    // 确保坐标在范围内
    if (chunkX < 0 || chunkX >= firstSubmap.size || chunkY < 0 || chunkY >= firstSubmap.size) {
      console.warn(`Nested chunk ${chunkId} coordinates (${chunkX}, ${chunkY}) out of bounds`);
      // Fall back to normal character processing
      const originalChar = this.resolvedMapgenData.rows[mapgenY]?.[mapgenX] || ' ';
      return this.mapCharToTile(originalChar, context, rng);
    }

    const extractedTile = firstSubmap.tiles!.getTile(chunkX, chunkY);
    return extractedTile;
  }

  /**
   * 检查是否可以应用此生成器
   */
  canApply(context: MapGenContext): boolean {
    // 简单验证：检查是否有 rows 或 fill_ter
    return (
      this.resolvedMapgenData.rows.length > 0 ||
      this.resolvedMapgenData.fillTerrain !== undefined
    );
  }

  /**
   * 获取生成器权重
   */
  getWeight(context: MapGenContext): number {
    return this.resolvedMapgenData.weight || 1;
  }
}
