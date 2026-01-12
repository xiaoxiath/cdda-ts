import { describe, it, expect, beforeEach } from 'vitest';
import { Furniture } from '../Furniture';
import { FurnitureFlags, FurnitureFlag } from '../types';
import { FurnitureData } from '../FurnitureData';
import { FurnitureParser, FurnitureJson } from '../FurnitureParser';
import { FurnitureLoader } from '../FurnitureLoader';

describe('FurnitureFlags', () => {
  describe('fromJson', () => {
    it('should create flags from JSON array', () => {
      const flags = FurnitureFlags.fromJson(['TRANSPARENT', 'FLAMMABLE', 'WORKBENCH']);

      expect(flags.size).toBe(3);
      expect(flags.has(FurnitureFlag.TRANSPARENT)).toBe(true);
      expect(flags.has(FurnitureFlag.FLAMMABLE)).toBe(true);
      expect(flags.has(FurnitureFlag.WORKBENCH)).toBe(true);
    });

    it('should handle empty array', () => {
      const flags = FurnitureFlags.fromJson([]);
      expect(flags.size).toBe(0);
    });

    it('should ignore invalid flags', () => {
      const flags = FurnitureFlags.fromJson(['TRANSPARENT', 'INVALID_FLAG']);
      expect(flags.size).toBe(1);
      expect(flags.has(FurnitureFlag.TRANSPARENT)).toBe(true);
    });
  });

  describe('query methods', () => {
    it('should check transparency', () => {
      const flags = new FurnitureFlags([FurnitureFlag.TRANSPARENT]);
      expect(flags.isTransparent()).toBe(true);

      const flags2 = new FurnitureFlags([FurnitureFlag.OPAQUE]);
      expect(flags2.isTransparent()).toBe(false);
    });

    it('should check sittable', () => {
      const flags1 = new FurnitureFlags([FurnitureFlag.SITTABLE]);
      expect(flags1.isSittable()).toBe(true);

      const flags2 = new FurnitureFlags([FurnitureFlag.MOUNTABLE]);
      expect(flags2.isSittable()).toBe(true);
    });

    it('should check workbench', () => {
      const flags = new FurnitureFlags([FurnitureFlag.WORKBENCH]);
      expect(flags.isWorkbench()).toBe(true);
    });

    it('should check container', () => {
      const flags = new FurnitureFlags([FurnitureFlag.CONTAINER]);
      expect(flags.isContainer()).toBe(true);
    });

    it('should check operable', () => {
      const flags = new FurnitureFlags([FurnitureFlag.OPERABLE]);
      expect(flags.isOperable()).toBe(true);
    });

    it('should check plant', () => {
      const flags = new FurnitureFlags([FurnitureFlag.PLANT]);
      expect(flags.isPlant()).toBe(true);
    });

    it('should check flammable', () => {
      const flags1 = new FurnitureFlags([FurnitureFlag.FLAMMABLE]);
      expect(flags1.isFlammable()).toBe(true);

      const flags2 = new FurnitureFlags([FurnitureFlag.FLAMMABLE_ASH]);
      expect(flags2.isFlammable()).toBe(true);
    });

    it('should check wood', () => {
      const flags = new FurnitureFlags([FurnitureFlag.WOOD]);
      expect(flags.isWood()).toBe(true);
    });

    it('should check metal', () => {
      const flags = new FurnitureFlags([FurnitureFlag.METAL]);
      expect(flags.isMetal()).toBe(true);
    });

    it('should check blocks door', () => {
      const flags = new FurnitureFlags([FurnitureFlag.BLOCKSDOOR]);
      expect(flags.blocksDoor()).toBe(true);
    });

    it('should check can place items', () => {
      const flags1 = new FurnitureFlags([FurnitureFlag.FLAT]);
      expect(flags1.canPlaceItems()).toBe(true);

      const flags2 = new FurnitureFlags([FurnitureFlag.CAN_PUTITEMS_VISIBLE]);
      expect(flags2.canPlaceItems()).toBe(true);

      const flags3 = new FurnitureFlags([FurnitureFlag.NOITEM]);
      expect(flags3.canPlaceItems()).toBe(false);
    });
  });
});

