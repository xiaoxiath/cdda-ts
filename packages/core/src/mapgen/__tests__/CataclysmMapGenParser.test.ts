/**
 * Cataclysm-DDA Mapgen 解析器测试
 *
 * 测试 CataclysmMapGenParser 能否正确解析 Cataclysm-DDA 的 mapgen JSON 数据
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CataclysmMapGenParser,
  CataclysmMapGenLoader,
  type CataclysmMapGenJson,
  type ParsedMapGenData,
} from '../CataclysmMapGenParser';
import { getMapgenPath } from '../../config/CddaConfig';

describe('CataclysmMapGenParser', () => {
  const DATA_PATH = getMapgenPath();

  it('should parse abandoned_barn.json', () => {
    const filePath = join(DATA_PATH, 'abandoned_barn.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    expect(Array.isArray(jsonData)).toBe(true);

    const parsedArray = CataclysmMapGenParser.parseArray(jsonData);

    console.log(`\n✅ 成功解析 ${parsedArray.length} 个 mapgen 对象`);

    // 显示第一个 mapgen 的信息
    if (parsedArray.length > 0) {
      const first = parsedArray[0];
      console.log('\n第一个 mapgen 对象:');
      console.log(`  ID: ${first.id}`);
      console.log(`  尺寸: ${first.width}x${first.height}`);
      console.log(`  行数: ${first.rows.length}`);
      console.log(`  地形映射: ${first.terrain.size} 个`);
      console.log(`  家具映射: ${first.furniture.size} 个`);
      console.log(`  物品映射: ${first.items.size} 个`);
      console.log(`  物品放置: ${first.placeItems.length} 个`);
      console.log(`  怪物放置: ${first.placeMonsters.length} 个`);
      console.log(`  嵌套地图: ${first.placeNested.length} 个`);
      console.log(`  标志: ${first.flags.size} 个`);

      if (first.flags.size > 0) {
        console.log(`  标志列表: ${Array.from(first.flags).join(', ')}`);
      }

      // 验证数据完整性
      const validation = CataclysmMapGenParser.validate(first);
      console.log(`\n验证结果: ${validation.valid ? '✅ 有效' : '❌ 无效'}`);
      if (!validation.valid) {
        console.log(`  错误: ${validation.errors.join(', ')}`);
      }

      expect(validation.valid).toBe(true);
    }

    expect(parsedArray.length).toBeGreaterThan(0);
  });

  it('should parse mansion.json', () => {
    const filePath = join(DATA_PATH, 'mansion.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    const parsedArray = CataclysmMapGenParser.parseArray(jsonData);

    console.log(`\n✅ 成功解析 ${parsedArray.length} 个 mapgen 对象`);

    if (parsedArray.length > 0) {
      const first = parsedArray[0];

      // mansion.json 应该有家具映射
      console.log(`\n第一个 mapgen 对象:`);
      console.log(`  ID: ${first.id}`);
      console.log(`  地形映射: ${first.terrain.size} 个`);
      console.log(`  家具映射: ${first.furniture.size} 个`);
      console.log(`  物品映射: ${first.items.size} 个`);
      console.log(`  怪物放置: ${first.placeMonsters.length} 个`);

      // 显示一些地形映射示例
      if (first.terrain.size > 0) {
        console.log('\n地形映射示例 (前5个):');
        let count = 0;
        for (const [char, mapping] of first.terrain) {
          if (count++ < 5) {
            const mappingStr = Array.isArray(mapping)
              ? `[${mapping.map(m => Array.isArray(m) ? `[${m.join(':')}]` : m).join(', ')}]`
              : mapping;
            console.log(`  '${char}' -> ${mappingStr}`);
          }
        }
      }

      // 显示一些家具映射示例
      if (first.furniture.size > 0) {
        console.log('\n家具映射示例 (前5个):');
        let count = 0;
        for (const [char, mapping] of first.furniture) {
          if (count++ < 5) {
            const mappingStr = Array.isArray(mapping)
              ? `[${mapping.map(m => Array.isArray(m) ? `[${m.join(':')}]` : m).join(', ')}]`
              : `'${mapping}'`;
            console.log(`  '${char}' -> ${mappingStr}`);
          }
        }
      }
    }

    expect(parsedArray.length).toBeGreaterThan(0);
  });

  it('should parse lan_center.json with complex mappings', () => {
    const filePath = join(DATA_PATH, 'lan_center.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    const parsedArray = CataclysmMapGenParser.parseArray(jsonData);

    console.log(`\n✅ 成功解析 ${parsedArray.length} 个 mapgen 对象`);

    if (parsedArray.length > 0) {
      const first = parsedArray[0];

      console.log(`\n第一个 mapgen 对象:`);
      console.log(`  ID: ${first.id}`);
      console.log(`  尺寸: ${first.width}x${first.height}`);
      console.log(`  行数: ${first.rows.length}`);

      // lan_center.json 应该有很多字符映射
      console.log(`  地形映射: ${first.terrain.size} 个`);
      console.log(`  家具映射: ${first.furniture.size} 个`);

      // 显示第一行
      if (first.rows.length > 0) {
        console.log(`\n第一行示例:`);
        console.log(`  "${first.rows[0]}"`);
      }
    }

    expect(parsedArray.length).toBeGreaterThan(0);
  });

  it('should load mapgen using CataclysmMapGenLoader', async () => {
    const loader = new CataclysmMapGenLoader();

    // 加载单个文件
    const filePath = join(DATA_PATH, 'abandoned_barn.json');
    await loader.loadFromFile(filePath);

    console.log(`\n✅ 加载器成功加载 ${loader.size()} 个 mapgen 对象`);

    // 获取第一个 mapgen
    const all = loader.getAll();
    if (all.length > 0) {
      const first = all[0];
      console.log(`\n第一个 mapgen 对象:`);
      console.log(`  ID: ${first.id}`);
      console.log(`  尺寸: ${first.width}x${first.height}`);

      // 通过 ID 获取
      const retrieved = loader.get(first.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(first.id);
    }

    expect(loader.size()).toBeGreaterThan(0);
  });

  it('should handle nested mapgen references', () => {
    const filePath = join(DATA_PATH, 'abandoned_barn.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    const parsedArray = CataclysmMapGenParser.parseArray(jsonData);

    // 查找有 nested_mapgen_id 的对象
    const nestedMapgens = parsedArray.filter(p => p.nestedId);

    console.log(`\n找到 ${nestedMapgens.length} 个嵌套 mapgen 对象`);

    if (nestedMapgens.length > 0) {
      console.log('\n嵌套 mapgen 列表:');
      nestedMapgens.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.nestedId}`);
        console.log(`     尺寸: ${m.width}x${m.height}`);
        console.log(`     嵌套定义: ${m.nested.size} 个`);
      });
    }

    // 查找有 place_nested 的对象
    const withPlaceNested = parsedArray.filter(p => p.placeNested.length > 0);

    console.log(`\n找到 ${withPlaceNested.length} 个有 place_nested 的对象`);

    if (withPlaceNested.length > 0) {
      console.log('\nplace_nested 示例:');
      withPlaceNested.slice(0, 3).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.id}`);
        m.placeNested.forEach((n, j) => {
          console.log(`     嵌套 ${j + 1}: x=${n.x}, y=${n.y}, chunks=${n.chunks.length}`);
        });
      });
    }
  });

  it('should parse multiple files and collect statistics', async () => {
    const loader = new CataclysmMapGenLoader();

    const files = [
      'abandoned_barn.json',
      'mansion.json',
      'lan_center.json',
      'cemetery_small.json',
    ];

    console.log('\n加载多个文件...');

    for (const file of files) {
      const filePath = join(DATA_PATH, file);
      try {
        await loader.loadFromFile(filePath);
        console.log(`  ✅ ${file}`);
      } catch (error) {
        console.log(`  ❌ ${file}: ${(error as Error).message}`);
      }
    }

    console.log(`\n总计加载 ${loader.size()} 个 mapgen 对象`);

    const all = loader.getAll();

    // 统计各种特性
    const withTerrain = all.filter(m => m.terrain.size > 0).length;
    const withFurniture = all.filter(m => m.furniture.size > 0).length;
    const withItems = all.filter(m => m.placeItems.length > 0).length;
    const withMonsters = all.filter(m => m.placeMonsters.length > 0).length;
    const withNested = all.filter(m => m.placeNested.length > 0).length;
    const withFlags = all.filter(m => m.flags.size > 0).length;

    console.log('\n特性统计:');
    console.log(`  有地形映射: ${withTerrain} 个`);
    console.log(`  有家具映射: ${withFurniture} 个`);
    console.log(`  有物品放置: ${withItems} 个`);
    console.log(`  有怪物放置: ${withMonsters} 个`);
    console.log(`  有嵌套地图: ${withNested} 个`);
    console.log(`  有标志: ${withFlags} 个`);

    // 验证所有对象
    let validCount = 0;
    let invalidCount = 0;
    const allErrors: string[] = [];

    for (const data of all) {
      const validation = CataclysmMapGenParser.validate(data);
      if (validation.valid) {
        validCount++;
      } else {
        invalidCount++;
        allErrors.push(...validation.errors.map(e => `${data.id}: ${e}`));
      }
    }

    console.log('\n验证结果:');
    console.log(`  有效: ${validCount} 个`);
    console.log(`  无效: ${invalidCount} 个`);

    if (invalidCount > 0) {
      console.log('\n错误列表:');
      allErrors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
      if (allErrors.length > 10) {
        console.log(`  ... 还有 ${allErrors.length - 10} 个错误`);
      }
    }

    expect(loader.size()).toBeGreaterThan(0);
    expect(validCount).toBeGreaterThan(0);
  });
});
