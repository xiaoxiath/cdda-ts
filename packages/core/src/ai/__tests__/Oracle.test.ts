/**
 * Oracle 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Oracle } from '../Oracle';
import { Tripoint } from '../../coordinates/Tripoint';
import { ThreatLevel, PerceptionType } from '../types';
import type { GameMap } from '../../map/GameMap';

describe('Oracle', () => {
  let oracle: Oracle;
  let mockNPC: any;
  let mockMap: GameMap;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(1000000);

    // 创建模拟 NPC
    mockNPC = {
      id: 'test_npc',
      position: new Tripoint({ x: 50, y: 50, z: 0 }),
      currentHP: 100,
      maxHP: 100,
    };

    // 创建模拟地图
    mockMap = {
      creatures: new Map([
        ['enemy_1', {
          id: 'enemy_1',
          position: new Tripoint({ x: 55, y: 50, z: 0 }),
          isHostile: () => true,
          isPlayer: () => false,
          isMoving: () => true,
        }],
        ['player_1', {
          id: 'player_1',
          position: new Tripoint({ x: 45, y: 50, z: 0 }),
          isHostile: () => false,
          isPlayer: () => true,
          isMoving: () => false,
        }],
      ]),
      grid: new Map(),
    } as any;

    oracle = Oracle.create(mockNPC, {
      perceptionRange: 20,
      hearingRange: 15,
    });
  });

  describe('create', () => {
    it('should create oracle with default config', () => {
      const defaultOracle = Oracle.create(mockNPC);

      expect(defaultOracle.owner).toBe(mockNPC);
      expect(defaultOracle.visionRange).toBe(20);
      expect(defaultOracle.hearingRange).toBe(15);
      expect(defaultOracle.smellRange).toBe(5);
    });

    it('should create oracle with custom config', () => {
      const customOracle = Oracle.create(mockNPC, {
        perceptionRange: 30,
        hearingRange: 25,
      });

      expect(customOracle.visionRange).toBe(30);
      expect(customOracle.hearingRange).toBe(25);
    });

    it('should initialize with empty data', () => {
      expect(oracle.memories.size).toBe(0);
      expect(oracle.perceivedEntities.size).toBe(0);
      expect(oracle.threats.size).toBe(0);
    });
  });

  describe('perceiveVision', () => {
    it('should perceive creatures in vision range', () => {
      const updated = oracle.perceiveVision(mockMap);

      expect(updated.perceivedEntities.size).toBeGreaterThan(0);
    });

    it('should not perceive self', () => {
      const updated = oracle.perceiveVision(mockMap);

      expect(updated.perceivedEntities.has('test_npc')).toBe(false);
    });

    it('should add memories for perceived creatures', () => {
      const updated = oracle.perceiveVision(mockMap);

      expect(updated.memories.size).toBeGreaterThan(0);
    });

    it('should assess threats for hostile creatures', () => {
      const updated = oracle.perceiveVision(mockMap);

      const enemyThreat = updated.threats.get('enemy_1');
      expect(enemyThreat).toBeGreaterThanOrEqual(ThreatLevel.MEDIUM);
    });

    it('should not perceive creatures outside vision range', () => {
      mockMap.creatures.set('far_enemy', {
        id: 'far_enemy',
        position: new Tripoint({ x: 100, y: 50, z: 0 }),
        isHostile: () => true,
        isPlayer: () => false,
      } as any);

      const updated = oracle.perceiveVision(mockMap);

      expect(updated.perceivedEntities.has('far_enemy')).toBe(false);
    });
  });

  describe('perceiveHearing', () => {
    it('should perceive moving creatures', () => {
      const updated = oracle.perceiveHearing(mockMap);

      // enemy_1 在移动
      expect(updated.perceivedEntities.has('enemy_1')).toBe(true);
    });

    it('should not perceive non-moving creatures', () => {
      const updated = oracle.perceiveHearing(mockMap);

      // player_1 不在移动
      const playerPerception = updated.perceivedEntities.get('player_1');
      expect(playerPerception).toBeUndefined();
    });

    it('should respect hearing range', () => {
      mockMap.creatures.set('far_creature', {
        id: 'far_creature',
        position: new Tripoint({ x: 70, y: 50, z: 0 }),
        isHostile: () => false,
        isPlayer: () => false,
        isMoving: () => true,
      } as any);

      const updated = oracle.perceiveHearing(mockMap);

      // 超出听觉范围 (15)
      expect(updated.perceivedEntities.has('far_creature')).toBe(false);
    });
  });

  describe('perceive', () => {
    it('should update all perception systems', () => {
      const updated = oracle.perceive(mockMap);

      expect(updated.perceivedEntities.size).toBeGreaterThan(0);
    });

    it('should combine vision and hearing', () => {
      const updated = oracle.perceive(mockMap);

      // 应该感知到敌人（视觉 + 听觉）
      expect(updated.perceivedEntities.has('enemy_1')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update all systems', () => {
      const currentTime = Date.now();
      const updated = oracle.update(mockMap, currentTime, 100);

      expect(updated.perceivedEntities.size).toBeGreaterThan(0);
      expect(updated.currentTime).toBe(currentTime);
    });

    it('should cleanup old memories', () => {
      const oldTime = 1000000 - 70000; // 70 秒前

      const oldOracle = new Oracle({
        ...oracle,
        memories: (oracle as any).memories.push({
          id: 'old_memory',
          type: PerceptionType.VISION,
          targetId: 'old_target',
          position: new Tripoint({ x: 0, y: 0, z: 0 }),
          timestamp: oldTime,
          confidence: 1.0,
          importance: 0.5,
        }),
      });

      const updated = oldOracle.update(mockMap, Date.now(), 100);

      // 旧记忆应该被清理
      const oldMemory = updated.memories.find(m => m.id === 'old_memory');
      expect(oldMemory).toBeUndefined();
    });

    it('should update threat levels', () => {
      const updated = oracle.update(mockMap, Date.now(), 100);

      expect(updated.threats.size).toBeGreaterThan(0);
    });
  });

  describe('memory management', () => {
    it('should add memory', () => {
      const memory = {
        id: 'test_memory',
        type: PerceptionType.MEMORY,
        targetId: 'target_1',
        position: new Tripoint({ x: 10, y: 10, z: 0 }),
        timestamp: Date.now(),
        confidence: 1.0,
        importance: 0.8,
      };

      const updated = oracle.addMemory(memory);

      expect(updated.memories.size).toBe(1);
    });

    it('should get memory for target', () => {
      const memory = {
        id: 'test_memory',
        type: PerceptionType.MEMORY,
        targetId: 'target_1',
        position: new Tripoint({ x: 10, y: 10, z: 0 }),
        timestamp: Date.now(),
        confidence: 1.0,
        importance: 0.8,
      };

      const withMemory = oracle.addMemory(memory);
      const retrieved = withMemory.getMemory('target_1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.targetId).toBe('target_1');
    });

    it('should get all memories for target', () => {
      const targetId = 'target_1';
      const memories = [
        {
          id: 'mem_1',
          type: PerceptionType.VISION,
          targetId,
          position: new Tripoint({ x: 10, y: 10, z: 0 }),
          timestamp: Date.now(),
          confidence: 1.0,
          importance: 0.8,
        },
        {
          id: 'mem_2',
          type: PerceptionType.HEARING,
          targetId,
          position: new Tripoint({ x: 11, y: 11, z: 0 }),
          timestamp: Date.now(),
          confidence: 0.9,
          importance: 0.7,
        },
      ];

      let updated = oracle;
      memories.forEach(m => {
        updated = updated.addMemory(m);
      });

      const targetMemories = updated.getMemoriesForTarget(targetId);
      expect(targetMemories.size).toBe(2);
    });

    it('should decay memory confidence', () => {
      const memory = {
        id: 'test_memory',
        type: PerceptionType.MEMORY,
        targetId: 'target_1',
        position: new Tripoint({ x: 10, y: 10, z: 0 }),
        timestamp: Date.now(),
        confidence: 1.0,
        importance: 0.8,
      };

      const withMemory = oracle.addMemory(memory);
      const laterTime = Date.now() + 10000; // 10 秒后

      const updated = withMemory.updateMemoryDecay(laterTime);

      const retrieved = updated.getMemory('target_1');
      expect(retrieved?.confidence).toBeLessThan(1.0);
    });
  });

  describe('threat assessment', () => {
    it('should assess threat level', () => {
      const updated = oracle.perceiveVision(mockMap);

      const threatLevel = updated.assessThreat('enemy_1');
      expect(threatLevel).toBeGreaterThanOrEqual(ThreatLevel.LOW);
    });

    it('should return NONE for unknown target', () => {
      const threatLevel = oracle.assessThreat('unknown');

      expect(threatLevel).toBe(ThreatLevel.NONE);
    });

    it('should get highest threat', () => {
      const updated = oracle.perceiveVision(mockMap);

      const highestThreat = updated.getHighestThreat();

      expect(highestThreat).toBeDefined();
      expect(highestThreat?.level).toBeGreaterThan(ThreatLevel.NONE);
    });

    it('should return null when no threats', () => {
      const highestThreat = oracle.getHighestThreat();

      expect(highestThreat).toBeNull();
    });

    it('should assess higher threat for closer enemies', () => {
      mockMap.creatures.set('close_enemy', {
        id: 'close_enemy',
        position: new Tripoint({ x: 51, y: 50, z: 0 }), // 非常近
        isHostile: () => true,
        isPlayer: () => false,
        weapon: { id: 'weapon_1' },
      } as any);

      const updated = oracle.perceiveVision(mockMap);
      const threatLevel = updated.assessThreat('close_enemy');

      expect(threatLevel).toBeGreaterThanOrEqual(ThreatLevel.HIGH);
    });
  });

  describe('query methods', () => {
    it('should check if can perceive target', () => {
      const updated = oracle.perceiveVision(mockMap);

      expect(updated.canPerceive('enemy_1')).toBe(true);
      expect(updated.canPerceive('unknown')).toBe(false);
    });

    it('should get perceived enemies', () => {
      const updated = oracle.perceiveVision(mockMap);

      const enemies = updated.getPerceivedEnemies();

      expect(enemies.length).toBeGreaterThan(0);
      expect(enemies).toContain('enemy_1');
    });

    it('should get perceived entity count', () => {
      const updated = oracle.perceiveVision(mockMap);

      expect(updated.getPerceivedEntityCount()).toBeGreaterThan(0);
    });

    it('should check if location is safe', () => {
      const updated = oracle.perceiveVision(mockMap);

      // 当前位置应该是安全的（没有高威胁目标）
      expect(updated.isLocationSafe(mockNPC.position)).toBe(true);
    });

    it('should consider nearby high threats as unsafe', () => {
      mockMap.creatures.set('dangerous_enemy', {
        id: 'dangerous_enemy',
        position: new Tripoint({ x: 51, y: 50, z: 0 }), // 非常近
        isHostile: () => true,
        isPlayer: () => false,
        weapon: { id: 'weapon_1' },
      } as any);

      const updated = oracle.perceiveVision(mockMap);

      // 附近有高威胁目标，位置不安全
      expect(updated.isLocationSafe(mockNPC.position)).toBe(false);
    });
  });

  describe('toJson', () => {
    it('should convert to JSON', () => {
      const json = oracle.toJson();

      expect(json.visionRange).toBe(20);
      expect(json.hearingRange).toBe(15);
      expect(json.smellRange).toBe(5);
      expect(json.memories).toEqual([]);
      expect(json.perceivedEntities).toEqual({});
      expect(json.threats).toEqual({});
    });

    it('should include perceived entities in JSON', () => {
      const updated = oracle.perceiveVision(mockMap);
      const json = updated.toJson();

      expect(json.perceivedEntities).toBeDefined();
      expect(Object.keys(json.perceivedEntities).length).toBeGreaterThan(0);
    });
  });

  describe('fromJson', () => {
    it('should create from JSON', () => {
      const jsonData = {
        visionRange: 25,
        hearingRange: 20,
        smellRange: 5,
        memories: [],
        perceivedEntities: {},
        threats: {},
        currentTime: Date.now(),
      };

      const restored = Oracle.fromJson(jsonData, mockNPC);

      expect(restored.visionRange).toBe(25);
      expect(restored.hearingRange).toBe(20);
    });
  });
});
