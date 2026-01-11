import { describe, it, expect, beforeEach } from 'vitest';
import { FieldEntry } from '../FieldEntry';
import { FieldType } from '../FieldType';
import { FieldPhase, FieldTypeFlags, FieldTypeFlag } from '../types';
import { FieldData } from '../FieldData';

describe('FieldEntry', () => {
  describe('creation', () => {
    it('should create entry with defaults', () => {
      const entry = new FieldEntry();

      expect(entry.type).toBe('');
      expect(entry.intensity).toBe(1);
      expect(entry.age).toBe(0);
      expect(entry.decayTime).toBe(0);
      expect(entry.isAlive).toBe(true);
    });

    it('should create entry with properties', () => {
      const entry = new FieldEntry({
        type: 'fd_fire',
        intensity: 2,
        age: 10,
        decayTime: 100,
        isAlive: true,
      });

      expect(entry.type).toBe('fd_fire');
      expect(entry.intensity).toBe(2);
      expect(entry.age).toBe(10);
      expect(entry.decayTime).toBe(100);
    });

    it('should create entry using factory method', () => {
      const entry = FieldEntry.create('fd_smoke', 3);

      expect(entry.type).toBe('fd_smoke');
      expect(entry.intensity).toBe(3);
      expect(entry.age).toBe(0);
      expect(entry.isAlive).toBe(true);
    });
  });

  describe('query methods', () => {
    let entry: FieldEntry;

    beforeEach(() => {
      entry = new FieldEntry({
        type: 'fd_fire',
        intensity: 2,
        age: 50,
        decayTime: 100,
        isAlive: true,
      });
    });

    it('should check if alive', () => {
      expect(entry.checkAlive()).toBe(true);

      const deadEntry = entry.set('isAlive', false);
      expect(deadEntry.checkAlive()).toBe(false);
    });

    it('should check if expired', () => {
      expect(entry.isExpired()).toBe(false);

      const expiredEntry = entry.set('age', 100);
      expect(expiredEntry.isExpired()).toBe(true);

      const expiredEntry2 = entry.set('age', 150);
      expect(expiredEntry2.isExpired()).toBe(true);
    });

    it('should check if young', () => {
      expect(entry.isYoung(100)).toBe(true);
      expect(entry.isYoung(50)).toBe(false);
      expect(entry.isYoung(25)).toBe(false);
    });

    it('should get age progress', () => {
      expect(entry.getAgeProgress()).toBe(0.5);

      const youngEntry = entry.set('age', 25);
      expect(youngEntry.getAgeProgress()).toBe(0.25);

      const oldEntry = entry.set('age', 75);
      expect(oldEntry.getAgeProgress()).toBe(0.75);

      const noDecayEntry = entry.set('decayTime', 0);
      expect(noDecayEntry.getAgeProgress()).toBe(0);
    });
  });

  describe('mutations', () => {
    let entry: FieldEntry;

    beforeEach(() => {
      entry = FieldEntry.create('fd_fire', 2);
    });

    it('should update age', () => {
      const updated = entry.update(10);
      expect(updated.age).toBe(10);
      expect(entry.age).toBe(0); // 原对象不变
    });

    it('should decay intensity', () => {
      const decayed = entry.decayIntensity();
      expect(decayed.intensity).toBe(1);
      expect(decayed.isAlive).toBe(true);

      const decayedAgain = decayed.decayIntensity();
      expect(decayedAgain.intensity).toBe(0);
      expect(decayedAgain.isAlive).toBe(false);
    });

    it('should increase intensity', () => {
      const increased = entry.increaseIntensity(1, 3);
      expect(increased.intensity).toBe(3);

      const maxed = entry.increaseIntensity(5, 3);
      expect(maxed.intensity).toBe(3);
    });

    it('should set intensity', () => {
      const setEntry = entry.setIntensity(3);
      expect(setEntry.intensity).toBe(3);

      const zeroEntry = entry.setIntensity(0);
      expect(zeroEntry.intensity).toBe(0);
    });

    it('should set decay time', () => {
      const withDecay = entry.setDecayTime(100);
      expect(withDecay.decayTime).toBe(100);
    });

    it('should kill entry', () => {
      const killed = entry.kill();
      expect(killed.isAlive).toBe(false);
      expect(killed.intensity).toBe(0);
    });

    it('should clone entry', () => {
      const cloned = entry.clone();

      expect(cloned.type).toBe(entry.type);
      expect(cloned.intensity).toBe(entry.intensity);
      expect(cloned.age).toBe(entry.age);

      // 确保是独立副本
      const modified = cloned.setIntensity(3);
      expect(entry.intensity).toBe(2);
      expect(modified.intensity).toBe(3);
    });
  });

  describe('utility methods', () => {
    it('should get normalized intensity', () => {
      const entry = FieldEntry.create('fd_fire', 2);

      expect(entry.getNormalizedIntensity(3)).toBeCloseTo(0.667, 2);
      expect(entry.getNormalizedIntensity(4)).toBe(0.5);
    });

    it('should compare intensity', () => {
      const entry1 = FieldEntry.create('fd_fire', 1);
      const entry2 = FieldEntry.create('fd_fire', 2);
      const entry3 = FieldEntry.create('fd_fire', 3);

      expect(entry2.isStrongerThan(entry1)).toBe(true);
      expect(entry2.isStrongerThan(entry2)).toBe(false);
      expect(entry2.isStrongerThan(entry3)).toBe(false);
    });

    it('should check at max intensity', () => {
      const entry1 = FieldEntry.create('fd_fire', 3);
      const entry2 = FieldEntry.create('fd_fire', 2);

      expect(entry1.isAtMaxIntensity(3)).toBe(true);
      expect(entry2.isAtMaxIntensity(3)).toBe(false);
      expect(entry1.isAtMaxIntensity(4)).toBe(false);
    });

    it('should get display string', () => {
      const entry = FieldEntry.create('fd_fire', 2);
      expect(entry.getDisplayString()).toBe('fd_fire:2');
    });

    it('should convert to and from JSON', () => {
      const entry = new FieldEntry({
        type: 'fd_fire',
        intensity: 2,
        age: 10,
        decayTime: 100,
        isAlive: true,
      });

      const json = entry.toJSON();
      expect(json.type).toBe('fd_fire');
      expect(json.intensity).toBe(2);
      expect(json.age).toBe(10);
      expect(json.decayTime).toBe(100);

      const restored = FieldEntry.fromJSON(json);
      expect(restored.type).toBe(entry.type);
      expect(restored.intensity).toBe(entry.intensity);
      expect(restored.age).toBe(entry.age);
    });
  });
});

