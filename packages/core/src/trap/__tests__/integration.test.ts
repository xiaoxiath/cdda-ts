import { describe, it, expect, beforeEach } from 'vitest';
import { Trap } from '../Trap';
import { TrapData } from '../TrapData';
import { TrapParser, TrapJson } from '../TrapParser';
import { TrapLoader } from '../TrapLoader';
import { TrapAction, TrapFlags } from '../types';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Trap System Integration', () => {
  describe('TrapData with Trap management', () => {
    let trapData: TrapData;

    beforeEach(() => {
      trapData = new TrapData();
    });

    it('should store and retrieve traps', () => {
      const trap = new Trap({
        id: 'tr_test' as any,
        name: 'test trap',
        description: 'test',
        symbol: '^',
        color: 'red',
        visibility: 5,
        avoidance: 10,
        difficulty: 3,
        trapRadius: 0,
        benign: false,
        alwaysInvisible: false,
        triggerWeight: 5000,
        action: TrapAction.SNARE_LIGHT,
        flags: new TrapFlags(['HIDDEN']),
        fun: 1,
        complexity: 2,
      });

      trapData.set(trap.id, trap);
      expect(trapData.get(trap.id)).toBe(trap);
      expect(trapData.findByName('test trap')).toBe(trap);
    });

    it('should handle multiple traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'trap 1',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'trap 2',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: true,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.ALARM,
          flags: new TrapFlags(['VISIBLE']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      expect(trapData.size()).toBe(2);
      expect(trapData.getAll()).toHaveLength(2);
    });

    it('should filter visible traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'visible trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['VISIBLE']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'hidden trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CALTROPS,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const visible = trapData.getVisibleTraps();
      expect(visible).toHaveLength(1);
      expect(visible[0].name).toBe('visible trap');
    });

    it('should filter hidden traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'visible trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['VISIBLE']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'hidden trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CALTROPS,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const hidden = trapData.getHiddenTraps();
      expect(hidden).toHaveLength(1);
      expect(hidden[0].name).toBe('hidden trap');
    });

    it('should filter benign traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'benign trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: true,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.BUBBLE,
          flags: new TrapFlags(['BENIGN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'dangerous trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CALTROPS,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const benign = trapData.getBenignTraps();
      expect(benign).toHaveLength(1);
      expect(benign[0].name).toBe('benign trap');
    });

    it('should filter dangerous traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'benign trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: true,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.BUBBLE,
          flags: new TrapFlags(['BENIGN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'dangerous trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['DANGEROUS']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const dangerous = trapData.getDangerousTraps();
      expect(dangerous).toHaveLength(1);
      expect(dangerous[0].name).toBe('dangerous trap');
    });

    it('should filter lethal traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'crossbow trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'shotgun trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.SHOTGUN,
          flags: new TrapFlags(['LETHAL']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const lethal = trapData.getLethalTraps();
      expect(lethal).toHaveLength(1);
      expect(lethal[0].name).toBe('shotgun trap');
    });

    it('should filter traps requiring ammunition', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'crossbow trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'snare trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const withAmmo = trapData.getTrapsRequiringAmmunition();
      expect(withAmmo).toHaveLength(1);
      expect(withAmmo[0].name).toBe('crossbow trap');
    });

    it('should sort by complexity', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'complex trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 5,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'simple trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CALTROPS,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const sorted = trapData.sortByComplexity();
      expect(sorted[0].complexity).toBe(1);
      expect(sorted[1].complexity).toBe(5);
    });

    it('should sort by difficulty', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'hard trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 8,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'easy trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CALTROPS,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const sorted = trapData.sortByDifficulty();
      expect(sorted[0].difficulty).toBe(1);
      expect(sorted[1].difficulty).toBe(8);
    });

    it('should get beginner traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'easy trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'hard trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 5,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const beginner = trapData.getBeginnerTraps(2);
      expect(beginner).toHaveLength(1);
      expect(beginner[0].name).toBe('easy trap');
    });

    it('should get expert traps', () => {
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'easy trap',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['HIDDEN']),
          fun: 1,
          complexity: 2,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'hard trap',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 5,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['HIDDEN']),
          fun: 0,
          complexity: 1,
        }),
      ];

      trapData.setMany(traps);
      const expert = trapData.getExpertTraps(5);
      expect(expert).toHaveLength(1);
      expect(expert[0].name).toBe('hard trap');
    });
  });

  describe('TrapParser with TrapData', () => {
    let parser: TrapParser;
    let trapData: TrapData;

    beforeEach(() => {
      parser = new TrapParser();
      trapData = new TrapData();
    });

    it('should parse and integrate multiple traps', () => {
      const jsonData: TrapJson[] = [
        {
          id: 'tr_1',
          type: 'trap',
          name: 'Trap 1',
          description: 'First trap',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trap_radius: 0,
          benign: false,
          always_invisible: false,
          trigger_weight: 5000,
          action: 'snare_light',
          flags: ['HIDDEN'],
          fun: 1,
          complexity: 2,
        },
        {
          id: 'tr_2',
          type: 'trap',
          name: 'Trap 2',
          description: 'Second trap',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 1,
          trap_radius: 0,
          benign: true,
          always_invisible: false,
          trigger_weight: 1000,
          action: 'bubble',
          flags: ['VISIBLE', 'BENIGN'],
          fun: 0,
          complexity: 1,
        },
      ];

      const traps = parser.parseMany(jsonData);
      trapData.setMany(traps);

      expect(trapData.size()).toBe(2);
      expect(trapData.get('tr_1' as any)?.name).toBe('Trap 1');
      expect(trapData.get('tr_2' as any)?.name).toBe('Trap 2');
    });

    it('should handle kebab-case action names', () => {
      const jsonData: TrapJson = {
        id: 'tr_test',
        type: 'trap',
        name: 'Test Trap',
        description: 'Test',
        action: 'pit-spikes',
        flags: [],
      };

      const trap = parser.parse(jsonData);
      expect(trap.action).toBe(TrapAction.PIT_SPIKES);
    });
  });

  describe('TrapLoader workflow', () => {
    it('should load from JSON and populate data', async () => {
      const loader = new TrapLoader();
      const jsonData = [
        {
          type: 'trap',
          id: 'tr_test',
          name: 'test trap',
          description: 'A test trap',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 3,
          trap_radius: 0,
          benign: false,
          always_invisible: false,
          trigger_weight: 5000,
          action: 'snare_light',
          flags: ['HIDDEN'],
          fun: 1,
          complexity: 2,
        },
      ];

      const data = await loader.loadFromJson(jsonData);
      expect(data.size()).toBe(1);
      expect(data.get('tr_test' as any)?.name).toBe('test trap');
    });

    it('should handle parse errors gracefully', async () => {
      const loader = new TrapLoader();
      const jsonData = [
        {
          type: 'trap',
          id: 'tr_good',
          name: 'good trap',
          description: 'Good',
          action: 'snare_light',
          flags: [],
        },
        {
          type: 'invalid',
          id: 'tr_bad',
        },
      ];

      const data = await loader.loadFromJson(jsonData);
      expect(data.size()).toBe(1);
      expect(data.get('tr_good' as any)?.name).toBe('good trap');
      expect(data.get('tr_bad' as any)).toBeUndefined();
    });
  });

  describe('Trap mechanics integration', () => {
    it('should calculate detection and trigger probabilities', () => {
      const trap = new Trap({
        id: 'tr_test' as any,
        name: 'test trap',
        description: 'test',
        symbol: '^',
        color: 'red',
        visibility: 5,
        avoidance: 10,
        difficulty: 3,
        trapRadius: 0,
        benign: false,
        alwaysInvisible: false,
        triggerWeight: 5000,
        action: TrapAction.CROSSBOW,
        flags: new TrapFlags(['HIDDEN']),
        fun: 1,
        complexity: 2,
      });

      // Character with perception 3 should have difficulty 20
      const discoveryDiff = trap.getDiscoveryDifficulty(3);
      expect(discoveryDiff).toBe(20);

      // Character with dodge 5 should have 50% trigger chance
      const triggerChance = trap.getTriggerChance(5);
      expect(triggerChance).toBe(0.5);

      // Should deal 20 damage
      const damage = trap.getDamage(80000);
      expect(damage).toBe(20);

      // Requires ammunition
      expect(trap.requiresAmmunition()).toBe(true);
    });

    it('should handle complete trap lifecycle', () => {
      const trap = new Trap({
        id: 'tr_snare' as any,
        name: 'snare trap',
        description: 'A snare trap',
        symbol: '^',
        color: 'green',
        visibility: 3,
        avoidance: 8,
        difficulty: 2,
        trapRadius: 0,
        benign: false,
        alwaysInvisible: false,
        triggerWeight: 1000,
        action: TrapAction.SNARE_HEAVY,
        flags: new TrapFlags(['TRIGGERED_BY_WEIGHT']),
        fun: 0,
        complexity: 1,
      });

      // Character with high detection can see it
      expect(trap.isVisible(5)).toBe(true);
      expect(trap.isVisible(1)).toBe(false);

      // Can be triggered by sufficient weight
      expect(trap.canTrigger(2000)).toBe(true);
      expect(trap.canTrigger(500)).toBe(false);

      // When triggered, causes movement penalty
      expect(trap.getMovementPenalty()).toBe(200);

      // Deals small damage
      expect(trap.getDamage(80000)).toBe(5);

      // Not lethal
      expect(trap.isLethal()).toBe(false);

      // Can be disarmed with sufficient skill
      const skills = new Map([['traps', 3]]);
      expect(trap.canDisarm(skills)).toBe(true);
    });
  });

  describe('Trap filtering integration', () => {
    let trapData: TrapData;

    beforeEach(() => {
      trapData = new TrapData();
      const traps = [
        new Trap({
          id: 'tr_1' as any,
          name: 'easy visible',
          description: 'test',
          symbol: '^',
          color: 'red',
          visibility: 5,
          avoidance: 10,
          difficulty: 1,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 5000,
          action: TrapAction.SNARE_LIGHT,
          flags: new TrapFlags(['VISIBLE']),
          fun: 1,
          complexity: 1,
        }),
        new Trap({
          id: 'tr_2' as any,
          name: 'hard hidden',
          description: 'test',
          symbol: '*',
          color: 'blue',
          visibility: 3,
          avoidance: 5,
          difficulty: 8,
          trapRadius: 0,
          benign: false,
          alwaysInvisible: false,
          triggerWeight: 1000,
          action: TrapAction.CROSSBOW,
          flags: new TrapFlags(['HIDDEN', 'DANGEROUS']),
          fun: 0,
          complexity: 5,
        }),
        new Trap({
          id: 'tr_3' as any,
          name: 'benign alarm',
          description: 'test',
          symbol: '=',
          color: 'yellow',
          visibility: 0,
          avoidance: 0,
          difficulty: 1,
          trapRadius: 0,
          benign: true,
          alwaysInvisible: false,
          triggerWeight: 500,
          action: TrapAction.ALARM,
          flags: new TrapFlags(['VISIBLE', 'BENIGN']),
          fun: 1,
          complexity: 2,
        }),
      ];
      trapData.setMany(traps);
    });

    it('should filter by multiple criteria', () => {
      const hidden = trapData.getHiddenTraps();
      expect(hidden).toHaveLength(1);

      const visible = trapData.getVisibleTraps();
      expect(visible).toHaveLength(2);

      const dangerous = trapData.getDangerousTraps();
      expect(dangerous).toHaveLength(1);

      const benign = trapData.getBenignTraps();
      expect(benign).toHaveLength(1);
    });

    it('should get statistics', () => {
      const loader = new TrapLoader();
      loader['data'] = trapData;

      const stats = loader.getStats();
      expect(stats.total).toBe(3);
      expect(stats.visible).toBe(2);
      expect(stats.hidden).toBe(1);
      expect(stats.benign).toBe(1);
      expect(stats.dangerous).toBe(1);
    });
  });
});
