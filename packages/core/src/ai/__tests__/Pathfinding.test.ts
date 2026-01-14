/**
 * Pathfinding 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Pathfinding } from '../Pathfinding';
import { Tripoint } from '../../coordinates/Tripoint';
import type { GameMap } from '../../map/GameMap';
import type { PathfindingRequest } from '../types';

describe('Pathfinding', () => {
  let pathfinding: Pathfinding;
  let mockMap: GameMap;

  beforeEach(() => {
    // 创建模拟地图
    mockMap = {
      creatures: new Map(),
      grid: new Map(),
    } as any;

    pathfinding = Pathfinding.create(mockMap, 100, 5000);
  });

  describe('create', () => {
    it('should create pathfinding system', () => {
      expect(pathfinding.map).toBe(mockMap);
      expect(pathfinding.maxCacheSize).toBe(100);
      expect(pathfinding.cacheTimeout).toBe(5000);
      expect(pathfinding.cache.size).toBe(0);
    });

    it('should use default values', () => {
      const defaultPathfinding = Pathfinding.create(mockMap);

      expect(defaultPathfinding.maxCacheSize).toBe(100);
      expect(defaultPathfinding.cacheTimeout).toBe(5000);
    });
  });

  describe('heuristic', () => {
    it('should calculate Manhattan distance', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 10, y: 5, z: 2 });

      // 直接调用私有方法的测试通过 findPath 间接验证
      const result = pathfinding.findPath({
        start: from,
        end: to,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      // 应该能找到路径
      expect(result.success).toBe(true);
    });

    it('should return zero for same position', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });

      const result = pathfinding.findPath({
        start: pos,
        end: pos,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(result.success).toBe(true);
      expect(result.path).toHaveLength(1);
      expect(result.cost).toBe(0);
    });
  });

  describe('isPassable', () => {
    it('should check if position is passable', () => {
      const pos = new Tripoint({ x: 50, y: 50, z: 0 });

      // 在没有障碍物的情况下应该可通过
      expect(pathfinding.isPassable(pos, true)).toBe(true);
    });

    it('should respect creature blocking', () => {
      const pos = new Tripoint({ x: 50, y: 50, z: 0 });

      // 添加一个生物
      mockMap.creatures.set('creature_1', {
        id: 'creature_1',
        position: pos,
      } as any);

      // 忽略生物时应该可通过
      expect(pathfinding.isPassable(pos, true)).toBe(true);

      // 不忽略生物时应该不可通过
      expect(pathfinding.isPassable(pos, false)).toBe(false);
    });

    it('should check bounds', () => {
      const outOfBounds = new Tripoint({ x: -1, y: -1, z: 0 });

      expect(pathfinding.isPassable(outOfBounds, true)).toBe(false);
    });

    it('should check z-axis bounds', () => {
      const belowMin = new Tripoint({ x: 50, y: 50, z: -11 });
      const aboveMax = new Tripoint({ x: 50, y: 50, z: 11 });

      expect(pathfinding.isPassable(belowMin, true)).toBe(false);
      expect(pathfinding.isPassable(aboveMax, true)).toBe(false);
    });
  });

  describe('getMovementCost', () => {
    it('should calculate basic movement cost', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 1, y: 0, z: 0 });

      const cost = pathfinding.getMovementCost(from, to);
      expect(cost).toBe(1.0);
    });

    it('should apply diagonal penalty', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 1, y: 1, z: 0 });

      const cost = pathfinding.getMovementCost(from, to);
      expect(cost).toBeCloseTo(1.414, 2);
    });

    it('should apply z-axis penalty', () => {
      const from = new Tripoint({ x: 0, y: 0, z: 0 });
      const to = new Tripoint({ x: 1, y: 0, z: 1 });

      const cost = pathfinding.getMovementCost(from, to);
      expect(cost).toBe(2.0);
    });
  });

  describe('getNeighbors', () => {
    it('should return 4-directional neighbors', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });

      const neighbors = pathfinding.getNeighbors(pos, false);

      // 4 方向 + 2 垂直方向
      expect(neighbors).toHaveLength(6);
    });

    it('should return 8-directional neighbors with diagonal', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });

      const neighbors = pathfinding.getNeighbors(pos, true);

      // 8 方向 + 2 垂直方向
      expect(neighbors).toHaveLength(10);
    });

    it('should include z-axis neighbors', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });

      const neighbors = pathfinding.getNeighbors(pos, false);

      // 检查是否包含上下方向
      const hasAbove = neighbors.some(n => n.z === 1);
      const hasBelow = neighbors.some(n => n.z === -1);

      expect(hasAbove).toBe(true);
      expect(hasBelow).toBe(true);
    });
  });

  describe('findPath', () => {
    it('should find straight path', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 5, y: 0, z: 0 });

      const result = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[0]).toEqual(start);
      expect(result.path[result.path.length - 1]).toEqual(end);
    });

    it('should find diagonal path when allowed', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 3, y: 3, z: 0 });

      const result = pathfinding.findPath({
        start,
        end,
        allowDiagonal: true,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(result.success).toBe(true);
      // 对角线路径应该更短
      expect(result.path.length).toBeLessThanOrEqual(4);
    });

    it('should fail when max cost exceeded', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 50, y: 50, z: 0 });

      const result = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 10,
        ignoreCreatures: true,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('超过最大代价限制');
    });

    it('should fail when start is blocked', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 5, y: 0, z: 0 });

      // 添加生物阻挡起点
      mockMap.creatures.set('blocker', {
        id: 'blocker',
        position: start,
      } as any);

      const result = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: false,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('起点不可通过');
    });

    it('should fail when end is blocked', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 5, y: 0, z: 0 });

      // 添加生物阻挡终点
      mockMap.creatures.set('blocker', {
        id: 'blocker',
        position: end,
      } as any);

      const result = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: false,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('终点不可通过');
    });

    it('should cache successful paths', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 5, y: 0, z: 0 });

      // 第一次查找
      const result1 = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(result1.success).toBe(true);

      // 第二次查找应该使用缓存
      const result2 = pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(result2.success).toBe(true);
      expect(result2.path).toEqual(result1.path);
    });
  });

  describe('path utilities', () => {
    it('should calculate path cost', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
      ];

      const cost = pathfinding.calculatePathCost(path);
      expect(cost).toBe(2.0);
    });

    it('should get path length', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
      ];

      expect(pathfinding.getPathLength(path)).toBe(3);
    });

    it('should get next position in path', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
      ];

      const next1 = pathfinding.getNextPosition(path, 0);
      const next2 = pathfinding.getNextPosition(path, 1);

      expect(next1).toEqual(new Tripoint({ x: 1, y: 0, z: 0 }));
      expect(next2).toEqual(new Tripoint({ x: 2, y: 0, z: 0 }));
    });

    it('should return null for invalid index', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
      ];

      const next = pathfinding.getNextPosition(path, 5);
      expect(next).toBeNull();
    });
  });

  describe('optimizePath', () => {
    it('should optimize path by removing redundant nodes', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
        new Tripoint({ x: 3, y: 0, z: 0 }),
      ];

      const optimized = pathfinding.optimizePath(path);

      // 应该减少节点数量
      expect(optimized.length).toBeLessThan(path.length);
    });

    it('should keep path endpoints', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
      ];

      const optimized = pathfinding.optimizePath(path);

      expect(optimized[0]).toEqual(path[0]);
      expect(optimized[optimized.length - 1]).toEqual(path[path.length - 1]);
    });
  });

  describe('smoothPath', () => {
    it('should smooth path', () => {
      const path: any[] = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 1, y: 0, z: 0 }),
        new Tripoint({ x: 2, y: 0, z: 0 }),
      ];

      const smoothed = pathfinding.smoothPath(path);

      // 平滑后的路径应该有效
      expect(smoothed.length).toBeGreaterThan(0);
      expect(smoothed[0]).toEqual(path[0]);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      const start = new Tripoint({ x: 0, y: 0, z: 0 });
      const end = new Tripoint({ x: 5, y: 0, z: 0 });

      pathfinding.findPath({
        start,
        end,
        allowDiagonal: false,
        maxCost: 1000,
        ignoreCreatures: true,
      });

      expect(pathfinding.cache.size).toBeGreaterThan(0);

      const cleared = pathfinding.clearCache();
      expect(cleared.cache.size).toBe(0);
    });
  });

  describe('toJson', () => {
    it('should convert to JSON', () => {
      const json = pathfinding.toJson();

      expect(json.maxCacheSize).toBe(100);
      expect(json.cacheTimeout).toBe(5000);
      expect(json.cacheSize).toBe(0);
      expect(json.cache).toBeDefined();
    });
  });
});
