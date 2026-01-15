/**
 * City 单元测试
 */

import { describe, it, expect } from 'vitest';
import { City } from '../City';

describe('City', () => {
  describe('create', () => {
    it('应该创建城市', () => {
      const city = City.create({
        pos: { x: 90, y: 90 },
        size: 10,
        name: 'Test City',
      });

      expect(city.pos).toEqual({ x: 90, y: 90 });
      expect(city.size).toBe(10);
      expect(city.name).toBe('Test City');
    });

    it('应该使用默认名称', () => {
      const city = City.fromPositionSize(90, 90, 10);

      expect(city.name).toBe('City');
    });
  });

  describe('fromPositionSize', () => {
    it('应该从坐标和大小创建', () => {
      const city = City.fromPositionSize(100, 100, 15, 'Big City');

      expect(city.pos).toEqual({ x: 100, y: 100 });
      expect(city.size).toBe(15);
      expect(city.name).toBe('Big City');
    });
  });

  describe('getRadius', () => {
    it('应该计算城市半径', () => {
      const city = City.fromPositionSize(90, 90, 10);

      expect(city.getRadius()).toBe(5);
    });

    it('奇数大小应该向下取整', () => {
      const city = City.fromPositionSize(90, 90, 11);

      expect(city.getRadius()).toBe(5);
    });
  });

  describe('contains', () => {
    it('应该检查点是否在城市内', () => {
      const city = City.fromPositionSize(100, 100, 10);

      expect(city.contains(100, 100)).toBe(true); // 中心
      expect(city.contains(105, 105)).toBe(true); // 边界内
      expect(city.contains(110, 110)).toBe(true); // 边界上
      expect(city.contains(111, 111)).toBe(false); // 边界外
    });
  });

  describe('isInBounds', () => {
    it('应该检查点是否在城市边界内', () => {
      const city = City.fromPositionSize(100, 100, 10);

      const halfSize = city.size / 2;

      expect(city.isInBounds(100, 100)).toBe(true); // 中心
      expect(city.isInBounds(100 - halfSize, 100)).toBe(true); // 左边界
      expect(city.isInBounds(100 + halfSize, 100)).toBe(true); // 右边界
      expect(city.isInBounds(100, 100 - halfSize)).toBe(true); // 上边界
      expect(city.isInBounds(100, 100 + halfSize)).toBe(true); // 下边界
      expect(city.isInBounds(100 + halfSize + 1, 100)).toBe(false);
    });
  });

  describe('distanceTo', () => {
    it('应该计算到城市的距离', () => {
      const city = City.fromPositionSize(100, 100, 10);

      expect(city.distanceTo(100, 100)).toBe(0); // 中心
      expect(city.distanceTo(110, 100)).toBe(10); // 10 格
      expect(city.distanceTo(100, 110)).toBe(10);
    });
  });

  describe('overlaps', () => {
    it('应该检查两个城市是否重叠', () => {
      const city1 = City.fromPositionSize(90, 90, 10);
      const city2 = City.fromPositionSize(100, 100, 10);

      expect(city1.overlaps(city2)).toBe(true);
    });

    it('不重叠的城市应该返回 false', () => {
      const city1 = City.fromPositionSize(50, 50, 5);
      const city2 = City.fromPositionSize(150, 150, 5);

      expect(city1.overlaps(city2)).toBe(false);
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const city = City.fromPositionSize(90, 90, 10, 'Test City');

      const json = city.toJson();

      expect(json.pos).toEqual({ x: 90, y: 90 });
      expect(json.size).toBe(10);
      expect(json.name).toBe('Test City');
    });

    it('应该从 JSON 创建', () => {
      const json = {
        pos: { x: 90, y: 90 },
        size: 10,
        name: 'Test City',
      };

      const city = City.fromJson(json);

      expect(city.pos).toEqual({ x: 90, y: 90 });
      expect(city.size).toBe(10);
      expect(city.name).toBe('Test City');
    });
  });
});
