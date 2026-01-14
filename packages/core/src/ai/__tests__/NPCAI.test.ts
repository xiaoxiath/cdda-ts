/**
 * NPCAI 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NPCAI } from '../NPCAI';
import { BehaviorTree } from '../BehaviorTree';
import { BehaviorNode } from '../BehaviorNode';
import { Oracle } from '../Oracle';
import { Pathfinding } from '../Pathfinding';
import { Tripoint } from '../../coordinates/Tripoint';
import { AIState, AIActionType, BehaviorStatus } from '../types';
import type { GameMap } from '../../map/GameMap';

describe('NPCAI', () => {
  let npcAI: NPCAI;
  let mockNPC: any;
  let mockBehaviorTree: BehaviorTree;
  let mockMap: GameMap;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(1000000);

    // 创建模拟 NPC
    mockNPC = {
      id: 'test_npc',
      position: new Tripoint({ x: 50, y: 50, z: 0 }),
      currentHP: 100,
      maxHP: 100,
      survivalStats: {
        isHungry: () => false,
        isThirsty: () => false,
        isTired: () => false,
        isStarving: () => false,
        isDehydrated: () => false,
        isExhausted: () => false,
      },
      map: null,
    };

    // 创建模拟地图
    mockMap = {
      creatures: new Map(),
      grid: new Map(),
    } as any;

    // 创建模拟行为树
    const mockRoot = BehaviorNode.action(
      'test_action',
      '测试动作',
      () => BehaviorStatus.SUCCESS
    );
    mockBehaviorTree = BehaviorTree.create('test_tree', mockRoot);

    npcAI = NPCAI.create(mockNPC, mockBehaviorTree);
  });

  describe('create', () => {
    it('should create NPC AI', () => {
      expect(npcAI.npc).toBe(mockNPC);
      expect(npcAI.behaviorTree).toBe(mockBehaviorTree);
      expect(npcAI.state.state).toBe(AIState.IDLE);
    });

    it('should create with custom config', () => {
      const customAI = NPCAI.create(mockNPC, mockBehaviorTree, {
        perceptionRange: 30,
        hearingRange: 25,
      });

      expect(customAI.oracle.visionRange).toBe(30);
      expect(customAI.oracle.hearingRange).toBe(25);
    });

    it('should initialize with empty state', () => {
      expect(npcAI.state.currentDecision).toBeNull();
      expect(npcAI.state.target).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update oracle', () => {
      const currentTime = Date.now();

      const { ai } = npcAI.update(mockMap, currentTime, 100);

      expect(ai.oracle.currentTime).toBe(currentTime);
    });

    it('should execute behavior tree', () => {
      const currentTime = Date.now();

      const { ai } = npcAI.update(mockMap, currentTime, 100);

      // 行为树应该被执行
      const stats = ai.behaviorTree.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });

    it('should make decisions', () => {
      const currentTime = Date.now();

      const { actions } = npcAI.update(mockMap, currentTime, 100);

      expect(Array.isArray(actions)).toBe(true);
    });

    it('should update state timestamp', () => {
      const currentTime = Date.now();

      const { ai } = npcAI.update(mockMap, currentTime, 100);

      expect(ai.state.lastUpdate).toBe(currentTime);
    });
  });

  describe('processTurn', () => {
    it('should process turn and return updated AI', () => {
      const updated = npcAI.processTurn(mockMap);

      expect(updated).toBeDefined();
      expect(updated.state.lastUpdate).toBeGreaterThan(0);
    });

    it('should execute current decision', () => {
      // 创建一个有决策的 AI
      let ai = npcAI;
      ai.state = {
        ...ai.state,
        currentDecision: {
          id: 'test_decision' as any,
          action: {
            type: AIActionType.WAIT,
            duration: 1000,
            cost: 1,
          },
          priority: 1,
          timestamp: Date.now(),
        },
      };

      const updated = ai.processTurn(mockMap);

      expect(updated).toBeDefined();
    });
  });

  describe('decision making', () => {
    it('should create survival decision when needed', () => {
      const hungryNPC = {
        ...mockNPC,
        survivalStats: {
          isHungry: () => true,
          isThirsty: () => false,
          isTired: () => false,
          isStarving: () => true,
          isDehydrated: () => false,
          isExhausted: () => false,
        },
      };

      const hungryAI = NPCAI.create(hungryNPC, mockBehaviorTree);
      const decisions = hungryAI.makeDecision(mockMap);

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].action.type).toBe(AIActionType.EAT);
    });

    it('should create combat decision when threatened', () => {
      // 添加敌人
      mockMap.creatures.set('enemy_1', {
        id: 'enemy_1',
        position: new Tripoint({ x: 55, y: 50, z: 0 }),
        isHostile: () => true,
        isPlayer: () => false,
      } as any);

      // 创建新的 NPCAI，其 oracle 会感知到敌人
      const updatedAI = NPCAI.create(mockNPC, mockBehaviorTree);
      // 在内部 oracle 创建后更新它以感知敌人
      (updatedAI as any).oracle = (updatedAI as any).oracle.update(mockMap, Date.now(), 100);

      const decisions = updatedAI.makeDecision(mockMap);

      // 应该有战斗决策
      const combatDecision = decisions.find(d => d.action.type === AIActionType.ATTACK);
      expect(combatDecision).toBeDefined();
    });

    it('should create wait decision when idle', () => {
      const decisions = npcAI.makeDecision(mockMap);

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].action.type).toBe(AIActionType.WAIT);
    });
  });

  describe('executeDecision', () => {
    it('should execute MOVE decision', () => {
      const decision = {
        id: 'test_move' as any,
        action: {
          type: AIActionType.MOVE_TO,
          duration: 1000,
          cost: 1,
        },
        position: new Tripoint({ x: 55, y: 50, z: 0 }),
        priority: 5,
        timestamp: Date.now(),
      };

      const { ai, result } = npcAI.executeDecision(decision, mockMap);

      expect(result).toBeDefined();
    });

    it('should execute ATTACK decision', () => {
      mockMap.creatures.set('enemy_1', {
        id: 'enemy_1',
        position: new Tripoint({ x: 51, y: 50, z: 0 }),
        isHostile: () => true,
        isPlayer: () => false,
      } as any);

      const decision = {
        id: 'test_attack' as any,
        action: {
          type: AIActionType.ATTACK,
          duration: 1000,
          cost: 1,
        },
        target: 'enemy_1',
        priority: 8,
        timestamp: Date.now(),
      };

      const { result } = npcAI.executeDecision(decision, mockMap);

      expect(result.success).toBe(true);
    });

    it('should execute FLEE decision', () => {
      const decision = {
        id: 'test_flee' as any,
        action: {
          type: AIActionType.FLEE,
          duration: 1000,
          cost: 1,
        },
        position: new Tripoint({ x: 60, y: 50, z: 0 }),
        priority: 9,
        timestamp: Date.now(),
      };

      const { result } = npcAI.executeDecision(decision, mockMap);

      expect(result).toBeDefined();
    });

    it('should execute WAIT decision', () => {
      const decision = {
        id: 'test_wait' as any,
        action: {
          type: AIActionType.WAIT,
          duration: 1000,
          cost: 1,
        },
        priority: 1,
        timestamp: Date.now(),
      };

      const { result } = npcAI.executeDecision(decision, mockMap);

      expect(result.success).toBe(true);
    });
  });

  describe('behavior execution', () => {
    it('should move to position', () => {
      const targetPos = new Tripoint({ x: 55, y: 50, z: 0 });

      const { success, path } = npcAI.moveTo(targetPos, mockMap);

      expect(success).toBe(true);
      expect(path).toBeDefined();
    });

    it('should follow target', () => {
      mockMap.creatures.set('target_1', {
        id: 'target_1',
        position: new Tripoint({ x: 55, y: 50, z: 0 }),
        isHostile: () => false,
        isPlayer: () => false,
      } as any);

      const { success } = npcAI.follow('target_1', mockMap);

      expect(success).toBeDefined();
    });

    it('should flee from position', () => {
      const fromPos = new Tripoint({ x: 60, y: 50, z: 0 });

      const { success } = npcAI.flee(fromPos, mockMap);

      expect(success).toBeDefined();
    });

    it('should attack target', () => {
      mockMap.creatures.set('enemy_1', {
        id: 'enemy_1',
        position: new Tripoint({ x: 51, y: 50, z: 0 }),
        isHostile: () => true,
        isPlayer: () => false,
      } as any);

      const { success } = npcAI.attack('enemy_1', mockMap);

      expect(success).toBe(true);
    });
  });

  describe('survival needs', () => {
    it('should check survival needs', () => {
      const needs = npcAI.checkSurvivalNeeds();

      expect(needs.needsFood).toBeDefined();
      expect(needs.needsWater).toBeDefined();
      expect(needs.needsRest).toBeDefined();
      expect(needs.priority).toBeDefined();
    });

    it('should detect hunger', () => {
      const hungryNPC = {
        ...mockNPC,
        survivalStats: {
          isHungry: () => true,
          isThirsty: () => false,
          isTired: () => false,
          isStarving: () => false,
          isDehydrated: () => false,
          isExhausted: () => false,
        },
      };

      const hungryAI = NPCAI.create(hungryNPC, mockBehaviorTree);
      const needs = hungryAI.checkSurvivalNeeds();

      expect(needs.needsFood).toBe(true);
    });

    it('should detect thirst', () => {
      const thirstyNPC = {
        ...mockNPC,
        survivalStats: {
          isHungry: () => false,
          isThirsty: () => true,
          isTired: () => false,
          isStarving: () => false,
          isDehydrated: () => true,
          isExhausted: () => false,
        },
      };

      const thirstyAI = NPCAI.create(thirstyNPC, mockBehaviorTree);
      const needs = thirstyAI.checkSurvivalNeeds();

      expect(needs.needsWater).toBe(true);
      expect(needs.priority).toBe(AIActionType.DRINK);
    });

    it('should detect fatigue', () => {
      const tiredNPC = {
        ...mockNPC,
        survivalStats: {
          isHungry: () => false,
          isThirsty: () => false,
          isTired: () => true,
          isStarving: () => false,
          isDehydrated: () => false,
          isExhausted: () => true,
        },
      };

      const tiredAI = NPCAI.create(tiredNPC, mockBehaviorTree);
      const needs = tiredAI.checkSurvivalNeeds();

      expect(needs.needsRest).toBe(true);
      expect(needs.priority).toBe(AIActionType.SLEEP);
    });
  });

  describe('resource finding', () => {
    it('should find food location', () => {
      // 模拟记忆中的食物位置
      const withMemory = (npcAI as any).oracle.addMemory({
        id: 'food_memory',
        type: 'memory' as any,
        targetId: 'food_1',
        position: new Tripoint({ x: 10, y: 10, z: 0 }),
        timestamp: Date.now(),
        confidence: 1.0,
        importance: 0.8,
      });

      npcAI.state = {
        ...npcAI.state,
        oracle: withMemory,
      };

      const foodLocation = npcAI.findFood(mockMap);

      expect(foodLocation).toBeDefined();
    });

    it('should return null when no food found', () => {
      const foodLocation = npcAI.findFood(mockMap);

      expect(foodLocation).toBeNull();
    });

    it('should find water location', () => {
      const withMemory = (npcAI as any).oracle.addMemory({
        id: 'water_memory',
        type: 'memory' as any,
        targetId: 'water_1',
        position: new Tripoint({ x: 15, y: 15, z: 0 }),
        timestamp: Date.now(),
        confidence: 1.0,
        importance: 0.8,
      });

      npcAI.state = {
        ...npcAI.state,
        oracle: withMemory,
      };

      const waterLocation = npcAI.findWater(mockMap);

      expect(waterLocation).toBeDefined();
    });

    it('should find resting spot', () => {
      const restingSpot = npcAI.findRestingSpot(mockMap);

      // 当前位置应该是安全的
      expect(restingSpot).toBeDefined();
    });
  });

  describe('state management', () => {
    it('should switch state', () => {
      const updated = npcAI.switchState(AIState.PATROL);

      expect(updated.state.state).toBe(AIState.PATROL);
    });

    it('should check state transition', () => {
      const canTransition = npcAI.canTransitionTo(AIState.COMBAT);

      expect(canTransition).toBe(true);
    });

    it('should get state description', () => {
      const description = npcAI.getStateDescription();

      expect(description).toContain('IDLE');
    });
  });

  describe('query methods', () => {
    it('should get current target', () => {
      npcAI.state = {
        ...npcAI.state,
        currentDecision: {
          id: 'test' as any,
          action: { type: AIActionType.ATTACK, duration: 1000, cost: 1 },
          target: 'enemy_1',
          priority: 5,
          timestamp: Date.now(),
        },
      };

      const target = npcAI.getCurrentTarget();

      expect(target).toBe('enemy_1');
    });

    it('should return null when no target', () => {
      const target = npcAI.getCurrentTarget();

      expect(target).toBeNull();
    });

    it('should check if has valid target', () => {
      expect(npcAI.hasValidTarget(mockMap)).toBe(false);

      npcAI.state = {
        ...npcAI.state,
        currentDecision: {
          id: 'test' as any,
          action: { type: AIActionType.ATTACK, duration: 1000, cost: 1 },
          target: 'enemy_1',
          priority: 5,
          timestamp: Date.now(),
        },
      };

      // 添加目标到地图
      mockMap.creatures.set('enemy_1', {
        id: 'enemy_1',
        position: new Tripoint({ x: 55, y: 50, z: 0 }),
      } as any);

      expect(npcAI.hasValidTarget(mockMap)).toBe(true);
    });
  });

  describe('toJson', () => {
    it('should convert to JSON', () => {
      const json = npcAI.toJson();

      expect(json.npcId).toBe('test_npc');
      expect(json.state).toBeDefined();
      expect(json.oracle).toBeDefined();
      expect(json.pathfinding).toBeDefined();
    });
  });
});