describe('FieldType', () => {
  let fieldType: FieldType;

  beforeEach(() => {
    fieldType = new FieldType({
      id: 'fd_fire',
      name: 'fire',
      description: 'Burns things',
      intensityLevels: [
        { name: 'small flames', color: 'red', symbol: '^' },
        { name: 'flames', color: 'red', symbol: '^' },
        { name: 'inferno', color: 'red', symbol: '^' },
      ],
      halfLife: 100,
      phase: FieldPhase.PLASMA,
      acceleratedDecay: true,
      displayField: true,
      displayPriority: 10,
      transparent: true,
      dangerLevel: 3,
      fireSpreadChance: 10,
      fireIgnitionChance: 20,
      lightEmitted: 5,
      lightConsumed: 0,
      flags: new FieldTypeFlags([FieldTypeFlag.FIRE, FieldTypeFlag.DANGEROUS]),
    });
  });

  describe('intensity levels', () => {
    it('should get max intensity', () => {
      expect(fieldType.getMaxIntensity()).toBe(3);
    });

    it('should check valid intensity', () => {
      expect(fieldType.isValidIntensity(1)).toBe(true);
      expect(fieldType.isValidIntensity(3)).toBe(true);
      expect(fieldType.isValidIntensity(0)).toBe(false);
      expect(fieldType.isValidIntensity(4)).toBe(false);
    });

    it('should get intensity level', () => {
      const level1 = fieldType.getIntensityLevel(1);
      expect(level1?.name).toBe('small flames');

      const level3 = fieldType.getIntensityLevel(3);
      expect(level3?.name).toBe('inferno');

      const invalid = fieldType.getIntensityLevel(4);
      expect(invalid).toBeUndefined();
    });

    it('should get intensity name', () => {
      expect(fieldType.getIntensityName(1)).toBe('small flames');
      expect(fieldType.getIntensityName(2)).toBe('flames');
      expect(fieldType.getIntensityName(4)).toContain('fire');
    });

    it('should get intensity color', () => {
      expect(fieldType.getIntensityColor(1)).toBe('red');
      expect(fieldType.getIntensityColor(2)).toBe('red');
    });

    it('should get intensity symbol', () => {
      expect(fieldType.getIntensitySymbol(1)).toBe('^');
      expect(fieldType.getIntensitySymbol(2)).toBe('^');
    });
  });

  describe('decay', () => {
    it('should calculate decay time', () => {
      const decayTime = fieldType.calculateDecayTime();
      expect(decayTime).toBe(300); // 100 * 3
    });

    it('should check accelerated decay', () => {
      expect(fieldType.shouldAccelerateDecay()).toBe(true);

      const noAccel = fieldType.set('acceleratedDecay', false);
      expect(noAccel.shouldAccelerateDecay()).toBe(false);
    });
  });

  describe('query methods', () => {
    it('should check display', () => {
      expect(fieldType.shouldDisplay()).toBe(true);

      const hidden = fieldType.set('displayField', false);
      expect(hidden.shouldDisplay()).toBe(false);
    });

    it('should check transparency', () => {
      expect(fieldType.isTransparent()).toBe(true);

      const opaque = fieldType.set('transparent', false);
      expect(opaque.isTransparent()).toBe(false);
    });

    it('should check blocks vision', () => {
      expect(fieldType.blocksVision()).toBe(false);

      const opaque = fieldType.set('transparent', false);
      expect(opaque.blocksVision()).toBe(true);
    });

    it('should check dangerous', () => {
      expect(fieldType.isDangerous()).toBe(true);

      const safe = fieldType.set('dangerLevel', 0).set('flags', new FieldTypeFlags());
      expect(safe.isDangerous()).toBe(false);
    });

    it('should check can spread', () => {
      expect(fieldType.canSpread()).toBe(true);

      const noSpread = fieldType.set('fireSpreadChance', 0).set('flags', new FieldTypeFlags());
      expect(noSpread.canSpread()).toBe(false);
    });

    it('should check can ignite', () => {
      expect(fieldType.canIgnite()).toBe(true);

      const noIgnite = fieldType.set('fireIgnitionChance', 0);
      expect(noIgnite.canIgnite()).toBe(false);
    });

    it('should check emits light', () => {
      expect(fieldType.emitsLight()).toBe(true);
      expect(fieldType.getLightModifier()).toBe(5);
    });

    it('should check consumes light', () => {
      expect(fieldType.consumesLight()).toBe(false);

      const consumes = fieldType.set('lightConsumed', 3);
      expect(consumes.consumesLight()).toBe(true);
      expect(consumes.getLightModifier()).toBe(2); // 5 - 3 = 2
    });

    it('should check phase', () => {
      expect(fieldType.getPhase()).toBe(FieldPhase.PLASMA);
      expect(fieldType.isPhase(FieldPhase.PLASMA)).toBe(true);
      expect(fieldType.isPhase(FieldPhase.GAS)).toBe(false);
    });

    it('should check is fire', () => {
      expect(fieldType.isFire()).toBe(true);
    });

    it('should check is liquid', () => {
      expect(fieldType.isLiquid()).toBe(false);

      const liquid = fieldType.set('phase', FieldPhase.LIQUID);
      expect(liquid.isLiquid()).toBe(true);
    });

    it('should check is gas', () => {
      expect(fieldType.isGas()).toBe(false);

      const gas = fieldType.set('phase', FieldPhase.GAS);
      expect(gas.isGas()).toBe(true);
    });
  });

  describe('display info', () => {
    it('should get display info', () => {
      const info = fieldType.getDisplayInfo(2);

      expect(info.symbol).toBe('^');
      expect(info.color).toBe('red');
      expect(info.name).toBe('flames');
      expect(info.priority).toBe(10);
    });
  });

  describe('create entry', () => {
    it('should create entry with default intensity', () => {
      const entry = fieldType.createEntry();

      expect(entry.type).toBe('fd_fire');
      expect(entry.intensity).toBe(1);
      expect(entry.age).toBe(0);
      expect(entry.isAlive).toBe(true);
    });

    it('should create entry with specified intensity', () => {
      const entry = fieldType.createEntry(3);

      expect(entry.intensity).toBe(3);
    });

    it('should clamp intensity to max', () => {
      const entry = fieldType.createEntry(5);

      expect(entry.intensity).toBe(3);
    });
  });

  describe('compare priority', () => {
    it('should compare display priority', () => {
      const lowPriority = fieldType.set('displayPriority', 5);
      const highPriority = fieldType.set('displayPriority', 10);

      expect(highPriority.comparePriority(lowPriority)).toBeGreaterThan(0);
      expect(lowPriority.comparePriority(highPriority)).toBeLessThan(0);
      expect(fieldType.comparePriority(fieldType)).toBe(0);
    });
  });
});

