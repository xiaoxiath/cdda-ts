import { describe, it, expect } from 'vitest';
import { Trap } from '../Trap';
import { TrapFlags, TrapAction, TrapFlag } from '../types';
import { Map } from 'immutable';

describe('TrapFlags', () => {
  it('should create empty flags', () => {
    const flags = new TrapFlags();
    expect(flags.size).toBe(0);
    expect(flags.isEmpty()).toBe(true);
  });

  it('should create flags from array', () => {
    const flags = TrapFlags.fromJson(['HIDDEN', 'DANGEROUS']);
    expect(flags.size).toBe(2);
    expect(flags.has('HIDDEN')).toBe(true);
    expect(flags.has('DANGEROUS')).toBe(true);
  });

  it('should check visibility correctly', () => {
    const visible = new TrapFlags(['VISIBLE']);
    const hidden = new TrapFlags(['HIDDEN']);
    const neither = new TrapFlags([]);

    expect(visible.isVisible()).toBe(true);
    expect(hidden.isHidden()).toBe(true);
    expect(neither.isVisible()).toBe(false);
    expect(neither.isHidden()).toBe(false);
  });

  it('should check danger level correctly', () => {
    const benign = new TrapFlags(['BENIGN']);
    const dangerous = new TrapFlags(['DANGEROUS']);
    const lethal = new TrapFlags(['LETHAL']);

    expect(benign.isBenign()).toBe(true);
    expect(dangerous.isDangerous()).toBe(true);
    expect(lethal.isLethal()).toBe(true);
  });

  it('should check consumption correctly', () => {
    const consumed = new TrapFlags(['CONSUMED']);
    const reloadable = new TrapFlags(['RELOADABLE']);

    expect(consumed.isConsumed()).toBe(true);
    expect(reloadable.isReloadable()).toBe(true);
  });

  it('should check interaction flags correctly', () => {
    const canAvoid = new TrapFlags(['CAN_BE_AVOIDED']);
    const triggeredByWalk = new TrapFlags(['TRIGGERED_BY_WALK']);
    const triggeredByWeight = new TrapFlags(['TRIGGERED_BY_WEIGHT']);

    expect(canAvoid.isCanBeAvoided()).toBe(true);
    expect(triggeredByWalk.isTriggeredByWalk()).toBe(true);
    expect(triggeredByWeight.isTriggeredByWeight()).toBe(true);
  });

  it('should check special flags correctly', () => {
    const loud = new TrapFlags(['LOUD']);
    const alwaysInvisible = new TrapFlags(['ALWAYS_INVISIBLE']);

    expect(loud.isLoud()).toBe(true);
    expect(alwaysInvisible.isAlwaysInvisible()).toBe(true);
  });
});

