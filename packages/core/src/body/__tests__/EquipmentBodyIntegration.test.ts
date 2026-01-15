/**
 * EquipmentBodyIntegration 单元测试
 *
 * 测试装备系统与身体部位系统的集成功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map, List } from 'immutable';
import { EquipmentBodyIntegration } from '../EquipmentBodyIntegration';
import { DamageDistributionSystem } from '../DamageDistributionSystem';
import { BodyPartManager } from '../BodyPartManager';
import {
  createEmptyEquipmentState,
  createTestEquipmentItem,
  getProtectedBodyParts,
  calculateItemProtection,
} from '../EquipmentBodyIntegration';
import { BodyPartId } from '../../creature/types';
import {
  EquipmentSlotType,
  EquipmentLayer,
  type EquipmentItem,
  type EquipmentState,
} from '../../equipment/types';
import { AttackType, AttackDirection, DistributionStrategy } from '../DamageDistributionSystem';

describe('EquipmentBodyIntegration', () => {
  let emptyState: EquipmentState;
  let bodyPartManager: BodyPartManager;
  let damageSystem: DamageDistributionSystem;

  beforeEach(() => {
    emptyState = createEmptyEquipmentState();
    bodyPartManager = BodyPartManager.createHuman('test_npc', '测试角色');
    damageSystem = DamageDistributionSystem.create();
  });

  describe('装备防护计算', () => {
    it('应该对空装备状态返回空防护列表', () => {
      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(emptyState);

      expect(protections).toHaveLength(0);
    });

    it('调试：应该能正确处理Map', () => {
      // 测试 Map 迭代是否正常
      const testMap = Map().set('head', List(['item1']));

      let found = false;
      testMap.forEach((items, slotId) => {
        found = true;
        expect(slotId).toBe('head');
        expect(items.toArray()).toEqual(['item1']);
      });

      expect(found).toBe(true);
    });

    it('调试：extractSlotType 应该正确识别槽位', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 80,
          thickness: 3,
          envProtection: 20,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('head', List([helmet])),
      };

      // 检查状态是否正确创建
      expect(state.equippedItems.size).toBe(1);

      // 检查 forEach 是否被调用
      let forEachCalled = false;
      state.equippedItems.forEach((items, slotId) => {
        forEachCalled = true;
        expect(slotId).toBe('head');
        expect(items.toArray().length).toBe(1);
      });
      expect(forEachCalled).toBe(true);
    });

    it('应该正确计算单个装备项的防护', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 80,
          thickness: 3,
          envProtection: 20,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('head', List([helmet])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);

      expect(protections).toHaveLength(1);
      expect(protections[0].bodyPart).toBe(BodyPartId.HEAD);
      expect(protections[0].coverage).toBeCloseTo(0.8, 1);
      expect(protections[0].protection).toBeGreaterThan(0);
    });

    it('应该正确计算多个装备项的叠加防护', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 60,
          thickness: 2,
          envProtection: 10,
          resistances: Map({ 'BASH': 8, 'CUT': 10, 'STAB': 8 }),
          rigid: true,
        },
        weight: 800,
      });

      const hood = createTestEquipmentItem({
        itemId: 'hood',
        itemName: '兜帽',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 50,
          thickness: 1,
          envProtection: 5,
          resistances: Map({ 'BASH': 3, 'CUT': 4, 'STAB': 3 }),
          rigid: false,
        },
        weight: 200,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map()
          .set('head_outer', List([helmet]))
          .set('head_inner', List([hood])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);

      expect(protections).toHaveLength(1);
      expect(protections[0].bodyPart).toBe(BodyPartId.HEAD);

      // 叠加防护应该比单个装备更高
      const combinedProtection = protections[0].protection;
      expect(combinedProtection).toBeGreaterThan(0.1);

      // 叠加覆盖率
      const combinedCoverage = protections[0].coverage;
      expect(combinedCoverage).toBeGreaterThan(0.6); // 60% 和 50% 叠加
      expect(combinedCoverage).toBeLessThan(1.0);
    });

    it('应该正确处理双侧保护装备', () => {
      const gloves = createTestEquipmentItem({
        itemId: 'gloves',
        itemName: '手套',
        covers: [EquipmentSlotType.HANDS],
        armor: {
          coverage: 70,
          thickness: 1,
          envProtection: 5,
          resistances: Map({ 'BASH': 4, 'CUT': 6, 'STAB': 5 }),
          rigid: false,
        },
        weight: 100,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('hands', List([gloves])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);

      // 手套应该保护双臂
      expect(protections.length).toBeGreaterThanOrEqual(2);

      const armLProtection = protections.find(p => p.bodyPart === BodyPartId.ARM_L);
      const armRProtection = protections.find(p => p.bodyPart === BodyPartId.ARM_R);

      expect(armLProtection).toBeDefined();
      expect(armRProtection).toBeDefined();
      expect(armLProtection!.coverage).toBeCloseTo(0.7, 1);
      expect(armRProtection!.coverage).toBeCloseTo(0.7, 1);
    });

    it('应该正确计算躯干多层防护', () => {
      const shirt = createTestEquipmentItem({
        itemId: 'shirt',
        itemName: '衬衫',
        covers: [EquipmentSlotType.TORSO_INNER],
        armor: {
          coverage: 80,
          thickness: 0.5,
          envProtection: 5,
          resistances: Map({ 'BASH': 1, 'CUT': 1, 'STAB': 1 }),
          rigid: false,
        },
        weight: 200,
      });

      const armor = createTestEquipmentItem({
        itemId: 'armor_vest',
        itemName: '防弹背心',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 60,
          thickness: 5,
          envProtection: 10,
          resistances: Map({ 'BASH': 15, 'CUT': 20, 'STAB': 25, 'BULLET': 20 }),
          rigid: true,
        },
        weight: 3000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map()
          .set('torso_inner', List([shirt]))
          .set('torso_outer', List([armor])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);

      const torsoProtection = protections.find(p => p.bodyPart === BodyPartId.TORSO);
      expect(torsoProtection).toBeDefined();
      expect(torsoProtection!.sourceItems).toHaveLength(2);
    });
  });

  describe('ArmorProtection 转换', () => {
    it('应该正确转换为 DamageDistributionSystem 格式', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 80,
          thickness: 3,
          envProtection: 20,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('head', List([helmet])),
      };

      const armorProtections = EquipmentBodyIntegration.toArmorProtections(state);

      expect(armorProtections).toHaveLength(1);
      expect(armorProtections[0].bodyPart).toBe(BodyPartId.HEAD);
      expect(armorProtections[0].coverage).toBeCloseTo(0.8, 1);
      expect(armorProtections[0].protection).toBeGreaterThan(0);
    });

    it('应该集成到伤害分配系统', () => {
      const armor = createTestEquipmentItem({
        itemId: 'armor_vest',
        itemName: '防弹背心',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 80,
          thickness: 5,
          envProtection: 15,
          resistances: Map({ 'BASH': 15, 'CUT': 20, 'STAB': 25 }),
          rigid: true,
        },
        weight: 3000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso_outer', List([armor])),
      };

      const armorProtections = EquipmentBodyIntegration.toArmorProtections(state);

      const request: Parameters<typeof damageSystem.distributeDamage>[1] = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 50,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.TORSO,
        armor: armorProtections,
      };

      const result = damageSystem.distributeDamage(bodyPartManager, request);

      const torsoDamage = result.partDamages.find(d => d.partId === BodyPartId.TORSO);
      expect(torsoDamage).toBeDefined();

      // 主目标伤害 = 50 * 0.8 = 40
      // 装备应该阻挡部分伤害
      expect(torsoDamage!.rawDamage).toBeCloseTo(40, 0);
      expect(torsoDamage!.blockedDamage).toBeGreaterThan(0);
      expect(torsoDamage!.finalDamage).toBeLessThan(40);
    });
  });

  describe('装备防护摘要', () => {
    it('应该生成正确的防护摘要', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 80,
          thickness: 3,
          envProtection: 20,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1000,
      });

      const vest = createTestEquipmentItem({
        itemId: 'vest',
        itemName: '防弹背心',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 70,
          thickness: 5,
          envProtection: 15,
          resistances: Map({ 'BASH': 15, 'CUT': 20, 'STAB': 25 }),
          rigid: true,
        },
        weight: 3000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map()
          .set('head', List([helmet]))
          .set('torso_outer', List([vest])),
      };

      const summary = EquipmentBodyIntegration.summarizeProtection(state);

      expect(summary.protections.length).toBeGreaterThanOrEqual(2);
      expect(summary.totalWeight).toBe(4000); // 1000 + 3000
      expect(summary.avgCoverage).toBeGreaterThan(0);
    });
  });

  describe('获取特定身体部位防护', () => {
    it('应该正确获取头部防护', () => {
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 75,
          thickness: 3,
          envProtection: 20,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('head', List([helmet])),
      };

      const headProtection = EquipmentBodyIntegration.getBodyPartProtection(
        state,
        BodyPartId.HEAD
      );

      expect(headProtection).toBeDefined();
      expect(headProtection!.bodyPart).toBe(BodyPartId.HEAD);
      expect(headProtection!.coverage).toBeCloseTo(0.75, 1);
    });

    it('应该在无装备时返回 undefined', () => {
      const headProtection = EquipmentBodyIntegration.getBodyPartProtection(
        emptyState,
        BodyPartId.HEAD
      );

      expect(headProtection).toBeUndefined();
    });
  });

  describe('伤害类型防护计算', () => {
    it('应该正确计算切割防护', () => {
      const armor = createTestEquipmentItem({
        itemId: 'cut_resistant_armor',
        itemName: '防切割护甲',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 80,
          thickness: 3,
          envProtection: 10,
          resistances: Map({ 'BASH': 10, 'CUT': 25, 'STAB': 15 }),
          rigid: true,
        },
        weight: 2000,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso_outer', List([armor])),
      };

      const cutProtection = EquipmentBodyIntegration.calculateDamageTypeProtection(
        state,
        BodyPartId.TORSO,
        'CUT'
      );

      expect(cutProtection).toBeGreaterThan(0);
      expect(cutProtection).toBeLessThanOrEqual(1);
    });

    it('应该正确计算穿刺防护', () => {
      const armor = createTestEquipmentItem({
        itemId: 'stab_resistant_armor',
        itemName: '防穿刺护甲',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 75,
          thickness: 4,
          envProtection: 10,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 30 }),
          rigid: true,
        },
        weight: 2500,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso_outer', List([armor])),
      };

      const stabProtection = EquipmentBodyIntegration.calculateDamageTypeProtection(
        state,
        BodyPartId.TORSO,
        'STAB'
      );

      expect(stabProtection).toBeGreaterThan(0);
    });
  });

  describe('完整战斗场景', () => {
    it('应该正确处理完整装备角色的战斗', () => {
      // 创建全套装备
      const helmet = createTestEquipmentItem({
        itemId: 'helmet',
        itemName: '战术头盔',
        covers: [EquipmentSlotType.HEAD],
        armor: {
          coverage: 85,
          thickness: 4,
          envProtection: 25,
          resistances: Map({ 'BASH': 12, 'CUT': 18, 'STAB': 15, 'BULLET': 15 }),
          rigid: true,
        },
        weight: 1500,
      });

      const vest = createTestEquipmentItem({
        itemId: 'tactical_vest',
        itemName: '战术背心',
        covers: [EquipmentSlotType.TORSO_OUTER],
        armor: {
          coverage: 75,
          thickness: 6,
          envProtection: 20,
          resistances: Map({ 'BASH': 20, 'CUT': 25, 'STAB': 30, 'BULLET': 25 }),
          rigid: true,
        },
        weight: 4000,
      });

      const armGuards = createTestEquipmentItem({
        itemId: 'arm_guards',
        itemName: '护臂',
        covers: [EquipmentSlotType.HAND_L, EquipmentSlotType.HAND_R],
        armor: {
          coverage: 60,
          thickness: 2,
          envProtection: 5,
          resistances: Map({ 'BASH': 8, 'CUT': 12, 'STAB': 10 }),
          rigid: true,
        },
        weight: 800,
      });

      const legArmor = createTestEquipmentItem({
        itemId: 'leg_armor',
        itemName: '护腿',
        covers: [EquipmentSlotType.LEGS],
        armor: {
          coverage: 70,
          thickness: 3,
          envProtection: 10,
          resistances: Map({ 'BASH': 10, 'CUT': 15, 'STAB': 12 }),
          rigid: true,
        },
        weight: 1500,
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map()
          .set('head', List([helmet]))
          .set('torso_outer', List([vest]))
          .set('hands', List([armGuards]))
          .set('legs', List([legArmor])),
      };

      const armorProtections = EquipmentBodyIntegration.toArmorProtections(state);

      // 测试对躯干的攻击
      const torsoRequest = {
        attackType: AttackType.MELEE as const,
        direction: AttackDirection.FRONT as const,
        totalDamage: 50,
        strategy: DistributionStrategy.TARGETED as const,
        targetPart: BodyPartId.TORSO,
        armor: armorProtections,
      };

      const torsoResult = damageSystem.distributeDamage(bodyPartManager, torsoRequest);
      const torsoDamage = torsoResult.partDamages.find(d => d.partId === BodyPartId.TORSO);

      expect(torsoDamage).toBeDefined();
      expect(torsoDamage!.rawDamage).toBeCloseTo(40, 0); // 80% of 50
      expect(torsoDamage!.blockedDamage).toBeGreaterThan(15); // 战术背心应该阻挡大量伤害
      expect(torsoDamage!.finalDamage).toBeLessThan(25);

      // 测试对头部的攻击
      const headRequest = {
        attackType: AttackType.RANGED as const,
        direction: AttackDirection.FRONT as const,
        totalDamage: 35,
        strategy: DistributionStrategy.TARGETED as const,
        targetPart: BodyPartId.HEAD,
        armor: armorProtections,
      };

      const headResult = damageSystem.distributeDamage(bodyPartManager, headRequest);
      const headDamage = headResult.partDamages.find(d => d.partId === BodyPartId.HEAD);

      expect(headDamage).toBeDefined();
      expect(headDamage!.blockedDamage).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理覆盖率 0% 的装备', () => {
      const item = createTestEquipmentItem({
        armor: {
          coverage: 0,
          thickness: 2,
          envProtection: 0,
          resistances: Map({ 'BASH': 10, 'CUT': 10, 'STAB': 10 }),
          rigid: true,
        },
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso', List([item])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);
      const torso = protections.find(p => p.bodyPart === BodyPartId.TORSO);

      expect(torso).toBeDefined();
      expect(torso!.coverage).toBe(0);
    });

    it('应该处理覆盖率 100% 的装备', () => {
      const item = createTestEquipmentItem({
        armor: {
          coverage: 100,
          thickness: 5,
          envProtection: 30,
          resistances: Map({ 'BASH': 20, 'CUT': 25, 'STAB': 25 }),
          rigid: true,
        },
      });

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso', List([item])),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);
      const torso = protections.find(p => p.bodyPart === BodyPartId.TORSO);

      expect(torso).toBeDefined();
      expect(torso!.coverage).toBeCloseTo(1.0, 2);
    });

    it('应该限制最大防护为 95%', () => {
      // 创建多个高防护装备
      const items = Array(10).fill(null).map((_, i) =>
        createTestEquipmentItem({
          itemId: `super_armor_${i}`,
          itemName: `超级护甲 ${i}`,
          covers: [EquipmentSlotType.TORSO_OUTER],
          armor: {
            coverage: 90,
            thickness: 10,
            envProtection: 50,
            resistances: Map({ 'BASH': 30, 'CUT': 30, 'STAB': 30 }),
            rigid: true,
          },
          weight: 5000,
        })
      );

      const state: EquipmentState = {
        ...emptyState,
        equippedItems: Map().set('torso', List(items)),
      };

      const protections = EquipmentBodyIntegration.calculateBodyPartProtections(state);
      const torso = protections.find(p => p.bodyPart === BodyPartId.TORSO);

      expect(torso).toBeDefined();
      expect(torso!.protection).toBeLessThanOrEqual(0.95);
    });
  });
});
