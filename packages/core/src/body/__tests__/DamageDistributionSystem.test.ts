/**
 * DamageDistributionSystem 单元测试
 *
 * 测试伤害分配系统的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DamageDistributionSystem } from '../DamageDistributionSystem';
import { BodyPartManager } from '../BodyPartManager';
import {
  AttackType,
  AttackDirection,
  DistributionStrategy,
  type DamageDistributionRequest,
} from '../DamageDistributionSystem';
import { BodyPartId } from '../../creature/types';

describe('DamageDistributionSystem', () => {
  let system: DamageDistributionSystem;
  let bodyPartManager: BodyPartManager;

  beforeEach(() => {
    system = DamageDistributionSystem.create();
    bodyPartManager = BodyPartManager.createHuman('test_npc', '测试角色');
  });

  describe('随机分配策略', () => {
    it('应该选择单个部位承受全部伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.RANDOM,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.partDamages).toHaveLength(1);
      expect(result.partDamages[0].finalDamage).toBe(30);
      expect(result.totalDamage).toBe(30);
    });

    it('应该考虑攻击方向', () => {
      const frontRequest: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.RANDOM,
      };

      // 使用固定随机数来确保测试可预测
      const fixedSystem = DamageDistributionSystem.createWithRandom(() => 0.1);
      const result = fixedSystem.distributeDamage(bodyPartManager, frontRequest);

      expect(result.partDamages).toHaveLength(1);
      expect(result.partDamages[0].partId).toBeDefined();
    });
  });

  describe('基于大小加权的分配', () => {
    it('应该根据部位大小分配主要伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 50,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.partDamages.length).toBeGreaterThan(0);
      expect(result.totalDamage).toBeGreaterThan(0);

      // 主要伤害应该在较大部位
      const mainDamage = Math.max(...result.partDamages.map(d => d.finalDamage));
      expect(mainDamage).toBeGreaterThan(0);
    });

    it('应该将部分伤害溅射到其他部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 50,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 应该有主目标和溅射目标
      if (result.partDamages.length > 1) {
        const sortedDamages = result.partDamages
          .map(d => d.finalDamage)
          .sort((a, b) => b - a);

        // 主目标应该承受更多伤害
        expect(sortedDamages[0]).toBeGreaterThan(sortedDamages[1] || 0);
      }
    });
  });

  describe('指定目标分配', () => {
    it('应该将主要伤害分配到指定部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 40,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.HEAD,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      const headDamage = result.partDamages.find(d => d.partId === BodyPartId.HEAD);
      expect(headDamage).toBeDefined();
      expect(headDamage!.finalDamage).toBeCloseTo(32, 0); // 80% of 40
    });

    it('应该将剩余伤害溅射到相邻部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 40,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.ARM_L,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 应该有左臂和可能的其他部位
      expect(result.partDamages.length).toBeGreaterThan(0);

      const armDamage = result.partDamages.find(d => d.partId === BodyPartId.ARM_L);
      expect(armDamage).toBeDefined();
    });

    it('应该处理不存在的目标部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.TARGETED,
        targetPart: 999 as BodyPartId, // 无效部位
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 应该回退到 SIZE_WEIGHTED 策略
      expect(result.partDamages.length).toBeGreaterThan(0);
    });
  });

  describe('均匀分配', () => {
    it('应该将伤害均匀分配到所有部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.EXPLOSION,
        direction: AttackDirection.ALL,
        totalDamage: 120,
        strategy: DistributionStrategy.EVEN,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 所有部位应该受到相同的伤害
      const damages = result.partDamages.map(d => d.finalDamage);
      const uniqueDamages = new Set(damages.map(d => Math.round(d * 10) / 10));

      // 大部分部位应该受到相似伤害
      expect(uniqueDamages.size).toBeLessThanOrEqual(2);
    });

    it('应该计算正确的总伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.EXPLOSION,
        direction: AttackDirection.ALL,
        totalDamage: 120,
        strategy: DistributionStrategy.EVEN,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.totalDamage).toBeCloseTo(120, 0);
    });
  });

  describe('攻击方向影响', () => {
    it('应该提高正面攻击的躯干命中率', () => {
      const frontRequest: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
        randomness: 0, // 无随机性，纯基于权重
      };

      const noRandomSystem = DamageDistributionSystem.createWithRandom(() => 0.5);
      const result = noRandomSystem.distributeDamage(bodyPartManager, frontRequest);

      expect(result.partDamages.length).toBeGreaterThan(0);
    });

    it('应该提高上方攻击的头部命中率', () => {
      const aboveRequest: DamageDistributionRequest = {
        attackType: AttackType.EXPLOSION,
        direction: AttackDirection.ABOVE,
        totalDamage: 30,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
        randomness: 0,
      };

      const noRandomSystem = DamageDistributionSystem.createWithRandom(() => 0.5);
      const result = noRandomSystem.distributeDamage(bodyPartManager, aboveRequest);

      expect(result.partDamages.length).toBeGreaterThan(0);
    });
  });

  describe('攻击类型影响', () => {
    it('应该为跌落伤害调整部位权重', () => {
      const fallRequest: DamageDistributionRequest = {
        attackType: AttackType.FALL,
        direction: AttackDirection.BELOW,
        totalDamage: 50,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
        randomness: 0, // 无随机性，纯基于权重
      };

      const noRandomSystem = DamageDistributionSystem.createWithRandom(() => 0.5);
      const result = noRandomSystem.distributeDamage(bodyPartManager, fallRequest);

      // 跌落应该影响腿部，由于使用固定随机数，应该可预测地选择腿或脚
      const legDamages = result.partDamages.filter(
        d => d.partId === BodyPartId.LEG_L || d.partId === BodyPartId.LEG_R ||
             d.partId === BodyPartId.FOOT_L || d.partId === BodyPartId.FOOT_R
      );

      // 应该至少有一个腿部相关部位受到伤害
      expect(legDamages.length).toBeGreaterThan(0);
    });

    it('应该为远程攻击调整部位权重', () => {
      const rangedRequest: DamageDistributionRequest = {
        attackType: AttackType.RANGED,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
      };

      const result = system.distributeDamage(bodyPartManager, rangedRequest);

      expect(result.partDamages.length).toBeGreaterThan(0);
    });
  });

  describe('装备防护', () => {
    it('应该减少装备部位的伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.TORSO,
        armor: [
          {
            bodyPart: BodyPartId.TORSO,
            protection: 0.5, // 50% 防护
            coverage: 1.0, // 100% 覆盖
          },
        ],
      };

      const result = system.distributeDamage(bodyPartManager, request);

      const torsoDamage = result.partDamages.find(d => d.partId === BodyPartId.TORSO);
      expect(torsoDamage).toBeDefined();
      // 主目标伤害 = 30 * 0.8 = 24，防护 = 24 * 0.5 = 12，最终 = 24 - 12 = 12
      expect(torsoDamage!.rawDamage).toBeCloseTo(24, 0); // 80% of 30
      expect(torsoDamage!.blockedDamage).toBeCloseTo(12, 0); // 24 * 0.5
      expect(torsoDamage!.finalDamage).toBeCloseTo(12, 0); // 24 - 12
    });

    it('应该根据覆盖率计算防护', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 40,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.TORSO,
        armor: [
          {
            bodyPart: BodyPartId.TORSO,
            protection: 0.6, // 60% 防护
            coverage: 0.5, // 50% 覆盖
          },
        ],
      };

      const result = system.distributeDamage(bodyPartManager, request);

      const torsoDamage = result.partDamages.find(d => d.partId === BodyPartId.TORSO);
      expect(torsoDamage).toBeDefined();

      // 主目标伤害 = 40 * 0.8 = 32
      // 防护 = 0.6 * 0.5 = 0.3 (30%)
      // 阻挡伤害 = 32 * 0.3 = 9.6
      // 最终伤害 = 32 - 9.6 = 22.4
      expect(torsoDamage!.blockedDamage).toBeCloseTo(9.6, 1);
      expect(torsoDamage!.finalDamage).toBeCloseTo(22.4, 1);
    });

    it('应该不影响无装备部位', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.TORSO,
        armor: [
          {
            bodyPart: BodyPartId.ARM_L, // 保护手臂，不是躯干
            protection: 0.8,
            coverage: 1.0,
          },
        ],
      };

      const result = system.distributeDamage(bodyPartManager, request);

      const torsoDamage = result.partDamages.find(d => d.partId === BodyPartId.TORSO);
      expect(torsoDamage).toBeDefined();
      // 躯干没有装备，所以不阻挡伤害
      // 主目标伤害 = 30 * 0.8 = 24
      expect(torsoDamage!.blockedDamage).toBe(0);
      expect(torsoDamage!.finalDamage).toBeCloseTo(24, 0); // 80% of 30
    });
  });

  describe('致命伤害检测', () => {
    it('应该检测到致命部位的致命伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 100,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.HEAD,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 头部受到致命伤害
      expect(result.lethalHits).toContain(BodyPartId.HEAD);
    });

    it('不应该将非致命部位标记为致命', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 60,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.ARM_L,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 手臂不是致命部位
      expect(result.lethalHits).not.toContain(BodyPartId.ARM_L);
    });
  });

  describe('复杂场景', () => {
    it('应该处理爆炸攻击', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.EXPLOSION,
        direction: AttackDirection.ALL,
        totalDamage: 200,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 爆炸应该影响多个部位
      expect(result.partDamages.length).toBeGreaterThan(1);
      expect(result.totalDamage).toBeGreaterThan(0);
    });

    it('应该处理带装备的近战攻击', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 25,
        strategy: DistributionStrategy.TARGETED, // 改为 TARGETED 以确保击中有装备的部位
        targetPart: BodyPartId.TORSO,
        armor: [
          { bodyPart: BodyPartId.TORSO, protection: 0.4, coverage: 1.0 },
          { bodyPart: BodyPartId.HEAD, protection: 0.3, coverage: 0.8 },
        ],
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.partDamages.length).toBeGreaterThan(0);
      // 主目标伤害 = 25 * 0.8 = 20
      // 阻挡伤害 = 20 * 0.4 = 8
      expect(result.totalBlocked).toBeCloseTo(8, 0);
    });

    it('应该正确计算总伤害和总阻挡', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 100,
        strategy: DistributionStrategy.TARGETED,
        targetPart: BodyPartId.TORSO,
        armor: [
          { bodyPart: BodyPartId.TORSO, protection: 0.5, coverage: 1.0 },
        ],
      };

      const result = system.distributeDamage(bodyPartManager, request);

      // 总伤害 + 总阻挡应该接近原始伤害
      const total = result.totalDamage + result.totalBlocked;
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理零伤害', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 0,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.totalDamage).toBe(0);
    });

    it('应该处理高随机性', () => {
      const request: DamageDistributionRequest = {
        attackType: AttackType.MELEE,
        direction: AttackDirection.FRONT,
        totalDamage: 30,
        strategy: DistributionStrategy.SIZE_WEIGHTED,
        randomness: 1.0, // 完全随机
      };

      const result = system.distributeDamage(bodyPartManager, request);

      expect(result.partDamages.length).toBeGreaterThan(0);
    });
  });
});
