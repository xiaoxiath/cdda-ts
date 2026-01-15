/**
 * BodyPart 单元测试
 *
 * 测试身体部位的核心功能
 */

import { describe, it, expect } from 'vitest';
import { BodyPart } from '../BodyPart';
import { BodyPartHealth, BodyPartStatus } from '../BodyPartTypes';
import { BodyPartId, BodyPartType } from '../../creature/types';

describe('BodyPart', () => {
  describe('创建身体部位', () => {
    it('应该创建健康的身体部位', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      expect(part.id).toBe(BodyPartId.ARM_L);
      expect(part.name).toBe('左臂');
      expect(part.currentHP).toBe(50);
      expect(part.maxHP).toBe(50);
      expect(part.status).toBe(BodyPartStatus.HEALTHY);
    });

    it('应该创建受伤的身体部位', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 25,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.BROKEN,
        statusDuration: 100,
        pain: 5,
        bleeding: 0,
        infection: 0,
      });

      expect(part.currentHP).toBe(25);
      expect(part.status).toBe(BodyPartStatus.BROKEN);
      expect(part.pain).toBe(5);
    });
  });

  describe('受伤系统', () => {
    it('应该正确处理伤害', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      const result = part.takeDamage(20);

      expect(result.originalDamage).toBe(20);
      expect(result.actualDamage).toBe(20);
      expect(result.newHP).toBe(30);
      expect(result.destroyed).toBe(false);
      expect(result.severed).toBe(false);
    });

    it('应该在 HP 降至 0 时破坏部位', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 10,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
      });

      const result = part.takeDamage(15);

      expect(result.newHP).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.severed).toBe(true);
    });

    it('应该在重伤时产生出血', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      const result = part.takeDamage(20);

      expect(result.effects[0].bleeding).toBeGreaterThan(0);
    });

    it('不应该破坏致命部位', () => {
      const part = BodyPart.create({
        id: BodyPartId.HEAD,
        type: BodyPartType.HEAD,
        name: '头部',
        maxHP: 60,
        currentHP: 5,
        size: 3,
        isLethal: true,
        canBeMissing: false,
        status: BodyPartStatus.BADLY_HURT,
        statusDuration: 0,
        pain: 8,
        bleeding: 0,
        infection: 0,
      });

      const result = part.takeDamage(10);

      expect(result.newHP).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.severed).toBe(false); // 致命部位不会断肢
    });
  });

  describe('治疗系统', () => {
    it('应该正确治疗部位', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 30,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
      });

      const result = part.heal(10);

      expect(result.partId).toBe(BodyPartId.ARM_L);
      expect(result.originalHP).toBe(30);
      expect(result.healAmount).toBe(10);
      expect(result.newHP).toBe(40);
    });

    it('不应该超过最大 HP', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 45,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.BRUISED,
        statusDuration: 0,
        pain: 1,
        bleeding: 0,
        infection: 0,
      });

      const result = part.heal(20);

      expect(result.healAmount).toBe(5);
      expect(result.newHP).toBe(50);
    });

    it('应该在治疗到 90% HP 时移除状态', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 35,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
      });

      const result = part.heal(15);

      expect(result.newHP).toBe(50);
      expect(result.statusRemoved).toBe(true);
      expect(result.removedStatus).toBe(BodyPartStatus.HURT);
    });

    it('不应该治疗断肢', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 0,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.AMPUTATED,
        statusDuration: -1,
        pain: 10,
        bleeding: 0,
        infection: 0,
      });

      const result = part.heal(50);

      expect(result.healAmount).toBe(0);
      expect(result.newHP).toBe(0);
    });
  });

  describe('状态管理', () => {
    it('应该正确设置状态', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      const newPart = part.setStatus(BodyPartStatus.BROKEN, 100);

      expect(newPart.status).toBe(BodyPartStatus.BROKEN);
      expect(newPart.statusDuration).toBe(100);
      expect(newPart.pain).toBe(8);
    });

    it('应该处理状态持续时间', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.BROKEN,
        statusDuration: 5,
        pain: 8,
        bleeding: 2,
        infection: 0,
      });

      const updatedPart = part.processStatusTurn();

      expect(updatedPart.statusDuration).toBe(4);
    });

    it('应该在持续时间结束时移除状态', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 25,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.BROKEN,
        statusDuration: 1,
        pain: 8,
        bleeding: 2,
        infection: 0,
      });

      const updatedPart = part.processStatusTurn();

      expect(updatedPart.status).toBe(BodyPartStatus.HEALTHY);
      expect(updatedPart.statusDuration).toBe(0);
    });

    it('应该保持永久状态', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 0,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.AMPUTATED,
        statusDuration: -1,
        pain: 10,
        bleeding: 0,
        infection: 0,
      });

      const updatedPart = part.processStatusTurn();

      expect(updatedPart.status).toBe(BodyPartStatus.AMPUTATED);
      expect(updatedPart.statusDuration).toBe(-1);
    });
  });

  describe('查询方法', () => {
    it('应该正确判断部位是否功能正常', () => {
      const healthyPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      expect(healthyPart.isFunctional()).toBe(true);

      const brokenPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 0,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.AMPUTATED,
        statusDuration: -1,
        pain: 10,
        bleeding: 0,
        infection: 0,
      });

      expect(brokenPart.isFunctional()).toBe(false);
    });

    it('应该正确计算部位效率', () => {
      const healthyPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      expect(healthyPart.getEfficiency()).toBe(1);

      const injuredPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 25,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
      });

      expect(injuredPart.getEfficiency()).toBeLessThan(1);
      expect(injuredPart.getEfficiency()).toBeGreaterThan(0);
    });

    it('应该正确获取健康状态', () => {
      const healthyPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      expect(healthyPart.getHealthStatus()).toBe(BodyPartHealth.HEALTHY);

      const hurtPart = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 35,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.BRUISED,
        statusDuration: 0,
        pain: 1,
        bleeding: 0,
        infection: 0,
      });

      expect(hurtPart.getHealthStatus()).toBe(BodyPartHealth.BRUISED);
    });

    it('应该正确获取部位影响', () => {
      const legPart = BodyPart.create({
        id: BodyPartId.LEG_L,
        type: BodyPartType.LEG,
        name: '左腿',
        maxHP: 60,
        currentHP: 60,
        size: 5,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      const impact = legPart.getImpact();

      expect(impact.speedModifier).toBe(1);
      expect(impact.canMove).toBe(true);
    });

    it('应该正确获取部位统计', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 30,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 3,
        bleeding: 1,
        infection: 0.2,
      });

      const stats = part.getStats();

      expect(stats.totalHP).toBe(30);
      expect(stats.totalMaxHP).toBe(50);
      expect(stats.functionalParts).toBe(1);
      expect(stats.injuredParts).toBe(1);
      expect(stats.totalPain).toBe(3);
      expect(stats.healthPercentage).toBe(60);
    });
  });

  describe('序列化', () => {
    it('应该正确序列化为 JSON', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 30,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
      });

      const json = part.toJSON();

      expect(json.id).toBe(BodyPartId.ARM_L);
      expect(json.name).toBe('左臂');
      expect(json.currentHP).toBe(30);
      expect(json.status).toBe(BodyPartStatus.HURT);
    });

    it('应该正确从 JSON 创建', () => {
      const json = {
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 30,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HURT,
        statusDuration: 0,
        pain: 2,
        bleeding: 0,
        infection: 0,
        subParts: {},
      };

      const part = BodyPart.fromJSON(json);

      expect(part.id).toBe(BodyPartId.ARM_L);
      expect(part.name).toBe('左臂');
      expect(part.currentHP).toBe(30);
      expect(part.status).toBe(BodyPartStatus.HURT);
    });
  });

  describe('不可变性', () => {
    it('应该保持不可变', () => {
      const part = BodyPart.create({
        id: BodyPartId.ARM_L,
        type: BodyPartType.ARM,
        name: '左臂',
        maxHP: 50,
        currentHP: 50,
        size: 4,
        isLethal: false,
        canBeMissing: true,
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      const result = part.takeDamage(20);

      // 原始部位不应该被修改
      expect(part.currentHP).toBe(50);
      expect(part.status).toBe(BodyPartStatus.HEALTHY);

      // 返回的新 HP 应该不同
      expect(result.newHP).toBe(30);
    });
  });
});
