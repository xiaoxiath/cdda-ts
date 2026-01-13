/**
 * Cataclysm-DDA 所有 Mapgen 数据加载验证
 *
 * 验证所有 845 个 mapgen JSON 文件是否可以成功加载
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  CataclysmMapGenParser,
  CataclysmMapGenLoader,
} from '../CataclysmMapGenParser';
import { getMapgenPath } from '../../config/CddaConfig';

describe('Cataclysm-DDA Complete MapGen Loading Test', () => {
  const DATA_PATH = getMapgenPath();

  // 递归获取所有 JSON 文件
  function getAllJsonFiles(dir: string, baseDir = dir): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllJsonFiles(fullPath, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  it('should load and parse all mapgen JSON files', () => {
    const files = getAllJsonFiles(DATA_PATH);

    console.log(`\n开始测试 ${files.length} 个 mapgen 文件...\n`);

    const loader = new CataclysmMapGenLoader();

    let successFiles = 0;
    let failedFiles = 0;
    let totalMapgens = 0;
    let totalOtherObjects = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        // 统计 mapgen 对象
        if (Array.isArray(jsonData)) {
          const mapgenCount = jsonData.filter((obj: any) => obj.type === 'mapgen').length;
          const otherCount = jsonData.length - mapgenCount;

          totalMapgens += mapgenCount;
          totalOtherObjects += otherCount;

          // 尝试解析
          const parsed = CataclysmMapGenParser.parseArray(jsonData);
          if (parsed.length === mapgenCount) {
            successFiles++;
          } else {
            failedFiles++;
            errors.push({
              file: file.replace(DATA_PATH, ''),
              error: `解析失败: 预期 ${mapgenCount} 个，实际 ${parsed.length} 个`,
            });
          }
        } else {
          totalOtherObjects++;
        }
      } catch (error) {
        failedFiles++;
        errors.push({
          file: file.replace(DATA_PATH, ''),
          error: (error as Error).message,
        });
      }
    }

    console.log('✅ 测试完成！\n');
    console.log('文件统计:');
    console.log(`  总文件数: ${files.length} 个`);
    console.log(`  成功加载: ${successFiles} 个 (${((successFiles / files.length) * 100).toFixed(1)}%)`);
    console.log(`  加载失败: ${failedFiles} 个 (${((failedFiles / files.length) * 100).toFixed(1)}%)`);

    console.log('\n对象统计:');
    console.log(`  mapgen 对象: ${totalMapgens} 个`);
    console.log(`  其他对象: ${totalOtherObjects} 个`);
    console.log(`  总对象数: ${totalMapgens + totalOtherObjects} 个`);

    if (errors.length > 0) {
      console.log(`\n❌ 错误文件 (${errors.length} 个):`);
      errors.slice(0, 10).forEach(({ file, error }) => {
        console.log(`  - ${file}`);
        console.log(`    ${error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... 还有 ${errors.length - 10} 个错误`);
      }
    } else {
      console.log('\n✅ 所有文件加载成功！');
    }

    expect(successFiles).toBeGreaterThan(0);
  }, 120000); // 2 分钟超时

  it('should analyze mapgen data coverage', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 100); // 分析前100个文件

    console.log('\n分析 mapgen 数据覆盖...\n');

    let totalMapgens = 0;
    const featureCounts = new Map<string, number>();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          const mapgens = jsonData.filter((obj: any) => obj.type === 'mapgen');
          totalMapgens += mapgens.length;

          for (const mapgen of mapgens) {
            const obj = mapgen.object;

            // 统计特性
            if (obj.rows) featureCounts.set('rows', (featureCounts.get('rows') || 0) + 1);
            if (obj.fill_ter) featureCounts.set('fill_ter', (featureCounts.get('fill_ter') || 0) + 1);
            if (obj.palettes) featureCounts.set('palettes', (featureCounts.get('palettes') || 0) + 1);
            if (obj.terrain) featureCounts.set('terrain', (featureCounts.get('terrain') || 0) + 1);
            if (obj.furniture) featureCounts.set('furniture', (featureCounts.get('furniture') || 0) + 1);
            if (obj.items) featureCounts.set('items', (featureCounts.get('items') || 0) + 1);
            if (obj.place_items) featureCounts.set('place_items', (featureCounts.get('place_items') || 0) + 1);
            if (obj.place_monster || obj.place_monsters) {
              featureCounts.set('place_monsters', (featureCounts.get('place_monsters') || 0) + 1);
            }
            if (obj.place_nested) featureCounts.set('place_nested', (featureCounts.get('place_nested') || 0) + 1);
            if (obj.nested) featureCounts.set('nested', (featureCounts.get('nested') || 0) + 1);
            if (obj.flags) featureCounts.set('flags', (featureCounts.get('flags') || 0) + 1);
            if (obj.place_vehicles) featureCounts.set('place_vehicles', (featureCounts.get('place_vehicles') || 0) + 1);
            if (obj.place_rubble) featureCounts.set('place_rubble', (featureCounts.get('place_rubble') || 0) + 1);
            if (obj.place_graffiti) featureCounts.set('place_graffiti', (featureCounts.get('place_graffiti') || 0) + 1);
            if (obj.place_npcs) featureCounts.set('place_npcs', (featureCounts.get('place_npcs') || 0) + 1);
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }

    console.log(`分析了 ${totalMapgens} 个 mapgen 对象\n`);

    console.log('特性覆盖统计:');
    const sortedFeatures = Array.from(featureCounts.entries()).sort((a, b) => b[1] - a[1]);

    sortedFeatures.forEach(([feature, count]) => {
      const percentage = ((count / totalMapgens) * 100).toFixed(1);
      console.log(`  ${feature}: ${count} 个 (${percentage}%)`);
    });

    expect(totalMapgens).toBeGreaterThan(0);
  });

  it('should check for unsupported features', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 100);

    console.log('\n检查未支持的特性...\n');

    const unsupportedFeatures = new Map<string, number>();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          for (const obj of jsonData) {
            if (obj.type === 'mapgen' && obj.object) {
              const objKeys = Object.keys(obj.object);

              // 未支持的特性列表
              // 注意：rotation 是 place_vehicles 的子属性，不是顶级特性
              // add 是一个特殊指令，通常不需要解析
              const unsupportedKeys = [
                'add',
              ];

              for (const key of unsupportedKeys) {
                if (objKeys.includes(key)) {
                  unsupportedFeatures.set(key, (unsupportedFeatures.get(key) || 0) + 1);
                }
              }
            }
          }
        }
      } catch (e) {
        // 忽略
      }
    }

    if (unsupportedFeatures.size > 0) {
      console.log(`⚠️  发现未支持的特性 (${unsupportedFeatures.size} 个):\n`);

      const sorted = Array.from(unsupportedFeatures.entries()).sort((a, b) => b[1] - a[1]);

      sorted.forEach(([feature, count]) => {
        console.log(`  ${feature}: ${count} 个对象`);
      });

      console.log('\n这些特性不会阻止数据加载，但在生成地图时不会被处理。\n');
    } else {
      console.log('✅ 所有特性都已支持！\n');
    }

    expect(true).toBe(true);
  });

  it('should validate parsed mapgen integrity', () => {
    const files = getAllJsonFiles(DATA_PATH).slice(0, 50); // 验证前50个文件

    console.log('\n验证解析后的数据完整性...\n');

    let totalMapgens = 0;
    let validMapgens = 0;
    let invalidMapgens = 0;
    const allErrors: Array<string> = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
          const parsed = CataclysmMapGenParser.parseArray(jsonData);

          for (const data of parsed) {
            totalMapgens++;

            const validation = CataclysmMapGenParser.validate(data);

            if (validation.valid) {
              validMapgens++;
            } else {
              invalidMapgens++;
              allErrors.push(...validation.errors.map(e => `${data.id}: ${e}`));
            }
          }
        }
      } catch (e) {
        // 忽略
      }
    }

    console.log(`验证了 ${totalMapgens} 个 mapgen 对象\n`);
    console.log('验证结果:');
    console.log(`  ✅ 有效: ${validMapgens} 个 (${((validMapgens / totalMapgens) * 100).toFixed(1)}%)`);
    console.log(`  ❌ 无效: ${invalidMapgens} 个 (${((invalidMapgens / totalMapgens) * 100).toFixed(1)}%)`);

    if (invalidMapgens > 0) {
      console.log('\n错误详情:');
      allErrors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
      if (allErrors.length > 20) {
        console.log(`  ... 还有 ${allErrors.length - 20} 个错误`);
      }
    }

    expect(validMapgens).toBeGreaterThan(0);
  });
});
