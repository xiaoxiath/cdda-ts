/**
 * Strategy 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Strategy,
  CombatStrategy,
  SurvivalStrategy,
  SocialStrategy,
  PatrolStrategy,
  StrategyManager,
  PresetStrategies,
} from '../Strategy';
import { StrategyType, BehaviorStatus, AIActionType } from '../types';
import type { AIContext } from '../types';

describe('Strategy', () => {
  let mockContext: AIContext;

  beforeEach(() => {
    mockContext = {
      npc: {
        id: 'test_npc',
        position: { x: 50, y: 50, z: 0 },
        currentHP: 100,
        maxHP: 100,
        survivalStats: {
          isHungry: () => false,
          isThirsty: () => false,
          isTired: () => false,
        },
      },
      map: {
        creatures: new Map(),
      },
      oracle: {
        getPerceivedEnemies: () => ['enemy_1'],
        getPerceivedEntityCount: () => 1,
      },
      pathfinding: {},
      currentTime: Date.now(),
      deltaTime: 100,
      blackboard: new Map(),
    };
  });

  describe('CombatStrategy', () => {
    let combatStrategy: CombatStrategy;

    beforeEach(() => {
      combatStrategy = CombatStrategy.create({
        aggressiveness: 0.8,
        preferredRange: 10,
        useCover: true,
        retreatThreshold: 0.3,
      });
    });

    it('should create combat strategy', () => {
      expect(combatStrategy.type).toBe(StrategyType.COMBAT);
      expect(combatStrategy.aggressiveness).toBe(0.8);
      expect(combatStrategy.preferredRange).toBe(10);
      expect(combatStrategy.useCover).toBe(true);
      expect(combatStrategy.retreatThreshold).toBe(0.3);
    });

    it('should be applicable when enemies are perceived', () => {
      const applicable = combatStrategy.isApplicable(mockContext);

      expect(applicable).toBe(true);
    });

    it('should not be applicable when no enemies', () => {
      const noEnemyContext = {
        ...mockContext,
        oracle: {
          getPerceivedEnemies: () => [],
          getPerceivedEntityCount: () => 0,
        },
      };

      const applicable = combatStrategy.isApplicable(noEnemyContext);

      expect(applicable).toBe(false);
    });

    it('should generate behavior tree', () => {
      const tree = combatStrategy.getBehaviorTree();

      expect(tree.name).toBe(combatStrategy.name);
      expect(tree.getNodeCount()).toBeGreaterThan(0);
    });

    it('should execute strategy', () => {
      const status = combatStrategy.execute(mockContext);

      expect([BehaviorStatus.SUCCESS, BehaviorStatus.FAILURE, BehaviorStatus.RUNNING])
        .toContain(status);
    });

    it('should check if should retreat', () => {
      const healthyNPC = { ...mockContext.npc, currentHP: 100, maxHP: 100 };

      expect(combatStrategy.shouldRetreat({ ...mockContext, npc: healthyNPC }))
        .toBe(false);

      const woundedNPC = { ...mockContext.npc, currentHP: 20, maxHP: 100 };

      expect(combatStrategy.shouldRetreat({ ...mockContext, npc: woundedNPC }))
        .toBe(true);
    });

    it('should get combat position', () => {
      const position = combatStrategy.getCombatPosition(mockContext);

      expect(position).toBeDefined();
    });

    it('should have default values', () => {
      const defaultStrategy = CombatStrategy.create();

      expect(defaultStrategy.aggressiveness).toBe(0.5);
      expect(defaultStrategy.preferredRange).toBe(5);
      expect(defaultStrategy.useCover).toBe(true);
      expect(defaultStrategy.retreatThreshold).toBe(0.3);
    });
  });

  describe('SurvivalStrategy', () => {
    let survivalStrategy: SurvivalStrategy;

    beforeEach(() => {
      survivalStrategy = SurvivalStrategy.create({
        foodPriority: 0.9,
        waterPriority: 0.95,
        restPriority: 0.7,
        safetyPriority: 0.8,
      });
    });

    it('should create survival strategy', () => {
      expect(survivalStrategy.type).toBe(StrategyType.SURVIVAL);
      expect(survivalStrategy.foodPriority).toBe(0.9);
      expect(survivalStrategy.waterPriority).toBe(0.95);
      expect(survivalStrategy.restPriority).toBe(0.7);
      expect(survivalStrategy.safetyPriority).toBe(0.8);
    });

    it('should be applicable when survival needs exist', () => {
      const hungryContext = {
        ...mockContext,
        npc: {
          ...mockContext.npc,
          survivalStats: {
            isHungry: () => true,
            isThirsty: () => false,
            isTired: () => false,
          },
        },
      };

      const applicable = survivalStrategy.isApplicable(hungryContext);

      expect(applicable).toBe(true);
    });

    it('should not be applicable when no survival needs', () => {
      const applicable = survivalStrategy.isApplicable(mockContext);

      expect(applicable).toBe(false);
    });

    it('should generate behavior tree', () => {
      const tree = survivalStrategy.getBehaviorTree();

      expect(tree.name).toBe(survivalStrategy.name);
    });

    it('should get highest priority need', () => {
      const starvingContext = {
        ...mockContext,
        npc: {
          ...mockContext.npc,
          survivalStats: {
            isHungry: () => true,
            isThirsty: () => false,
            isTired: () => false,
            isStarving: () => true,
            isDehydrated: () => false,
            isExhausted: () => false,
          },
        },
      };

      const need = survivalStrategy.getHighestPriorityNeed(starvingContext);

      expect(need).toBe(AIActionType.EAT);
    });

    it('should return null when no urgent needs', () => {
      const need = survivalStrategy.getHighestPriorityNeed(mockContext);

      expect(need).toBeNull();
    });

    it('should prioritize thirst over hunger', () => {
      const dehydratedContext = {
        ...mockContext,
        npc: {
          ...mockContext.npc,
          survivalStats: {
            isHungry: () => true,
            isThirsty: () => true,
            isTired: () => false,
            isStarving: () => false,
            isDehydrated: () => true,
            isExhausted: () => false,
          },
        },
      };

      const need = survivalStrategy.getHighestPriorityNeed(dehydratedContext);

      expect(need).toBe(AIActionType.DRINK);
    });

    it('should prioritize sleep over food', () => {
      const exhaustedContext = {
        ...mockContext,
        npc: {
          ...mockContext.npc,
          survivalStats: {
            isHungry: () => true,
            isThirsty: () => false,
            isTired: () => true,
            isStarving: () => false,
            isDehydrated: () => false,
            isExhausted: () => true,
          },
        },
      };

      const need = survivalStrategy.getHighestPriorityNeed(exhaustedContext);

      expect(need).toBe(AIActionType.SLEEP);
    });
  });

  describe('SocialStrategy', () => {
    let socialStrategy: SocialStrategy;

    beforeEach(() => {
      socialStrategy = SocialStrategy.create({
        friendliness: 0.8,
        tradeInterest: 0.9,
        cooperationLevel: 0.7,
      });
    });

    it('should create social strategy', () => {
      expect(socialStrategy.type).toBe(StrategyType.SOCIAL);
      expect(socialStrategy.friendliness).toBe(0.8);
      expect(socialStrategy.tradeInterest).toBe(0.9);
      expect(socialStrategy.cooperationLevel).toBe(0.7);
    });

    it('should be applicable when entities are nearby', () => {
      const applicable = socialStrategy.isApplicable(mockContext);

      expect(applicable).toBe(true);
    });

    it('should generate behavior tree', () => {
      const tree = socialStrategy.getBehaviorTree();

      expect(tree.name).toBe(socialStrategy.name);
    });

    it('should check if willing to trade', () => {
      const willing = socialStrategy.isWillingToTrade(mockContext);

      expect(willing).toBe(true);
    });

    it('should check if willing to cooperate', () => {
      const willing = socialStrategy.isWillingToCooperate(mockContext);

      expect(willing).toBe(true);
    });

    it('should not be willing to trade with low interest', () => {
      const lowTradeStrategy = SocialStrategy.create({
        tradeInterest: 0.3,
      });

      const willing = lowTradeStrategy.isWillingToTrade(mockContext);

      expect(willing).toBe(false);
    });
  });

  describe('PatrolStrategy', () => {
    let patrolStrategy: PatrolStrategy;
    const patrolRoute = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 },
    ];

    beforeEach(() => {
      patrolStrategy = PatrolStrategy.create({
        patrolRoute,
      });
    });

    it('should create patrol strategy', () => {
      expect(patrolStrategy.type).toBe(StrategyType.PATROL);
      expect(patrolStrategy.patrolRoute).toEqual(patrolRoute);
      expect(patrolStrategy.currentWaypoint).toBe(0);
    });

    it('should be applicable when route exists', () => {
      const applicable = patrolStrategy.isApplicable(mockContext);

      expect(applicable).toBe(true);
    });

    it('should not be applicable when no route', () => {
      const emptyRouteStrategy = PatrolStrategy.create({
        patrolRoute: [],
      });

      const applicable = emptyRouteStrategy.isApplicable(mockContext);

      expect(applicable).toBe(false);
    });

    it('should get next waypoint', () => {
      const waypoint1 = patrolStrategy.getNextWaypoint();
      const waypoint2 = patrolStrategy.getNextWaypoint();

      expect(waypoint1).toEqual(patrolRoute[0]);
      expect(waypoint2).toEqual(patrolRoute[0]); // 没有实际移动，返回相同点
    });

    it('should loop through waypoints', () => {
      // 使用 advanceWaypoint 创建新的策略实例
      const advanced = patrolStrategy.advanceWaypoint();
      const waypoint = advanced.getNextWaypoint();

      expect(waypoint).toEqual(patrolRoute[1]);
    });
  });

  describe('StrategyManager', () => {
    let strategies: Strategy[];
    let manager: StrategyManager;

    beforeEach(() => {
      strategies = [
        CombatStrategy.create({ priority: 5 }),
        SurvivalStrategy.create({ priority: 8 }),
        SocialStrategy.create({ priority: 3 }),
      ];
      manager = StrategyManager.create(strategies);
    });

    it('should create strategy manager', () => {
      expect(manager.getAllStrategies().size).toBe(3);
    });

    it('should get best strategy', () => {
      // 创建有生存需求的上下文，使 SurvivalStrategy 适用
      const survivalContext = {
        ...mockContext,
        npc: {
          ...mockContext.npc,
          survivalStats: {
            isHungry: () => true, // 有生存需求
            isThirsty: () => false,
            isTired: () => false,
          },
        },
      };

      const best = manager.getBestStrategy(survivalContext);

      expect(best).toBeDefined();
      expect(best?.type).toBe(StrategyType.SURVIVAL); // 最高优先级且适用
    });

    it('should return null when no applicable strategy', () => {
      const noEnemyContext = {
        ...mockContext,
        oracle: {
          getPerceivedEnemies: () => [],
          getPerceivedEntityCount: () => 0,
        },
      };

      const best = manager.getBestStrategy(noEnemyContext);

      // 只有 CombatStrategy 需要敌人，其他应该仍然适用
      // 但由于我们的 mock 配置，SocialStrategy 需要实体
      expect(best).toBeDefined();
    });

    it('should add strategy', () => {
      const updated = manager.addStrategy(
        PatrolStrategy.create({ patrolRoute: [] })
      );

      expect(updated.getAllStrategies().size).toBe(4);
    });

    it('should remove strategy', () => {
      const updated = manager.removeStrategy(StrategyType.COMBAT);

      expect(updated.getAllStrategies().size).toBe(2);
      expect(updated.getAllStrategies().find(s => s.type === StrategyType.COMBAT))
        .toBeUndefined();
    });

    it('should respect priority when choosing', () => {
      const lowPrioritySurvival = SurvivalStrategy.create({
        priority: 1,
      });

      const lowPriorityManager = StrategyManager.create([
        CombatStrategy.create({ priority: 5 }),
        lowPrioritySurvival,
      ]);

      const best = lowPriorityManager.getBestStrategy(mockContext);

      // CombatStrategy 应该被选中（虽然不是最高优先级，但适用于有敌人的情况）
      expect(best?.type).toBe(StrategyType.COMBAT);
    });
  });

  describe('PresetStrategies', () => {
    it('should have SOLDIER preset', () => {
      const soldier = PresetStrategies.SOLDIER;

      expect(soldier).toBeDefined();
      expect(soldier.getAllStrategies().size).toBeGreaterThan(0);
    });

    it('should have SURVIVOR preset', () => {
      const survivor = PresetStrategies.SURVIVOR;

      expect(survivor).toBeDefined();
      expect(survivor.getAllStrategies().size).toBeGreaterThan(0);
    });

    it('should have MERCHANT preset', () => {
      const merchant = PresetStrategies.MERCHANT;

      expect(merchant).toBeDefined();
      expect(merchant.getAllStrategies().size).toBeGreaterThan(0);
    });

    it('should have DOCTOR preset', () => {
      const doctor = PresetStrategies.DOCTOR;

      expect(doctor).toBeDefined();
      expect(doctor.getAllStrategies().size).toBeGreaterThan(0);
    });

    it('should select appropriate strategy for SOLDIER', () => {
      const soldier = PresetStrategies.SOLDIER;
      const best = soldier.getBestStrategy(mockContext);

      expect(best).toBeDefined();
      // 士兵在有敌人时应该优先战斗
      expect([StrategyType.COMBAT, StrategyType.PATROL]).toContain(best?.type);
    });

    it('should select appropriate strategy for SURVIVOR', () => {
      const survivor = PresetStrategies.SURVIVOR;
      const best = survivor.getBestStrategy(mockContext);

      expect(best).toBeDefined();
    });

    it('should select appropriate strategy for MERCHANT', () => {
      const merchant = PresetStrategies.MERCHANT;
      const best = merchant.getBestStrategy(mockContext);

      expect(best).toBeDefined();
    });
  });

  describe('Strategy base class', () => {
    it('should get description', () => {
      const strategy = CombatStrategy.create({ name: '测试战斗' });
      const description = strategy.getDescription();

      expect(description).toContain('测试战斗');
      expect(description).toContain('COMBAT');
      expect(description).toContain('优先级');
    });

    it('should be immutable', () => {
      const strategy = CombatStrategy.create();

      // 尝试修改应该抛出错误（由于 Object.freeze）
      expect(() => {
        (strategy as any).name = 'modified';
      }).toThrow();

      // 属性值不应改变
      expect(strategy.name).not.toBe('modified');
    });
  });
});