describe('Furniture', () => {
  let furniture: Furniture;

  beforeEach(() => {
    furniture = new Furniture();
  });

  describe('creation', () => {
    it('should create furniture with defaults', () => {
      expect(furniture.id).toBe(0);
      expect(furniture.name).toBe('');
      expect(furniture.symbol).toBe('?');
      expect(furniture.color).toBe('white');
      expect(furniture.moveCost).toBe(0);
      expect(furniture.comfort).toBe(0);
    });

    it('should create furniture with properties', () => {
      const f = new Furniture({
        id: 1,
        name: 'chair',
        description: 'A wooden chair.',
        symbol: '_',
        color: 'brown',
        moveCostMod: 1,
        comfort: 1,
        requiredStr: 8,
        flags: new FurnitureFlags([FurnitureFlag.TRANSPARENT, FurnitureFlag.FLAMMABLE_ASH]),
      });

      expect(f.name).toBe('chair');
      expect(f.symbol).toBe('_');
      expect(f.color).toBe('brown');
      expect(f.comfort).toBe(1);
      expect(f.requiredStr).toBe(8);
    });
  });

  describe('query methods', () => {
    it('should check transparency', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.TRANSPARENT]),
      });
      expect(f.isTransparent()).toBe(true);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.OPAQUE]),
      });
      expect(f2.isTransparent()).toBe(false);
    });

    it('should check passability', () => {
      const f = new Furniture({ moveCost: 1 });
      expect(f.isPassable()).toBe(true);

      const f2 = new Furniture({ moveCost: 0 });
      expect(f2.isPassable()).toBe(false);
    });

    it('should check if bashable', () => {
      const f = new Furniture({
        bash: { strMin: 2, strMax: 4 },
      });
      expect(f.isBashable()).toBe(true);
    });

    it('should check if deconstructable', () => {
      const f = new Furniture({
        deconstruct: { time: 50 },
      });
      expect(f.isDeconstructable()).toBe(true);
    });

    it('should check sittable', () => {
      const f1 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.SITTABLE]),
      });
      expect(f1.isSittable()).toBe(true);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.MOUNTABLE]),
      });
      expect(f2.isSittable()).toBe(true);

      const f3 = new Furniture({ comfort: 5 });
      expect(f3.isSittable()).toBe(true);
    });

    it('should check workbench', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: { multiplier: 2.0, allowedMass: 20000, allowedVolume: 10000 },
      });
      expect(f.isWorkbench()).toBe(true);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
      });
      expect(f2.isWorkbench()).toBe(false);
    });

    it('should check plant', () => {
      const f = new Furniture({
        plant: {
          transform: 'f_plant',
          base: 'f_plant_seed',
          growthMultiplier: 1.0,
          harvestMultiplier: 1.0,
        },
      });
      expect(f.isPlant()).toBe(true);
    });

    it('should check container', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.CONTAINER]),
      });
      expect(f.isContainer()).toBe(true);
    });

    it('should check emits field', () => {
      const f = new Furniture({
        emitters: new Map([['fd_fire', { field: 'fd_fire', density: 1, chance: 20 }]]),
      });
      expect(f.emitsField('fd_fire')).toBe(true);
      expect(f.emitsField('fd_smoke')).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get bash difficulty', () => {
      const f = new Furniture({
        bash: { strMin: 5, strMax: 15 },
      });
      expect(f.getBashDifficulty()).toBe(10);
    });

    it('should return -1 when not bashable', () => {
      expect(furniture.getBashDifficulty()).toBe(-1);
    });

    it('should get move cost modifier', () => {
      const f = new Furniture({ moveCostMod: 2 });
      expect(f.getMoveCostModifier()).toBe(2);
    });

    it('should get comfort', () => {
      const f = new Furniture({ comfort: 5 });
      expect(f.getComfort()).toBe(5);
    });

    it('should get required strength', () => {
      const f = new Furniture({ requiredStr: 15 });
      expect(f.getRequiredStrength()).toBe(15);
    });

    it('should get mass', () => {
      const f = new Furniture({ mass: 10000 });
      expect(f.getMass()).toBe(10000);
    });

    it('should get volume', () => {
      const f = new Furniture({ volume: 5000 });
      expect(f.getVolume()).toBe(5000);
    });

    it('should get display info', () => {
      const f = new Furniture({
        name: 'chair',
        symbol: '_',
        color: 'brown',
      });
      const info = f.getDisplayInfo();
      expect(info.symbol).toBe('_');
      expect(info.color).toBe('brown');
      expect(info.name).toBe('chair');
    });

    it('should get light', () => {
      const f = new Furniture({
        emittedLight: 5,
        light: 2,
      });
      expect(f.getLight()).toBe(5);

      const f2 = new Furniture({
        emittedLight: 0,
        light: 3,
      });
      expect(f2.getLight()).toBe(3);
    });

    it('should check if emits light', () => {
      const f1 = new Furniture({ emittedLight: 5 });
      expect(f1.emitsLight()).toBe(true);

      const f2 = new Furniture({ light: 3 });
      expect(f2.emitsLight()).toBe(true);

      const f3 = new Furniture({ emittedLight: 0, light: 0 });
      expect(f3.emitsLight()).toBe(false);
    });

    it('should check if blocks vision', () => {
      const f1 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.TRANSPARENT]),
      });
      expect(f1.blocksVision()).toBe(false);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.OPAQUE]),
      });
      expect(f2.blocksVision()).toBe(true);
    });

    it('should check if blocks movement', () => {
      const f1 = new Furniture({ moveCost: 1 });
      expect(f1.blocksMovement()).toBe(false);

      const f2 = new Furniture({ moveCost: 0 });
      expect(f2.blocksMovement()).toBe(true);
    });

    it('should check requires moving', () => {
      const f1 = new Furniture({ requiredStr: 10 });
      expect(f1.requiresMoving()).toBe(true);

      const f2 = new Furniture({ requiredStr: 0 });
      expect(f2.requiresMoving()).toBe(false);
    });

    it('should check if flammable', () => {
      const f1 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.FLAMMABLE]),
      });
      expect(f1.isFlammable()).toBe(true);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.FLAMMABLE_ASH]),
      });
      expect(f2.isFlammable()).toBe(true);
    });

    it('should check blocks door', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.BLOCKSDOOR]),
      });
      expect(f.blocksDoor()).toBe(true);
    });

    it('should check can place items on', () => {
      const f1 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.FLAT]),
      });
      expect(f1.canPlaceItemsOn()).toBe(true);

      const f2 = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.NOITEM]),
      });
      expect(f2.canPlaceItemsOn()).toBe(false);
    });
  });

  describe('workbench methods', () => {
    it('should get workbench info', () => {
      const wb = { multiplier: 2.5, allowedMass: 30000, allowedVolume: 15000 };
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: wb,
      });
      expect(f.getWorkbenchInfo()).toBe(wb);
    });

    it('should get workbench multiplier', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: { multiplier: 2.5 },
      });
      expect(f.getWorkbenchMultiplier()).toBe(2.5);
    });

    it('should get allowed mass', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: { multiplier: 1.5, allowedMass: 20000 },
      });
      expect(f.getAllowedMass()).toBe(20000);
    });

    it('should get allowed volume', () => {
      const f = new Furniture({
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: { multiplier: 1.5, allowedVolume: 10000 },
      });
      expect(f.getAllowedVolume()).toBe(10000);
    });

    it('should return default values when no workbench', () => {
      const f = new Furniture();
      expect(f.getWorkbenchMultiplier()).toBe(1.0);
      expect(f.getAllowedMass()).toBe(0);
      expect(f.getAllowedVolume()).toBe(0);
    });
  });

  describe('plant methods', () => {
    it('should get plant data', () => {
      const plantData = {
        transform: 'f_plant',
        base: 'f_plant_seed',
        growthMultiplier: 1.5,
        harvestMultiplier: 2.0,
      };
      const f = new Furniture({ plant: plantData });
      expect(f.getPlantData()).toBe(plantData);
    });

    it('should get plant transform', () => {
      const f = new Furniture({
        plant: {
          transform: 'f_plant',
          base: 'f_plant_seed',
          growthMultiplier: 1.0,
          harvestMultiplier: 1.0,
        },
      });
      expect(f.getPlantTransform()).toBe('f_plant');
    });

    it('should get plant base', () => {
      const f = new Furniture({
        plant: {
          transform: 'f_plant',
          base: 'f_plant_seed',
          growthMultiplier: 1.0,
          harvestMultiplier: 1.0,
        },
      });
      expect(f.getPlantBase()).toBe('f_plant_seed');
    });

    it('should get growth multiplier', () => {
      const f = new Furniture({
        plant: {
          transform: 'f_plant',
          base: 'f_plant_seed',
          growthMultiplier: 1.5,
          harvestMultiplier: 1.0,
        },
      });
      expect(f.getGrowthMultiplier()).toBe(1.5);
    });

    it('should get harvest multiplier', () => {
      const f = new Furniture({
        plant: {
          transform: 'f_plant',
          base: 'f_plant_seed',
          growthMultiplier: 1.0,
          harvestMultiplier: 2.0,
        },
      });
      expect(f.getHarvestMultiplier()).toBe(2.0);
    });

    it('should return default values when no plant', () => {
      const f = new Furniture();
      expect(f.getPlantTransform()).toBeUndefined();
      expect(f.getPlantBase()).toBeUndefined();
      expect(f.getGrowthMultiplier()).toBe(1.0);
      expect(f.getHarvestMultiplier()).toBe(1.0);
    });
  });

  describe('emitters', () => {
    it('should get emitter data', () => {
      const emission = { field: 'fd_fire', density: 1, chance: 20 };
      const f = new Furniture({
        emitters: new Map([['fire', emission] as [string, any]]),
      });
      expect(f.getEmitterData('fire')).toBe(emission);
    });
  });
});

