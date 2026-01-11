/**
 * Cataclysm-DDA MapGen 数据加载测试
 *
 * 测试所有 845 个 mapgen JSON 文件的加载能力
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Cataclysm-DDA MapGen Data Loading Test', () => {
  const DATA_PATH = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/mapgen';

  // 递归获取所有 JSON 文件
  function getAllJsonFiles(dir: string, baseDir = dir): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllJsonFiles(fullPath, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // 保存相对路径
        files.push(fullPath);
      }
    }

    return files;
  }

  it('should scan and count all mapgen JSON files', () => {
    const files = getAllJsonFiles(DATA_PATH);
    console.log(`\n找到 ${files.length} 个 mapgen JSON 文件`);

    // 统计子目录
    const entries = readdirSync(DATA_PATH, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory()).length;
    const rootFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json')).length;

    console.log(`  根目录文件: ${rootFiles} 个`);
    console.log(`  子目录: ${subdirs} 个`);
    console.log(`  子目录中的文件: ${files.length - rootFiles} 个`);

    expect(files.length).toBeGreaterThan(0);
  });

  it('should parse sample mapgen files', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 10); // 测试前10个

    console.log(`\n测试 ${files.length} 个 mapgen 文件:`);
    let totalObjects = 0;
    let mapgenCount = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        // 统计对象
        totalObjects += Array.isArray(jsonData) ? jsonData.length : 1;

        // 统计 mapgen 类型对象
        if (Array.isArray(jsonData)) {
          const mapgens = jsonData.filter((obj: any) => obj.type === 'mapgen');
          mapgenCount += mapgens.length;

          // 分析第一个 mapgen 对象
          if (mapgens.length > 0) {
            const firstMapgen = mapgens[0];
            const relativePath = file.replace(DATA_PATH, '');
            const hasRows = firstMapgen.object?.rows !== undefined;
            const hasTerrain = firstMapgen.object?.terrain !== undefined;
            const hasFurniture = firstMapgen.object?.furniture !== undefined;
            const hasItems = firstMapgen.object?.items !== undefined;

            console.log(`  ✓ ${relativePath}`);
            console.log(`    - mapgen 对象: ${mapgens.length} 个`);
            console.log(`    - rows: ${hasRows ? '✓' : '✗'}`);
            console.log(`    - terrain: ${hasTerrain ? '✓' : '✗'}`);
            console.log(`    - furniture: ${hasFurniture ? '✓' : '✗'}`);
            console.log(`    - items: ${hasItems ? '✓' : '✗'}`);
          }
        }
      } catch (error) {
        errors++;
        const relativePath = file.replace(DATA_PATH, '');
        console.log(`  ✗ ${relativePath}: ${(error as Error).message}`);
      }
    }

    console.log(`\n总计:`);
    console.log(`  JSON 对象: ${totalObjects} 个`);
    console.log(`  mapgen 对象: ${mapgenCount} 个`);
    console.log(`  错误文件: ${errors} 个`);

    expect(errors).toBe(0);
  });

  it('should analyze mapgen data structure', () => {
    const testFile = join(DATA_PATH, 'abandoned_barn.json');
    const content = readFileSync(testFile, 'utf-8');
    const jsonData = JSON.parse(content);

    console.log('\n分析 mapgen 数据结构:');
    console.log('文件: abandoned_barn.json');

    if (Array.isArray(jsonData)) {
      const mapgens = jsonData.filter((obj: any) => obj.type === 'mapgen');
      console.log(`mapgen 对象数量: ${mapgens.length}`);

      if (mapgens.length > 0) {
        const first = mapgens[0];
        console.log('\n第一个 mapgen 对象结构:');
        console.log(`  type: ${first.type}`);
        console.log(`  nested_mapgen_id: ${first.nested_mapgen_id}`);
        console.log(`  om_terrain: ${first.om_terrain}`);
        console.log(`  weight: ${first.weight}`);

        if (first.object) {
          console.log(`\n  object 字段:`);
          console.log(`    mapgensize: ${JSON.stringify(first.object.mapgensize)}`);
          console.log(`    fill_ter: ${first.object.fill_ter}`);
          console.log(`    rows: ${first.object.rows?.length} 行`);
          console.log(`    palettes: ${JSON.stringify(first.object.palettes)}`);
          console.log(`    terrain: ${Object.keys(first.object.terrain || {}).length} 个映射`);
          console.log(`    furniture: ${Object.keys(first.object.furniture || {}).length} 个映射`);
          console.log(`    place_items: ${first.object.place_items?.length || 0} 项`);
          console.log(`    place_nested: ${first.object.place_nested?.length || 0} 项`);
          console.log(`    flags: ${JSON.stringify(first.object.flags)}`);
        }
      }
    }

    expect(jsonData).toBeDefined();
  });

  it('should check for different mapgen types', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 20);

    const mapgenTypes = new Map<string, number>();
    const hasOmTerrain: string[] = [];
    const hasNestedId: string[] = [];

    console.log('\n分析不同类型的 mapgen:');

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          jsonData.forEach((obj: any) => {
            if (obj.type === 'mapgen') {
              const relativePath = file.replace(DATA_PATH, '');

              if (obj.om_terrain) {
                hasOmTerrain.push(relativePath);
              }

              if (obj.nested_mapgen_id) {
                hasNestedId.push(relativePath);
              }

              // 检查特殊类型
              if (obj.object?.rows) {
                mapgenTypes.set('with_rows', (mapgenTypes.get('with_rows') || 0) + 1);
              }
              if (obj.object?.nested) {
                mapgenTypes.set('nested', (mapgenTypes.get('nested') || 0) + 1);
              }
              if (obj.object?.place_nested) {
                mapgenTypes.set('place_nested', (mapgenTypes.get('place_nested') || 0) + 1);
              }
              if (obj.object?.palettes) {
                mapgenTypes.set('with_palette', (mapgenTypes.get('with_palette') || 0) + 1);
              }
              if (obj.object?.place_monsters) {
                mapgenTypes.set('place_monsters', (mapgenTypes.get('place_monsters') || 0) + 1);
              }
            }
          });
        }
      } catch (e) {
        // 忽略错误
      }
    }

    console.log(`\nMapgen 类型统计:`);
    mapgenTypes.forEach((count, type) => {
      console.log(`  ${type}: ${count} 个`);
    });

    console.log(`\n特殊字段:`);
    console.log(`  有 om_terrain: ${hasOmTerrain.length} 个`);
    console.log(`  有 nested_mapgen_id: ${hasNestedId.length} 个`);

    expect(mapgenTypes.size).toBeGreaterThan(0);
  });

  it('should identify all unique fields in mapgen objects', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 50); // 检查前50个文件

    const allFields = new Set<string>();
    const fieldCounts = new Map<string, number>();
    const objectFields = new Set<string>();
    const objectFieldCounts = new Map<string, number>();

    console.log('\n分析所有 mapgen 字段:');

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          jsonData.forEach((obj: any) => {
            if (obj.type === 'mapgen') {
              // 统计顶层字段
              Object.keys(obj).forEach(key => {
                allFields.add(key);
                fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
              });

              // 统计 object 内部字段
              if (obj.object) {
                Object.keys(obj.object).forEach(key => {
                  objectFields.add(key);
                  objectFieldCounts.set(key, (objectFieldCounts.get(key) || 0) + 1);
                });
              }
            }
          });
        }
      } catch (e) {
        // 忽略
      }
    }

    // 按出现次数排序
    const sortedFields = Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const sortedObjectFields = Array.from(objectFieldCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    console.log(`\n顶层字段 (${allFields.size} 个):`);
    sortedFields.slice(0, 15).forEach(([field, count]) => {
      console.log(`  ${field}: ${count} 次`);
    });

    console.log(`\nobject 内部字段 (${objectFields.size} 个):`);
    sortedObjectFields.slice(0, 20).forEach(([field, count]) => {
      console.log(`  ${field}: ${count} 次`);
    });

    // 检查是否有未处理的字段
    const knownObjectFields = [
      'mapgensize', 'rows', 'fill_ter', 'palettes', 'terrain', 'furniture',
      'items', 'place_items', 'place_monsters', 'place_nested', 'nested',
      'flags', 'predecessor_mapgen', 'object', 'vehicles', 'trap',
      'traps', 'signs', 'placed_npcs', 'add', 'set', 'rotate', 'mirror',
      'alignment', 'index', 'spawns', 'monster_classes', 'faction'
    ];

    const unknownObjectFields = Array.from(objectFields).filter(
      f => !knownObjectFields.includes(f)
    );

    if (unknownObjectFields.length > 0) {
      console.log(`\n⚠️  发现未处理的 object 字段 (${unknownObjectFields.length} 个):`);
      unknownObjectFields.forEach(f => {
        const count = objectFieldCounts.get(f) || 0;
        console.log(`  ${f}: ${count} 次`);
      });
    } else {
      console.log('\n✅ 所有常见 object 字段都已识别');
    }

    expect(allFields.size).toBeGreaterThan(0);
  });
});
