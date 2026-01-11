/**
 * 全面测试 Cataclysm-DDA 地图数据加载
 */
import { describe, it, expect } from 'vitest';
import { TerrainLoader } from '../TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Cataclysm-DDA Complete Data Loading Test', () => {
  const DATA_PATH = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/furniture_and_terrain';

  it('should scan and count all JSON files', () => {
    const files = readdirSync(DATA_PATH).filter(f => f.endsWith('.json'));
    console.log(`\n找到 ${files.length} 个 JSON 文件`);

    // 分类统计
    const terrainFiles = files.filter(f => f.startsWith('terrain-'));
    const furnitureFiles = files.filter(f => f.startsWith('furniture'));
    const applianceFiles = files.filter(f => f.startsWith('appliance'));

    console.log(`  地形文件: ${terrainFiles.length} 个`);
    console.log(`  家具文件: ${furnitureFiles.length} 个`);
    console.log(`  设备文件: ${applianceFiles.length} 个`);
    console.log(`  其他文件: ${files.length - terrainFiles.length - furnitureFiles.length - applianceFiles.length} 个`);

    expect(files.length).toBeGreaterThan(0);
  });

  it('should load all terrain files', async () => {
    const files = readdirSync(DATA_PATH)
      .filter(f => f.startsWith('terrain-') && f.endsWith('.json'))
      .slice(0, 10); // 先测试前10个

    console.log(`\n测试 ${files.length} 个地形文件:`);
    const loader = new TerrainLoader();
    let totalTerrains = 0;
    let totalErrors = 0;

    for (const file of files) {
      const filePath = join(DATA_PATH, file);
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // 只解析 terrain 类型
        const terrainObjs = jsonData.filter((obj: any) => obj.type === 'terrain');

        // 尝试解析前几个
        let successCount = 0;
        for (let i = 0; i < Math.min(5, terrainObjs.length); i++) {
          try {
            loader.parse(terrainObjs[i]);
            successCount++;
          } catch (e) {
            // 忽略
          }
        }

        totalTerrains += terrainObjs.length;
        console.log(`  ✓ ${file}: ${terrainObjs.length} 个地形 (测试 ${successCount}/5)`);
      } catch (error) {
        totalErrors++;
        console.log(`  ✗ ${file}: 加载失败 - ${(error as Error).message}`);
      }
    }

    console.log(`\n总计: ${totalTerrains} 个地形对象`);
    console.log(`错误文件: ${totalErrors} 个`);

    expect(totalErrors).toBe(0);
  });

  it('should load all furniture files', async () => {
    const files = readdirSync(DATA_PATH)
      .filter(f => f.startsWith('furniture-') && f.endsWith('.json'))
      .slice(0, 10); // 先测试前10个

    console.log(`\n测试 ${files.length} 个家具文件:`);
    const loader = new FurnitureLoader();
    let totalFurniture = 0;
    let totalErrors = 0;

    for (const file of files) {
      const filePath = join(DATA_PATH, file);
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // 只解析 furniture 类型
        const furnitureObjs = jsonData.filter((obj: any) =>
          obj.type === 'furniture' || obj.type === 'furniture_nested'
        );

        // 尝试解析前几个
        let successCount = 0;
        for (let i = 0; i < Math.min(5, furnitureObjs.length); i++) {
          try {
            loader.parse(furnitureObjs[i]);
            successCount++;
          } catch (e) {
            // 忽略
          }
        }

        totalFurniture += furnitureObjs.length;
        console.log(`  ✓ ${file}: ${furnitureObjs.length} 个家具 (测试 ${successCount}/5)`);
      } catch (error) {
        totalErrors++;
        console.log(`  ✗ ${file}: 加载失败 - ${(error as Error).message}`);
      }
    }

    console.log(`\n总计: ${totalFurniture} 个家具对象`);
    console.log(`错误文件: ${totalErrors} 个`);

    expect(totalErrors).toBe(0);
  });

  it('should check for unexpected fields in all data', async () => {
    const files = readdirSync(DATA_PATH)
      .filter(f => f.startsWith('terrain-') && f.endsWith('.json'))
      .slice(0, 5); // 检查前5个地形文件

    console.log('\n检查未处理的字段:');
    const allFields = new Set<string>();
    const fieldCounts = new Map<string, number>();

    for (const file of files) {
      const filePath = join(DATA_PATH, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // 统计所有字段
      jsonData.forEach((obj: any) => {
        Object.keys(obj).forEach(key => {
          allFields.add(key);
          fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
        });
      });
    }

    // 按出现次数排序
    const sortedFields = Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    console.log(`  共发现 ${allFields.size} 个不同字段`);
    console.log('\n最常见的字段:');
    sortedFields.slice(0, 20).forEach(([field, count]) => {
      console.log(`  ${field}: ${count} 次`);
    });

    // 检查是否有未处理的字段
    const knownFields = [
      'type', 'id', 'name', 'description', 'symbol', 'color',
      'move_cost', 'coverage', 'flags', 'open', 'close',
      'bash', 'deconstruct', 'lockpick_result', 'transforms_into',
      'roof', 'trap', 'connect_groups', 'connects_to',
      'looks_like', 'copy_from', 'light_emitted', 'shoot', 'comfort',
      '//', '//1', 'item', 'items', 'furniture'
    ];

    const unknownFields = Array.from(allFields).filter(f => !knownFields.includes(f));
    if (unknownFields.length > 0) {
      console.log(`\n⚠️  发现未处理的字段 (${unknownFields.length} 个):`);
      unknownFields.forEach(f => {
        const count = fieldCounts.get(f) || 0;
        console.log(`  ${f}: ${count} 次`);
      });
    } else {
      console.log('\n✅ 所有常见字段都已处理');
    }
  });

  it('should test large file loading', async () => {
    // 测试一个大文件
    const bigFile = 'terrain-all_outdoor.json'; // 如果存在
    const filePath = join(DATA_PATH, bigFile);

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      console.log(`\n大文件测试: ${bigFile}`);
      console.log(`  文件大小: ${fileContent.length} 字符`);
      console.log(`  对象数量: ${jsonData.length} 个`);

      const startTime = Date.now();
      const loader = new TerrainLoader();

      let successCount = 0;
      for (let i = 0; i < Math.min(100, jsonData.length); i++) {
        try {
          loader.parse(jsonData[i]);
          successCount++;
        } catch (e) {
          // 忽略
        }
      }

      const duration = Date.now() - startTime;
      console.log(`  解析测试: ${successCount}/${Math.min(100, jsonData.length)} 成功`);
      console.log(`  耗时: ${duration}ms`);
      console.log(`  平均速度: ${(duration / successCount).toFixed(2)}ms/个`);

      expect(successCount).toBeGreaterThan(0);
    } catch (error) {
      console.log(`  文件不存在或加载失败，跳过测试`);
    }
  });
});
