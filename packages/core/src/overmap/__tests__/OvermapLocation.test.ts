/**
 * OvermapLocation 单元测试
 */

import { describe, it, expect } from 'vitest';
import { OvermapLocation } from '../OvermapLocation';
import type { OvermapLocationJson } from '../types';

describe('OvermapLocation', () => {
  describe('fromJson', () => {
    it('应该从 JSON 创建 OvermapLocation', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'forest_location',
        terrains: ['forest', 'forest_thick', 'forest_water'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.id).toBe('forest_location');
      expect(location.terrains).toEqual(['forest', 'forest_thick', 'forest_water']);
    });

    it('应该支持空地形列表', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'empty_location',
        terrains: [],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.id).toBe('empty_location');
      expect(location.terrains).toEqual([]);
    });

    it('应该支持单个地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'single_terrain',
        terrains: ['road'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.terrains).toHaveLength(1);
      expect(location.terrains[0]).toBe('road');
    });
  });

  describe('hasTerrain', () => {
    it('应该检查是否包含指定地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'urban_terrain',
        terrains: ['road', 'street', 'house', 'park'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.hasTerrain('road')).toBe(true);
      expect(location.hasTerrain('street')).toBe(true);
      expect(location.hasTerrain('house')).toBe(true);
      expect(location.hasTerrain('park')).toBe(true);
      expect(location.hasTerrain('forest')).toBe(false);
    });

    it('空列表应该总是返回 false', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'empty',
        terrains: [],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.hasTerrain('any_terrain')).toBe(false);
    });
  });

  describe('getTerrainCount', () => {
    it('应该返回地形数量', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'multiple',
        terrains: ['t1', 't2', 't3', 't4', 't5'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.getTerrainCount()).toBe(5);
    });

    it('空列表应该返回 0', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'empty',
        terrains: [],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.getTerrainCount()).toBe(0);
    });
  });

  describe('getRandomTerrain', () => {
    it('应该返回随机地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'random_test',
        terrains: ['forest', 'field', 'road'],
      };

      const location = OvermapLocation.fromJson(json);

      const terrain = location.getRandomTerrain();

      expect(['forest', 'field', 'road']).toContain(terrain);
    });

    it('空列表应该返回 null', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'empty',
        terrains: [],
      };

      const location = OvermapLocation.fromJson(json);

      const terrain = location.getRandomTerrain();

      expect(terrain).toBeNull();
    });

    it('单个地形应该总是返回该地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'single',
        terrains: ['only_terrain'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.getRandomTerrain()).toBe('only_terrain');
      expect(location.getRandomTerrain()).toBe('only_terrain');
    });
  });

  describe('getAllTerrains', () => {
    it('应该返回所有地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'all_test',
        terrains: ['t1', 't2', 't3'],
      };

      const location = OvermapLocation.fromJson(json);

      expect(location.getAllTerrains()).toEqual(['t1', 't2', 't3']);
    });

    it('应该返回只读数组', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'readonly',
        terrains: ['a', 'b'],
      };

      const location = OvermapLocation.fromJson(json);
      const terrains = location.getAllTerrains();

      // 确保是只读的（实际上 TypeScript 只在编译时检查）
      expect(terrains).toBeReadOnly();
    });
  });

  describe('toJson', () => {
    it('应该序列化为 JSON', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'serializable',
        terrains: ['forest', 'field'],
      };

      const location = OvermapLocation.fromJson(json);
      const serialized = location.toJson();

      expect(serialized.type).toBe('overmap_location');
      expect(serialized.id).toBe('serializable');
      expect(serialized.terrains).toEqual(['forest', 'field']);
    });

    it('应该保持所有地形', () => {
      const json: OvermapLocationJson = {
        type: 'overmap_location',
        id: 'many_terrains',
        terrains: ['a', 'b', 'c', 'd', 'e'],
      };

      const location = OvermapLocation.fromJson(json);
      const serialized = location.toJson();

      expect(serialized.terrains).toHaveLength(5);
      expect(serialized.terrains).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
  });

  describe('工厂方法', () => {
    it('create 应该创建空位置', () => {
      const location = OvermapLocation.create('empty_id');

      expect(location.id).toBe('empty_id');
      expect(location.terrains).toEqual([]);
    });

    it('createWithTerrains 应该创建带地形的的位置', () => {
      const location = OvermapLocation.createWithTerrains('test_id', ['t1', 't2', 't3']);

      expect(location.id).toBe('test_id');
      expect(location.terrains).toEqual(['t1', 't2', 't3']);
    });
  });
});