describe('FurnitureData', () => {
  let data: FurnitureData;

  beforeEach(() => {
    data = new FurnitureData();
  });

  describe('storage', () => {
    it('should store and retrieve furniture', () => {
      const furniture = new Furniture({
        id: 1,
        name: 'chair',
        symbol: '_',
        color: 'brown',
      });

      data.set(1, furniture);
      expect(data.get(1)).toBe(furniture);
    });

    it('should store multiple furnitures', () => {
      const f1 = new Furniture({ id: 1, name: 'chair', symbol: '_', color: 'brown' });
      const f2 = new Furniture({ id: 2, name: 'table', symbol: 't', color: 'brown' });

      data.setMany([f1, f2]);

      expect(data.size()).toBe(2);
      expect(data.get(1)).toBe(f1);
      expect(data.get(2)).toBe(f2);
    });

    it('should find by name', () => {
      const f = new Furniture({ id: 1, name: 'chair', symbol: '_', color: 'brown' });
      data.set(1, f);
      expect(data.findByName('chair')).toBe(f);
      expect(data.findByName('table')).toBeUndefined();
    });

    it('should find by symbol', () => {
      const f = new Furniture({ id: 1, name: 'chair', symbol: '_', color: 'brown' });
      data.set(1, f);
      expect(data.findBySymbol('_')).toBe(f);
      expect(data.findBySymbol('#')).toBeUndefined();
    });

    it('should check if has furniture', () => {
      const f = new Furniture({ id: 1, name: 'chair', symbol: '_', color: 'brown' });
      data.set(1, f);
      expect(data.has(1)).toBe(true);
      expect(data.has(2)).toBe(false);
    });

    it('should clear all data', () => {
      const f1 = new Furniture({ id: 1, name: 'chair', symbol: '_', color: 'brown' });
      const f2 = new Furniture({ id: 2, name: 'table', symbol: 't', color: 'brown' });

      data.setMany([f1, f2]);
      expect(data.size()).toBe(2);

      data.clear();
      expect(data.size()).toBe(0);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const f1 = new Furniture({
        id: 1,
        name: 'chair',
        symbol: '_',
        color: 'brown',
        comfort: 1,
        flags: new FurnitureFlags([FurnitureFlag.TRANSPARENT]),
      });
      const f2 = new Furniture({
        id: 2,
        name: 'workbench',
        symbol: 'W',
        color: 'blue',
        flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
        workbench: { multiplier: 2.0, allowedMass: 20000, allowedVolume: 10000 },
      });
      const f3 = new Furniture({
        id: 3,
        name: 'crate',
        symbol: 'c',
        color: 'brown',
        flags: new FurnitureFlags([FurnitureFlag.CONTAINER]),
      });

      data.setMany([f1, f2, f3]);
    });

    it('should filter by flag', () => {
      const transparent = data.filterByFlag('TRANSPARENT');
      expect(transparent.length).toBe(1);
      expect(transparent[0].name).toBe('chair');
    });

    it('should get workbenches', () => {
      const workbenches = data.getWorkbenches();
      expect(workbenches.length).toBe(1);
      expect(workbenches[0].name).toBe('workbench');
    });

    it('should get sittable', () => {
      const sittable = data.getSittable();
      expect(sittable.length).toBe(1);
      expect(sittable[0].name).toBe('chair');
    });

    it('should get containers', () => {
      const containers = data.getContainers();
      expect(containers.length).toBe(1);
      expect(containers[0].name).toBe('crate');
    });

    it('should get light emitters', () => {
      const f = new Furniture({
        id: 4,
        name: 'lamp',
        symbol: '5',
        color: 'yellow',
        emittedLight: 5,
      });
      data.set(4, f);

      const emitters = data.getLightEmitters();
      expect(emitters.length).toBe(1);
      expect(emitters[0].name).toBe('lamp');
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      const f1 = new Furniture({ id: 1, name: 'bed', symbol: '=', color: 'cyan', comfort: 10 });
      const f2 = new Furniture({ id: 2, name: 'chair', symbol: '_', color: 'brown', comfort: 1 });
      const f3 = new Furniture({ id: 3, name: 'sofa', symbol: '=', color: 'green', comfort: 5 });

      data.setMany([f1, f2, f3]);
    });

    it('should sort by comfort', () => {
      const sorted = data.sortByComfort();
      expect(sorted[0].name).toBe('bed');
      expect(sorted[1].name).toBe('sofa');
      expect(sorted[2].name).toBe('chair');
    });
  });
});