describe('FieldData', () => {
  let data: FieldData;

  beforeEach(() => {
    data = new FieldData();
  });

  describe('storage', () => {
    it('should store and retrieve field type', () => {
      const fieldType = new FieldType({
        id: 'fd_test',
        name: 'test',
        intensityLevels: [{ name: 'test' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
      });

      data.set('fd_test', fieldType);
      expect(data.get('fd_test')).toBe(fieldType);
    });

    it('should store multiple field types', () => {
      const ft1 = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [{ name: 'fire' }],
        halfLife: 100,
        phase: FieldPhase.PLASMA,
        flags: new FieldTypeFlags([FieldTypeFlag.FIRE]),
      });
      const ft2 = new FieldType({
        id: 'fd_smoke',
        name: 'smoke',
        intensityLevels: [{ name: 'smoke' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
        flags: new FieldTypeFlags([FieldTypeFlag.SMOKE]),
      });

      data.setMany([ft1, ft2]);

      expect(data.size()).toBe(2);
      expect(data.get('fd_fire')).toBe(ft1);
      expect(data.get('fd_smoke')).toBe(ft2);
    });

    it('should find by name', () => {
      const fieldType = new FieldType({
        id: 'fd_test',
        name: 'test field',
        intensityLevels: [{ name: 'test' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
      });

      data.set('fd_test', fieldType);

      expect(data.findByName('test field')).toBe(fieldType);
      expect(data.findByName('nonexistent')).toBeUndefined();
    });

    it('should check if has field type', () => {
      const fieldType = new FieldType({
        id: 'fd_test',
        name: 'test',
        intensityLevels: [{ name: 'test' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
      });

      data.set('fd_test', fieldType);

      expect(data.has('fd_test')).toBe(true);
      expect(data.has('fd_nonexistent')).toBe(false);
    });

    it('should clear all data', () => {
      const fieldType = new FieldType({
        id: 'fd_test',
        name: 'test',
        intensityLevels: [{ name: 'test' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
      });

      data.set('fd_test', fieldType);
      expect(data.size()).toBe(1);

      data.clear();
      expect(data.size()).toBe(0);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const fire = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [{ name: 'fire' }],
        halfLife: 100,
        phase: FieldPhase.PLASMA,
        flags: new FieldTypeFlags([FieldTypeFlag.FIRE]),
      });
      const smoke = new FieldType({
        id: 'fd_smoke',
        name: 'smoke',
        intensityLevels: [{ name: 'smoke' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
        flags: new FieldTypeFlags([FieldTypeFlag.SMOKE]),
      });
      const acid = new FieldType({
        id: 'fd_acid',
        name: 'acid',
        intensityLevels: [{ name: 'acid' }],
        halfLife: 100,
        phase: FieldPhase.LIQUID,
        flags: new FieldTypeFlags([FieldTypeFlag.ACID, FieldTypeFlag.DANGEROUS]),
        dangerLevel: 3,
      });

      data.setMany([fire, smoke, acid]);
    });

    it('should filter by flag', () => {
      const fireFields = data.filterByFlag('FIRE');
      expect(fireFields.length).toBe(1);
      expect(fireFields[0].id).toBe('fd_fire');
    });

    it('should get fire fields', () => {
      const fireFields = data.getFireFields();
      expect(fireFields.length).toBe(1);
      expect(fireFields[0].isFire()).toBe(true);
    });

    it('should get smoke fields', () => {
      const smokeFields = data.getSmokeFields();
      expect(smokeFields.length).toBe(1);
      expect(smokeFields[0].isSmoke()).toBe(true);
    });

    it('should get toxic fields', () => {
      const toxicFields = data.getToxicFields();
      expect(toxicFields.length).toBe(1);
    });

    it('should get dangerous fields', () => {
      const dangerousFields = data.getDangerousFields();
      expect(dangerousFields.length).toBeGreaterThan(0);
      expect(dangerousFields.every((f) => f.isDangerous())).toBe(true);
    });

    it('should get light emitters', () => {
      const emitter = new FieldType({
        id: 'fd_light',
        name: 'light',
        intensityLevels: [{ name: 'light' }],
        halfLife: 100,
        phase: FieldPhase.ENERGY,
        lightEmitted: 5,
      });

      data.set('fd_light', emitter);

      const emitters = data.getLightEmitters();
      expect(emitters.length).toBeGreaterThan(0);
      expect(emitters[0].emitsLight()).toBe(true);
    });

    it('should get liquid fields', () => {
      const liquidFields = data.getLiquidFields();
      expect(liquidFields.length).toBe(1);
      expect(liquidFields[0].id).toBe('fd_acid');
    });

    it('should get gas fields', () => {
      const gasFields = data.getGasFields();
      expect(gasFields.length).toBe(1);
      expect(gasFields[0].id).toBe('fd_smoke');
    });

    it('should get fields by phase', () => {
      const gasFields = data.getByPhase('gas');
      expect(gasFields.length).toBe(1);

      const plasmaFields = data.getByPhase('plasma');
      expect(plasmaFields.length).toBe(1);
    });

    it('should sort by danger level', () => {
      const sorted = data.sortByDangerLevel();

      expect(sorted[0].getDangerLevel()).toBeGreaterThanOrEqual(sorted[1].getDangerLevel());
    });
  });

  describe('entry management', () => {
    it('should create entry', () => {
      const fieldType = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [
          { name: 'small flames', color: 'red' },
          { name: 'flames', color: 'red' },
        ],
        halfLife: 100,
        phase: FieldPhase.PLASMA,
      });

      data.set('fd_fire', fieldType);

      const entry = data.createEntry('fd_fire', 2);
      expect(entry).toBeDefined();
      expect(entry?.type).toBe('fd_fire');
      expect(entry?.intensity).toBe(2);
    });

    it('should update entry', () => {
      const fieldType = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [{ name: 'fire' }],
        halfLife: 10,
        phase: FieldPhase.PLASMA,
        acceleratedDecay: true,
      });

      data.set('fd_fire', fieldType);

      const entry = new FieldEntry({
        type: 'fd_fire',
        intensity: 2,
        age: 0,
        decayTime: 20,
        isAlive: true,
      });

      // 更新一次，年龄增加但不衰减
      const updated1 = data.updateEntry(entry);
      expect(updated1.age).toBe(1);
      expect(updated1.intensity).toBe(2);

      // 更新到半衰期，应该衰减
      let updated = updated1;
      for (let i = 0; i < 9; i++) {
        updated = data.updateEntry(updated);
      }
      expect(updated.age).toBe(10);
      expect(updated.intensity).toBe(1);
    });

    it('should get entry display info', () => {
      const fieldType = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [
          { name: 'small flames', color: 'red', symbol: '^' },
          { name: 'flames', color: 'red', symbol: '^' },
        ],
        halfLife: 100,
        phase: FieldPhase.PLASMA,
        displayPriority: 10,
      });

      data.set('fd_fire', fieldType);

      const entry = new FieldEntry({
        type: 'fd_fire',
        intensity: 1,
        age: 0,
        decayTime: 0,
        isAlive: true,
      });

      const info = data.getEntryDisplayInfo(entry);
      expect(info?.symbol).toBe('^');
      expect(info?.color).toBe('red');
      expect(info?.name).toBe('small flames');
      expect(info?.priority).toBe(10);
    });

    it('should merge entries by priority', () => {
      const fire = new FieldType({
        id: 'fd_fire',
        name: 'fire',
        intensityLevels: [{ name: 'fire' }],
        halfLife: 100,
        phase: FieldPhase.PLASMA,
        displayPriority: 10,
      });

      const smoke = new FieldType({
        id: 'fd_smoke',
        name: 'smoke',
        intensityLevels: [{ name: 'smoke' }],
        halfLife: 100,
        phase: FieldPhase.GAS,
        displayPriority: 5,
      });

      data.setMany([fire, smoke]);

      const fireEntry = new FieldEntry({
        type: 'fd_fire',
        intensity: 1,
        age: 0,
        decayTime: 0,
        isAlive: true,
      });

      const smokeEntry = new FieldEntry({
        type: 'fd_smoke',
        intensity: 1,
        age: 0,
        decayTime: 0,
        isAlive: true,
      });

      const merged = data.mergeEntries([smokeEntry, fireEntry]);
      expect(merged?.type).toBe('fd_fire'); // 优先级更高
    });
  });
});
