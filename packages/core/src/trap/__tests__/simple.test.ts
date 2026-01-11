import { describe, it, expect } from 'vitest';
import { Trap } from '../Trap';
import { TrapData } from '../TrapData';
import { TrapAction, TrapFlags } from '../types';

describe('Trap - Simple Tests', () => {
  it('should create a trap', () => {
    const trap = new Trap({
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

    expect(trap.id).toBe('tr_test');
    expect(trap.name).toBe('test trap');
    expect(trap.visibility).toBe(5);
    expect(trap.difficulty).toBe(3);
  });

  it('should have methods', () => {
    const trap = new Trap({
      id: 'tr_test',
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

    expect(typeof trap.isVisible).toBe('function');
    expect(typeof trap.canTrigger).toBe('function');
    expect(typeof trap.getDamage).toBe('function');
    expect(typeof trap.getDiscoveryDifficulty).toBe('function');
  });

  it('should store and retrieve from TrapData', () => {
    const trap = new Trap({
      id: 'tr_test',
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

    const data = new TrapData();
    data.set(trap.id, trap);

    const retrieved = data.get(trap.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test trap');
  });
});
