import { describe, it, expect, beforeEach } from 'vitest';
import { MapTileSoa } from '../MapTileSoa';
import { MapTile } from '../MapTile';
import { FieldEntry } from '../../field/FieldEntry';

describe('MapTileSoa', () => {
  const SIZE = 12;

  describe('creation', () => {
    it('should create empty SOA', () => {
      const soa = new MapTileSoa(SIZE);

      expect(soa.size).toBe(SIZE);
      expect(soa.terrain).toHaveLength(SIZE * SIZE);
      expect(soa.furniture).toHaveLength(SIZE * SIZE);
      expect(soa.radiation).toHaveLength(SIZE * SIZE);
      expect(soa.traps).toBeInstanceOf(Map);
      expect(soa.traps.size).toBe(0);
    });

    it('should create SOA from uniform terrain', () => {
      const soa = MapTileSoa.fromUniform(5, SIZE);

      expect(soa.size).toBe(SIZE);

      for (let i = 0; i < SIZE * SIZE; i++) {
        expect(soa.terrain[i]).toBe(5);
      }
    });

    it('should create empty SOA', () => {
      const soa = MapTileSoa.createEmpty(SIZE);

      expect(soa.size).toBe(SIZE);
      for (let i = 0; i < SIZE * SIZE; i++) {
        expect(soa.terrain[i]).toBe(0);
      }
    });
  });

  describe('tile access', () => {
    let soa: MapTileSoa;

    beforeEach(() => {
      soa = new MapTileSoa(SIZE);
    });

    it('should get tile at position', () => {
      const tile = soa.getTile(5, 5);

      expect(tile.terrain).toBe(0);
      expect(tile.furniture).toBeNull();
      expect(tile.radiation).toBe(0);
      expect(tile.trap).toBeNull();
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => soa.getTile(-1, 0)).toThrow();
      expect(() => soa.getTile(0, -1)).toThrow();
      expect(() => soa.getTile(SIZE, 0)).toThrow();
      expect(() => soa.getTile(0, SIZE)).toThrow();
    });

    it('should get all tiles', () => {
      const tiles = soa.allTiles();

      expect(tiles).toHaveLength(SIZE * SIZE);
    });

    it('should get all terrain', () => {
      const terrain = soa.allTerrain();

      expect(terrain).toHaveLength(SIZE * SIZE);
    });
  });

  describe('setting values', () => {
    it('should set tile', () => {
      const soa = new MapTileSoa(SIZE);
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const tile = new MapTile({
        terrain: 5,
        furniture: 10,
        radiation: 20,
        trap: 3,
        field,
      });

      const updated = soa.setTile(3, 4, tile);

      expect(updated.getTile(3, 4).terrain).toBe(5);
      expect(updated.getTile(3, 4).furniture).toBe(10);
      expect(updated.getTile(3, 4).radiation).toBe(20);
      expect(updated.getTile(3, 4).trap).toBe(3);
      expect(updated.getTile(3, 4).field).toEqual(field);

      // Original unchanged
      expect(soa.getTile(3, 4).terrain).toBe(0);
    });

    it('should set terrain', () => {
      const soa = new MapTileSoa(SIZE);
      const updated = soa.setTerrain(5, 5, 10);

      expect(updated.getTerrain(5, 5)).toBe(10);
      expect(soa.getTerrain(5, 5)).toBe(0);
    });

    it('should set furniture', () => {
      const soa = new MapTileSoa(SIZE);
      const updated = soa.setFurniture(3, 4, 15);

      expect(updated.getFurniture(3, 4)).toBe(15);
      expect(soa.getFurniture(3, 4)).toBeNull();
    });

    it('should set trap', () => {
      const soa = new MapTileSoa(SIZE);
      const updated = soa.setTrap(6, 7, 8);

      expect(updated.getTrap(6, 7)).toBe(8);
      expect(soa.getTrap(6, 7)).toBeNull();
    });

    it('should set field', () => {
      const soa = new MapTileSoa(SIZE);
      const field = new FieldEntry({ type: 'fd_smoke', intensity: 1 });
      const updated = soa.setField(2, 3, field);

      expect(updated.getField(2, 3)).toEqual(field);
      expect(soa.getField(2, 3)).toBeNull();
    });

    it('should remove field', () => {
      const soa = new MapTileSoa(SIZE);
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const withField = soa.setField(2, 3, field);
      const withoutField = withField.setField(2, 3, null);

      expect(withField.getField(2, 3)).toEqual(field);
      expect(withoutField.getField(2, 3)).toBeNull();
    });
  });

  describe('uniform optimization', () => {
    it('should check if uniform', () => {
      const uniformSoa = MapTileSoa.fromUniform(5, SIZE);
      const mixedSoa = new MapTileSoa(SIZE);

      expect(uniformSoa.isUniform()).toBe(true);
      expect(uniformSoa.isUniform(5)).toBe(true);
      expect(uniformSoa.isUniform(10)).toBe(false);

      expect(mixedSoa.isUniform()).toBe(true);
      expect(mixedSoa.isUniform(0)).toBe(true);
    });

    it('should detect non-uniform after modification', () => {
      const soa = MapTileSoa.fromUniform(5, SIZE);
      const updated = soa.setTerrain(3, 4, 10);

      expect(updated.isUniform()).toBe(false);
      expect(updated.isUniform(5)).toBe(false);
    });
  });

  describe('fill operations', () => {
    it('should fill terrain', () => {
      const soa = new MapTileSoa(SIZE);
      const filled = soa.fillTerrain(7);

      for (let i = 0; i < SIZE * SIZE; i++) {
        expect(filled.terrain[i]).toBe(7);
      }

      // Original unchanged
      expect(soa.terrain[0]).toBe(0);
    });
  });

  describe('field management', () => {
    it('should manage fields independently', () => {
      const soa = new MapTileSoa(SIZE);
      const field1 = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const field2 = new FieldEntry({ type: 'fd_smoke', intensity: 1 });

      const updated = soa.setField(0, 0, field1).setField(5, 5, field2);

      expect(updated.getField(0, 0)).toEqual(field1);
      expect(updated.getField(5, 5)).toEqual(field2);
      expect(updated.getField(10, 10)).toBeNull();
    });

    it('should preserve fields when updating other properties', () => {
      const soa = new MapTileSoa(SIZE);
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const withField = soa.setField(3, 4, field);
      const updated = withField.setTerrain(3, 4, 10);

      expect(updated.getField(3, 4)).toEqual(field);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const original = new MapTileSoa(SIZE)
        .setTerrain(0, 0, 5)
        .setFurniture(1, 1, 10)
        .setField(2, 2, field);

      const cloned = original.clone();

      expect(cloned.getTerrain(0, 0)).toBe(5);
      expect(cloned.getFurniture(1, 1)).toBe(10);
      expect(cloned.getField(2, 2)).toEqual(field);

      // Modify clone
      const modified = cloned.setTerrain(0, 0, 20);

      // Original unchanged
      expect(original.getTerrain(0, 0)).toBe(5);
      expect(modified.getTerrain(0, 0)).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should handle size 1', () => {
      const soa = new MapTileSoa(1);

      expect(soa.size).toBe(1);
      expect(soa.getTile(0, 0)).toBeDefined();
    });

    it('should ignore updates to invalid coordinates', () => {
      const soa = new MapTileSoa(SIZE);
      const updated = soa.setTerrain(-1, -1, 10);

      expect(updated).toBe(soa);
    });
  });
});
