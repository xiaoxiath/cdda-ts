import { describe, it, expect } from 'vitest';
import { Terrain } from '../Terrain';
import { TerrainFlags, TerrainFlag } from '../types';
import { TerrainData } from '../TerrainData';
import { TerrainParser, TerrainJson } from '../TerrainParser';
import { TerrainLoader } from '../TerrainLoader';

describe('TerrainFlags', () => {
  describe('fromJson', () => {
    it('should create flags from JSON array', () => {
      const flags = TerrainFlags.fromJson(['TRANSPARENT', 'FLAT', 'DIGGABLE']);

      expect(flags.size).toBe(3);
      expect(flags.has(TerrainFlag.TRANSPARENT)).toBe(true);
      expect(flags.has(TerrainFlag.FLAT)).toBe(true);
      expect(flags.has(TerrainFlag.DIGGABLE)).toBe(true);
    });

    it('should handle empty array', () => {
      const flags = TerrainFlags.fromJson([]);

      expect(flags.size).toBe(0);
    });

    it('should ignore invalid flags', () => {
      const flags = TerrainFlags.fromJson(['TRANSPARENT', 'INVALID_FLAG']);

      expect(flags.size).toBe(1);
      expect(flags.has(TerrainFlag.TRANSPARENT)).toBe(true);
    });
  });

  describe('query methods', () => {
    it('should check transparency', () => {
      const flags = new TerrainFlags([TerrainFlag.TRANSPARENT]);
      expect(flags.isTransparent()).toBe(true);

      const flags2 = new TerrainFlags([TerrainFlag.WALL]);
      expect(flags2.isTransparent()).toBe(false);
    });

    it('should check passability', () => {
      const flags = new TerrainFlags([TerrainFlag.FLAT]);
      expect(flags.isPassable()).toBe(true);

      const flags2 = new TerrainFlags([TerrainFlag.WALL]);
      expect(flags2.isPassable()).toBe(false);
    });

    it('should check if flat', () => {
      const flags = new TerrainFlags([TerrainFlag.FLAT]);
      expect(flags.isFlat()).toBe(true);
    });

    it('should check if indoors', () => {
      const flags = new TerrainFlags([TerrainFlag.INDOORS]);
      expect(flags.isIndoors()).toBe(true);
    });

    it('should check if liquid', () => {
      const flags = new TerrainFlags([TerrainFlag.LIQUID]);
      expect(flags.isLiquid()).toBe(true);
    });

    it('should check if wall', () => {
      const flags = new TerrainFlags([TerrainFlag.WALL]);
      expect(flags.isWall()).toBe(true);
    });

    it('should check if door', () => {
      const flags = new TerrainFlags([TerrainFlag.DOOR]);
      expect(flags.isDoor()).toBe(true);
    });
  });
});

