import { describe, it, expect } from 'vitest';
import { MapGenJson } from '../MapGenJson';
import { Tripoint } from '../../coordinates/Tripoint';
import { GameMap } from '../../map/GameMap';

// 创建标准上下文
function createContext(
  position = new Tripoint({ x: 0, y: 0, z: 0 })
): import('../MapGenFunction').MapGenContext {
  return {
    position,
    seed: 42,
    map: new GameMap(),
    params: {},
    depth: 0,
  };
}

describe('MapGenJson', () => {
  describe('creation', () => {
    it('should create from JSON config', () => {
      const config = {
        id: 'test_json',
        name: 'Test JSON Generator',
        method: 'fill' as const,
        fill: {
          terrain: 'grass',
        },
      };

      const generator = MapGenJson.fromJson(config);

      expect(generator.id).toBe('test_json');
      expect(generator.name).toBe('Test JSON Generator');
    });

    it('should have default values', () => {
      const generator = new MapGenJson();

      expect(generator.id).toBe('json_default');
      expect(generator.name).toBe('Default JSON Generator');
    });
  });

  describe('fill method', () => {
    it('should generate uniform terrain', () => {
      const config = {
        id: 'grass_fill',
        name: 'Grass Fill',
        method: 'fill' as const,
        fill: {
          terrain: 'grass',
        },
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(1);
    });

    it('should handle missing terrain gracefully', () => {
      const config = {
        id: 'missing_terrain',
        name: 'Missing Terrain',
        method: 'fill' as const,
        fill: {
          terrain: 'missing',
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();
      const result = generator.generate(context);

      // 应该回退到 t_null (0)
      expect(result.getTile(0, 0).terrain).toBe(0);
    });
  });

  describe('rows method', () => {
    it('should generate based on rows config', () => {
      const config = {
        id: 'rows_test',
        name: 'Rows Test',
        method: 'rows' as const,
        rows: [
          {
            row: 0,
            columns: [
              { column: 0, terrain: 'grass' },
              { column: 1, terrain: 'dirt' },
            ],
          },
        ],
        data: {
          palette: {
            terrains: { grass: 1, dirt: 5 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();
      const result = generator.generate(context);

      expect(result.getTile(0, 0).terrain).toBe(1);
      expect(result.getTile(1, 0).terrain).toBe(5);
    });

    it('should handle empty rows', () => {
      const config = {
        id: 'empty_rows',
        name: 'Empty Rows',
        method: 'rows' as const,
        rows: [],
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(0);
    });
  });

  describe('conditions', () => {
    it('should check z-level condition', () => {
      const config = {
        id: 'z_condition',
        name: 'Z Condition',
        method: 'fill' as const,
        fill: { terrain: 'grass' },
        conditions: {
          z: 0,
        },
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);

      // 匹配的 z 层级
      const matchingContext = createContext(new Tripoint({ x: 0, y: 0, z: 0 }));
      expect(generator.canApply(matchingContext)).toBe(true);

      // 不匹配的 z 层级
      const nonMatchingContext = createContext(
        new Tripoint({ x: 0, y: 0, z: 1 })
      );
      expect(generator.canApply(nonMatchingContext)).toBe(false);
    });

    it('should apply without conditions', () => {
      const config = {
        id: 'no_conditions',
        name: 'No Conditions',
        method: 'fill' as const,
        fill: { terrain: 'grass' },
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext(new Tripoint({ x: 0, y: 0, z: 99 }));

      expect(generator.canApply(context)).toBe(true);
    });
  });

  describe('weight', () => {
    it('should use config weight', () => {
      const config = {
        id: 'weighted',
        name: 'Weighted',
        method: 'fill' as const,
        fill: { terrain: 'grass' },
        weight: 100,
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();

      expect(generator.getWeight(context)).toBe(100);
    });

    it('should use default weight without config', () => {
      const config = {
        id: 'no_weight',
        name: 'No Weight',
        method: 'fill' as const,
        fill: { terrain: 'grass' },
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();

      expect(generator.getWeight(context)).toBe(1);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const config = {
        id: 'clone_test',
        name: 'Clone Test',
        method: 'fill' as const,
        fill: { terrain: 'grass' },
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const original = MapGenJson.fromJson(config);
      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.name).toBe(original.name);
      expect(cloned).not.toBe(original);
    });
  });

  describe('unknown method', () => {
    it('should fallback to fill for unknown method', () => {
      const config = {
        id: 'unknown_method',
        name: 'Unknown Method',
        method: 'unknown' as any,
        data: {
          palette: {
            terrains: { grass: 1 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      };

      const generator = MapGenJson.fromJson(config);
      const context = createContext();
      const result = generator.generate(context);

      // 应该回退到 fill，但没有 fill 配置所以返回空
      expect(result.getTile(0, 0).terrain).toBe(0);
    });
  });
});
