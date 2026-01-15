/**
 * OvermapBuffer 单元测试
 */

import { describe, it, expect } from 'vitest';
import { OvermapBuffer } from '../OvermapBuffer';
import { Overmap } from '../Overmap';
import { City } from '../City';
import { OmTerrain } from '../OmTerrain';
import type { PointAbsOM } from '../types';

describe('OvermapBuffer', () => {
  describe('create', () => {
    it('应该创建空的 buffer', () => {
      const buffer = OvermapBuffer.create();

      expect(buffer.size()).toBe(0);
      expect(buffer.has({ x: 0, y: 0 })).toBe(false);
    });

    it('应该用初始数据创建', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const buffer = OvermapBuffer.create().addOvermap(overmap);

      expect(buffer.size()).toBe(1);
      expect(buffer.has({ x: 0, y: 0 })).toBe(true);
    });
  });

  describe('addOvermap', () => {
    it('应该添加 overmap', () => {
      const buffer = OvermapBuffer.create();
      const overmap = Overmap.create({ x: 5, y: 10 });

      const updated = buffer.addOvermap(overmap);

      expect(updated.size()).toBe(1);
      expect(updated.has({ x: 5, y: 10 })).toBe(true);
      expect(buffer.size()).toBe(0); // 原实例不变
    });

    it('应该替换已存在的 overmap', () => {
      const buffer = OvermapBuffer.create();
      const overmap1 = Overmap.create({ x: 0, y: 0 });
      const overmap2 = Overmap.create({ x: 0, y: 0 }).setTerrain({ x: 10, y: 10, z: 0 }, 'forest');

      const updated1 = buffer.addOvermap(overmap1);
      const updated2 = updated1.addOvermap(overmap2);

      expect(updated2.size()).toBe(1); // 不是 2
      expect(updated2.get({ x: 0, y: 0 })?.getTerrain({ x: 10, y: 10, z: 0 })).toBe('forest');
    });

    it('应该添加多个 overmap', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 1 }));

      expect(buffer.size()).toBe(3);
      expect(buffer.has({ x: 0, y: 0 })).toBe(true);
      expect(buffer.has({ x: 1, y: 0 })).toBe(true);
      expect(buffer.has({ x: 0, y: 1 })).toBe(true);
    });
  });

  describe('getOrCreate', () => {
    it('应该获取已存在的 overmap', () => {
      const buffer = OvermapBuffer.create();
      const overmap = Overmap.create({ x: 5, y: 10 });
      const updated = buffer.addOvermap(overmap);

      const retrieved = updated.getOrCreate({ x: 5, y: 10 });

      expect(retrieved.localPos).toEqual({ x: 5, y: 10 });
      expect(updated.size()).toBe(1);
    });

    it('应该创建新的 overmap', () => {
      const buffer = OvermapBuffer.create();

      const created = buffer.getOrCreate({ x: 5, y: 10 });

      expect(created.localPos).toEqual({ x: 5, y: 10 });
      expect(created).toBeInstanceOf(Overmap);
    });

    it('应该缓存创建的 overmap', () => {
      const buffer = OvermapBuffer.create();

      const om1 = buffer.getOrCreate({ x: 5, y: 10 });
      const om2 = buffer.getOrCreate({ x: 5, y: 10 });

      // 由于 Overmap 是不可变的，每次返回新实例
      expect(om1.localPos).toEqual(om2.localPos);
    });
  });

  describe('get', () => {
    it('应该返回已存在的 overmap', () => {
      const buffer = OvermapBuffer.create();
      const overmap = Overmap.create({ x: 5, y: 10 });
      const updated = buffer.addOvermap(overmap);

      const retrieved = updated.get({ x: 5, y: 10 });

      expect(retrieved).toBeDefined();
      expect(retrieved?.localPos).toEqual({ x: 5, y: 10 });
    });

    it('不存在时应该返回 undefined', () => {
      const buffer = OvermapBuffer.create();

      const retrieved = buffer.get({ x: 5, y: 10 });

      expect(retrieved).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('应该移除 overmap', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));

      const updated = buffer.remove({ x: 0, y: 0 });

      expect(updated.size()).toBe(1);
      expect(updated.has({ x: 0, y: 0 })).toBe(false);
      expect(updated.has({ x: 1, y: 0 })).toBe(true);
    });

    it('移除不存在的 overmap 应该无效果', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));

      const updated = buffer.remove({ x: 5, y: 10 });

      expect(updated.size()).toBe(1);
    });
  });

  describe('has', () => {
    it('应该检查 overmap 是否存在', () => {
      let buffer = OvermapBuffer.create();
      expect(buffer.has({ x: 0, y: 0 })).toBe(false);

      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      expect(buffer.has({ x: 0, y: 0 })).toBe(true);
      expect(buffer.has({ x: 1, y: 0 })).toBe(false);
    });
  });

  describe('size', () => {
    it('应该返回 overmap 数量', () => {
      let buffer = OvermapBuffer.create();
      expect(buffer.size()).toBe(0);

      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      expect(buffer.size()).toBe(1);

      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 2, y: 0 }));
      expect(buffer.size()).toBe(3);

      buffer = buffer.remove({ x: 1, y: 0 });
      expect(buffer.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('应该清空所有 overmap', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));

      expect(buffer.size()).toBe(2);

      const cleared = buffer.clear();

      expect(cleared.size()).toBe(0);
      expect(cleared.has({ x: 0, y: 0 })).toBe(false);
    });
  });

  describe('getAllPositions', () => {
    it('应该返回所有 overmap 的位置', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 1 }));

      const positions = buffer.getAllPositions();

      expect(positions).toHaveLength(3);
      expect(positions).toContainEqual({ x: 0, y: 0 });
      expect(positions).toContainEqual({ x: 1, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: 1 });
    });

    it('空的 buffer 应该返回空数组', () => {
      const buffer = OvermapBuffer.create();

      const positions = buffer.getAllPositions();

      expect(positions).toEqual([]);
    });
  });

  describe('地形缓存', () => {
    it('应该缓存地形定义', () => {
      const buffer = OvermapBuffer.create();
      const terrain = OmTerrain.create({
        primaryId: 'test_terrain',
        name: 'Test Terrain',
        sym: 'T',
        color: 'green',
      });

      const updated = buffer.cacheTerrain(terrain);

      expect(updated.getTerrain('test_terrain')).toBe(terrain);
    });

    it('应该返回 undefined 对于不存在的地形', () => {
      const buffer = OvermapBuffer.create();

      expect(buffer.getTerrain('nonexistent')).toBeUndefined();
    });

    it('应该替换已缓存的地形', () => {
      let buffer = OvermapBuffer.create();
      const terrain1 = OmTerrain.create({
        primaryId: 'test_terrain',
        name: 'Terrain 1',
        sym: 'T',
        color: 'green',
      });
      const terrain2 = OmTerrain.create({
        primaryId: 'test_terrain',
        name: 'Terrain 2',
        sym: 'X',
        color: 'red',
      });

      buffer = buffer.cacheTerrain(terrain1);
      buffer = buffer.cacheTerrain(terrain2);

      expect(buffer.getTerrain('test_terrain')?.name).toBe('Terrain 2');
    });
  });

  describe('toJson', () => {
    it('应该序列化为 JSON', () => {
      let buffer = OvermapBuffer.create();
      const overmap = Overmap.create({ x: 5, y: 10 }).setTerrain({ x: 0, y: 0, z: 0 }, 'forest');
      buffer = buffer.addOvermap(overmap);

      const json = buffer.toJson();

      expect(json.overmaps).toHaveLength(1);
      expect(json.overmaps[0].key).toBe('5,10');
      expect(json.overmaps[0].overmap.localPos).toEqual({ x: 5, y: 10 });
    });

    it('应该序列化地形缓存', () => {
      let buffer = OvermapBuffer.create();
      const terrain = OmTerrain.create({
        primaryId: 'cached_terrain',
        name: 'Cached',
        sym: 'C',
        color: 'blue',
      });
      buffer = buffer.cacheTerrain(terrain);

      const json = buffer.toJson();

      expect(json.terrains).toHaveLength(1);
      expect(json.terrains[0].id).toBe('cached_terrain');
    });
  });

  describe('fromJson', () => {
    it('应该从 JSON 创建 buffer', () => {
      const json = {
        overmaps: [
          {
            localPos: { x: 5, y: 10 },
            layers: [],
            cities: [],
            radios: [],
            connections: [],
            specials: [],
          },
        ],
        terrains: [],
      };

      const buffer = OvermapBuffer.fromJson(json);

      expect(buffer.size()).toBe(1);
      expect(buffer.has({ x: 5, y: 10 })).toBe(true);
    });
  });

  describe('getNeighbors', () => {
    it('应该返回相邻的 overmap 位置', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: -1, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 1 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: -1 }));

      const neighbors = buffer.getNeighbors({ x: 0, y: 0 });

      expect(neighbors).toHaveLength(4);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: -1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
      expect(neighbors).toContainEqual({ x: 0, y: -1 });
    });

    it('应该只返回已加载的邻居', () => {
      let buffer = OvermapBuffer.create();
      buffer = buffer.addOvermap(Overmap.create({ x: 0, y: 0 }));
      buffer = buffer.addOvermap(Overmap.create({ x: 1, y: 0 }));
      // 只加载了一个邻居

      const neighbors = buffer.getNeighbors({ x: 0, y: 0 });

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toEqual({ x: 1, y: 0 });
    });
  });
});
