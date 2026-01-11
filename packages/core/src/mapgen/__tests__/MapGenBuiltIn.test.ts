import { describe, it, expect } from 'vitest';
import {
  BUILTIN_GENERATORS,
  MapGenEmpty,
  MapGenGrass,
  MapGenForest,
  MapGenRoom,
  MapGenRoad,
  MapGenRandom,
  MapGenNoise,
  selectRandomGenerator,
  getBuiltinGenerator,
} from '../MapGenBuiltIn';
import { Submap } from '../../map/Submap';
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

describe('Builtin Generators', () => {
  describe('MapGenEmpty', () => {
    it('should generate empty submap', () => {
      const generator = new MapGenEmpty();
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(0); // t_null
    });

    it('should have correct ID and name', () => {
      const generator = new MapGenEmpty();

      expect(generator.id).toBe('empty');
      expect(generator.name).toBe('Empty');
    });
  });

  describe('MapGenGrass', () => {
    it('should generate grass submap', () => {
      const generator = new MapGenGrass();
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(1); // t_grass
    });

    it('should have higher weight than empty', () => {
      const generator = new MapGenGrass();
      const context = createContext();

      expect(generator.getWeight(context)).toBeGreaterThan(
        new MapGenEmpty().getWeight(context)
      );
    });
  });

  describe('MapGenForest', () => {
    it('should generate forest with trees', () => {
      const generator = new MapGenForest();
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(false);

      // 检查有家具（树）
      let treeCount = 0;
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const tile = result.getTile(x, y);
          if (tile.furniture !== null) {
            treeCount++;
          }
        }
      }

      // 应该有一些树（但不一定是全部）
      expect(treeCount).toBeGreaterThan(0);
      expect(treeCount).toBeLessThan(144); // 12x12
    });

    it('should have forest ID and name', () => {
      const generator = new MapGenForest();

      expect(generator.id).toBe('forest');
      expect(generator.name).toBe('Forest');
    });
  });

  describe('MapGenRoom', () => {
    it('should generate room with walls', () => {
      const generator = new MapGenRoom();
      const context = createContext();
      const result = generator.generate(context);

      // 检查四角的墙
      expect(result.getTile(0, 0).terrain).toBe(11); // t_wall
      expect(result.getTile(11, 0).terrain).toBe(11);
      expect(result.getTile(0, 11).terrain).toBe(11);
      expect(result.getTile(11, 11).terrain).toBe(11);

      // 检查中心的地面
      expect(result.getTile(6, 6).terrain).toBe(10); // t_floor
    });

    it('should have room ID and name', () => {
      const generator = new MapGenRoom();

      expect(generator.id).toBe('room_empty');
      expect(generator.name).toBe('Empty Room');
    });
  });

  describe('MapGenRoad', () => {
    it('should generate road', () => {
      const generator = new MapGenRoad();
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(true);
      expect(result.getTile(0, 0).terrain).toBe(20); // t_pavement
    });
  });

  describe('MapGenRandom', () => {
    it('should generate random terrain', () => {
      const generator = new MapGenRandom(0, 5);
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(false);

      // 检查地形在范围内
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const terrain = result.getTile(x, y).terrain;
          expect(terrain).toBeGreaterThanOrEqual(0);
          expect(terrain).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should support custom range', () => {
      const generator = new MapGenRandom(10, 15);
      const context = createContext();
      const result = generator.generate(context);

      const terrain = result.getTile(0, 0).terrain;
      expect(terrain).toBeGreaterThanOrEqual(10);
      expect(terrain).toBeLessThanOrEqual(15);
    });
  });

  describe('MapGenNoise', () => {
    it('should generate noise-based terrain', () => {
      const generator = new MapGenNoise();
      const context = createContext();
      const result = generator.generate(context);

      expect(result.isUniform()).toBe(false);

      // 噪声应该产生一些变化
      const terrains = new Set<number>();
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          terrains.add(result.getTile(x, y).terrain);
        }
      }

      expect(terrains.size).toBeGreaterThan(1);
    });

    it('should support custom parameters', () => {
      const generator = new MapGenNoise(5, 3, 0.5);
      const context = createContext();
      const result = generator.generate(context);

      // 应该在基础地形附近变化
      const centerTerrain = result.getTile(6, 6).terrain;
      expect(centerTerrain).toBeGreaterThanOrEqual(5 - 3);
      expect(centerTerrain).toBeLessThanOrEqual(5 + 3);
    });
  });
});

describe('Generator Selection', () => {
  describe('selectRandomGenerator', () => {
    it('should select generator based on weight', () => {
      const generators = [
        new MapGenEmpty(),
        new MapGenGrass(),
        new MapGenForest(),
      ];
      const context = createContext();

      const selected = selectRandomGenerator(generators, context);

      expect(selected).toBeDefined();
      expect(generators).toContain(selected);
    });

    it('should return null if no generators', () => {
      const context = createContext();
      const selected = selectRandomGenerator([], context);

      expect(selected).toBeNull();
    });

    it('should return null if no applicable generators', () => {
      const generator = new MapGenGrass();
      // 重写 canApply 使其永远返回 false
      generator.canApply = () => false;

      const context = createContext();
      const selected = selectRandomGenerator([generator], context);

      expect(selected).toBeNull();
    });
  });

  describe('getBuiltinGenerator', () => {
    it('should get generator by ID', () => {
      const generator = getBuiltinGenerator('empty');

      expect(generator).toBeInstanceOf(MapGenEmpty);
    });

    it('should return undefined for unknown ID', () => {
      const generator = getBuiltinGenerator('unknown');

      expect(generator).toBeUndefined();
    });

    it('should get all builtin generators', () => {
      expect(BUILTIN_GENERATORS).toHaveLength(7);
      expect(BUILTIN_GENERATORS[0]).toBeInstanceOf(MapGenEmpty);
      expect(BUILTIN_GENERATORS[1]).toBeInstanceOf(MapGenGrass);
    });
  });
});
