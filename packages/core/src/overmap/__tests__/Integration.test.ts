/**
 * Overmap 系统集成测试
 *
 * 测试整个 Overmap 系统的组件协作
 */

import { describe, it, expect } from 'vitest';
import { Overmap } from '../Overmap';
import { OvermapLayer } from '../OvermapLayer';
import { City } from '../City';
import { OvermapSpecial } from '../OvermapSpecial';
import { OvermapConnection } from '../OvermapConnection';
import { OvermapLocation } from '../OvermapLocation';
import { OvermapBuffer } from '../OvermapBuffer';
import { OvermapGenerator } from '../OvermapGenerator';
import { OmTerrain } from '../OmTerrain';
import { OmVisionLevel, OMAPX, OMAPY, OVERMAP_LAYERS } from '../types';

describe('Overmap 系统集成测试', () => {
  describe('Overmap 和 OvermapLayer', () => {
    it('应该正确管理多层地形', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });

      // 设置不同层的地形
      // z=0: 地下, z=1: 地面, z=2+: 空中
      overmap = overmap.setTerrain({ x: 10, y: 20, z: 1 }, 'forest');
      overmap = overmap.setTerrain({ x: 10, y: 20, z: 2 }, 'open_air');
      overmap = overmap.setTerrain({ x: 10, y: 20, z: 0 }, 'rock_floor');

      expect(overmap.getTerrain({ x: 10, y: 20, z: 1 })).toBe('forest');
      expect(overmap.getTerrain({ x: 10, y: 20, z: 2 })).toBe('open_air');
      expect(overmap.getTerrain({ x: 10, y: 20, z: 0 })).toBe('rock_floor');
    });

    it('应该正确处理视野系统', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });

      // 探索区域
      overmap = overmap.setSeen({ x: 10, y: 10, z: 0 }, OmVisionLevel.VAGUE);
      overmap = overmap.setSeen({ x: 11, y: 11, z: 0 }, OmVisionLevel.FULL);

      expect(overmap.hasSeenLevel({ x: 10, y: 10, z: 0 }, OmVisionLevel.VAGUE)).toBe(true);
      expect(overmap.hasSeenLevel({ x: 11, y: 11, z: 0 }, OmVisionLevel.FULL)).toBe(true);
      expect(overmap.hasSeenLevel({ x: 10, y: 10, z: 0 }, OmVisionLevel.FULL)).toBe(false);
    });

    it('应该正确处理笔记', () => {
      const note = {
        text: 'Interesting location',
        position: { x: 50, y: 50, z: 0 },
        dangerous: true,
        dangerRadius: 10,
      };

      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.addNote(note);

      expect(overmap.hasNote({ x: 50, y: 50, z: 0 })).toBe(true);
      expect(overmap.hasNote({ x: 60, y: 60, z: 0 })).toBe(false);
    });
  });

  describe('Overmap 和 City', () => {
    it('应该正确管理城市', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      const city = City.fromPositionSize(90, 90, 10, 'Test City');

      overmap = overmap.addCity(city);

      expect(overmap.cities).toHaveLength(1);
      expect(overmap.isInCity({ x: 90, y: 90, z: 0 })).toBe(true);
      expect(overmap.isInCity({ x: 50, y: 50, z: 0 })).toBe(false);
    });

    it('应该找到最近的城市', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      const city1 = City.fromPositionSize(50, 50, 5, 'City 1');
      const city2 = City.fromPositionSize(150, 150, 5, 'City 2');

      overmap = overmap.addCity(city1).addCity(city2);

      const nearest = overmap.getNearestCity({ x: 60, y: 60, z: 0 });
      expect(nearest).toEqual(city1);

      const nearest2 = overmap.getNearestCity({ x: 140, y: 140, z: 0 });
      expect(nearest2).toEqual(city2);
    });
  });

  describe('Overmap 序列化', () => {
    it('应该完整序列化和反序列化', () => {
      let overmap = Overmap.create({ x: 5, y: 10 });
      overmap = overmap.setTerrain({ x: 10, y: 20, z: 0 }, 'forest');
      overmap = overmap.setSeen({ x: 10, y: 20, z: 0 }, OmVisionLevel.FULL);
      overmap = overmap.addNote({
        text: 'Test note',
        position: { x: 50, y: 50, z: 0 },
        dangerous: false,
        dangerRadius: 0,
      });
      overmap = overmap.addCity(City.fromPositionSize(90, 90, 10, 'Test City'));

      const json = overmap.toJson();
      const restored = Overmap.fromJson(json);

      expect(restored.localPos).toEqual(overmap.localPos);
      expect(restored.getTerrain({ x: 10, y: 20, z: 0 })).toBe('forest');
      expect(restored.getSeen({ x: 10, y: 20, z: 0 })).toBe(OmVisionLevel.FULL);
      expect(restored.hasNote({ x: 50, y: 50, z: 0 })).toBe(true);
      expect(restored.cities).toHaveLength(1);
      expect(restored.cities[0].name).toBe('Test City');
    });
  });

  describe('OvermapBuffer 集成', () => {
    it('应该管理多个 Overmap', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 1 }));

      expect(buffer.size()).toBe(3);
      expect(buffer.has({ x: 0, y: 0 })).toBe(true);
      expect(buffer.has({ x: 1, y: 0 })).toBe(true);
      expect(buffer.has({ x: 0, y: 1 })).toBe(true);
    });

    it('应该正确序列化和反序列化', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.cacheTerrain(
        OmTerrain.create({
          primaryId: 'test',
          name: 'Test',
          sym: 'T',
          color: 'red',
        })
      );

      const json = buffer.toJson();
      const restored = OvermapBuffer.fromJson(json);

      expect(restored.size()).toBe(1);
      expect(restored.has({ x: 0, y: 0 })).toBe(true);
      expect(restored.getTerrain('test')).toBeDefined();
    });
  });

  describe('OvermapGenerator 集成', () => {
    it('应该生成完整的 Overmap', () => {
      const buffer = OvermapBuffer.create();
      const terrains = [
        OmTerrain.create({
          primaryId: 'field',
          name: 'Field',
          sym: '.',
          color: 'green',
        }),
        OmTerrain.create({
          primaryId: 'house',
          name: 'House',
          sym: 'H',
          color: 'light_blue',
        }),
      ];
      const specials = [
        OvermapSpecial.fromJson({
          type: 'overmap_special',
          id: 'test_cabin',
          locations: ['field'],
        }),
      ];
      const connections = [
        OvermapConnection.fromJson({
          type: 'overmap_connection',
          id: 'local_road',
          subtypes: [
            {
              terrain: 'road',
              locations: ['field'],
            },
          ],
        }),
      ];

      const generator = OvermapGenerator.create(buffer, terrains, specials, connections);
      const overmap = generator.generate({ x: 0, y: 0 });

      expect(overmap.localPos).toEqual({ x: 0, y: 0 });
      expect(overmap.layers).toHaveLength(OVERMAP_LAYERS);
      expect(overmap.getTerrain({ x: 0, y: 0, z: 0 })).toBe('field');
    });

    it('生成的 Overmap 应该被缓存', () => {
      const buffer = OvermapBuffer.create();
      const terrains = [
        OmTerrain.create({
          primaryId: 'field',
          name: 'Field',
          sym: '.',
          color: 'green',
        }),
      ];
      const generator = OvermapGenerator.create(buffer, terrains, [], []);

      const pos = { x: 5, y: 10 };
      generator.generate(pos);

      expect(buffer.has(pos)).toBe(true);
    });
  });

  describe('OvermapSpecial 集成', () => {
    it('应该正确解析和使用特殊地点', () => {
      const json = {
        type: 'overmap_special' as const,
        id: 'test_lab',
        locations: ['forest', 'forest_thick'],
        city_distance: [10, 100],
        city_sizes: [5, 20],
        occurrences: [0, 1],
        flags: ['GLOBALLY_UNIQUE', 'UNDERGROUND'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.id).toBe('test_lab');
      expect(special.hasLocation('forest')).toBe(true);
      expect(special.isGloballyUnique()).toBe(true);
      expect(special.hasFlag('UNDERGROUND')).toBe(true);
      expect(special.getMinCityDistance()).toBe(10);
      expect(special.getMaxCityDistance()).toBe(100);
    });
  });

  describe('OvermapConnection 集成', () => {
    it('应该正确处理连接定义', () => {
      const json = {
        type: 'overmap_connection' as const,
        id: 'sewer_system',
        subtypes: [
          {
            terrain: 'sewer_tunnel',
            locations: ['sewer'],
            basic_cost: 20,
            flags: ['UNDERGROUND'],
          },
          {
            terrain: 'sewer_exit',
            locations: ['sewer_exit'],
            basic_cost: 5,
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.id).toBe('sewer_system');
      expect(connection.getTerrainForLocation('sewer')).toBe('sewer_tunnel');
      expect(connection.getTerrainForLocation('sewer_exit')).toBe('sewer_exit');
      expect(connection.getCostForLocation('sewer')).toBe(20);
      expect(connection.hasFlag('sewer', 'UNDERGROUND')).toBe(true);
    });
  });

  describe('OvermapLocation 集成', () => {
    it('应该正确管理位置类型', () => {
      const json = {
        type: 'overmap_location' as const,
        id: 'urban_terrain',
        terrains: ['road', 'street', 'house', 'shop', 'park'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.id).toBe('urban_terrain');
      expect(location.hasTerrain('road')).toBe(true);
      expect(location.hasTerrain('forest')).toBe(false);
      expect(location.getTerrainCount()).toBe(5);
    });
  });

  describe('完整工作流', () => {
    it('应该支持完整的生成和查询流程', () => {
      // 1. 创建 buffer 和 generator
      let buffer = OvermapBuffer.create();
      const terrains = [
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
      ];

      const specials = [
        OvermapSpecial.fromJson({
          type: 'overmap_special',
          id: 'cabin',
          locations: ['forest'],
        }),
      ];

      const connections = [
        OvermapConnection.fromJson({
          type: 'overmap_connection',
          id: 'dirt_road',
          subtypes: [
            {
              terrain: 'dirt_road',
              locations: ['field', 'forest'],
            },
          ],
        }),
      ];

      const generator = OvermapGenerator.create(buffer, terrains, specials, connections);

      // 2. 生成 overmap
      const overmap = generator.generate({ x: 0, y: 0 });

      // 3. 验证基础属性
      expect(overmap.localPos).toEqual({ x: 0, y: 0 });
      expect(overmap.layers).toHaveLength(OVERMAP_LAYERS);

      // 4. 添加城市
      const city = City.fromPositionSize(90, 90, 8, 'My City');
      let updated = overmap.addCity(city);
      expect(updated.isInCity({ x: 90, y: 90, z: 0 })).toBe(true);

      // 5. 添加笔记
      updated = updated.addNote({
        text: 'Zombie spawn',
        position: { x: 50, y: 50, z: 0 },
        dangerous: true,
        dangerRadius: 5,
      });
      expect(updated.hasNote({ x: 50, y: 50, z: 0 })).toBe(true);

      // 6. 更新视野
      updated = updated.setSeen({ x: 50, y: 50, z: 0 }, OmVisionLevel.DETAILS);
      expect(updated.getSeen({ x: 50, y: 50, z: 0 })).toBe(OmVisionLevel.DETAILS);

      // 7. 序列化并验证
      const json = updated.toJson();
      const restored = Overmap.fromJson(json);

      expect(restored.localPos).toEqual({ x: 0, y: 0 });
      expect(restored.cities).toHaveLength(1);
      expect(restored.cities[0].name).toBe('My City');
      expect(restored.hasNote({ x: 50, y: 50, z: 0 })).toBe(true);
    });
  });

  describe('边界和尺寸', () => {
    it('应该正确处理边界', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      // 测试四个角
      expect(overmap.inBounds({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(overmap.inBounds({ x: OMAPX - 1, y: OMAPY - 1, z: 0 })).toBe(true);
      expect(overmap.inBounds({ x: 0, y: 0, z: OVERMAP_LAYERS - 1 })).toBe(true);

      // 测试边界外
      expect(overmap.inBounds({ x: -1, y: 0, z: 0 })).toBe(false);
      expect(overmap.inBounds({ x: OMAPX, y: 0, z: 0 })).toBe(false);
      expect(overmap.inBounds({ x: 0, y: 0, z: OVERMAP_LAYERS })).toBe(false);
    });

    it('应该支持 clearance 参数', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.inBounds({ x: 0, y: 0, z: 0 }, 1)).toBe(false);
      expect(overmap.inBounds({ x: 5, y: 5, z: 0 }, 5)).toBe(true);
      expect(overmap.inBounds({ x: 90, y: 90, z: 0 }, 50)).toBe(true);
    });
  });

  describe('不可变性', () => {
    it('Overmap 操作应该返回新实例', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.setTerrain({ x: 10, y: 10, z: 0 }, 'forest');

      expect(overmap).not.toBe(updated);
      expect(overmap.getTerrain({ x: 10, y: 10, z: 0 })).toBe('');
      expect(updated.getTerrain({ x: 10, y: 10, z: 0 })).toBe('forest');
    });

    it('OvermapBuffer 操作应该返回新实例', () => {
      let buffer = OvermapBuffer.create();
      const updated = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));

      expect(buffer.size()).toBe(0);
      expect(updated.size()).toBe(1);
    });
  });

  describe('错误处理', () => {
    it('应该忽略边界外的操作', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.setTerrain({ x: 200, y: 200, z: 0 }, 'forest');

      expect(overmap).toBe(updated); // 没有变化，返回相同实例
    });

    it('应该处理空的数据结构', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.getNearestCity({ x: 50, y: 50, z: 0 })).toBeNull();
      expect(overmap.findNotesInRange({ x: 50, y: 50, z: 0 }, 10)).toEqual([]);
      expect(overmap.findTerrain('forest')).toEqual([]);
    });
  });
});
