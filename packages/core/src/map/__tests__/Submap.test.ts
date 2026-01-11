import { describe, it, expect, beforeEach } from 'vitest';
import { Submap, SUBMAP_SIZE, SpawnPoint } from '../Submap';
import { MapTile } from '../MapTile';
import { FieldEntry } from '../../field/FieldEntry';
import { Point } from '../../coordinates/Point';

describe('Submap', () => {
  describe('creation', () => {
    it('should create uniform submap', () => {
      const submap = Submap.createUniform(5);

      expect(submap.isUniform()).toBe(true);
      expect(submap.uniformTerrain).toBe(5);
      expect(submap.tiles).toBeNull();
      expect(submap.size).toBe(SUBMAP_SIZE);
    });

    it('should create empty submap', () => {
      const submap = Submap.createEmpty();

      expect(submap.isUniform()).toBe(false);
      expect(submap.uniformTerrain).toBeNull();
      expect(submap.tiles).toBeDefined();
      expect(submap.size).toBe(SUBMAP_SIZE);
    });

    it('should create submap with custom properties', () => {
      const spawns: SpawnPoint[] = [
        {
          type: 'monster_zombie',
          position: new Point(5, 5),
          data: { hostile: true },
        },
      ];

      const submap = new Submap({
        uniformTerrain: 1,
        spawns,
        fieldCount: 0,
      });

      expect(submap.isUniform()).toBe(true);
      expect(submap.spawns).toHaveLength(1);
      expect(submap.spawns[0].type).toBe('monster_zombie');
      expect(submap.fieldCount).toBe(0);
    });
  });

  describe('uniform submap behavior', () => {
    let submap: Submap;

    beforeEach(() => {
      submap = Submap.createUniform(5);
    });

    it('should return uniform terrain for all positions', () => {
      expect(submap.getTerrain(0, 0)).toBe(5);
      expect(submap.getTerrain(5, 5)).toBe(5);
      expect(submap.getTerrain(11, 11)).toBe(5);
    });

    it('should return default tile for all positions', () => {
      const tile1 = submap.getTile(0, 0);
      const tile2 = submap.getTile(5, 5);
      const tile3 = submap.getTile(11, 11);

      expect(tile1.terrain).toBe(5);
      expect(tile2.terrain).toBe(5);
      expect(tile3.terrain).toBe(5);

      // Furniture, radiation, field, trap should be null/default
      expect(tile1.furniture).toBeNull();
      expect(tile1.radiation).toBe(0);
      expect(tile1.field).toBeNull();
      expect(tile1.trap).toBeNull();
    });

    it('should convert to non-uniform when setting different terrain', () => {
      const updated = submap.setTerrain(5, 5, 10);

      expect(updated.isUniform()).toBe(false);
      expect(updated.uniformTerrain).toBeNull();
      expect(updated.tiles).toBeDefined();

      // Original unchanged
      expect(submap.isUniform()).toBe(true);

      // New terrain at modified position
      expect(updated.getTerrain(5, 5)).toBe(10);
      expect(updated.getTerrain(0, 0)).toBe(5);
    });

    it('should stay uniform when setting same terrain', () => {
      const updated = submap.setTerrain(5, 5, 5);

      expect(updated.isUniform()).toBe(true);
      expect(updated.uniformTerrain).toBe(5);
    });
  });

  describe('tile operations', () => {
    let submap: Submap;

    beforeEach(() => {
      submap = Submap.createEmpty();
    });

    it('should get and set tiles', () => {
      const tile = new MapTile({ terrain: 10 });
      const updated = submap.setTile(3, 4, tile);

      expect(updated.getTile(3, 4).terrain).toBe(10);
      expect(submap.getTile(3, 4).terrain).toBe(0);
    });

    it('should set terrain', () => {
      const updated = submap.setTerrain(5, 5, 15);

      expect(updated.getTerrain(5, 5)).toBe(15);
      expect(submap.getTerrain(5, 5)).toBe(0);
    });

    it('should set furniture', () => {
      const updated = submap.setFurniture(2, 3, 20);

      expect(updated.getTile(2, 3).furniture).toBe(20);
      expect(submap.getTile(2, 3).furniture).toBeNull();
    });

    it('should set trap', () => {
      const updated = submap.setTrap(6, 7, 25);

      expect(updated.getTile(6, 7).trap).toBe(25);
      expect(submap.getTile(6, 7).trap).toBeNull();
    });

    it('should set field', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const updated = submap.setField(3, 4, field);

      expect(updated.getTile(3, 4).field).toEqual(field);
      expect(submap.getTile(3, 4).field).toBeNull();

      // Field count should be updated
      expect(updated.fieldCount).toBe(1);
    });

    it('should remove field and update count', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const withField = submap.setField(3, 4, field);
      const withoutField = withField.setField(3, 4, null);

      expect(withoutField.getTile(3, 4).field).toBeNull();
      expect(withoutField.fieldCount).toBe(0);
    });

    it('should get all tiles', () => {
      const tiles = submap.allTiles();

      expect(tiles).toHaveLength(SUBMAP_SIZE * SUBMAP_SIZE);
    });
  });

  describe('fill operations', () => {
    it('should fill uniform submap', () => {
      const submap = Submap.createUniform(5);
      const updated = submap.fillTerrain(10);

      expect(updated.isUniform()).toBe(true);
      expect(updated.uniformTerrain).toBe(10);
    });

    it('should fill non-uniform submap', () => {
      const submap = Submap.createEmpty();
      const updated = submap.fillTerrain(7);

      expect(updated.getTerrain(0, 0)).toBe(7);
      expect(updated.getTerrain(5, 5)).toBe(7);
      expect(updated.getTerrain(11, 11)).toBe(7);
    });
  });

  describe('optimization', () => {
    it('should optimize uniform submap to uniform terrain', () => {
      const submap = Submap.createEmpty();
      const filled = submap.fillTerrain(5);
      const optimized = filled.optimize();

      expect(optimized.isUniform()).toBe(true);
      expect(optimized.uniformTerrain).toBe(5);
      expect(optimized.tiles).toBeNull();
    });

    it('should not optimize non-uniform submap', () => {
      const submap = Submap.createEmpty();
      const mixed = submap.setTerrain(5, 5, 10);
      const optimized = mixed.optimize();

      expect(optimized.isUniform()).toBe(false);
      expect(optimized.tiles).toBeDefined();
    });

    it('should return same instance if already uniform', () => {
      const submap = Submap.createUniform(5);
      const optimized = submap.optimize();

      expect(optimized).toBe(submap);
    });
  });

  describe('spawn management', () => {
    it('should add spawn point', () => {
      const submap = Submap.createEmpty();
      const spawn: SpawnPoint = {
        type: 'monster_zombie',
        position: new Point(5, 5),
        data: {},
      };

      const updated = submap.addSpawn(spawn);

      expect(updated.spawns).toHaveLength(1);
      expect(updated.spawns[0]).toEqual(spawn);
      expect(submap.spawns).toHaveLength(0);
    });

    it('should add multiple spawn points', () => {
      const submap = Submap.createEmpty();
      const spawn1: SpawnPoint = {
        type: 'monster_zombie',
        position: new Point(1, 1),
        data: {},
      };
      const spawn2: SpawnPoint = {
        type: 'monster_dog',
        position: new Point(8, 8),
        data: {},
      };

      const updated = submap.addSpawn(spawn1).addSpawn(spawn2);

      expect(updated.spawns).toHaveLength(2);
    });

    it('should clear spawns', () => {
      const spawn: SpawnPoint = {
        type: 'monster_zombie',
        position: new Point(5, 5),
        data: {},
      };

      const withSpawn = Submap.createEmpty().addSpawn(spawn);
      const cleared = withSpawn.clearSpawns();

      expect(cleared.spawns).toHaveLength(0);
      expect(withSpawn.spawns).toHaveLength(1);
    });
  });

  describe('touch', () => {
    it('should update last touched time', () => {
      const submap = Submap.createEmpty();
      const before = submap.lastTouched;

      // Small delay to ensure time difference
      const updated = submap.touch();

      expect(updated.lastTouched).toBeGreaterThanOrEqual(before);
    });
  });

  describe('memory usage', () => {
    it('should estimate memory for uniform submap', () => {
      const submap = Submap.createUniform(5);
      const usage = submap.getMemoryUsage();

      // Uniform should use less memory
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeLessThan(1000); // Less than 1KB
    });

    it('should estimate memory for non-uniform submap', () => {
      const submap = Submap.createEmpty();
      const usage = submap.getMemoryUsage();

      // Non-uniform should use more memory
      expect(usage).toBeGreaterThan(1000); // More than 1KB for full SOA
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const spawn: SpawnPoint = {
        type: 'monster_zombie',
        position: new Point(5, 5),
        data: { hostile: true },
      };

      const original = Submap.createEmpty()
        .setTerrain(0, 0, 10)
        .addSpawn(spawn);

      const cloned = original.clone();

      expect(cloned.isUniform()).toBe(original.isUniform());
      expect(cloned.getTerrain(0, 0)).toBe(10);
      expect(cloned.spawns).toHaveLength(1);
      expect(cloned.spawns[0]).toEqual(spawn);

      // Modify clone
      const modified = cloned.setTerrain(0, 0, 20);

      // Original unchanged
      expect(original.getTerrain(0, 0)).toBe(10);
      expect(modified.getTerrain(0, 0)).toBe(20);
    });

    it('should clone uniform submap', () => {
      const original = Submap.createUniform(5);
      const cloned = original.clone();

      expect(cloned.isUniform()).toBe(true);
      expect(cloned.uniformTerrain).toBe(5);
    });
  });

  describe('chaining operations', () => {
    it('should chain multiple operations', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const spawn: SpawnPoint = {
        type: 'monster_zombie',
        position: new Point(5, 5),
        data: {},
      };

      const submap = Submap.createEmpty()
        .setTerrain(0, 0, 5)
        .setFurniture(1, 1, 10)
        .setTrap(2, 2, 15)
        .setField(3, 3, field)
        .addSpawn(spawn)
        .touch();

      expect(submap.getTerrain(0, 0)).toBe(5);
      expect(submap.getTile(1, 1).furniture).toBe(10);
      expect(submap.getTile(2, 2).trap).toBe(15);
      expect(submap.getTile(3, 3).field).toEqual(field);
      expect(submap.spawns).toHaveLength(1);
      expect(submap.lastTouched).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum size', () => {
      const submap = new Submap({ size: 1 });
      expect(submap.size).toBe(1);
    });

    it('should handle large size', () => {
      const submap = new Submap({ size: 24 });
      expect(submap.size).toBe(24);
    });
  });
});
