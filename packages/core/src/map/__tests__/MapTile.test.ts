import { describe, it, expect } from 'vitest';
import { MapTile } from '../MapTile';
import { FieldEntry } from '../../field/FieldEntry';

describe('MapTile', () => {
  describe('creation', () => {
    it('should create tile with defaults', () => {
      const tile = new MapTile();

      expect(tile.terrain).toBe(0); // t_null
      expect(tile.furniture).toBeNull();
      expect(tile.radiation).toBe(0);
      expect(tile.field).toBeNull();
      expect(tile.trap).toBeNull();
    });

    it('should create tile with properties', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const tile = new MapTile({
        terrain: 1,
        furniture: 5,
        radiation: 10,
        field,
        trap: 3,
      });

      expect(tile.terrain).toBe(1);
      expect(tile.furniture).toBe(5);
      expect(tile.radiation).toBe(10);
      expect(tile.field).toEqual(field);
      expect(tile.trap).toBe(3);
    });

    it('should create tile from terrain', () => {
      const tile = MapTile.fromTerrain(5);

      expect(tile.terrain).toBe(5);
      expect(tile.furniture).toBeNull();
      expect(tile.radiation).toBe(0);
      expect(tile.field).toBeNull();
      expect(tile.trap).toBeNull();
    });
  });

  describe('immutability', () => {
    it('should return new instance when setting terrain', () => {
      const tile = new MapTile();
      const updated = tile.withTerrain(5);

      expect(updated.terrain).toBe(5);
      expect(tile.terrain).toBe(0);
      expect(updated).not.toBe(tile);
    });

    it('should return new instance when setting furniture', () => {
      const tile = new MapTile();
      const updated = tile.withFurniture(10);

      expect(updated.furniture).toBe(10);
      expect(tile.furniture).toBeNull();
      expect(updated).not.toBe(tile);
    });

    it('should return new instance when setting field', () => {
      const tile = new MapTile();
      const field = new FieldEntry({ type: 'fd_smoke', intensity: 1 });
      const updated = tile.withField(field);

      expect(updated.field).toEqual(field);
      expect(tile.field).toBeNull();
      expect(updated).not.toBe(tile);
    });

    it('should return new instance when setting trap', () => {
      const tile = new MapTile();
      const updated = tile.withTrap(7);

      expect(updated.trap).toBe(7);
      expect(tile.trap).toBeNull();
      expect(updated).not.toBe(tile);
    });

    it('should return new instance when setting radiation', () => {
      const tile = new MapTile();
      const updated = tile.withRadiation(50);

      expect(updated.radiation).toBe(50);
      expect(tile.radiation).toBe(0);
      expect(updated).not.toBe(tile);
    });
  });

  describe('chaining', () => {
    it('should chain setters', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 3 });
      const tile = new MapTile()
        .withTerrain(1)
        .withFurniture(5)
        .withRadiation(10)
        .withTrap(3)
        .withField(field);

      expect(tile.terrain).toBe(1);
      expect(tile.furniture).toBe(5);
      expect(tile.radiation).toBe(10);
      expect(tile.trap).toBe(3);
      expect(tile.field).toEqual(field);
    });
  });

  describe('removing properties', () => {
    it('should remove furniture', () => {
      const tile = new MapTile({ furniture: 5 });
      const updated = tile.withoutFurniture();

      expect(updated.furniture).toBeNull();
      expect(tile.furniture).toBe(5);
    });

    it('should remove field', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const tile = new MapTile({ field });
      const updated = tile.withoutField();

      expect(updated.field).toBeNull();
      expect(tile.field).toEqual(field);
    });

    it('should remove trap', () => {
      const tile = new MapTile({ trap: 5 });
      const updated = tile.withoutTrap();

      expect(updated.trap).toBeNull();
      expect(tile.trap).toBe(5);
    });
  });

  describe('query methods', () => {
    it('should check if has furniture', () => {
      const withFurniture = new MapTile({ furniture: 5 });
      const withoutFurniture = new MapTile();

      expect(withFurniture.hasFurniture()).toBe(true);
      expect(withoutFurniture.hasFurniture()).toBe(false);
    });

    it('should check if has field', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2, isAlive: true });
      const withField = new MapTile({ field });
      const withoutField = new MapTile();
      const deadField = new MapTile({ field: new FieldEntry({ type: 'fd_fire', intensity: 0, isAlive: false }) });

      expect(withField.hasField()).toBe(true);
      expect(withoutField.hasField()).toBe(false);
      expect(deadField.hasField()).toBe(false);
    });

    it('should check if has trap', () => {
      const withTrap = new MapTile({ trap: 3 });
      const withoutTrap = new MapTile();

      expect(withTrap.hasTrap()).toBe(true);
      expect(withoutTrap.hasTrap()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const tile = new MapTile({
        terrain: 1,
        furniture: 5,
        radiation: 10,
        field,
        trap: 3,
      });

      const json = tile.toJSON();

      expect(json.terrain).toBe(1);
      expect(json.furniture).toBe(5);
      expect(json.radiation).toBe(10);
      expect(json.field).toEqual(field.toJSON());
      expect(json.trap).toBe(3);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const field = new FieldEntry({ type: 'fd_fire', intensity: 2 });
      const original = new MapTile({
        terrain: 1,
        furniture: 5,
        field,
      });

      const cloned = original.clone();

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);

      const updated = cloned.withTerrain(10);
      expect(original.terrain).toBe(1);
      expect(updated.terrain).toBe(10);
    });
  });
});
