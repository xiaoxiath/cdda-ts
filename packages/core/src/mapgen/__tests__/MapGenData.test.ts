import { describe, it, expect } from 'vitest';
import {
  MapGenData,
  createMapGenDataFromJson,
  createEmptyMapGenData,
} from '../MapGenData';
import { MapTile } from '../../map/MapTile';

describe('MapGenData', () => {
  describe('creation', () => {
    it('should create empty data', () => {
      const data = createEmptyMapGenData();

      expect(data.palette.terrains).toEqual({});
      expect(data.palette.furniture).toEqual({});
      expect(data.palette.traps).toEqual({});
      expect(data.palette.fills).toEqual({});
    });

    it('should create data from JSON', () => {
      const json = {
        palette: {
          terrains: { grass: 1, dirt: 5 },
          furniture: { chair: 100 },
          traps: { beartrap: 200 },
          fills: {
            grass_floor: { terrain: 1, furniture: 100 },
          },
        },
        alternate_palettes: {
          desert: {
            terrains: { sand: 3 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
        schema: { version: 1 },
      };

      const data = createMapGenDataFromJson(json);

      expect(data.getTerrain('grass')).toBe(1);
      expect(data.getTerrain('dirt')).toBe(5);
      expect(data.getFurniture('chair')).toBe(100);
      expect(data.getTrap('beartrap')).toBe(200);
    });

    it('should create data with minimal JSON', () => {
      const json = {
        palette: {
          terrains: { grass: 1 },
          furniture: {},
          traps: {},
          fills: {},
        },
      };

      const data = createMapGenDataFromJson(json);

      expect(data.getTerrain('grass')).toBe(1);
      expect(data.getFurniture('missing')).toBeUndefined();
    });
  });

  describe('terrain access', () => {
    it('should get terrain ID', () => {
      const data = createMapGenDataFromJson({
        palette: {
          terrains: { grass: 1, dirt: 5 },
          furniture: {},
          traps: {},
          fills: {},
        },
      });

      expect(data.getTerrain('grass')).toBe(1);
      expect(data.getTerrain('dirt')).toBe(5);
      expect(data.getTerrain('missing')).toBeUndefined();
    });
  });

  describe('furniture access', () => {
    it('should get furniture ID', () => {
      const data = createMapGenDataFromJson({
        palette: {
          terrains: {},
          furniture: { chair: 100, table: 101 },
          traps: {},
          fills: {},
        },
      });

      expect(data.getFurniture('chair')).toBe(100);
      expect(data.getFurniture('table')).toBe(101);
      expect(data.getFurniture('missing')).toBeUndefined();
    });
  });

  describe('trap access', () => {
    it('should get trap ID', () => {
      const data = createMapGenDataFromJson({
        palette: {
          terrains: {},
          furniture: {},
          traps: { beartrap: 200, snare: 201 },
          fills: {},
        },
      });

      expect(data.getTrap('beartrap')).toBe(200);
      expect(data.getTrap('snare')).toBe(201);
      expect(data.getTrap('missing')).toBeUndefined();
    });
  });

  describe('fill rules', () => {
    it('should get fill rule', () => {
      const fillRule = { terrain: 1, furniture: 100 };
      const data = createMapGenDataFromJson({
        palette: {
          terrains: {},
          furniture: {},
          traps: {},
          fills: {
            grass_with_chair: fillRule,
          },
        },
      });

      expect(data.getFill('grass_with_chair')).toEqual(fillRule);
    });

    it('should handle fill rule array', () => {
      const fillRules = [
        { terrain: 1, weight: 5 },
        { terrain: 2, weight: 3 },
      ];
      const data = createMapGenDataFromJson({
        palette: {
          terrains: {},
          furniture: {},
          traps: {},
          fills: {
            random_fill: fillRules,
          },
        },
      });

      expect(data.getFill('random_fill')).toEqual(fillRules);
    });
  });

  describe('createTileFromFill', () => {
    it('should create tile from fill rule', () => {
      const data = createMapGenDataFromJson({
        palette: {
          terrains: { grass: 1 },
          furniture: { chair: 100 },
          traps: {},
          fills: {
            grass_floor: { terrain: 'grass', furniture: 'chair' },
          },
        },
      });

      const tile = data.createTileFromFill('grass_floor');

      expect(tile).toBeInstanceOf(MapTile);
      expect(tile.terrain).toBe(1);
      expect(tile.furniture).toBe(100);
    });

    it('should return default tile for missing fill', () => {
      const data = createEmptyMapGenData();
      const tile = data.createTileFromFill('missing');

      expect(tile).toBeInstanceOf(MapTile);
      expect(tile.terrain).toBe(0);
    });
  });

  describe('alternate palettes', () => {
    it('should get alternate palette', () => {
      const data = createMapGenDataFromJson({
        alternate_palettes: {
          desert: {
            terrains: { sand: 3 },
            furniture: {},
            traps: {},
            fills: {},
          },
        },
      });

      const palette = data.getAlternatePalette('desert');

      expect(palette).toBeDefined();
      expect(palette!.terrains.sand).toBe(3);
    });

    it('should return undefined for missing palette', () => {
      const data = createEmptyMapGenData();
      const palette = data.getAlternatePalette('missing');

      expect(palette).toBeUndefined();
    });
  });

  describe('schema access', () => {
    it('should get schema value', () => {
      const data = createMapGenDataFromJson({
        schema: { version: 1, name: 'test' },
      });

      expect(data.getSchemaValue('version')).toBe(1);
      expect(data.getSchemaValue('name')).toBe('test');
    });

    it('should return undefined for missing schema key', () => {
      const data = createEmptyMapGenData();
      const value = data.getSchemaValue('missing');

      expect(value).toBeUndefined();
    });
  });
});
