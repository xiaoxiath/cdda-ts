/**
 * OvermapConnection 单元测试
 */

import { describe, it, expect } from 'vitest';
import { OvermapConnection } from '../OvermapConnection';
import type { OvermapConnectionJson, ConnectionSubtype } from '../types';

describe('OvermapConnection', () => {
  const subtype1: ConnectionSubtype = {
    terrain: 'road',
    locations: ['road', 'street'],
    basic_cost: 10,
    flags: ['LINEAR'],
  };

  const subtype2: ConnectionSubtype = {
    terrain: 'sewer_tunnel',
    locations: ['sewer'],
    basic_cost: 20,
    flags: ['UNDERGROUND'],
  };

  describe('fromJson', () => {
    it('应该从 JSON 创建 OvermapConnection', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'local_road',
        subtypes: [subtype1],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.id).toBe('local_road');
      expect(connection.subtypes).toHaveLength(1);
      expect(connection.subtypes[0]).toEqual(subtype1);
    });

    it('应该支持多个子类型', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'multi_connection',
        subtypes: [subtype1, subtype2],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.subtypes).toHaveLength(2);
      expect(connection.subtypes[0].terrain).toBe('road');
      expect(connection.subtypes[1].terrain).toBe('sewer_tunnel');
    });
  });

  describe('getTerrainForLocation', () => {
    it('应该返回匹配位置的地形', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'test_road',
        subtypes: [
          {
            terrain: 'main_road',
            locations: ['road', 'street'],
          },
          {
            terrain: 'dirt_path',
            locations: ['field', 'forest'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.getTerrainForLocation('road')).toBe('main_road');
      expect(connection.getTerrainForLocation('street')).toBe('main_road');
      expect(connection.getTerrainForLocation('field')).toBe('dirt_path');
    });

    it('没有匹配时应该返回 null', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'limited_road',
        subtypes: [
          {
            terrain: 'paved_road',
            locations: ['road'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.getTerrainForLocation('forest')).toBeNull();
      expect(connection.getTerrainForLocation('water')).toBeNull();
    });
  });

  describe('getCostForLocation', () => {
    it('应该返回匹配位置的代价', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'costed_road',
        subtypes: [
          {
            terrain: 'paved_road',
            locations: ['road'],
            basic_cost: 5,
          },
          {
            terrain: 'dirt_path',
            locations: ['field'],
            basic_cost: 15,
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.getCostForLocation('road')).toBe(5);
      expect(connection.getCostForLocation('field')).toBe(15);
    });

    it('没有指定代价时应该返回 0', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'no_cost',
        subtypes: [
          {
            terrain: 'free_path',
            locations: ['path'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.getCostForLocation('path')).toBe(0);
    });

    it('没有匹配时应该返回 0', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'limited',
        subtypes: [
          {
            terrain: 'road',
            locations: ['road'],
            basic_cost: 10,
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.getCostForLocation('forest')).toBe(0);
    });
  });

  describe('getSubtypeForLocation', () => {
    it('应该返回匹配位置的子类型', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'test_connection',
        subtypes: [subtype1, subtype2],
      };

      const connection = OvermapConnection.fromJson(json);

      const result = connection.getSubtypeForLocation('road');

      expect(result).toEqual(subtype1);
    });

    it('没有匹配时应该返回 null', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'test_connection',
        subtypes: [subtype1],
      };

      const connection = OvermapConnection.fromJson(json);

      const result = connection.getSubtypeForLocation('water');

      expect(result).toBeNull();
    });
  });

  describe('hasFlag', () => {
    it('应该检查子类型是否包含标志', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'flagged_connection',
        subtypes: [
          {
            terrain: 'tunnel',
            locations: ['underground'],
            flags: ['LINEAR', 'UNDERGROUND', 'NO_ZOMBIES'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.hasFlag('underground', 'LINEAR')).toBe(true);
      expect(connection.hasFlag('underground', 'UNDERGROUND')).toBe(true);
      expect(connection.hasFlag('underground', 'NO_ZOMBIES')).toBe(true);
      expect(connection.hasFlag('underground', 'OUTDOOR')).toBe(false);
    });

    it('没有标志时应该返回 false', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'no_flags',
        subtypes: [
          {
            terrain: 'road',
            locations: ['road'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.hasFlag('road', 'ANY_FLAG')).toBe(false);
    });
  });

  describe('supportsLocation', () => {
    it('应该检查连接是否支持指定位置', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'multi_terrain',
        subtypes: [
          {
            terrain: 'road',
            locations: ['road', 'street', 'highway'],
          },
          {
            terrain: 'dirt',
            locations: ['field', 'forest'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);

      expect(connection.supportsLocation('road')).toBe(true);
      expect(connection.supportsLocation('street')).toBe(true);
      expect(connection.supportsLocation('field')).toBe(true);
      expect(connection.supportsLocation('forest')).toBe(true);
      expect(connection.supportsLocation('water')).toBe(false);
    });
  });

  describe('toJson', () => {
    it('应该序列化为 JSON', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'serializable',
        subtypes: [subtype1, subtype2],
      };

      const connection = OvermapConnection.fromJson(json);
      const serialized = connection.toJson();

      expect(serialized.type).toBe('overmap_connection');
      expect(serialized.id).toBe('serializable');
      expect(serialized.subtypes).toHaveLength(2);
      expect(serialized.subtypes[0]).toEqual(subtype1);
      expect(serialized.subtypes[1]).toEqual(subtype2);
    });

    it('应该保持所有属性', () => {
      const json: OvermapConnectionJson = {
        type: 'overmap_connection',
        id: 'full_connection',
        subtypes: [
          {
            terrain: 'road',
            locations: ['road'],
            basic_cost: 100,
            flags: ['LINEAR', 'SAFE'],
          },
        ],
      };

      const connection = OvermapConnection.fromJson(json);
      const serialized = connection.toJson();

      expect(serialized.subtypes[0].basic_cost).toBe(100);
      expect(serialized.subtypes[0].flags).toEqual(['LINEAR', 'SAFE']);
    });
  });
});