describe('Trap', () => {
  // Helper function to create default trap
  const createDefaultTrap = () => new Trap({
    id: 'tr_test',
    name: 'test trap',
    description: 'A test trap',
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

  it('should create trap with defaults', () => {
    const trap = new Trap();
    expect(trap.id).toBe('');
    expect(trap.name).toBe('');
    expect(trap.symbol).toBe('^');
    expect(trap.color).toBe('light_green');
    expect(trap.visibility).toBe(3);
    expect(trap.benign).toBe(false);
  });

  it('should create trap with properties', () => {
    expect(createDefaultTrap().id).toBe('tr_test');
    expect(createDefaultTrap().name).toBe('test trap');
    expect(createDefaultTrap().description).toBe('A test trap');
    expect(createDefaultTrap().symbol).toBe('^');
    expect(createDefaultTrap().color).toBe('red');
    expect(createDefaultTrap().visibility).toBe(5);
    expect(createDefaultTrap().avoidance).toBe(10);
    expect(createDefaultTrap().difficulty).toBe(3);
  });

  describe('isVisible', () => {
    it('should return false if always invisible', () => {
      const trap = createDefaultTrap().set('alwaysInvisible', true);
      expect(trap.isVisible(100)).toBe(false);
    });

    it('should return true if flag is VISIBLE', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['VISIBLE']));
      expect(trap.isVisible(0)).toBe(true);
    });

    it('should return false if flag is HIDDEN', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['HIDDEN']));
      expect(trap.isVisible(100)).toBe(false);
    });

    it('should check detection skill against visibility', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags([]));
      expect(trap.isVisible(5)).toBe(true);
      expect(trap.isVisible(4)).toBe(false);
      expect(trap.isVisible(6)).toBe(true);
    });

    it('should work with no flags', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags([]));
      expect(trap.isVisible(5)).toBe(true);
      expect(trap.isVisible(4)).toBe(false);
    });
  });

  describe('canTrigger', () => {
    it('should return false for benign traps', () => {
      const trap = createDefaultTrap().set('benign', true);
      expect(trap.canTrigger(10000)).toBe(false);
    });

    it('should return true if not triggered by weight', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags([]));
      expect(trap.canTrigger(0)).toBe(true);
      expect(trap.canTrigger(100)).toBe(true);
    });

    it('should check weight against triggerWeight', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['TRIGGERED_BY_WEIGHT']));
      expect(trap.canTrigger(4999)).toBe(false);
      expect(trap.canTrigger(5000)).toBe(true);
      expect(trap.canTrigger(6000)).toBe(true);
    });
  });

  describe('getDiscoveryDifficulty', () => {
    it('should return 0 for visible traps', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['VISIBLE']));
      expect(trap.getDiscoveryDifficulty(0)).toBe(0);
    });

    it('should calculate difficulty based on perception', () => {
      // visibility 5 - perception 5 = 0 difficulty
      expect(createDefaultTrap().getDiscoveryDifficulty(5)).toBe(0);
      // visibility 5 - perception 3 = 20 difficulty
      expect(createDefaultTrap().getDiscoveryDifficulty(3)).toBe(20);
      // visibility 5 - perception 7 = 0 (clamped)
      expect(createDefaultTrap().getDiscoveryDifficulty(7)).toBe(0);
    });

    it('should clamp difficulty between 0 and 100', () => {
      const trap = createDefaultTrap().set('visibility', 20);
      expect(trap.getDiscoveryDifficulty(0)).toBe(100); // 20 * 10 = 200, clamped to 100
      expect(trap.getDiscoveryDifficulty(20)).toBe(0);
    });
  });

  describe('getAvoidanceDifficulty', () => {
    it('should calculate difficulty based on dodge skill', () => {
      // avoidance 10 - dodge 5 = 50 difficulty
      expect(createDefaultTrap().getAvoidanceDifficulty(5)).toBe(50);
      // avoidance 10 - dodge 10 = 0 difficulty
      expect(createDefaultTrap().getAvoidanceDifficulty(10)).toBe(0);
    });

    it('should clamp difficulty between 0 and 100', () => {
      const trap = createDefaultTrap().set('avoidance', 20);
      expect(trap.getAvoidanceDifficulty(0)).toBe(100); // 20 * 10 = 200, clamped to 100
      expect(trap.getAvoidanceDifficulty(20)).toBe(0);
    });
  });

  describe('canDisarm', () => {
    it('should return false for benign traps', () => {
      const trap = createDefaultTrap().set('benign', true);
      const skills = Map({ traps: 10 });
      expect(trap.canDisarm(skills)).toBe(false);
    });

    it('should return false for always invisible traps', () => {
      const trap = createDefaultTrap().set('alwaysInvisible', true);
      const skills = Map({ traps: 10 });
      expect(trap.canDisarm(skills)).toBe(false);
    });

    it('should check traps skill', () => {
      const skills = Map({ traps: 5 });
      expect(createDefaultTrap().canDisarm(skills)).toBe(true); // difficulty 3 <= skill 5

      const lowSkills = Map({ traps: 2 });
      expect(createDefaultTrap().canDisarm(lowSkills)).toBe(false); // difficulty 3 > skill 2
    });

    it('should check mechanics skill if traps not available', () => {
      const skills = Map({ mechanics: 5 });
      expect(createDefaultTrap().canDisarm(skills)).toBe(true);
    });

    it('should prefer traps over mechanics', () => {
      const skills = Map({ traps: 2, mechanics: 10 });
      expect(createDefaultTrap().canDisarm(skills)).toBe(false); // uses traps (2) not mechanics (10)
    });
  });

  describe('getDisarmDifficulty', () => {
    it('should calculate difficulty based on skill', () => {
      const skills = Map({ traps: 3 });
      expect(createDefaultTrap().getDisarmDifficulty(skills)).toBe(0); // difficulty 3 - skill 3 = 0

      const lowSkills = Map({ traps: 1 });
      expect(createDefaultTrap().getDisarmDifficulty(lowSkills)).toBe(20); // difficulty 3 - skill 1 = 20
    });

    it('should use 0 if no skill available', () => {
      const skills = Map();
      expect(createDefaultTrap().getDisarmDifficulty(skills)).toBe(30); // difficulty 3 - 0 = 30
    });
  });

  describe('getTriggerChance', () => {
    it('should calculate chance based on dodge', () => {
      // avoidance 10, dodge 10 = 0 difficulty = 1.0 chance
      expect(createDefaultTrap().getTriggerChance(10)).toBe(1);
      // avoidance 10, dodge 0 = 100 difficulty = 0.0 chance
      expect(createDefaultTrap().getTriggerChance(0)).toBe(0);
      // avoidance 10, dodge 5 = 50 difficulty = 0.5 chance
      expect(createDefaultTrap().getTriggerChance(5)).toBe(0.5);
    });

    it('should clamp between 0 and 1', () => {
      const trap = createDefaultTrap().set('avoidance', 20);
      expect(trap.getTriggerChance(0)).toBe(0); // 200 difficulty = 0.0
      expect(trap.getTriggerChance(20)).toBe(1); // 0 difficulty = 1.0
    });
  });

  describe('isInRange', () => {
    it('should check if distance is within trap radius', () => {
      expect(createDefaultTrap().isInRange(0)).toBe(true);
      expect(createDefaultTrap().isInRange(1)).toBe(false);
    });

    it('should work with larger radius', () => {
      const trap = createDefaultTrap().set('trapRadius', 2);
      expect(trap.isInRange(0)).toBe(true);
      expect(trap.isInRange(1)).toBe(true);
      expect(trap.isInRange(2)).toBe(true);
      expect(trap.isInRange(3)).toBe(false);
    });
  });

  describe('getDamage', () => {
    it('should return 0 for snare light', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SNARE_LIGHT);
      expect(trap.getDamage(100)).toBe(0);
    });

    it('should return 5 for snare heavy', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SNARE_HEAVY);
      expect(trap.getDamage(100)).toBe(5);
    });

    it('should return 20 for crossbow', () => {
      const trap = createDefaultTrap().set('action', TrapAction.CROSSBOW);
      expect(trap.getDamage(100)).toBe(20);
    });

    it('should return 40 for shotgun', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SHOTGUN);
      expect(trap.getDamage(100)).toBe(40);
    });

    it('should return 25 for pit spikes', () => {
      const trap = createDefaultTrap().set('action', TrapAction.PIT_SPIKES);
      expect(trap.getDamage(100)).toBe(25);
    });

    it('should return 15 for gas pit', () => {
      const trap = createDefaultTrap().set('action', TrapAction.PIT_GAS);
      expect(trap.getDamage(100)).toBe(15);
    });

    it('should return 0 for unknown actions', () => {
      const trap = createDefaultTrap().set('action', TrapAction.NONE);
      expect(trap.getDamage(100)).toBe(0);
    });
  });

  describe('getMovementPenalty', () => {
    it('should return 100 for snare light', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SNARE_LIGHT);
      expect(trap.getMovementPenalty()).toBe(100);
    });

    it('should return 200 for snare heavy', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SNARE_HEAVY);
      expect(trap.getMovementPenalty()).toBe(200);
    });

    it('should return 50 for pits', () => {
      expect(createDefaultTrap().set('action', TrapAction.PIT).getMovementPenalty()).toBe(50);
      expect(createDefaultTrap().set('action', TrapAction.PIT_SPIKES).getMovementPenalty()).toBe(50);
      expect(createDefaultTrap().set('action', TrapAction.HOLE).getMovementPenalty()).toBe(50);
    });

    it('should return 0 for non-restricting traps', () => {
      const trap = createDefaultTrap().set('action', TrapAction.ALARM);
      expect(trap.getMovementPenalty()).toBe(0);
    });
  });

  describe('isLethal', () => {
    it('should return true for lethal traps', () => {
      expect(createDefaultTrap().set('action', TrapAction.PIT_SPIKES).isLethal()).toBe(true);
      expect(createDefaultTrap().set('action', TrapAction.SHOTGUN).isLethal()).toBe(true);
      expect(createDefaultTrap().set('action', TrapAction.SINKHOLE).isLethal()).toBe(true);
    });

    it('should return false for non-lethal traps', () => {
      expect(createDefaultTrap().set('action', TrapAction.SNARE_LIGHT).isLethal()).toBe(false);
      expect(createDefaultTrap().set('action', TrapAction.CALTROPS).isLethal()).toBe(false);
      expect(createDefaultTrap().set('action', TrapAction.ALARM).isLethal()).toBe(false);
    });
  });

  describe('getDisplayInfo', () => {
    it('should return trap info when visible', () => {
      const info = createDefaultTrap().getDisplayInfo(true);
      expect(info.symbol).toBe('^');
      expect(info.color).toBe('red');
      expect(info.name).toBe('test trap');
    });

    it('should return unknown when not visible', () => {
      const info = createDefaultTrap().getDisplayInfo(false);
      expect(info.symbol).toBe('.');
      expect(info.color).toBe('white');
      expect(info.name).toBe('unknown');
    });
  });

  describe('getActionDescription', () => {
    it('should return correct descriptions', () => {
      expect(createDefaultTrap().set('action', TrapAction.SNARE_LIGHT).getActionDescription()).toBe('snare trap (light)');
      expect(createDefaultTrap().set('action', TrapAction.SNARE_HEAVY).getActionDescription()).toBe('snare trap (heavy)');
      expect(createDefaultTrap().set('action', TrapAction.CROSSBOW).getActionDescription()).toBe('crossbow trap');
      expect(createDefaultTrap().set('action', TrapAction.SHOTGUN).getActionDescription()).toBe('shotgun trap');
      expect(createDefaultTrap().set('action', TrapAction.TELEPORT).getActionDescription()).toBe('teleport trap');
    });

    it('should return unknown for NONE', () => {
      const trap = createDefaultTrap().set('action', TrapAction.NONE);
      expect(trap.getActionDescription()).toBe('unknown trap');
    });
  });

  describe('requiresAmmunition', () => {
    it('should return true for crossbow', () => {
      const trap = createDefaultTrap().set('action', TrapAction.CROSSBOW);
      expect(trap.requiresAmmunition()).toBe(true);
    });

    it('should return true for shotgun', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SHOTGUN);
      expect(trap.requiresAmmunition()).toBe(true);
    });

    it('should return false for other traps', () => {
      const trap = createDefaultTrap().set('action', TrapAction.SNARE_LIGHT);
      expect(trap.requiresAmmunition()).toBe(false);
    });
  });

  describe('isConsumable', () => {
    it('should return true when CONSUMED flag is set', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['CONSUMED']));
      expect(trap.isConsumable()).toBe(true);
    });

    it('should return false when CONSUMED flag is not set', () => {
      expect(createDefaultTrap().isConsumable()).toBe(false);
    });
  });

  describe('isReloadable', () => {
    it('should return true when RELOADABLE flag is set', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['RELOADABLE']));
      expect(trap.isReloadable()).toBe(true);
    });

    it('should return false when RELOADABLE flag is not set', () => {
      expect(createDefaultTrap().isReloadable()).toBe(false);
    });
  });

  describe('getComplexity', () => {
    it('should return complexity value', () => {
      expect(createDefaultTrap().getComplexity()).toBe(2);
    });
  });

  describe('getFunValue', () => {
    it('should return fun value', () => {
      expect(createDefaultTrap().getFunValue()).toBe(1);
    });
  });

  describe('isDangerous', () => {
    it('should return true when DANGEROUS flag is set', () => {
      const trap = createDefaultTrap().set('flags', new TrapFlags(['DANGEROUS']));
      expect(trap.isDangerous()).toBe(true);
    });

    it('should return false when DANGEROUS flag is not set', () => {
      expect(createDefaultTrap().isDangerous()).toBe(false);
    });
  });

  describe('checkTrigger', () => {
    it('should return false if cannot trigger', () => {
      const trap = createDefaultTrap().set('benign', true);
      expect(trap.checkTrigger(100, 10)).toBe(false);
    });

    it('should check trigger chance', () => {
      // With dodge 10 and avoidance 10, chance is 1.0
      // Mock Math.random to test
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(createDefaultTrap().checkTrigger(100, 10)).toBe(true);
      mockRandom.mockRestore();
    });

    it('should return false when random roll fails', () => {
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      expect(createDefaultTrap().checkTrigger(100, 0)).toBe(false); // chance is 0
      mockRandom.mockRestore();
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const clone = createDefaultTrap().clone();
      expect(clone.id).toBe(createDefaultTrap().id);
      expect(clone.name).toBe(createDefaultTrap().name);
      expect(clone).not.toBe(createDefaultTrap());
    });
  });

  describe('immutability', () => {
    it('should create new instance when setting properties', () => {
      const modified = createDefaultTrap().set('name', 'modified trap');
      expect(modified.name).toBe('modified trap');
      expect(createDefaultTrap().name).toBe('test trap');
      expect(modified).not.toBe(createDefaultTrap());
    });

    it('should support chaining', () => {
      const modified = createDefaultTrap()
        .set('name', 'chain')
        .set('visibility', 10)
        .set('difficulty', 5);

      expect(modified.name).toBe('chain');
      expect(modified.visibility).toBe(10);
      expect(modified.difficulty).toBe(5);
      expect(createDefaultTrap().name).toBe('test trap');
    });
  });
});
