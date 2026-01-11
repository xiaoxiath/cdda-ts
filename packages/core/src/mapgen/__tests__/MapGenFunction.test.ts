import { describe, it, expect } from 'vitest';
import {
  MapGenFunction,
  MapGenContext,
  createMapGenResult,
} from '../MapGenFunction';
import { Submap } from '../../map/Submap';
import { Tripoint } from '../../coordinates/Tripoint';
import { GameMap } from '../../map/GameMap';

// 测试用的简单生成器
class TestGenerator extends MapGenFunction {
  readonly id = 'test';
  readonly name = 'Test Generator';

  constructor(private terrainId: number = 5) {
    super();
  }

  generate(context: MapGenContext): Submap {
    return Submap.createUniform(this.terrainId);
  }

  getWeight(): number {
    return 10;
  }
}

describe('MapGenFunction', () => {
  describe('base class', () => {
    it('should create generator instance', () => {
      const generator = new TestGenerator();

      expect(generator.id).toBe('test');
      expect(generator.name).toBe('Test Generator');
    });

    it('should generate submap', () => {
      const generator = new TestGenerator(10);
      const context: MapGenContext = {
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        seed: 42,
        map: new GameMap(),
        params: {},
        depth: 0,
      };

      const result = generator.generate(context);

      expect(result).toBeInstanceOf(Submap);
      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(10);
    });

    it('should return canApply true by default', () => {
      const generator = new TestGenerator();
      const context: MapGenContext = {
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        seed: 42,
        map: new GameMap(),
        params: {},
        depth: 0,
      };

      expect(generator.canApply(context)).toBe(true);
    });

    it('should return default weight', () => {
      const generator = new TestGenerator();
      const context: MapGenContext = {
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        seed: 42,
        map: new GameMap(),
        params: {},
        depth: 0,
      };

      expect(generator.getWeight(context)).toBe(10);
    });

    it('should clone generator', () => {
      const generator = new TestGenerator(5);
      const cloned = generator.clone();

      expect(cloned).toBeInstanceOf(TestGenerator);
      expect(cloned.id).toBe(generator.id);
      expect(cloned.name).toBe(generator.name);
    });
  });

  describe('createMapGenResult', () => {
    it('should create result with metadata', () => {
      const submap = Submap.createUniform(5);
      const result = createMapGenResult(submap, 'test_generator', {
        test: 'value',
      });

      expect(result.submap).toBe(submap);
      expect(result.generatorId).toBe('test_generator');
      expect(result.metadata).toEqual({ test: 'value' });
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should create result without metadata', () => {
      const submap = Submap.createUniform(5);
      const result = createMapGenResult(submap, 'test_generator');

      expect(result.submap).toBe(submap);
      expect(result.generatorId).toBe('test_generator');
      expect(result.metadata).toEqual({});
    });
  });
});
