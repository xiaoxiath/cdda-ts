import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameMap,
  MAPSIZE,
  MAP_SIZE_X,
  MAP_SIZE_Y,
  OVERMAP_LAYERS,
  posToSubmap,
} from '../GameMap';
import { Submap, SUBMAP_SIZE } from '../Submap';
import { MapTile } from '../MapTile';
import { Tripoint } from '../../coordinates/Tripoint';
import { LevelCache } from '../MapCache';

describe('GameMap', () => {
  describe('constants', () => {
    it('should have correct constants', () => {
      expect(MAPSIZE).toBe(11);
      expect(MAP_SIZE_X).toBe(132);
      expect(MAP_SIZE_Y).toBe(132);
      expect(OVERMAP_LAYERS).toBe(21);
    });
  });

  describe('creation', () => {
    it('should create empty map', () => {
      const map = new GameMap();

      expect(map.getLoadedSubmapCount()).toBe(0);
      expect(map.absSub.x).toBe(0);
      expect(map.absSub.y).toBe(0);
      expect(map.absSub.z).toBe(0);
    });

    it('should create map with custom absSub', () => {
      const absSub = new Tripoint({ x: 5, y: 10, z: 2 });
      const map = new GameMap({ absSub });

      expect(map.absSub).toEqual(absSub);
    });

    it('should create map with initial grid', () => {
      const grid = new Map<string, Submap | null>();
      const submap = Submap.createUniform(5);
      grid.set('0,0,0', submap);

      const map = new GameMap({ grid });

      expect(map.getLoadedSubmapCount()).toBe(1);
    });
  });

  describe('submap management', () => {
    let map: GameMap;
    let submap1: Submap;
    let submap2: Submap;

    beforeEach(() => {
      map = new GameMap();
      submap1 = Submap.createUniform(5);
      submap2 = Submap.createUniform(10);
    });

    it('should get non-existent submap returns null', () => {
      const result = map.getSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }));

      expect(result).toBeNull();
    });

    it('should set and get submap within grid bounds', () => {
      const pos = new Tripoint({ x: 0, y: 0, z: 0 });
      const updated = map.setSubmapAt(pos, submap1);

      expect(updated.getSubmapAt(pos)).toEqual(submap1);
      expect(map.getSubmapAt(pos)).toBeNull();
    });

    it('should not set submap outside grid bounds', () => {
      const pos = new Tripoint({ x: 20, y: 20, z: 0 }); // Outside 11x11
      const updated = map.setSubmapAt(pos, submap1);

      expect(updated.getSubmapAt(pos)).toBeNull();
    });

    it('should not set submap with invalid z', () => {
      const pos = new Tripoint({ x: 0, y: 0, z: 30 }); // > OVERMAP_LAYERS
      const updated = map.setSubmapAt(pos, submap1);

      expect(updated.getSubmapAt(pos)).toBeNull();
    });

    it('should update existing submap', () => {
      const pos = new Tripoint({ x: 1, y: 2, z: 0 });
      const withFirst = map.setSubmapAt(pos, submap1);
      const withSecond = withFirst.setSubmapAt(pos, submap2);

      expect(withFirst.getSubmapAt(pos)).toEqual(submap1);
      expect(withSecond.getSubmapAt(pos)).toEqual(submap2);
    });

    it('should set submap at different z-levels', () => {
      const pos0 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos1 = new Tripoint({ x: 0, y: 0, z: 1 });
      const withTwo = map.setSubmapAt(pos0, submap1).setSubmapAt(pos1, submap2);

      expect(withTwo.getSubmapAt(pos0)).toEqual(submap1);
      expect(withTwo.getSubmapAt(pos1)).toEqual(submap2);
      expect(withTwo.getLoadedSubmapCount()).toBe(2);
    });

    it('should sync with mapBuffer', () => {
      const pos = new Tripoint({ x: 0, y: 0, z: 0 });
      const updated = map.setSubmapAt(pos, submap1);

      expect(updated.mapBuffer.get(pos)).toEqual(submap1);
    });
  });

  describe('tile operations', () => {
    let map: GameMap;

    beforeEach(() => {
      map = new GameMap();
      const submap = Submap.createUniform(5);
      map = map.setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap);
    });

    it('should get tile from submap', () => {
      const pos = new Tripoint({ x: 0, y: 0, z: 0 });
      const tile = map.getTile(pos);

      expect(tile).toBeDefined();
      expect(tile!.terrain).toBe(5);
    });

    it('should return null for tile outside submap', () => {
      const pos = new Tripoint({ x: 200, y: 0, z: 0 });
      const tile = map.getTile(pos);

      expect(tile).toBeNull();
    });

    it('should set tile', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });
      const newTile = new MapTile({ terrain: 10 });
      const updated = map.setTile(pos, newTile);

      expect(updated.getTile(pos)!.terrain).toBe(10);
      expect(map.getTile(pos)!.terrain).toBe(5);
    });

    it('should handle negative coordinates', () => {
      // Set up a map with absSub at (-1, -1, 0) so negative coordinates work
      const submap = Submap.createUniform(5);
      map = new GameMap({ absSub: new Tripoint({ x: -1, y: -1, z: 0 }) });
      map = map.setSubmapAt(new Tripoint({ x: -1, y: -1, z: 0 }), submap);

      const pos = new Tripoint({ x: -1, y: -1, z: 0 });
      const newTile = new MapTile({ terrain: 15 });
      const updated = map.setTile(pos, newTile);

      expect(updated.getTile(pos)!.terrain).toBe(15);
    });

    it('should get and set terrain', () => {
      const pos = new Tripoint({ x: 3, y: 4, z: 0 });
      const updated = map.setTerrain(pos, 20);

      expect(updated.getTerrain(pos)).toBe(20);
      expect(map.getTerrain(pos)).toBe(5);
    });

    it('should return null for terrain outside map', () => {
      const pos = new Tripoint({ x: 1000, y: 0, z: 0 });
      const terrain = map.getTerrain(pos);

      expect(terrain).toBeNull();
    });
  });

  describe('coordinate conversion', () => {
    describe('posToSubmap', () => {
      it('should convert positive coordinates', () => {
        const pos = new Tripoint({ x: 15, y: 27, z: 0 });
        const sm = posToSubmap(pos);

        expect(sm.x).toBe(Math.floor(15 / SUBMAP_SIZE));
        expect(sm.y).toBe(Math.floor(27 / SUBMAP_SIZE));
        expect(sm.z).toBe(0);
      });

      it('should convert negative coordinates', () => {
        const pos = new Tripoint({ x: -15, y: -27, z: 0 });
        const sm = posToSubmap(pos);

        expect(sm.x).toBe(Math.floor(-15 / SUBMAP_SIZE));
        expect(sm.y).toBe(Math.floor(-27 / SUBMAP_SIZE));
      });

      it('should convert zero coordinates', () => {
        const pos = new Tripoint({ x: 0, y: 0, z: 0 });
        const sm = posToSubmap(pos);

        expect(sm.x).toBe(0);
        expect(sm.y).toBe(0);
        expect(sm.z).toBe(0);
      });

      it('should preserve z-coordinate', () => {
        const pos = new Tripoint({ x: 10, y: 10, z: 5 });
        const sm = posToSubmap(pos);

        expect(sm.z).toBe(5);
      });
    });
  });

  describe('map shift', () => {
    it('should shift map by submap units', () => {
      const map = new GameMap();
      const submap = Submap.createUniform(5);

      // Set initial submap at origin
      let mapWithSubmap = map.setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap);

      // Shift by 1 submap (12 tiles)
      const shifted = mapWithSubmap.shift(12, 0, 0);

      expect(shifted.absSub.x).toBe(1);
      expect(shifted.absSub.y).toBe(0);
      expect(shifted.absSub.z).toBe(0);
    });

    it('should shift map in negative direction', () => {
      const map = new GameMap();
      const shifted = map.shift(-12, -12, 0);

      expect(shifted.absSub.x).toBe(-1);
      expect(shifted.absSub.y).toBe(-1);
      expect(shifted.absSub.z).toBe(0);
    });

    it('should shift map by submap count (not tiles)', () => {
      const map = new GameMap();
      const shifted = map.shift(24, 36, 1);

      expect(shifted.absSub.x).toBe(2);
      expect(shifted.absSub.y).toBe(3);
      expect(shifted.absSub.z).toBe(1);
    });
  });

  describe('cache management', () => {
    let map: GameMap;

    beforeEach(() => {
      map = new GameMap();
    });

    it('should get cache for non-existent z returns empty cache', () => {
      const cache = map.getCache(0);

      expect(cache).toBeDefined();
      expect(cache.transparencySize()).toBe(0);
      expect(cache.apparentSize()).toBe(0);
    });

    it('should set and get cache', () => {
      const cache = new LevelCache();
      const updated = map.setCache(0, cache);

      expect(updated.getCache(0)).toBe(cache);
      expect(map.getCache(0)).not.toBe(cache);
    });

    it('should set cache for different z-levels', () => {
      const cache0 = new LevelCache();
      const cache1 = new LevelCache();
      const withBoth = map.setCache(0, cache0).setCache(1, cache1);

      expect(withBoth.getCache(0)).toEqual(cache0);
      expect(withBoth.getCache(1)).toEqual(cache1);
    });

    it('should clear all caches', () => {
      const cache = new LevelCache();
      const withCache = map.setCache(0, cache).setCache(1, cache);
      const cleared = withCache.clearAllCaches();

      expect(withCache.caches.size).toBe(2);
      expect(cleared.caches.size).toBe(0);
    });

    it('should clear specific cache', () => {
      const cache = new LevelCache();
      const withCache = map.setCache(0, cache).setCache(1, cache);
      const cleared = withCache.clearCache(0);

      expect(withCache.caches.size).toBe(2);
      expect(cleared.caches.size).toBe(1);
      expect(cleared.caches.has(0)).toBe(false);
      expect(cleared.caches.has(1)).toBe(true);
    });
  });

  describe('bounds checking', () => {
    let map: GameMap;

    beforeEach(() => {
      map = new GameMap();
      const submap = Submap.createUniform(5);
      // Load submaps at origin to cover 0-131 in both x and y
      for (let x = 0; x < MAPSIZE; x++) {
        for (let y = 0; y < MAPSIZE; y++) {
          map = map.setSubmapAt(new Tripoint({ x, y, z: 0 }), submap);
        }
      }
    });

    it('should detect positions within bounds', () => {
      const pos1 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 65, y: 65, z: 0 });
      const pos3 = new Tripoint({ x: 131, y: 131, z: 0 });

      expect(map.isInBounds(pos1)).toBe(true);
      expect(map.isInBounds(pos2)).toBe(true);
      expect(map.isInBounds(pos3)).toBe(true);
    });

    it('should detect positions outside bounds', () => {
      const pos1 = new Tripoint({ x: 132, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 0, y: 132, z: 0 });
      const pos3 = new Tripoint({ x: -1, y: 0, z: 0 });

      expect(map.isInBounds(pos1)).toBe(false);
      expect(map.isInBounds(pos2)).toBe(false);
      expect(map.isInBounds(pos3)).toBe(false);
    });

    it('should detect invalid z-levels', () => {
      const pos1 = new Tripoint({ x: 0, y: 0, z: -1 });
      const pos2 = new Tripoint({ x: 0, y: 0, z: 21 });

      expect(map.isInBounds(pos1)).toBe(false);
      expect(map.isInBounds(pos2)).toBe(false);
    });
  });

  describe('memory usage', () => {
    it('should estimate memory usage', () => {
      const map = new GameMap();
      const submap = Submap.createUniform(5);

      const withSubmap = map.setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap);

      expect(withSubmap.getMemoryUsage()).toBeGreaterThan(0);
    });

    it('should track memory for multiple submaps', () => {
      const map = new GameMap();
      const submap1 = Submap.createUniform(5);
      const submap2 = Submap.createUniform(10);

      const withOne = map.setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap1);
      const withTwo = withOne.setSubmapAt(new Tripoint({ x: 1, y: 0, z: 0 }), submap2);

      expect(withTwo.getMemoryUsage()).toBeGreaterThan(withOne.getMemoryUsage());
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const submap = Submap.createUniform(5);
      const cache = new LevelCache();
      const original = new GameMap()
        .setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap)
        .setCache(0, cache);

      const cloned = original.clone();

      expect(cloned.getLoadedSubmapCount()).toBe(original.getLoadedSubmapCount());
      expect(cloned.caches.size).toBe(original.caches.size);

      // Modify clone
      const newSubmap = Submap.createUniform(10);
      const modified = cloned.setSubmapAt(new Tripoint({ x: 1, y: 0, z: 0 }), newSubmap);

      // Original unchanged
      expect(original.getLoadedSubmapCount()).toBe(1);
      expect(modified.getLoadedSubmapCount()).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle setting tile at boundary', () => {
      let map = new GameMap();
      const submap = Submap.createUniform(5);
      map = map.setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap);

      const pos = new Tripoint({ x: 11, y: 11, z: 0 }); // Last tile in submap
      const newTile = new MapTile({ terrain: 20 });
      const updated = map.setTile(pos, newTile);

      expect(updated.getTile(pos)!.terrain).toBe(20);
    });

    it('should handle tile at submap boundary with wrapping', () => {
      let map = new GameMap();
      const submap1 = Submap.createUniform(5);
      const submap2 = Submap.createUniform(10);

      map = map
        .setSubmapAt(new Tripoint({ x: 0, y: 0, z: 0 }), submap1)
        .setSubmapAt(new Tripoint({ x: 1, y: 0, z: 0 }), submap2);

      // Position 12 should be in submap (1, 0, 0), local position (0, 0)
      const pos1 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 12, y: 0, z: 0 });

      expect(map.getTile(pos1)!.terrain).toBe(5);
      expect(map.getTile(pos2)!.terrain).toBe(10);
    });
  });
});