describe('Terrain', () => {
  describe('creation', () => {
    it('should create terrain with defaults', () => {
      const terrain = new Terrain();

      expect(terrain.id).toBe(0);
      expect(terrain.name).toBe('');
      expect(terrain.symbol).toBe('?');
      expect(terrain.color).toBe('white');
      expect(terrain.moveCost).toBe(2);
    });

    it('should create terrain with properties', () => {
      const terrain = new Terrain({
        id: 1,
        name: 'dirt',
        description: 'It is dirt.',
        symbol: '.',
        color: 'brown',
        moveCost: 2,
        flags: new TerrainFlags([TerrainFlag.TRANSPARENT, TerrainFlag.FLAT]),
      });

      expect(terrain.id).toBe(1);
      expect(terrain.name).toBe('dirt');
      expect(terrain.symbol).toBe('.');
      expect(terrain.color).toBe('brown');
      expect(terrain.moveCost).toBe(2);
    });
  });

  describe('query methods', () => {
    it('should check transparency', () => {
      const terrain = new Terrain({
        flags: new TerrainFlags([TerrainFlag.TRANSPARENT]),
      });

      expect(terrain.isTransparent()).toBe(true);

      const terrain2 = new Terrain({
        flags: new TerrainFlags([TerrainFlag.WALL]),
      });

      expect(terrain2.isTransparent()).toBe(false);
    });

    it('should check passability', () => {
      const terrain = new Terrain({
        moveCost: 2,
        flags: new TerrainFlags([TerrainFlag.FLAT]),
      });

      expect(terrain.isPassable()).toBe(true);

      const terrain2 = new Terrain({
        moveCost: 0,
        flags: new TerrainFlags([TerrainFlag.WALL]),
      });

      expect(terrain2.isPassable()).toBe(false);
    });

    it('should check if bashable', () => {
      const terrain = new Terrain({
        bash: {
          sound: 'thump',
          strMin: 10,
          strMax: 20,
          furniture: [],
        },
      });

      expect(terrain.isBashable()).toBe(true);

      const terrain2 = new Terrain();
      expect(terrain2.isBashable()).toBe(false);
    });

    it('should check if deconstructable', () => {
      const terrain = new Terrain({
        deconstruct: {
          furniture: 'f_wooden_support',
          time: 100,
        },
      });

      expect(terrain.isDeconstructable()).toBe(true);
    });

    it('should check if can open', () => {
      const terrain = new Terrain({
        open: 2,
      });

      expect(terrain.canOpen()).toBe(true);
    });

    it('should check if can close', () => {
      const terrain = new Terrain({
        close: 1,
      });

      expect(terrain.canClose()).toBe(true);
    });
  });

  describe('connect groups', () => {
    it('should get connect group', () => {
      const terrain = new Terrain({
        connectGroups: new Map([['WALL', true]]),
      });

      expect(terrain.getConnectGroup()).toBe('WALL');
    });

    it('should return null when no connect group', () => {
      const terrain = new Terrain();

      expect(terrain.getConnectGroup()).toBe(null);
    });

    it('should check if connects to group', () => {
      const terrain = new Terrain({
        connectsTo: new Map([['WALL', true], ['WOOD', true]]),
      });

      expect(terrain.connectsToGroup('WALL')).toBe(true);
      expect(terrain.connectsToGroup('WOOD')).toBe(true);
      expect(terrain.connectsToGroup('FLOOR')).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get bash difficulty', () => {
      const terrain = new Terrain({
        bash: {
          sound: 'thump',
          strMin: 10,
          strMax: 20,
          furniture: [],
        },
      });

      expect(terrain.getBashDifficulty()).toBe(15);
    });

    it('should return -1 when not bashable', () => {
      const terrain = new Terrain();

      expect(terrain.getBashDifficulty()).toBe(-1);
    });

    it('should check if has trap', () => {
      const terrain = new Terrain({
        trap: 'tr_snare',
      });

      expect(terrain.hasTrap()).toBe(true);

      const terrain2 = new Terrain({
        trap: 'tr_null',
      });

      expect(terrain2.hasTrap()).toBe(false);
    });

    it('should get display info', () => {
      const terrain = new Terrain({
        name: 'dirt floor',
        symbol: '.',
        color: 'brown',
      });

      const info = terrain.getDisplayInfo();

      expect(info.symbol).toBe('.');
      expect(info.color).toBe('brown');
      expect(info.name).toBe('dirt floor');
    });

    it('should check if can build on', () => {
      const terrain = new Terrain({
        flags: new TerrainFlags([TerrainFlag.FLAT]),
      });

      expect(terrain.canBuildOn()).toBe(true);

      const terrain2 = new Terrain({
        flags: new TerrainFlags([TerrainFlag.LIQUID]),
      });

      expect(terrain2.canBuildOn()).toBe(false);
    });

    it('should get move cost', () => {
      const terrain = new Terrain({
        moveCost: 5,
      });

      expect(terrain.getMoveCost()).toBe(5);
    });

    it('should check if dangerous', () => {
      const terrain1 = new Terrain({
        flags: new TerrainFlags([TerrainFlag.LIQUID]),
      });

      expect(terrain1.isDangerous()).toBe(true);

      const terrain2 = new Terrain({
        trap: 'tr_snare',
      });

      expect(terrain2.isDangerous()).toBe(true);

      const terrain3 = new Terrain({
        flags: new TerrainFlags([TerrainFlag.FLAT]),
      });

      expect(terrain3.isDangerous()).toBe(false);
    });
  });
});

