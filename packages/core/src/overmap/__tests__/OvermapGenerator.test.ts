/**
 * OvermapGenerator 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OvermapGenerator } from '../OvermapGenerator';
import { OvermapBuffer } from '../OvermapBuffer';
import { OvermapSpecial } from '../OvermapSpecial';
import { OvermapConnection } from '../OvermapConnection';
import { OmTerrain } from '../OmTerrain';
import type { PointAbsOM } from '../types';

describe('OvermapGenerator', () => {
  let buffer: OvermapBuffer;
  let terrains: OmTerrain[];
  let specials: OvermapSpecial[];
  let connections: OvermapConnection[];
  let generator: OvermapGenerator;

  beforeEach(() => {
    buffer = OvermapBuffer.create();

    // 创建测试地形
    terrains = [
      OmTerrain.create({
        primaryId: 'field',
        name: 'Field',
        sym: '.',
        color: 'green',
      }),
      OmTerrain.create({
        primaryId: 'forest',
        name: 'Forest',
        sym: 'T',
        color: 'dark_green',
      }),
      OmTerrain.create({
        primaryId: 'house',
        name: 'House',
        sym: 'H',
        color: 'light_blue',
      }),
      OmTerrain.create({
        primaryId: 'rock_floor',
        name: 'Rock Floor',
        sym: '=',
        color: 'dark_gray',
      }),
      OmTerrain.create({
        primaryId: 'open_air',
        name: 'Open Air',
        sym: ' ',
        color: 'white',
      }),
    ];

    // 创建测试特殊地点
    specials = [
      OvermapSpecial.fromJson({
        type: 'overmap_special',
        id: 'test_cabin',
        locations: ['forest'],
        occurrences: [1, 3],
      }),
      OvermapSpecial.fromJson({
        type: 'overmap_special',
        id: 'unique_lab',
        locations: ['field'],
        flags: ['GLOBALLY_UNIQUE'],
      }),
    ];

    // 创建测试连接
    connections = [
      OvermapConnection.fromJson({
        type: 'overmap_connection',
        id: 'local_road',
        subtypes: [
          {
            terrain: 'road',
            locations: ['field', 'forest'],
          },
        ],
      }),
    ];

    generator = OvermapGenerator.create(buffer, terrains, specials, connections);
  });

  describe('create', () => {
    it('应该创建生成器', () => {
      expect(generator).toBeDefined();
      expect(generator.getBuffer()).toBe(buffer);
    });

    it('应该正确缓存地形定义', () => {
      const terrain = generator.getTerrain('field');
      expect(terrain).toBeDefined();
      expect(terrain?.getName()).toBe('Field');
    });

    it('应该正确缓存连接定义', () => {
      const connection = generator.getConnection('local_road');
      expect(connection).toBeDefined();
      expect(connection?.id).toBe('local_road');
    });

    it('应该获取所有特殊地点', () => {
      const allSpecials = generator.getSpecials();
      expect(allSpecials).toHaveLength(2);
    });
  });

  describe('generate', () => {
    it('应该生成基础 overmap', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      expect(overmap).toBeDefined();
      expect(overmap.localPos).toEqual(globalPos);
      expect(overmap.layers.length).toBe(21);
    });

    it('应该填充基础地形', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      // 地面层 (z=1) 应该是 field
      expect(overmap.getTerrain({ x: 0, y: 0, z: 1 })).toBe('field');
      expect(overmap.getTerrain({ x: 90, y: 90, z: 1 })).toBe('field');
      expect(overmap.getTerrain({ x: 179, y: 179, z: 1 })).toBe('field');
    });

    it('应该正确处理不同 z 层的地形', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      // 地下 (z=0) 应该是 rock_floor
      expect(overmap.getTerrain({ x: 90, y: 90, z: 0 })).toBe('rock_floor');

      // 地面 (z=1) 应该是 field
      expect(overmap.getTerrain({ x: 90, y: 90, z: 1 })).toBe('field');

      // 空中 (z>=2) 应该是 open_air
      expect(overmap.getTerrain({ x: 90, y: 90, z: 2 })).toBe('open_air');
      expect(overmap.getTerrain({ x: 90, y: 90, z: 10 })).toBe('open_air');
    });

    it('应该放置城市', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      expect(overmap.cities.length).toBeGreaterThan(0);
      expect(overmap.cities[0].name).toBe('Generated City');
    });

    it('城市应该在中心位置', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      const city = overmap.cities[0];
      expect(city.pos.x).toBe(90); // OMAPX / 2
      expect(city.pos.y).toBe(90); // OMAPY / 2
    });

    it('应该在城市内放置建筑', () => {
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      const overmap = generator.generate(globalPos);

      // 检查城市区域内有建筑
      let houseCount = 0;
      for (let y = 86; y <= 94; y++) {
        for (let x = 86; x <= 94; x++) {
          if (overmap.getTerrain({ x, y, z: 1 }) === 'house') {
            houseCount++;
          }
        }
      }

      expect(houseCount).toBeGreaterThan(0);
    });
  });

  describe('findValidLocationForSpecial', () => {
    it('应该找到适合特殊地点的位置', () => {
      // 先生成一个 overmap 并放置森林
      const globalPos: PointAbsOM = { x: 0, y: 0 };
      let overmap = generator.generate(globalPos);

      // 手动添加一些森林地形
      overmap = overmap.setTerrain({ x: 50, y: 50, z: 0 }, 'forest');
      overmap = overmap.setTerrain({ x: 51, y: 51, z: 0 }, 'forest');

      // 更新 buffer
      const updatedBuffer = buffer.addOvermap(overmap);
      const updatedGenerator = OvermapGenerator.create(updatedBuffer, terrains, specials, connections);

      const special = specials[0]; // test_cabin 需要 forest
      const position = updatedGenerator.findValidLocationForSpecial(special);

      expect(position).toBeDefined();
      // 由于我们只设置了两个位置，返回的应该是其中之一
      if (position) {
        const terrain = overmap.getTerrain({ x: position.x, y: position.y, z: 0 });
        expect(terrain).toBe('forest');
      }
    });

    it('没有合适位置时应该返回 null', () => {
      const special = OvermapSpecial.fromJson({
        type: 'overmap_special',
        id: 'water_special',
        locations: ['deep_water'],
      });

      const position = generator.findValidLocationForSpecial(special);

      expect(position).toBeNull();
    });
  });

  describe('getTerrain', () => {
    it('应该获取地形定义', () => {
      const terrain = generator.getTerrain('forest');

      expect(terrain).toBeDefined();
      expect(terrain?.getPrimaryId()).toBe('forest');
      expect(terrain?.getName()).toBe('Forest');
    });

    it('不存在的地形应该返回 undefined', () => {
      const terrain = generator.getTerrain('nonexistent');

      expect(terrain).toBeUndefined();
    });
  });

  describe('getConnection', () => {
    it('应该获取连接定义', () => {
      const connection = generator.getConnection('local_road');

      expect(connection).toBeDefined();
      expect(connection?.id).toBe('local_road');
    });

    it('不存在的连接应该返回 undefined', () => {
      const connection = generator.getConnection('nonexistent');

      expect(connection).toBeUndefined();
    });
  });

  describe('getBuffer', () => {
    it('应该返回 buffer', () => {
      const returnedBuffer = generator.getBuffer();

      expect(returnedBuffer).toBe(buffer);
    });
  });

  describe('getSpecials', () => {
    it('应该返回所有特殊地点', () => {
      const allSpecials = generator.getSpecials();

      expect(allSpecials).toHaveLength(2);
      expect(allSpecials[0].id).toBe('test_cabin');
      expect(allSpecials[1].id).toBe('unique_lab');
    });
  });

  describe('生成不同位置的 overmap', () => {
    it('应该为不同全局位置生成独立的 overmap', () => {
      const overmap1 = generator.generate({ x: 0, y: 0 });
      const overmap2 = generator.generate({ x: 1, y: 0 });

      expect(overmap1.localPos).toEqual({ x: 0, y: 0 });
      expect(overmap2.localPos).toEqual({ x: 1, y: 0 });
      expect(overmap1).not.toBe(overmap2);
    });

    it('生成的 overmap 应该被缓存', () => {
      const pos: PointAbsOM = { x: 5, y: 10 };

      generator.generate(pos);

      expect(buffer.has(pos)).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的特殊地点列表', () => {
      const emptyGenerator = OvermapGenerator.create(buffer, terrains, [], connections);

      expect(emptyGenerator.getSpecials()).toHaveLength(0);
    });

    it('应该处理空的连接列表', () => {
      const emptyGenerator = OvermapGenerator.create(buffer, terrains, specials, []);

      expect(emptyGenerator.getConnection('local_road')).toBeUndefined();
    });

    it('应该处理空的地形列表', () => {
      const emptyGenerator = OvermapGenerator.create(buffer, [], specials, connections);

      expect(emptyGenerator.getTerrain('field')).toBeUndefined();
    });
  });
});
