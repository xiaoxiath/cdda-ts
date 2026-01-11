import { describe, it, expect, beforeEach } from 'vitest';
import { LevelCache, TransparencyCache } from '../MapCache';
import { Point } from '../../coordinates/Point';

describe('TransparencyCache', () => {
  describe('creation', () => {
    it('should create empty cache', () => {
      const cache = new TransparencyCache();

      expect(cache.size()).toBe(0);
      expect(cache.lastUpdate).toBeGreaterThan(0);
    });

    it('should create cache with initial data', () => {
      const transparent = new Map();
      transparent.set('0,0', true);
      transparent.set('1,1', false);

      const cache = new TransparencyCache({ transparent });

      expect(cache.size()).toBe(2);
      expect(cache.get(new Point({ x: 0, y: 0 }))).toBe(true);
      expect(cache.get(new Point({ x: 1, y: 1 }))).toBe(false);
    });
  });

  describe('transparency management', () => {
    let cache: TransparencyCache;

    beforeEach(() => {
      cache = new TransparencyCache();
    });

    it('should get non-existent position returns undefined', () => {
      const result = cache.get(new Point({ x: 5, y: 5 }));

      expect(result).toBeUndefined();
    });

    it('should set and get transparency', () => {
      const pos = new Point({ x: 3, y: 4 });
      const updated = cache.set(pos, true);

      expect(updated.get(pos)).toBe(true);
      expect(cache.get(pos)).toBeUndefined(); // Original unchanged
    });

    it('should update existing transparency', () => {
      const pos = new Point({ x: 3, y: 4 });
      const withFirst = cache.set(pos, true);
      const withSecond = withFirst.set(pos, false);

      expect(withFirst.get(pos)).toBe(true);
      expect(withSecond.get(pos)).toBe(false);
    });

    it('should clear all entries', () => {
      const pos1 = new Point({ x: 0, y: 0 });
      const pos2 = new Point({ x: 1, y: 1 });
      const withData = cache.set(pos1, true).set(pos2, false);
      const cleared = withData.clear();

      expect(withData.size()).toBe(2);
      expect(cleared.size()).toBe(0);
    });

    it('should check if has position', () => {
      const pos = new Point({ x: 5, y: 5 });

      expect(cache.has(pos)).toBe(false);

      const withData = cache.set(pos, true);
      expect(withData.has(pos)).toBe(true);
    });

    it('should update lastUpdate on set', () => {
      const before = cache.lastUpdate;
      const pos = new Point({ x: 0, y: 0 });

      // Small delay to ensure time difference
      const updated = cache.set(pos, true);

      expect(updated.lastUpdate).toBeGreaterThanOrEqual(before);
    });

    it('should update lastUpdate on clear', () => {
      const withData = cache.set(new Point({ x: 0, y: 0 }), true);
      const before = withData.lastUpdate;

      const cleared = withData.clear();

      expect(cleared.lastUpdate).toBeGreaterThanOrEqual(before);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const pos = new Point({ x: 1, y: 2 });
      const original = new TransparencyCache().set(pos, true);

      const cloned = original.clone();

      expect(cloned.size()).toBe(original.size());
      expect(cloned.get(pos)).toBe(true);

      // Modify clone
      const modified = cloned.set(pos, false);

      // Original unchanged
      expect(original.get(pos)).toBe(true);
      expect(modified.get(pos)).toBe(false);
    });
  });
});

