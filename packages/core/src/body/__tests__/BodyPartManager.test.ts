/**
 * BodyPartManager 单元测试
 *
 * 测试身体部位管理器的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map } from 'immutable';
import { BodyPartManager } from '../BodyPartManager';
import { BodyPart } from '../BodyPart';
import { BodyPartStatus } from '../BodyPartTypes';
import { BodyPartId, BodyPartType } from '../../creature/types';

describe('BodyPartManager', () => {
  let manager: BodyPartManager;

  beforeEach(() => {
    manager = BodyPartManager.createHuman('test_npc', '测试角色');
  });

  describe('创建管理器', () => {
    it('应该创建包含所有人类身体部位的管理器', () => {
      const parts = manager.getAllParts();

      expect(parts.size).toBe(12); // 12 个标准身体部位
    });

    it('应该包含所有必需的身体部位', () => {
      expect(manager.getPart(BodyPartId.TORSO)).toBeDefined();
      expect(manager.getPart(BodyPartId.HEAD)).toBeDefined();
      expect(manager.getPart(BodyPartId.ARM_L)).toBeDefined();
      expect(manager.getPart(BodyPartId.ARM_R)).toBeDefined();
      expect(manager.getPart(BodyPartId.LEG_L)).toBeDefined();
      expect(manager.getPart(BodyPartId.LEG_R)).toBeDefined();
    });

    it('应该正确设置部位属性', () => {
      const head = manager.getPart(BodyPartId.HEAD);

      expect(head?.name).toBe('头部');
      expect(head?.maxHP).toBe(60);
      expect(head?.currentHP).toBe(60);
      expect(head?.isLethal).toBe(true);
    });

    it('应该保持不可变性', () => {
      const originalManager = manager;
      const updatedManager = manager.takeDamage(BodyPartId.ARM_L, 20);

      // 原始管理器不应该被修改
      expect(originalManager.getPartHP(BodyPartId.ARM_L)).toBe(50);

      // 新管理器应该有不同的 HP
      expect(updatedManager.getPartHP(BodyPartId.ARM_L)).toBe(30);
    });
  });

  describe('伤害系统', () => {
    it('应该正确处理单部位伤害', () => {
      const updatedManager = manager.takeDamage(BodyPartId.ARM_L, 20);

      expect(updatedManager.getPartHP(BodyPartId.ARM_L)).toBe(30);
    });

    it('应该保持其他部位不受影响', () => {
      const updatedManager = manager.takeDamage(BodyPartId.ARM_L, 20);

      expect(updatedManager.getPartHP(BodyPartId.ARM_R)).toBe(50);
      expect(updatedManager.getPartHP(BodyPartId.LEG_L)).toBe(60);
    });

    it('应该处理部位破坏', () => {
      const updatedManager = manager
        .takeDamage(BodyPartId.ARM_L, 45)
        .takeDamage(BodyPartId.ARM_L, 10);

      const arm = updatedManager.getPart(BodyPartId.ARM_L);

      expect(arm?.currentHP).toBe(0);
      expect(arm?.status).toBe(BodyPartStatus.AMPUTATED);
    });

    it('应该正确判断死亡', () => {
      // 头部受到致命伤害
      const updatedManager = manager.takeDamage(BodyPartId.HEAD, 70);

      expect(updatedManager.isDead()).toBe(true);
    });

    it('应该正确判断倒地', () => {
      // 双腿都受伤
      const updatedManager = manager
        .takeDamage(BodyPartId.LEG_L, 65)
        .takeDamage(BodyPartId.LEG_R, 65);

      expect(updatedManager.isDowned()).toBe(true);
    });

    it('单腿受伤不应该倒地', () => {
      const updatedManager = manager.takeDamage(BodyPartId.LEG_L, 65);

      expect(updatedManager.isDowned()).toBe(false);
    });
  });

  describe('治疗系统', () => {
    it('应该正确治疗部位', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 20);
      const healedManager = injuredManager.heal(BodyPartId.ARM_L, 10);

      expect(healedManager.getPartHP(BodyPartId.ARM_L)).toBe(40);
    });

    it('不应该超过最大 HP', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 10);
      const healedManager = injuredManager.heal(BodyPartId.ARM_L, 20);

      expect(healedManager.getPartHP(BodyPartId.ARM_L)).toBe(50);
    });

    it('应该在治疗时移除状态', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 30);
      const healedManager = injuredManager.heal(BodyPartId.ARM_L, 30);

      const arm = healedManager.getPart(BodyPartId.ARM_L);

      expect(arm?.status).toBe(BodyPartStatus.HEALTHY);
    });
  });

  describe('状态管理', () => {
    it('应该正确设置部位状态', () => {
      const updatedManager = manager.setPartStatus(
        BodyPartId.ARM_L,
        BodyPartStatus.BROKEN,
        100
      );

      const arm = updatedManager.getPart(BodyPartId.ARM_L);

      expect(arm?.status).toBe(BodyPartStatus.BROKEN);
      expect(arm?.statusDuration).toBe(100);
    });

    it('应该处理状态持续时间', () => {
      const brokenManager = manager.setPartStatus(
        BodyPartId.ARM_L,
        BodyPartStatus.BROKEN,
        5
      );

      const updatedManager = brokenManager.processTurn();

      const arm = updatedManager.getPart(BodyPartId.ARM_L);

      expect(arm?.statusDuration).toBe(4);
    });

    it('应该在持续时间结束时移除状态', () => {
      const brokenManager = manager.setPartStatus(
        BodyPartId.ARM_L,
        BodyPartStatus.BROKEN,
        1
      );

      const updatedManager = brokenManager.processTurn();

      const arm = updatedManager.getPart(BodyPartId.ARM_L);

      expect(arm?.status).toBe(BodyPartStatus.HEALTHY);
      expect(arm?.statusDuration).toBe(0);
    });

    it('应该处理出血', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 25);
      const updatedManager = injuredManager.processTurn();

      const arm = updatedManager.getPart(BodyPartId.ARM_L);

      // 出血应该造成额外伤害
      expect(arm?.currentHP).toBeLessThan(25);
    });
  });

  describe('查询方法', () => {
    it('应该正确判断部位是否功能正常', () => {
      expect(manager.isPartFunctional(BodyPartId.ARM_L)).toBe(true);

      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 55);

      expect(injuredManager.isPartFunctional(BodyPartId.ARM_L)).toBe(false);
    });

    it('应该正确获取部位效率', () => {
      expect(manager.getPartEfficiency(BodyPartId.ARM_L)).toBe(1);

      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 25);

      expect(injuredManager.getPartEfficiency(BodyPartId.ARM_L)).toBeLessThan(1);
    });

    it('应该正确获取部位 HP', () => {
      expect(manager.getPartHP(BodyPartId.ARM_L)).toBe(50);
      expect(manager.getPartMaxHP(BodyPartId.ARM_L)).toBe(50);
    });

    it('应该查询所有部位', () => {
      const allParts = manager.getAllParts();

      expect(allParts.size).toBe(12);
    });

    it('应该查询功能正常的部位', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 55);
      const functionalParts = injuredManager.queryParts({ onlyFunctional: true });

      expect(functionalParts.size).toBe(11); // 一个部位不正常
    });

    it('应该按类型查询部位', () => {
      const armParts = manager.queryParts({ typeFilter: BodyPartType.ARM });

      expect(armParts.size).toBe(2); // 左臂和右臂
    });

    it('应该按状态查询部位', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 30);
      const injuredParts = injuredManager.queryParts({
        statusFilter: BodyPartStatus.CUT,
      });

      expect(injuredParts.size).toBeGreaterThan(0);
    });
  });

  describe('统计功能', () => {
    it('应该正确计算总体统计', () => {
      const stats = manager.getStats();

      expect(stats.totalMaxHP).toBe(550); // 所有部位的 HP 总和
      expect(stats.totalHP).toBe(550);
      expect(stats.functionalParts).toBe(12);
      expect(stats.injuredParts).toBe(0);
      expect(stats.healthPercentage).toBe(100);
    });

    it('应该正确计算受伤后的统计', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 30);
      const stats = injuredManager.getStats();

      expect(stats.totalHP).toBeLessThan(550);
      expect(stats.injuredParts).toBe(1);
      expect(stats.healthPercentage).toBeLessThan(100);
    });

    it('应该正确获取整体影响', () => {
      const impact = manager.getOverallImpact();

      expect(impact.speedModifier).toBe(1);
      expect(impact.dexterityModifier).toBe(1);
      expect(impact.canMove).toBe(true);
      expect(impact.canUseBothHands).toBe(true);
    });

    it('应该正确计算受伤后的影响', () => {
      const injuredManager = manager.takeDamage(BodyPartId.LEG_L, 65);
      const impact = injuredManager.getOverallImpact();

      expect(impact.speedModifier).toBeLessThan(1);
    });

    it('应该正确计算断肢后的影响', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 55);
      const impact = injuredManager.getOverallImpact();

      expect(impact.dexterityModifier).toBeLessThan(1);
      expect(impact.canUseBothHands).toBe(false);
    });
  });

  describe('序列化', () => {
    it('应该正确序列化为 JSON', () => {
      const json = manager.toJSON();

      expect(json.ownerId).toBe('test_npc');
      expect(json.ownerName).toBe('测试角色');
      expect(json.parts).toBeDefined();
      expect(Object.keys(json.parts).length).toBe(12);
    });

    it('应该正确从 JSON 创建', () => {
      const json = manager.toJSON();
      const restoredManager = BodyPartManager.fromJSON(json);

      expect(restoredManager.ownerId).toBe('test_npc');
      expect(restoredManager.ownerName).toBe('测试角色');

      // 检查部位
      expect(restoredManager.getPartHP(BodyPartId.ARM_L)).toBe(50);
      expect(restoredManager.getPartHP(BodyPartId.HEAD)).toBe(60);
    });

    it('应该正确序列化和恢复受伤状态', () => {
      const injuredManager = manager.takeDamage(BodyPartId.ARM_L, 30);
      const json = injuredManager.toJSON();
      const restoredManager = BodyPartManager.fromJSON(json);

      expect(restoredManager.getPartHP(BodyPartId.ARM_L)).toBe(20);

      const arm = restoredManager.getPart(BodyPartId.ARM_L);

      expect(arm?.status).toBe(BodyPartStatus.CUT);
    });
  });

  describe('复杂场景', () => {
    it('应该处理连续伤害', () => {
      const result = manager
        .takeDamage(BodyPartId.ARM_L, 10)
        .takeDamage(BodyPartId.ARM_L, 15)
        .takeDamage(BodyPartId.ARM_L, 5);

      expect(result.getPartHP(BodyPartId.ARM_L)).toBe(20);
    });

    it('应该同时治疗多个部位', () => {
      const injured = manager
        .takeDamage(BodyPartId.ARM_L, 20)
        .takeDamage(BodyPartId.ARM_R, 15)
        .takeDamage(BodyPartId.LEG_L, 25);

      const healed = injured
        .heal(BodyPartId.ARM_L, 10)
        .heal(BodyPartId.ARM_R, 15)
        .heal(BodyPartId.LEG_L, 20);

      expect(healed.getPartHP(BodyPartId.ARM_L)).toBe(40);
      expect(healed.getPartHP(BodyPartId.ARM_R)).toBe(50);
      expect(healed.getPartHP(BodyPartId.LEG_L)).toBe(55);
    });

    it('应该处理多处受伤后的整体状态', () => {
      const injured = manager
        .takeDamage(BodyPartId.ARM_L, 30)
        .takeDamage(BodyPartId.LEG_L, 40)
        .takeDamage(BodyPartId.HEAD, 20);

      const stats = injured.getStats();
      const impact = injured.getOverallImpact();

      expect(stats.injuredParts).toBe(3);
      expect(stats.healthPercentage).toBeLessThan(90);
      expect(impact.speedModifier).toBeLessThan(1);
      expect(impact.dexterityModifier).toBeLessThan(1);
      expect(impact.perceptionModifier).toBeLessThan(1);
    });
  });
});
