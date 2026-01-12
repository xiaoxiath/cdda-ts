/**
 * 真实 Cataclysm-DDA mapgen 生成测试
 *
 * 使用实际的 mapgen 文件生成 Submap
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CataclysmMapGenGenerator } from '../CataclysmMapGenGenerator';
import { CataclysmMapGenLoader } from '../CataclysmMapGenParser';
import { TerrainLoader } from '../../terrain/TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { TrapLoader } from '../../trap/TrapLoader';
import { MapGenContext } from '../MapGenFunction';
import { GameMap } from '../../map/GameMap';
import { Tripoint } from '../../coordinates/Tripoint';
import { getJsonPath } from '../../config/CddaConfig';

describe('Real Cataclysm-DDA MapGen Generation', () => {
  const DATA_PATH = getJsonPath();

  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let mapgenLoader: CataclysmMapGenLoader;
  let context: MapGenContext;

  beforeAll(async () => {
    console.log('\n🔄 加载 Cataclysm-DDA 游戏数据...\n');

    // 创建加载器
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();
    mapgenLoader = new CataclysmMapGenLoader();

    // 加载地形数据 - 加载多个文件以获得更多样化
    const terrainFiles = [
      'furniture_and_terrain/terrain-floors-indoor.json',
      'furniture_and_terrain/terrain-floors-outdoors.json',
      'furniture_and_terrain/terrain-walls.json',
    ];

    console.log('📁 加载地形数据:');
    for (const file of terrainFiles) {
      try {
        const filePath = join(DATA_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        await terrainLoader.loadFromJson(json);
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.log(`  ✗ ${file}: ${(error as Error).message}`);
      }
    }

    // 加载家具数据
    const furnitureFiles = [
      'furniture_and_terrain/furniture-seats.json',
      'furniture_and_terrain/furniture-surface.json',
    ];

    console.log('\n📁 加载家具数据:');
    for (const file of furnitureFiles) {
      try {
        const filePath = join(DATA_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        await furnitureLoader.loadFromJson(json);
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.log(`  ✗ ${file}: ${(error as Error).message}`);
      }
    }

    // 加载陷阱数据
    try {
      const trapPath = join(DATA_PATH, 'furniture_and_terrain/traps.json');
      const trapContent = readFileSync(trapPath, 'utf-8');
      const trapJson = JSON.parse(trapContent);
      await trapLoader.loadFromJson(trapJson);
      console.log(`  ✓ traps.json`);
    } catch (error) {
      console.log(`  ✗ traps.json: ${(error as Error).message}`);
    }

    console.log(`\n✅ 数据加载完成!`);
    console.log(`   地形: ${terrainLoader.getData().size()} 个`);
    console.log(`   家具: ${furnitureLoader.getData().size()} 个`);
    console.log(`   陷阱: ${trapLoader.getData().size()} 个\n`);

    // 创建 context
    const map = new GameMap();
    context = {
      position: new Tripoint(0, 0, 0),
      seed: 42,
      map,
      params: {},
      depth: 0,
    };
  });

  it('should generate submap from abandoned_barn.json', () => {
    console.log('\n🏠 测试生成 abandoned_barn (废弃谷仓)\n');

    // 加载 mapgen 文件
    const filePath = join(DATA_PATH, 'mapgen/abandoned_barn.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    // 解析 mapgen
    mapgenLoader.loadArray(jsonData);
    const mapgenData = mapgenLoader.get('desolatebarn');

    expect(mapgenData).toBeDefined();

    if (mapgenData) {
      console.log(`Mapgen ID: ${mapgenData.id}`);
      console.log(`尺寸: ${mapgenData.width}x${mapgenData.height}`);
      console.log(`行数: ${mapgenData.rows.length}`);
      console.log(`地形映射: ${mapgenData.terrain.size} 个`);
      console.log(`家具映射: ${mapgenData.furniture.size} 个`);

      // 创建生成器
      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      // 生成 Submap
      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 可视化生成的地图
      console.log('\n生成的地图 (12x12):');
      console.log(' Legend: # = Wall, . = Floor, c = Chair, etc.');
      console.log(''.padEnd(14, '='));

      for (let y = 0; y < 12; y++) {
        let line = '';
        for (let x = 0; x < 12; x++) {
          const tile = submap.tiles!.getTile(x, y);
          const terrain = terrainLoader.getData().get(tile.terrain);
          const symbol = terrain ? terrain.symbol : '?';
          line += symbol;
        }
        console.log(line);
      }

      // 统计地形
      const terrainCounts = new Map<string, number>();
      const furnitureCounts = new Map<string, number>();

      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const tile = submap.tiles!.getTile(x, y);

          const terrain = terrainLoader.getData().get(tile.terrain);
          if (terrain) {
            terrainCounts.set(terrain.name, (terrainCounts.get(terrain.name) || 0) + 1);
          }

          if (tile.furniture) {
            const furniture = furnitureLoader.getData().get(tile.furniture);
            if (furniture) {
              furnitureCounts.set(furniture.name, (furnitureCounts.get(furniture.name) || 0) + 1);
            }
          }
        }
      }

      console.log('\n地形统计:');
      terrainCounts.forEach((count, name) => {
        console.log(`  ${name}: ${count} 个`);
      });

      if (furnitureCounts.size > 0) {
        console.log('\n家具统计:');
        furnitureCounts.forEach((count, name) => {
          console.log(`  ${name}: ${count} 个`);
        });
      }
    }
  });

  it('should generate submap from mansion.json', () => {
    console.log('\n🏰 测试生成 mansion (豪宅)\n');

    const filePath = join(DATA_PATH, 'mapgen/mansion.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    mapgenLoader.loadArray(jsonData);

    // mansion 的 ID 是 "mansion_e1d" (om_terrain 的第一个值)
    const mapgenData = mapgenLoader.getAll().find(m => m.id.includes('mansion'));

    expect(mapgenData).toBeDefined();

    if (mapgenData) {
      console.log(`Mapgen ID: ${mapgenData.id}`);
      console.log(`尺寸: ${mapgenData.width}x${mapgenData.height}`);
      console.log(`行数: ${mapgenData.rows.length}`);
      console.log(`地形映射: ${mapgenData.terrain.size} 个`);
      console.log(`家具映射: ${mapgenData.furniture.size} 个`);

      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      });

      const submap = generator.generate(context);

      expect(submap.size).toBe(12);
      expect(submap.tiles).toBeDefined();

      // 显示前几行
      console.log('\n地图预览 (前 5 行):');
      for (let y = 0; y < Math.min(5, 12); y++) {
        let line = '';
        for (let x = 0; x < 12; x++) {
          const tile = submap.tiles!.getTile(x, y);
          const terrain = terrainLoader.getData().get(tile.terrain);
          const symbol = terrain ? terrain.symbol : '?';
          line += symbol;
        }
        console.log(line);
      }

      // 统计
      let differentTerrains = 0;
      const seenTerrains = new Set<number>();

      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const tile = submap.tiles!.getTile(x, y);
          if (!seenTerrains.has(tile.terrain)) {
            seenTerrains.add(tile.terrain);
            differentTerrains++;
          }
        }
      }

      console.log(`\n使用了 ${differentTerrains} 种不同的地形`);

      // 显示一些地形名称
      console.log('\n地形示例:');
      let count = 0;
      for (const terrainId of seenTerrains) {
        if (count++ < 5) {
          const terrain = terrainLoader.getData().get(terrainId);
          if (terrain) {
            console.log(`  - ${terrain.name} (${terrain.symbol})`);
          }
        }
      }
    }
  });

  it('should generate multiple mapgens from same file', () => {
    console.log('\n🏗️ 测试生成多个 mapgen (从 abandoned_barn.json)\n');

    const filePath = join(DATA_PATH, 'mapgen/abandoned_barn.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    mapgenLoader.loadArray(jsonData);
    const allMapgens = mapgenLoader.getAll();

    console.log(`文件包含 ${allMapgens.length} 个 mapgen 对象`);

    // 测试前 5 个
    const testCount = Math.min(5, allMapgens.length);
    let successCount = 0;

    for (let i = 0; i < testCount; i++) {
      const mapgenData = allMapgens[i];
      console.log(`\n${i + 1}. ${mapgenData.id}`);
      console.log(`   尺寸: ${mapgenData.width}x${mapgenData.height}`);
      console.log(`   地形映射: ${mapgenData.terrain.size} 个`);

      try {
        const generator = new CataclysmMapGenGenerator(mapgenData, {
          terrain: terrainLoader,
          furniture: furnitureLoader,
          trap: trapLoader,
        });

        const submap = generator.generate(context);
        expect(submap.size).toBe(12);
        expect(submap.tiles).toBeDefined();

        successCount++;
        console.log(`   ✅ 成功生成`);
      } catch (error) {
        console.log(`   ✗ 生成失败: ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ 成功生成 ${successCount}/${testCount} 个 mapgen`);
    expect(successCount).toBeGreaterThan(0);
  });

  it('should handle weighted options in real data', () => {
    console.log('\n🎲 测试加权选项 (从真实数据)\n');

    // 找一个包含加权选项的 mapgen
    const filePath = join(DATA_PATH, 'mapgen/mansion.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    mapgenLoader.loadArray(jsonData);

    // 查找有家具加权选项的 mapgen
    let found = false;
    for (const mapgenData of mapgenLoader.getAll()) {
      // 检查家具映射是否有加权选项
      for (const [char, mapping] of mapgenData.furniture) {
        if (Array.isArray(mapping) && mapping.length > 0 && Array.isArray(mapping[0])) {
          console.log(`找到加权选项: '${char}' -> ${JSON.stringify(mapping)}`);
          found = true;

          // 生成这个 mapgen
          const generator = new CataclysmMapGenGenerator(mapgenData, {
            terrain: terrainLoader,
            furniture: furnitureLoader,
            trap: trapLoader,
          });

          const submap = generator.generate(context);
          expect(submap.size).toBe(12);

          // 多次生成检查随机性
          console.log('\n生成 5 次检查随机性:');
          const results: Set<string> = new Set();

          for (let i = 0; i < 5; i++) {
            const s = generator.generate(context);
            const tile = s.tiles!.getTile(0, 0);
            const furniture = tile.furniture
              ? furnitureLoader.getData().get(tile.furniture)?.name || 'null'
              : 'null';
            results.add(furniture);
            console.log(`  ${i + 1}. ${furniture}`);
          }

          console.log(`\n不同的结果: ${results.size} 种`);
          break;
        }
      }

      if (found) break;
    }

    if (!found) {
      console.log('未找到加权选项示例');
    }
  });
});
