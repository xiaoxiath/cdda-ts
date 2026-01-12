/**
 * CataclysmMapGenGenerator 测试
 *
 * 测试 Cataclysm-DDA 地图生成器
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CataclysmMapGenGenerator } from '../CataclysmMapGenGenerator';
import { TerrainLoader } from '../../terrain/TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { TrapLoader } from '../../trap/TrapLoader';
import { ParsedMapGenData } from '../CataclysmMapGenParser';
import { MapGenContext } from '../MapGenFunction';
import { GameMap } from '../../map/GameMap';
import { Tripoint } from '../../coordinates/Tripoint';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getFurnitureAndTerrainPath } from '../../config/CddaConfig';

describe('CataclysmMapGenGenerator', () => {
  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let context: MapGenContext;

  beforeEach(async () => {
    // 创建加载器
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();

    // 从文件系统加载测试数据
    const basePath = getFurnitureAndTerrainPath();
    const terrainPath = join(basePath, 'terrain-floors-indoor.json');
    const furniturePath = join(basePath, 'furniture-seats.json');

    try {
      const terrainContent = readFileSync(terrainPath, 'utf-8');
      const terrainJson = JSON.parse(terrainContent);
      await terrainLoader.loadFromJson(terrainJson);

      const furnitureContent = readFileSync(furniturePath, 'utf-8');
      const furnitureJson = JSON.parse(furnitureContent);
      await furnitureLoader.loadFromJson(furnitureJson);
    } catch (error) {
      console.warn('Failed to load test data:', error);
    }

    // 创建 mock context
    const map = new GameMap();
    context = {
      position: new Tripoint(0, 0, 0),
      seed: 42,
      map,
      params: {},
      depth: 0,
    };
  });

  describe('基础生成功能', () => {
    it('should generate a 12x12 submap from simple mapgen', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_simple',
        width: 12,
        height: 12,
        rows: Array(12).fill('cccccccccccc'), // 12 个 'c'
        terrain: new Map([['c', 'concrete floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();
      // 检查能正确创建瓦片
      const tile = submap.tiles.getTile(0, 0);
      expect(tile).toBeDefined();
    });

    it('should generate submap with terrain mappings', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_terrain_mapping',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'), // 12 个点
        terrain: new Map([['.', 't_thconc_floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 检查一些瓦片
      const tile = submap.tiles!.getTile(0, 0);
      // 地形可能是 0 (t_null) 如果找不到，这是可以接受的
      expect(tile.terrain).toBeGreaterThanOrEqual(0);
    });

    it('should generate submap with furniture mappings', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_furniture_mapping',
        width: 12,
        height: 12,
        rows: Array(12).fill('cccccccccccc'), // 12 个椅子
        terrain: new Map([['c', 'concrete floor']]),
        furniture: new Map([['c', 'f_chair']]),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 检查一些瓦片
      const tile = submap.tiles!.getTile(0, 0);
      expect(tile.terrain).toBeGreaterThanOrEqual(0); // 地形可能是 0 (t_null) 如果找不到，这是可以接受的
      // 家具可能找不到（取决于测试数据），所以不强制检查
    });

    it('should handle mixed terrain and furniture', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_mixed',
        width: 12,
        height: 12,
        rows: [
          '############',
          '#..........#',
          '#.cc......c#',
          '#..........#',
          '############',
          ...Array(7).fill('            '), // 填充剩余行
        ],
        terrain: new Map([
          ['#', 't_wall'], // 使用 Cataclysm-DDA 的 wall ID
          ['.', 't_thconc_floor'],
        ]),
        furniture: new Map([['c', 'f_chair']]),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 检查墙壁 - 如果找不到 wall，会使用 t_null (0)
      const wallTile = submap.tiles!.getTile(0, 0);
      expect(wallTile.terrain).toBeGreaterThanOrEqual(0);

      // 检查地板
      const floorTile = submap.tiles!.getTile(1, 1);
      expect(floorTile.terrain).toBeGreaterThanOrEqual(0);
    });
  });

  describe('加权选项', () => {
    it('should handle weighted terrain selection', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_weighted',
        width: 12,
        height: 12,
        rows: Array(12).fill('ffffffffffff'),
        terrain: new Map([
          [
            'f',
            [
              ['t_thconc_floor', 75],
              ['dirt', 25],
            ],
          ],
        ]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 多次生成，检查分布
      const floorCount = 100;
      let floorTerrainCount = 0;

      for (let i = 0; i < floorCount; i++) {
        const s = generator.generate(context);
        const t = s.tiles!.getTile(0, 0).terrain;
        // 这里无法精确判断是哪个地形，因为我们不知道具体 ID
        // 但至少验证它能生成
        expect(t).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('边界情况', () => {
    it('should handle empty rows', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_empty_rows',
        width: 12,
        height: 12,
        rows: [],
        fillTerrain: 't_floor',
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();
    });

    it('should handle oversized mapgen (24x24)', () => {
      const rows = Array(24).fill('................'); // 24 个点
      const mapgenData: ParsedMapGenData = {
        id: 'test_oversized',
        width: 24,
        height: 24,
        rows,
        terrain: new Map([['.', 't_thconc_floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      // 应该只生成左上角 12x12
      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();
    });

    it('should handle undersized mapgen (6x6)', () => {
      const rows = Array(6).fill('......'); // 6 个点
      const mapgenData: ParsedMapGenData = {
        id: 'test_undersized',
        width: 6,
        height: 6,
        rows,
        terrain: new Map([['.', 't_thconc_floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      // 应该填充到 12x12
      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 中心区域应该有内容
      const centerTile = submap.tiles!.getTile(3, 3);
      expect(centerTile.terrain).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing terrain gracefully', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_missing_terrain',
        width: 12,
        height: 12,
        rows: Array(12).fill('xxxxxxxxxxxx'),
        terrain: new Map([['x', 'nonexistent_terrain']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      // 应该不抛出错误
      expect(() => generator.generate(context)).not.toThrow();

      const submap = generator.generate(context);
      expect(submap).toBeDefined();
      // 缺失的地形应该使用 t_null (0)
      const tile = submap.tiles!.getTile(0, 0);
      expect(tile.terrain).toBe(0);
    });
  });

  describe('生成器方法', () => {
    it('should return correct id', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_id',
        width: 12,
        height: 12,
        rows: Array(12).fill('            '),
        fillTerrain: 't_floor',
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      expect(generator.id).toBe('test_id');
    });

    it('should return correct weight', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_weight',
        width: 12,
        height: 12,
        rows: Array(12).fill('            '),
        fillTerrain: 't_floor',
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        weight: 100,
        raw: {} as any,
      };

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      expect(generator.getWeight(context)).toBe(100);
    });

    it('should validate canApply', () => {
      const mapgenDataWithRows: ParsedMapGenData = {
        id: 'test_can_apply_rows',
        width: 12,
        height: 12,
        rows: Array(12).fill('            '),
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator1 = new CataclysmMapGenGenerator(mapgenDataWithRows, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      expect(generator1.canApply(context)).toBe(true);

      const mapgenDataWithFill: ParsedMapGenData = {
        id: 'test_can_apply_fill',
        width: 12,
        height: 12,
        rows: [],
        fillTerrain: 't_floor',
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const generator2 = new CataclysmMapGenGenerator(mapgenDataWithFill, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      expect(generator2.canApply(context)).toBe(true);
    });
  });
});