describe('FurnitureParser', () => {
  let parser: FurnitureParser;

  beforeEach(() => {
    parser = new FurnitureParser();
  });

  describe('parse', () => {
    it('should parse minimal furniture', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_chair',
        name: 'chair',
        symbol: '_',
        color: 'brown',
      };

      const furniture = parser.parse(json);

      expect(furniture.name).toBe('chair');
      expect(furniture.symbol).toBe('_');
      expect(furniture.color).toBe('brown');
    });

    it('should parse full furniture', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_workbench',
        name: 'workbench',
        description: 'A sturdy workbench.',
        symbol: 'W',
        color: 'blue',
        move_cost_mod: 1,
        coverage: 50,
        flags: ['TRANSPARENT', 'WORKBENCH', 'FLAT'],
        comfort: 0,
        required_str: 25,
        mass: 40000,
        workbench: {
          multiplier: 1.5,
          allowedMass: 30000,
          allowedVolume: 15000,
        },
        bash: {
          str_min: 20,
          str_max: 50,
          sound: 'crash',
        },
      };

      const furniture = parser.parse(json);

      expect(furniture.name).toBe('workbench');
      expect(furniture.isWorkbench()).toBe(true);
      expect(furniture.getRequiredStrength()).toBe(25);
      expect(furniture.getMass()).toBe(40000);
    });

    it('should parse bash info', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_chair',
        name: 'chair',
        symbol: '_',
        color: 'brown',
        bash: {
          str_min: 2,
          str_max: 4,
          sound: 'crash',
          items: [
            { item: '2x4', count: [1, 2] },
            { item: 'splinter', count: [1, 3] },
          ],
        },
      };

      const furniture = parser.parse(json);

      expect(furniture.isBashable()).toBe(true);
      expect(furniture.getBashDifficulty()).toBe(3);
    });

    it('should parse workbench', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_workbench',
        name: 'workbench',
        symbol: 'W',
        color: 'blue',
        flags: ['WORKBENCH'],
        workbench: {
          multiplier: 2.0,
          allowed_mass: 30000,
          allowed_volume: 15000,
        },
      };

      const furniture = parser.parse(json);

      expect(furniture.isWorkbench()).toBe(true);
      expect(furniture.getWorkbenchMultiplier()).toBe(2.0);
      expect(furniture.getAllowedMass()).toBe(30000);
      expect(furniture.getAllowedVolume()).toBe(15000);
    });

    it('should parse plant data', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_sapling',
        name: 'sapling',
        symbol: '♠',
        color: 'green',
        flags: ['PLANT'],
        plant: {
          transform: 'f_plant',
          base: 'f_sapling',
          growth_multiplier: 1.5,
          harvest_multiplier: 2.0,
        },
      };

      const furniture = parser.parse(json);

      expect(furniture.isPlant()).toBe(true);
      expect(furniture.getPlantTransform()).toBe('f_plant');
      expect(furniture.getPlantBase()).toBe('f_sapling');
      expect(furniture.getGrowthMultiplier()).toBe(1.5);
      expect(furniture.getHarvestMultiplier()).toBe(2.0);
    });

    it('should parse emitters', () => {
      const json: FurnitureJson = {
        type: 'furniture',
        id: 'f_oven',
        name: 'oven',
        symbol: 'U',
        color: 'gray',
        emitted_light: 3,
        emitters: {
          fire: {
            field: 'fd_fire',
            density: 1,
            chance: 20,
          },
        },
      };

      const furniture = parser.parse(json);

      expect(furniture.emitsLight()).toBe(true);
      expect(furniture.emitsField('fire')).toBe(true);
    });

    it('should parse many furnitures', () => {
      const json: FurnitureJson[] = [
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'brown' },
        { type: 'furniture', id: 'f_table', name: 'table', symbol: 't', color: 'brown' },
        { type: 'furniture', id: 'f_bed', name: 'bed', symbol: '=', color: 'cyan' },
      ];

      const furnitures = parser.parseMany(json);

      expect(furnitures).toHaveLength(3);
      expect(furnitures[0].name).toBe('chair');
      expect(furnitures[1].name).toBe('table');
      expect(furnitures[2].name).toBe('bed');
    });
  });
});