describe('TerrainData', () => {
  let data: TerrainData;

  beforeEach(() => {
    data = new TerrainData();
  });

  describe('storage', () => {
    it('should store and retrieve terrain', () => {
      const terrain = new Terrain({
        id: 1,
        name: 'dirt',
        symbol: '.',
        color: 'brown',
      });

      data.set(1, terrain);

      expect(data.get(1)).toBe(terrain);
    });

    it('should store multiple terrains', () => {
      const terrain1 = new Terrain({ id: 1, name: 'dirt', symbol: '.', color: 'brown' });
      const terrain2 = new Terrain({ id: 2, name: 'grass', symbol: '"', color: 'green' });

      data.setMany([terrain1, terrain2]);

      expect(data.size()).toBe(2);
      expect(data.get(1)).toBe(terrain1);
      expect(data.get(2)).toBe(terrain2);
    });

    it('should find by name', () => {
      const terrain = new Terrain({
        id: 1,
        name: 'dirt',
        symbol: '.',
        color: 'brown',
      });

      data.set(1, terrain);

      expect(data.findByName('dirt')).toBe(terrain);
      expect(data.findByName('grass')).toBeUndefined();
    });

    it('should find by symbol', () => {
      const terrain = new Terrain({
        id: 1,
        name: 'dirt',
        symbol: '.',
        color: 'brown',
      });

      data.set(1, terrain);

      expect(data.findBySymbol('.')).toBe(terrain);
      expect(data.findBySymbol('#')).toBeUndefined();
    });

    it('should check if has terrain', () => {
      const terrain = new Terrain({
        id: 1,
        name: 'dirt',
        symbol: '.',
        color: 'brown',
      });

      data.set(1, terrain);

      expect(data.has(1)).toBe(true);
      expect(data.has(2)).toBe(false);
    });

    it('should clear all data', () => {
      const terrain1 = new Terrain({ id: 1, name: 'dirt', symbol: '.', color: 'brown' });
      const terrain2 = new Terrain({ id: 2, name: 'grass', symbol: '"', color: 'green' });

      data.setMany([terrain1, terrain2]);
      expect(data.size()).toBe(2);

      data.clear();
      expect(data.size()).toBe(0);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const terrain1 = new Terrain({
        id: 1,
        name: 'floor',
        symbol: '.',
        color: 'white',
        flags: new TerrainFlags([TerrainFlag.FLAT, TerrainFlag.TRANSPARENT]),
      });
      const terrain2 = new Terrain({
        id: 2,
        name: 'wall',
        symbol: '#',
        color: 'gray',
        flags: new TerrainFlags([TerrainFlag.WALL]),
      });
      const terrain3 = new Terrain({
        id: 3,
        name: 'door',
        symbol: '+',
        color: 'brown',
        flags: new TerrainFlags([TerrainFlag.DOOR, TerrainFlag.TRANSPARENT]),
      });

      data.setMany([terrain1, terrain2, terrain3]);
    });

    it('should filter by flag', () => {
      const transparent = data.filterByFlag('TRANSPARENT');

      expect(transparent.length).toBe(2);
      expect(transparent.every((t) => t.flags.has('TRANSPARENT' as any))).toBe(true);
    });

    it('should get flat terrains', () => {
      const flat = data.getFlatTerrains();

      expect(flat.length).toBe(1);
      expect(flat[0].name).toBe('floor');
    });

    it('should get walls', () => {
      const walls = data.getWalls();

      expect(walls.length).toBe(1);
      expect(walls[0].name).toBe('wall');
    });

    it('should get doors', () => {
      const doors = data.getDoors();

      expect(doors.length).toBe(1);
      expect(doors[0].name).toBe('door');
    });
  });
});

