/**
 * OvermapSpecial 单元测试
 */

import { describe, it, expect } from 'vitest';
import { OvermapSpecial } from '../OvermapSpecial';
import type { OvermapSpecialJson, OvermapSpecialEntry, SpecialConnection } from '../types';

describe('OvermapSpecial', () => {
  const mockEntry: OvermapSpecialEntry = {
    point: [0, 0, 0],
    overmap: 'test_house',
    locations: ['forest'],
  };

  const mockConnection: SpecialConnection = {
    point: [1, 0, 0],
    terrain: 'road',
    connection: 'local_road',
  };

  describe('fromJson', () => {
    it('应该从 JSON 创建 OvermapSpecial', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'test_cabin',
        locations: ['forest', 'forest_thick'],
        occurrences: [0, 5],
        overmaps: [mockEntry],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.id).toBe('test_cabin');
      expect(special.locations).toEqual(['forest', 'forest_thick']);
      expect(special.occurrences).toEqual([0, 5]);
      expect(special.overmaps).toEqual([mockEntry]);
    });

    it('应该使用默认值', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'minimal',
        locations: [],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.subtype).toBe('fixed');
      expect(special.cityDistance).toEqual([0, -1]);
      expect(special.citySizes).toEqual([0, -1]);
      expect(special.occurrences).toEqual([0, 10]);
      expect(special.flags).toEqual(new Set());
      expect(special.rotate).toBe(true);
      expect(special.overmaps).toEqual([]);
      expect(special.connections).toEqual([]);
    });

    it('应该解析完整的 JSON', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'full_test',
        subtype: 'mutable',
        locations: ['field'],
        city_distance: [5, 50],
        city_sizes: [3, 20],
        occurrences: [1, 3],
        flags: ['GLOBALLY_UNIQUE', 'NO_ROTATE'],
        rotate: false,
        overmaps: [mockEntry],
        connections: [mockConnection],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.subtype).toBe('mutable');
      expect(special.cityDistance).toEqual([5, 50]);
      expect(special.citySizes).toEqual([3, 20]);
      expect(special.occurrences).toEqual([1, 3]);
      expect(special.flags.has('GLOBALLY_UNIQUE')).toBe(true);
      expect(special.flags.has('NO_ROTATE')).toBe(true);
      expect(special.rotate).toBe(false);
    });
  });

  describe('canRotate', () => {
    it('默认应该可以旋转', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'rotatable',
        locations: [],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.canRotate()).toBe(true);
    });

    it('rotate: false 应该禁止旋转', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'no_rotate',
        locations: [],
        rotate: false,
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.canRotate()).toBe(false);
    });

    it('NO_ROTATE 标志应该禁止旋转', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'no_rotate_flag',
        locations: [],
        flags: ['NO_ROTATE'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.canRotate()).toBe(false);
    });
  });

  describe('isGloballyUnique', () => {
    it('GLOBALLY_UNIQUE 标志应该返回 true', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'unique_lab',
        locations: [],
        flags: ['GLOBALLY_UNIQUE'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.isGloballyUnique()).toBe(true);
    });

    it('没有 GLOBALLY_UNIQUE 标志应该返回 false', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'common_house',
        locations: [],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.isGloballyUnique()).toBe(false);
    });
  });

  describe('isOvermapUnique', () => {
    it('OVERMAP_UNIQUE 标志应该返回 true', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'unique_per_overmap',
        locations: [],
        flags: ['OVERMAP_UNIQUE'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.isOvermapUnique()).toBe(true);
    });

    it('没有 OVERMAP_UNIQUE 标志应该返回 false', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'multiple_allowed',
        locations: [],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.isOvermapUnique()).toBe(false);
    });
  });

  describe('getMinCityDistance', () => {
    it('应该返回最小城市距离', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'distant_cabin',
        locations: [],
        city_distance: [10, 100],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMinCityDistance()).toBe(10);
    });
  });

  describe('getMaxCityDistance', () => {
    it('应该返回最大城市距离', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'distant_cabin',
        locations: [],
        city_distance: [10, 100],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMaxCityDistance()).toBe(100);
    });

    it('-1 应该表示无限制', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'unlimited_distance',
        locations: [],
        city_distance: [5, -1],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMaxCityDistance()).toBe(-1);
    });
  });

  describe('getMinCitySize', () => {
    it('应该返回最小城市大小', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'city_dependent',
        locations: [],
        city_sizes: [5, 20],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMinCitySize()).toBe(5);
    });
  });

  describe('getMaxCitySize', () => {
    it('应该返回最大城市大小', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'city_dependent',
        locations: [],
        city_sizes: [5, 20],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMaxCitySize()).toBe(20);
    });
  });

  describe('getMinOccurrences', () => {
    it('应该返回最小出现次数', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'multiple_cabins',
        locations: [],
        occurrences: [2, 5],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMinOccurrences()).toBe(2);
    });
  });

  describe('getMaxOccurrences', () => {
    it('应该返回最大出现次数', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'multiple_cabins',
        locations: [],
        occurrences: [2, 5],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.getMaxOccurrences()).toBe(5);
    });
  });

  describe('hasFlag', () => {
    it('应该检查标志是否存在', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'flagged_special',
        locations: [],
        flags: ['OUTDOOR', 'NATURAL'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.hasFlag('OUTDOOR')).toBe(true);
      expect(special.hasFlag('NATURAL')).toBe(true);
      expect(special.hasFlag('UNDERGROUND')).toBe(false);
    });
  });

  describe('hasLocation', () => {
    it('应该检查位置类型是否匹配', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'forest_cabin',
        locations: ['forest', 'forest_thick', 'forest_water'],
      };

      const special = OvermapSpecial.fromJson(json);

      expect(special.hasLocation('forest')).toBe(true);
      expect(special.hasLocation('forest_thick')).toBe(true);
      expect(special.hasLocation('field')).toBe(false);
    });
  });

  describe('toJson', () => {
    it('应该序列化为 JSON', () => {
      const json: OvermapSpecialJson = {
        type: 'overmap_special',
        id: 'serializable',
        locations: ['forest'],
        occurrences: [1, 3],
        flags: ['GLOBALLY_UNIQUE'],
      };

      const special = OvermapSpecial.fromJson(json);
      const serialized = special.toJson();

      expect(serialized.id).toBe('serializable');
      expect(serialized.locations).toEqual(['forest']);
      expect(serialized.occurrences).toEqual([1, 3]);
      expect(serialized.flags).toEqual(['GLOBALLY_UNIQUE']);
    });
  });
});