describe('LevelCache', () => {
  describe('creation', () => {
    it('should create empty cache', () => {
      const cache = new LevelCache();

      expect(cache.transparencySize()).toBe(0);
      expect(cache.apparentSize()).toBe(0);
    });

    it('should create cache with initial data', () => {
      const transparency = new TransparencyCache().set(
        new Point({ x: 0, y: 0 }),
        true
      );
      const apparent = new Map();
      apparent.set('0,0', 5);

      const cache = new LevelCache({ transparency, apparent });

      expect(cache.transparencySize()).toBe(1);
      expect(cache.apparentSize()).toBe(1);
    });
  });

  describe('transparency management', () => {
    let cache: LevelCache;

    beforeEach(() => {
      cache = new LevelCache();
    });

    it('should get and set transparency', () => {
      const pos = new Point({ x: 3, y: 4 });
      const updated = cache.setTransparent(pos, true);

      expect(updated.getTransparent(pos)).toBe(true);
      expect(cache.getTransparent(pos)).toBeUndefined();
    });

    it('should clear transparency cache', () => {
      const pos1 = new Point({ x: 0, y: 0 });
      const pos2 = new Point({ x: 1, y: 1 });
      const withData = cache
        .setTransparent(pos1, true)
        .setTransparent(pos2, false);
      const cleared = withData.clearTransparency();

      expect(withData.transparencySize()).toBe(2);
      expect(cleared.transparencySize()).toBe(0);
    });
  });

  describe('apparent management', () => {
    let cache: LevelCache;

    beforeEach(() => {
      cache = new LevelCache();
    });

    it('should get non-existent position returns undefined', () => {
      const result = cache.getApparent(new Point({ x: 5, y: 5 }));

      expect(result).toBeUndefined();
    });

    it('should set and get apparent', () => {
      const pos = new Point({ x: 3, y: 4 });
      const updated = cache.setApparent(pos, 10);

      expect(updated.getApparent(pos)).toBe(10);
      expect(cache.getApparent(pos)).toBeUndefined();
    });

    it('should update existing apparent', () => {
      const pos = new Point({ x: 3, y: 4 });
      const withFirst = cache.setApparent(pos, 5);
      const withSecond = withFirst.setApparent(pos, 15);

      expect(withFirst.getApparent(pos)).toBe(5);
      expect(withSecond.getApparent(pos)).toBe(15);
    });

    it('should set apparent batch', () => {
      const entries: [Point, number][] = [
        [new Point({ x: 0, y: 0 }), 5],
        [new Point({ x: 1, y: 1 }), 10],
        [new Point({ x: 2, y: 2 }), 15],
      ];

      const updated = cache.setApparentBatch(entries);

      expect(updated.getApparent(new Point({ x: 0, y: 0 }))).toBe(5);
      expect(updated.getApparent(new Point({ x: 1, y: 1 }))).toBe(10);
      expect(updated.getApparent(new Point({ x: 2, y: 2 }))).toBe(15);
      expect(updated.apparentSize()).toBe(3);
    });

    it('should clear apparent cache', () => {
      const pos1 = new Point({ x: 0, y: 0 });
      const pos2 = new Point({ x: 1, y: 1 });
      const withData = cache.setApparent(pos1, 5).setApparent(pos2, 10);
      const cleared = withData.clearApparent();

      expect(withData.apparentSize()).toBe(2);
      expect(cleared.apparentSize()).toBe(0);
    });
  });

  describe('cache management', () => {
    let cache: LevelCache;

    beforeEach(() => {
      cache = new LevelCache();
    });

    it('should clear all caches', () => {
      const pos = new Point({ x: 0, y: 0 });
      const withData = cache.setTransparent(pos, true).setApparent(pos, 5);
      const cleared = withData.clear();

      expect(cleared.transparencySize()).toBe(0);
      expect(cleared.apparentSize()).toBe(0);
    });

    it('should check if expired', () => {
      const cache = new LevelCache();
      const now = Date.now();

      // Cache was just created, so it's not expired relative to now
      expect(cache.isExpired(now)).toBe(false);

      // If last map change was more recent than cache update, cache is expired
      const moreRecentTime = now + 1000; // 1 second in the future
      expect(cache.isExpired(moreRecentTime)).toBe(true);
    });

    it('should get memory usage', () => {
      const pos1 = new Point({ x: 0, y: 0 });
      const pos2 = new Point({ x: 1, y: 1 });
      const withData = cache
        .setTransparent(pos1, true)
        .setApparent(pos1, 5)
        .setApparent(pos2, 10);

      const usage = withData.getMemoryUsage();

      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const pos = new Point({ x: 1, y: 2 });
      const original = new LevelCache()
        .setTransparent(pos, true)
        .setApparent(pos, 10);

      const cloned = original.clone();

      expect(cloned.transparencySize()).toBe(original.transparencySize());
      expect(cloned.apparentSize()).toBe(original.apparentSize());
      expect(cloned.getTransparent(pos)).toBe(true);
      expect(cloned.getApparent(pos)).toBe(10);

      // Modify clone
      const modified = cloned.setTransparent(pos, false).setApparent(pos, 20);

      // Original unchanged
      expect(original.getTransparent(pos)).toBe(true);
      expect(original.getApparent(pos)).toBe(10);
      expect(modified.getTransparent(pos)).toBe(false);
      expect(modified.getApparent(pos)).toBe(20);
    });
  });

  describe('coordinate key conversion', () => {
    it('should handle negative coordinates', () => {
      const cache = new LevelCache();
      const pos = new Point({ x: -5, y: -10 });

      const updated = cache.setTransparent(pos, true).setApparent(pos, 5);

      expect(updated.getTransparent(pos)).toBe(true);
      expect(updated.getApparent(pos)).toBe(5);
    });

    it('should handle large coordinates', () => {
      const cache = new LevelCache();
      const pos = new Point({ x: 1000, y: 2000 });

      const updated = cache.setTransparent(pos, false).setApparent(pos, 100);

      expect(updated.getTransparent(pos)).toBe(false);
      expect(updated.getApparent(pos)).toBe(100);
    });
  });

  describe('independent caches', () => {
    it('should manage transparency and apparent independently', () => {
      const cache = new LevelCache();
      const pos1 = new Point({ x: 0, y: 0 });
      const pos2 = new Point({ x: 1, y: 1 });

      const updated = cache
        .setTransparent(pos1, true)
        .setApparent(pos2, 10);

      expect(updated.getTransparent(pos1)).toBe(true);
      expect(updated.getApparent(pos1)).toBeUndefined();
      expect(updated.getTransparent(pos2)).toBeUndefined();
      expect(updated.getApparent(pos2)).toBe(10);
    });
  });
});