describe('TerrainParser', () => {
  let parser: TerrainParser;

  beforeEach(() => {
    parser = new TerrainParser();
  });

  describe('parse', () => {
    it('should parse minimal terrain', () => {
      const json: TerrainJson = {
        type: 'terrain',
        id: 't_dirt',
        name: 'dirt',
        symbol: '.',
        color: 'brown',
      };

      const terrain = parser.parse(json);

      expect(terrain.name).toBe('dirt');
      expect(terrain.symbol).toBe('.');
      expect(terrain.color).toBe('brown');
      expect(terrain.moveCost).toBe(2);
    });

    it('should parse full terrain', () => {
      const json: TerrainJson = {
        type: 'terrain',
        id: 't_dirt',
        name: 'dirt',
        description: 'It is dirt.',
        symbol: '.',
        color: 'brown',
        move_cost: 2,
        coverage: 0,
        flags: ['TRANSPARENT', 'FLAT', 'DIGGABLE'],
        open: 't_open',
        close: 't_close',
        bash: {
          sound: 'thump',
          str_min: 10,
          str_max: 20,
          furniture: [],
        },
        deconstruct: {
          furniture: 'f_wood_floor',
          time: 100,
        },
        connect_groups: 'FLOOR',
        connects_to: ['FLOOR', 'WOOD'],
      };

      const terrain = parser.parse(json);

      expect(terrain.name).toBe('dirt');
      expect(terrain.description).toBe('It is dirt.');
      expect(terrain.moveCost).toBe(2);
      expect(terrain.flags.size).toBe(3);
      expect(terrain.isBashable()).toBe(true);
      expect(terrain.isDeconstructable()).toBe(true);
      expect(terrain.canOpen()).toBe(true);
      expect(terrain.getConnectGroup()).toBe('FLOOR');
    });

    it('should parse bash info', () => {
      const json: TerrainJson = {
        type: 'terrain',
        id: 't_wall',
        name: 'wall',
        symbol: '#',
        color: 'gray',
        bash: {
          sound: 'crash',
          str_min: 20,
          str_max: 40,
          furniture: ['f_wooden_support'],
          items: [
            { item: '2x4', count: [2, 4] },
            { item: 'nail', count: [4, 8] },
          ],
          ter_set: 't_dirt',
          success_msg: 'You smash the wall!',
          fail_msg: 'You fail to smash the wall.',
        },
      };

      const terrain = parser.parse(json);

      expect(terrain.bash).toBeDefined();
      expect(terrain.bash?.sound).toBe('crash');
      expect(terrain.bash?.strMin).toBe(20);
      expect(terrain.bash?.strMax).toBe(40);
      expect(terrain.bash?.furniture).toEqual(['f_wooden_support']);
      expect(terrain.bash?.items).toHaveLength(2);
    });

    it('should parse multiple connect groups', () => {
      const json: TerrainJson = {
        type: 'terrain',
        id: 't_wall_wood',
        name: 'wooden wall',
        symbol: '#',
        color: 'brown',
        connect_groups: ['WALL', 'WOOD'],
      };

      const terrain = parser.parse(json);

      expect(terrain.connectGroups.size).toBe(2);
      expect(terrain.connectGroups.has('WALL')).toBe(true);
      expect(terrain.connectGroups.has('WOOD')).toBe(true);
    });

    it('should parse many terrains', () => {
      const json: TerrainJson[] = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green' },
        { type: 'terrain', id: 't_wall', name: 'wall', symbol: '#', color: 'gray' },
      ];

      const terrains = parser.parseMany(json);

      expect(terrains).toHaveLength(3);
      expect(terrains[0].name).toBe('dirt');
      expect(terrains[1].name).toBe('grass');
      expect(terrains[2].name).toBe('wall');
    });
  });
});

describe('TerrainLoader', () => {
  let loader: TerrainLoader;

  beforeEach(() => {
    loader = new TerrainLoader();
  });

  describe('loadFromJson', () => {
    it('should load terrains from JSON array', async () => {
      const json = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBe(2);
      expect(data.findByName('dirt')).toBeDefined();
      expect(data.findByName('grass')).toBeDefined();
    });

    it('should ignore non-terrain objects', async () => {
      const json = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'white' },
        { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBe(2);
      expect(data.findByName('dirt')).toBeDefined();
      expect(data.findByName('grass')).toBeDefined();
      expect(data.findByName('chair')).toBeUndefined();
    });

    it('should handle parse errors gracefully', async () => {
      const json = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'terrain', id: 't_invalid' }, // Missing required fields
        { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const json = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green' },
        { type: 'terrain', id: 't_wall', name: 'wall', symbol: '#', color: 'gray' },
        { type: 'terrain', id: 't_floor', name: 'floor', symbol: '.', color: 'white' },
      ];

      await loader.loadFromJson(json);
      const stats = loader.getStats();

      expect(stats.total).toBe(4);
      expect(stats.bySymbol['.']).toBe(2);
      expect(stats.bySymbol['"']).toBe(1);
      expect(stats.bySymbol['#']).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      const json = [
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
      ];

      await loader.loadFromJson(json);
      expect(loader.getData().size()).toBe(1);

      loader.clear();
      expect(loader.getData().size()).toBe(0);
    });
  });
});
