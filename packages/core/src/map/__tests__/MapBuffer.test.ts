import { describe, it, expect, beforeEach } from 'vitest';
import { MapBuffer } from '../MapBuffer';
import { Submap } from '../Submap';
import { Tripoint } from '../../coordinates/Tripoint';

describe('MapBuffer', () => {
  describe('creation', () => {
    it('should create empty buffer', () => {
      const buffer = new MapBuffer();

      expect(buffer.size()).toBe(0);
      expect(buffer.maxSize).toBe(500);
    });

    it('should create buffer with custom max size', () => {
      const buffer = new MapBuffer({ maxSize: 100 });

      expect(buffer.maxSize).toBe(100);
    });

    it('should create buffer with initial submaps', () => {
      const submap = Submap.createUniform(5);
      const submaps = new Map();
      submaps.set('0,0,0', submap);

      const buffer = new MapBuffer({ submaps });

      expect(buffer.size()).toBe(1);
      expect(buffer.get(new Tripoint({ x: 0, y: 0, z: 0 }))).toEqual(submap);
    });
  });

  describe('submap management', () => {
    let buffer: MapBuffer;
    let submap1: Submap;
    let submap2: Submap;

    beforeEach(() => {
      buffer = new MapBuffer();
      submap1 = Submap.createUniform(5);
      submap2 = Submap.createUniform(10);
    });

    it('should get non-existent submap returns null', () => {
      const result = buffer.get(new Tripoint({ x: 0, y: 0, z: 0 }));

      expect(result).toBeNull();
    });

    it('should set and get submap', () => {
      const pos = new Tripoint({ x: 1, y: 2, z: 0 });
      const updated = buffer.set(pos, submap1);

      expect(updated.get(pos)).toEqual(submap1);
      expect(buffer.get(pos)).toBeNull(); // Original unchanged
    });

    it('should update existing submap', () => {
      const pos = new Tripoint({ x: 1, y: 2, z: 0 });
      const withFirst = buffer.set(pos, submap1);
      const withSecond = withFirst.set(pos, submap2);

      expect(withFirst.get(pos)).toEqual(submap1);
      expect(withSecond.get(pos)).toEqual(submap2);
    });

    it('should delete submap', () => {
      const pos = new Tripoint({ x: 1, y: 2, z: 0 });
      const withSubmap = buffer.set(pos, submap1);
      const withoutSubmap = withSubmap.delete(pos);

      expect(withSubmap.get(pos)).toEqual(submap1);
      expect(withoutSubmap.get(pos)).toBeNull();
    });

    it('should clear all submaps', () => {
      const pos1 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 1, y: 1, z: 0 });
      const withSubmaps = buffer.set(pos1, submap1).set(pos2, submap2);
      const cleared = withSubmaps.clear();

      expect(withSubmaps.size()).toBe(2);
      expect(cleared.size()).toBe(0);
    });

    it('should check if has submap', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });

      expect(buffer.has(pos)).toBe(false);

      const withSubmap = buffer.set(pos, submap1);
      expect(withSubmap.has(pos)).toBe(true);
    });

    it('should get all keys', () => {
      const pos1 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 1, y: 2, z: 3 });
      const withSubmaps = buffer.set(pos1, submap1).set(pos2, submap2);

      const keys = withSubmaps.getKeys();

      expect(keys).toHaveLength(2);
      expect(keys).toContainEqual(pos1);
      expect(keys).toContainEqual(pos2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize exceeded', () => {
      const buffer = new MapBuffer({ maxSize: 3 });
      const submap = Submap.createUniform(5);

      const pos1 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos2 = new Tripoint({ x: 1, y: 0, z: 0 });
      const pos3 = new Tripoint({ x: 2, y: 0, z: 0 });
      const pos4 = new Tripoint({ x: 3, y: 0, z: 0 });

      const step1 = buffer.set(pos1, submap);
      const step2 = step1.set(pos2, submap);
      const step3 = step2.set(pos3, submap);
      const step4 = step3.set(pos4, submap);

      expect(step1.size()).toBe(1);
      expect(step2.size()).toBe(2);
      expect(step3.size()).toBe(3);
      expect(step4.size()).toBe(3); // Max size reached

      expect(step4.has(pos1)).toBe(false); // First entry evicted
      expect(step4.has(pos2)).toBe(true);
      expect(step4.has(pos3)).toBe(true);
      expect(step4.has(pos4)).toBe(true);
    });
  });

  describe('memory usage', () => {
    it('should estimate memory usage', () => {
      const buffer = new MapBuffer();
      const submap = Submap.createUniform(5);
      const pos = new Tripoint({ x: 0, y: 0, z: 0 });
      const withSubmap = buffer.set(pos, submap);

      const usage = withSubmap.getMemoryUsage();

      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeGreaterThan(submap.getMemoryUsage());
    });

    it('should track memory for multiple submaps', () => {
      const buffer = new MapBuffer();
      const submap1 = Submap.createUniform(5);
      const submap2 = Submap.createUniform(10);

      const withOne = buffer.set(new Tripoint({ x: 0, y: 0, z: 0 }), submap1);
      const withTwo = withOne.set(new Tripoint({ x: 1, y: 0, z: 0 }), submap2);

      expect(withTwo.getMemoryUsage()).toBeGreaterThan(withOne.getMemoryUsage());
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const buffer = new MapBuffer();
      const submap = Submap.createUniform(5);
      const pos = new Tripoint({ x: 1, y: 2, z: 0 });
      const original = buffer.set(pos, submap);

      const cloned = original.clone();

      expect(cloned.size()).toBe(original.size());
      expect(cloned.get(pos)).toEqual(submap);

      // Modify clone
      const newSubmap = Submap.createUniform(10);
      const modified = cloned.set(pos, newSubmap);

      // Original unchanged
      expect(original.get(pos)).toEqual(submap);
      expect(modified.get(pos)).toEqual(newSubmap);
    });
  });

  describe('coordinate key conversion', () => {
    it('should handle negative coordinates', () => {
      const buffer = new MapBuffer();
      const submap = Submap.createUniform(5);
      const pos = new Tripoint({ x: -5, y: -10, z: -2 });

      const withSubmap = buffer.set(pos, submap);

      expect(withSubmap.has(pos)).toBe(true);
      expect(withSubmap.get(pos)).toEqual(submap);
    });

    it('should handle large coordinates', () => {
      const buffer = new MapBuffer();
      const submap = Submap.createUniform(5);
      const pos = new Tripoint({ x: 1000, y: 2000, z: 10 });

      const withSubmap = buffer.set(pos, submap);

      expect(withSubmap.has(pos)).toBe(true);
      expect(withSubmap.get(pos)).toEqual(submap);
    });

    it('should distinguish different z-levels', () => {
      const buffer = new MapBuffer();
      const submap = Submap.createUniform(5);
      const pos0 = new Tripoint({ x: 0, y: 0, z: 0 });
      const pos1 = new Tripoint({ x: 0, y: 0, z: 1 });

      const withTwo = buffer.set(pos0, submap).set(pos1, submap);

      expect(withTwo.size()).toBe(2);
      expect(withTwo.has(pos0)).toBe(true);
      expect(withTwo.has(pos1)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxSize', () => {
      const buffer = new MapBuffer({ maxSize: 0 });
      const submap = Submap.createUniform(5);
      const pos = new Tripoint({ x: 0, y: 0, z: 0 });

      const withSubmap = buffer.set(pos, submap);

      // With maxSize=0, submaps are added but immediately evicted
      expect(withSubmap.size()).toBe(0);
    });

    it('should handle deleting non-existent submap', () => {
      const buffer = new MapBuffer();
      const pos = new Tripoint({ x: 999, y: 999, z: 0 });

      const afterDelete = buffer.delete(pos);

      expect(afterDelete.size()).toBe(0);
    });
  });
});