describe('FurnitureLoader', () => {
  let loader: FurnitureLoader;

  beforeEach(() => {
    loader = new FurnitureLoader();
  });

  describe('loadFromJson', () => {
    it('should load furnitures from JSON array', async () => {
      const json = [
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'brown' },
        { type: 'furniture', id: 'f_table', name: 'table', symbol: 't', color: 'brown' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBe(2);
      expect(data.findByName('chair')).toBeDefined();
      expect(data.findByName('table')).toBeDefined();
    });

    it('should ignore non-furniture objects', async () => {
      const json = [
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'brown' },
        { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown' },
        { type: 'furniture', id: 'f_table', name: 'table', symbol: 't', color: 'brown' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBe(2);
      expect(data.findByName('chair')).toBeDefined();
      expect(data.findByName('table')).toBeDefined();
      expect(data.findByName('dirt')).toBeUndefined();
    });

    it('should handle parse errors gracefully', async () => {
      const json = [
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'brown' },
        { type: 'furniture', id: 'f_invalid' }, // Missing required fields
        { type: 'furniture', id: 'f_table', name: 'table', symbol: 't', color: 'brown' },
      ];

      const data = await loader.loadFromJson(json);

      expect(data.size()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const json = [
        { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '_', color: 'brown', comfort: 1 },
        {
          type: 'furniture',
          id: 'f_workbench',
          name: 'workbench',
          symbol: 'W',
          color: 'blue',
          flags: ['WORKBENCH'],
          workbench: { multiplier: 2.0 },
        },
        { type: 'furniture', id: 'f_lamp', name: 'lamp', symbol: '5', color: 'yellow', emitted_light: 5 },
      ];

      await loader.loadFromJson(json);
      const stats = loader.getStats();

      expect(stats.total).toBe(3);
      expect(stats.workbenches).toBe(1);
      expect(stats.lightEmitters).toBe(1);
    });
  });
});
