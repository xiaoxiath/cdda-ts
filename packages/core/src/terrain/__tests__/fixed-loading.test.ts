/**
 * 验证数据加载修复
 */
import { describe, it, expect } from 'vitest';
import { TerrainLoader } from '../TerrainLoader';
import { TerrainParser } from '../TerrainParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Fixed Data Loading Validation', () => {
  const DATA_PATH = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/furniture_and_terrain';

  it('should load terrain-floors-indoor.json with fixed parser', () => {
    const filePath = join(DATA_PATH, 'terrain-floors-indoor.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    console.log(`\n文件包含 ${jsonData.length} 个对象`);

    const parser = new TerrainParser();
    const loader = new TerrainLoader();

    // 尝试解析所有地形
    const errors: any[] = [];
    const success: any[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const terrain = parser.parse(jsonData[i]);
        success.push(terrain);

        // 验证关键字段
        if (i === 0) {
          console.log('\n第一个地形解析结果:');
          console.log(`  ID: ${terrain.id}`);
          console.log(`  Name: ${terrain.name}`);
          console.log(`  Symbol: ${terrain.symbol}`);
          console.log(`  Color: ${terrain.color}`);
          console.log(`  MoveCost: ${terrain.moveCost}`);
          console.log(`  Flags: ${terrain.flags.size} 个`);
          console.log(`  ConnectsTo: ${Array.from(terrain.connectsTo.keys()).join(', ')}`);
          console.log(`  LightEmitted: ${terrain.lightEmitted ?? 'undefined'}`);
          console.log(`  LooksLike: ${terrain.looksLike ?? 'undefined'}`);
          console.log(`  Bash.strMinSupported: ${terrain.bash?.strMinSupported ?? 'undefined'}`);
          console.log(`  Bash.soundVol: ${terrain.bash?.soundVol ?? 'undefined'}`);
        }
      } catch (error) {
        errors.push({ index: i, id: jsonData[i].id, error: (error as Error).message });
      }
    }

    console.log(`\n解析结果:`);
    console.log(`  ✅ 成功: ${success.length} 个`);
    console.log(`  ❌ 失败: ${errors.length} 个`);

    if (errors.length > 0) {
      console.log('\n失败详情:');
      errors.slice(0, 5).forEach(e => {
        console.log(`  [${e.index}] ${e.id}: ${e.error}`);
      });
    }

    // 验证特定地形
    const concreteFloor = success.find(t => t.name === 'concrete floor');
    expect(concreteFloor).toBeDefined();
    expect(concreteFloor?.connectsTo.has('CONCRETE')).toBe(true);

    // 验证有光照的地形
    const lightFloor = success.find(t => t.lightEmitted !== undefined);
    expect(lightFloor).toBeDefined();
    expect(lightFloor?.lightEmitted).toBe(120);

    // 所有都应该成功
    expect(errors.length).toBe(0);
    expect(success.length).toBe(jsonData.length);
  });

  it('should handle string connects_to correctly', () => {
    const parser = new TerrainParser();

    // 测试字符串类型的 connects_to
    const testTerrain = {
      type: 'terrain',
      id: 't_test',
      name: 'test',
      symbol: '.',
      color: 'white',
      connects_to: 'CONCRETE',  // 字符串
    };

    const terrain = parser.parse(testTerrain);
    expect(terrain.connectsTo.has('CONCRETE')).toBe(true);
    expect(terrain.connectsTo.size).toBe(1);
  });

  it('should handle array connects_to correctly', () => {
    const parser = new TerrainParser();

    // 测试数组类型的 connects_to
    const testTerrain = {
      type: 'terrain',
      id: 't_test',
      name: 'test',
      symbol: '.',
      color: 'white',
      connects_to: ['CONCRETE', 'WOOD'],  // 数组
    };

    const terrain = parser.parse(testTerrain);
    expect(terrain.connectsTo.has('CONCRETE')).toBe(true);
    expect(terrain.connectsTo.has('WOOD')).toBe(true);
    expect(terrain.connectsTo.size).toBe(2);
  });

  it('should parse bash extended fields', () => {
    const parser = new TerrainParser();

    const testTerrain = {
      type: 'terrain',
      id: 't_test',
      name: 'test',
      symbol: '#',
      color: 'gray',
      bash: {
        sound: 'crash',
        str_min: 10,
        str_max: 20,
        str_min_supported: 15,
        sound_vol: 12,
        sound_fail: 'thud',
        sound_fail_vol: 8,
      },
    };

    const terrain = parser.parse(testTerrain);
    expect(terrain.bash).toBeDefined();
    expect(terrain.bash?.strMinSupported).toBe(15);
    expect(terrain.bash?.soundVol).toBe(12);
    expect(terrain.bash?.soundFail).toBe('thud');
    expect(terrain.bash?.soundFailVol).toBe(8);
  });

  it('should parse new optional fields', () => {
    const parser = new TerrainParser();

    const testTerrain = {
      type: 'terrain',
      id: 't_test',
      name: 'test',
      symbol: '.',
      color: 'white',
      looks_like: 't_floor',
      light_emitted: 100,
      comfort: 2,
      shoot: {
        chance_to_hit: 0,
        destroy_damage: [2, 8],
      },
    };

    const terrain = parser.parse(testTerrain);
    expect(terrain.looksLike).toBe('t_floor');
    expect(terrain.lightEmitted).toBe(100);
    expect(terrain.comfort).toBe(2);
    expect(terrain.shoot).toBeDefined();
    expect(terrain.shoot?.chanceToHit).toBe(0);
  });
});
