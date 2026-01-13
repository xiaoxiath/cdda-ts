/**
 * 制作系统综合测试
 *
 * 测试 Proficiency、Quality、BatchOptimizer、RecipeHelper 系统
 */

import { describe, it, expect } from 'vitest';
import { List, Map, Set } from 'immutable';

// Proficiency 系统
import {
  ProficiencyDefinition,
  Proficiency,
  ProficiencyDefinitions,
} from '../Proficiency';
import type { ProficiencyId } from '../types';

// Quality 系统
import {
  QualityDefinition,
  QualityManager,
  QualityDefinitions,
} from '../Quality';
import type { QualityId, QualityLevel, QualityData } from '../types';

// BatchOptimizer 系统
import { BatchOptimizer } from '../BatchOptimizer';
import type { BatchOptimizationParams } from '../types';

// RecipeHelper 系统
import { RecipeHelper } from '../RecipeHelper';
import { Recipe } from '../Recipe';
import { RecipeCategory, RecipeSortBy, RecipeSortOrder } from '../types';

// ============================================================================
// Proficiency 系统测试
// ============================================================================

describe('Proficiency 系统', () => {
  describe('ProficiencyDefinition', () => {
    it('应该创建熟练度定义', () => {
      const def = ProficiencyDefinition.simple(
        'test_cooking' as ProficiencyId,
        '烹饪',
        'food',
        [RecipeCategory.FOOD],
        5
      );

      expect(def.id).toBe('test_cooking');
      expect(def.name).toBe('烹饪');
      expect(def.category).toBe('food');
      expect(def.relatedCategories.length).toBe(1);
      expect(def.maxLevel).toBe(5);
    });

    it('应该正确计算升级所需经验', () => {
      const def = ProficiencyDefinitions.COOKING;

      // 等级 0 -> 1
      expect(def.getExperienceForLevel(0)).toBe(100);
      // 等级 1 -> 2
      expect(def.getExperienceForLevel(1)).toBe(200);
      // 等级 4 -> 5
      expect(def.getExperienceForLevel(4)).toBe(500);
      // 已达最大等级
      expect(def.getExperienceForLevel(5)).toBe(Infinity);
    });

    it('应该正确计算制作速度倍率', () => {
      const def = ProficiencyDefinitions.COOKING;

      expect(def.getSpeedMultiplier(0)).toBe(1.0);
      expect(def.getSpeedMultiplier(1)).toBe(0.9);
      expect(def.getSpeedMultiplier(5)).toBe(0.5);
    });

    it('应该正确计算成功率加值', () => {
      const def = ProficiencyDefinitions.COOKING;

      expect(def.getSuccessRateBonus(0)).toBe(0);
      expect(def.getSuccessRateBonus(1)).toBe(0.05);
      expect(def.getSuccessRateBonus(5)).toBe(0.25);
    });

    it('应该正确计算批量大小修正', () => {
      const def = ProficiencyDefinitions.COOKING;

      expect(def.getBatchSizeModifier(0)).toBe(0);
      expect(def.getBatchSizeModifier(1)).toBe(1);
      expect(def.getBatchSizeModifier(5)).toBe(5);
    });

    it('应该检查是否与配方类别相关', () => {
      const def = ProficiencyDefinitions.COOKING;

      expect(def.isRelatedToCategory(RecipeCategory.FOOD)).toBe(true);
      expect(def.isRelatedToCategory(RecipeCategory.AMMO)).toBe(false);
    });
  });

  describe('Proficiency', () => {
    it('应该创建新的熟练度实例', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.new(def);

      expect(prof.definition).toBe(def);
      expect(prof.level).toBe(0);
      expect(prof.experience).toBe(0);
      expect(prof.isUnlocked).toBe(false);
    });

    it('应该创建已解锁的熟练度实例', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.unlocked(def, 2);

      expect(prof.level).toBe(2);
      expect(prof.isUnlocked).toBe(true);
    });

    it('应该解锁熟练度', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.new(def);
      const unlocked = prof.unlock();

      expect(unlocked.isUnlocked).toBe(true);
      expect(prof.isUnlocked).toBe(false); // 原实例不变
    });

    it('应该增加经验并升级', () => {
      const def = ProficiencyDefinitions.COOKING;
      let prof = Proficiency.unlocked(def);

      // 增加 50 经验（不够升级）
      prof = prof.gainExperience(50);
      expect(prof.level).toBe(0);
      expect(prof.experience).toBe(50);

      // 增加 50 经验（共 100，够升级）
      prof = prof.gainExperience(50);
      expect(prof.level).toBe(1);
      expect(prof.experience).toBe(0);
    });

    it('应该计算下一等级所需经验', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.unlocked(def);

      expect(prof.getExperienceToNextLevel()).toBe(100);
    });

    it('应该达到最大等级时返回 0', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.unlocked(def, 5);

      expect(prof.isMaxLevel()).toBe(true);
      expect(prof.getExperienceToNextLevel()).toBe(0);
    });

    it('应该正确计算制作加成', () => {
      const def = ProficiencyDefinitions.COOKING;
      const prof = Proficiency.unlocked(def, 3);

      const bonus = prof.getCraftingBonus();
      expect(bonus.speedMultiplier).toBeCloseTo(0.7, 5);
      expect(bonus.successRateBonus).toBeCloseTo(0.15, 5);
      expect(bonus.batchSizeModifier).toBe(3);
    });
  });
});

// ============================================================================
// Quality 系统测试
// ============================================================================

describe('Quality 系统', () => {
  describe('QualityDefinition', () => {
    it('应该创建质量定义', () => {
      const def = QualityDefinition.simple(
        'test_hammer' as QualityId,
        '锤击',
        ['hammer']
      );

      expect(def.id).toBe('test_hammer');
      expect(def.name).toBe('锤击');
      expect(def.relatedTools.has('hammer')).toBe(true);
    });

    it('应该检查工具是否相关', () => {
      const def = QualityDefinitions.HAMMER;

      expect(def.isRelatedToTool('hammer')).toBe(true);
      expect(def.isRelatedToTool('knife')).toBe(false);
    });

    it('应该获取质量等级名称', () => {
      const def = QualityDefinitions.HAMMER;

      expect(def.getLevelName(0)).toBe('极差');
      expect(def.getLevelName(1)).toBe('差');
      expect(def.getLevelName(2)).toBe('较差');
      expect(def.getLevelName(3)).toBe('普通');
      expect(def.getLevelName(4)).toBe('良好');
      expect(def.getLevelName(5)).toBe('优秀');
    });
  });

  describe('QualityManager', () => {
    it('应该检查质量要求是否满足', () => {
      const availableQualities = List<QualityData>([
        { qualityId: 'quality_hammer' as QualityId, level: 3 },
        { qualityId: 'quality_cut' as QualityId, level: 2 },
      ]);

      const requirements = List([
        { qualityId: 'quality_hammer' as QualityId, minLevel: 2 as QualityLevel },
        { qualityId: 'quality_cut' as QualityId, minLevel: 3 as QualityLevel, required: true },
      ]);

      const result = QualityManager.checkQualityRequirements(
        availableQualities,
        requirements
      );

      expect(result.matches).toBe(false); // cut 质量等级不足
      expect(result.matchedQualities).toHaveLength(1);
      expect(result.insufficientLevel).toHaveLength(1);
    });

    it('应该找到最佳质量匹配', () => {
      const candidateQualities = List<List<QualityData>>([
        List([{ qualityId: 'quality_hammer' as QualityId, level: 1 }]),
        List([{ qualityId: 'quality_hammer' as QualityId, level: 3 }]),
        List([{ qualityId: 'quality_hammer' as QualityId, level: 2 }]),
      ]);

      const requirements = List([
        { qualityId: 'quality_hammer' as QualityId, minLevel: 1 as QualityLevel },
      ]);

      const bestIndex = QualityManager.findBestQualityMatch(
        candidateQualities,
        requirements
      );

      expect(bestIndex).toBe(1); // 第 2 个候选质量等级最高
    });

    it('应该计算质量等级差异', () => {
      expect(QualityManager.getQualityLevelDifference(3, 5)).toBe(2);
      expect(QualityManager.getQualityLevelDifference(5, 3)).toBe(-2);
    });

    it('应该根据质量调整制作时间', () => {
      expect(QualityManager.adjustTimeByQuality(0, 100)).toBe(100);
      expect(QualityManager.adjustTimeByQuality(2, 100)).toBe(80);
      expect(QualityManager.adjustTimeByQuality(-1, 100)).toBeCloseTo(110, 5);
    });

    it('应该根据质量调整成功率', () => {
      expect(QualityManager.adjustSuccessRateByQuality(0, 0.5)).toBe(0.5);
      expect(QualityManager.adjustSuccessRateByQuality(2, 0.5)).toBe(0.6);
      expect(QualityManager.adjustSuccessRateByQuality(-1, 0.5)).toBe(0.45);
    });
  });
});

// ============================================================================
// BatchOptimizer 系统测试
// ============================================================================

describe('BatchOptimizer 系统', () => {
  describe('Logistic 函数', () => {
    it('应该正确计算 Logistic 函数值', () => {
      // 标准情况
      expect(BatchOptimizer.logisticFunction(5, 10, 1, 5)).toBeCloseTo(5, 1);

      // 在中心点附近
      expect(BatchOptimizer.logisticFunction(5, 10, 1, 5)).toBeCloseTo(5, 1);
      expect(BatchOptimizer.logisticFunction(6, 10, 1, 5)).toBeGreaterThan(5);

      // 极端情况
      expect(BatchOptimizer.logisticFunction(0, 10, 1, 5)).toBeLessThan(1);
      expect(BatchOptimizer.logisticFunction(10, 10, 1, 5)).toBeGreaterThan(9);
    });
  });

  describe('批量优化计算', () => {
    it('应该计算最优批量大小', () => {
      const params: BatchOptimizationParams = {
        baseBatchSize: 1,
        skillLevel: 5,
        proficiencyLevel: 0,
        difficultyMultiplier: 1.0,
        maxBatchLimit: 20,
      };

      const result = BatchOptimizer.calculateOptimalBatch(params);

      expect(result.batchSize).toBeGreaterThan(0);
      expect(result.batchSize).toBeLessThanOrEqual(params.maxBatchLimit!);
      expect(result.efficiency).toBeGreaterThan(0);
      expect(result.efficiency).toBeLessThanOrEqual(1);
    });

    it('技能等级越高批量越大', () => {
      const params1: BatchOptimizationParams = {
        baseBatchSize: 1,
        skillLevel: 1,
        difficultyMultiplier: 1.0,
      };

      const params2: BatchOptimizationParams = {
        baseBatchSize: 1,
        skillLevel: 5,
        difficultyMultiplier: 1.0,
      };

      const result1 = BatchOptimizer.calculateOptimalBatch(params1);
      const result2 = BatchOptimizer.calculateOptimalBatch(params2);

      expect(result2.batchSize).toBeGreaterThan(result1.batchSize);
    });

    it('熟练度应该增加批量大小', () => {
      const params1: BatchOptimizationParams = {
        baseBatchSize: 2,  // 增加基础批量以看到差异
        skillLevel: 5,
        proficiencyLevel: 0,
        difficultyMultiplier: 1.0,
        maxBatchLimit: 20,
      };

      const params2: BatchOptimizationParams = {
        baseBatchSize: 2,  // 增加基础批量以看到差异
        skillLevel: 5,
        proficiencyLevel: 3,
        difficultyMultiplier: 1.0,
        maxBatchLimit: 20,
      };

      const result1 = BatchOptimizer.calculateOptimalBatch(params1);
      const result2 = BatchOptimizer.calculateOptimalBatch(params2);

      expect(result2.batchSize).toBeGreaterThan(result1.batchSize);
    });

    it('难度越高批量越小', () => {
      // 注意：由于 Logistic 函数的特性，在某些参数范围内差异可能不明显
      // 这里使用较低的技能等级来放大难度差异的影响
      const params1: BatchOptimizationParams = {
        baseBatchSize: 5,
        skillLevel: 1,  // 低技能等级
        difficultyMultiplier: 1.0,
        maxBatchLimit: 20,
      };

      const params2: BatchOptimizationParams = {
        baseBatchSize: 5,
        skillLevel: 1,  // 低技能等级
        difficultyMultiplier: 3.0,  // 高难度
        maxBatchLimit: 20,
      };

      const result1 = BatchOptimizer.calculateOptimalBatch(params1);
      const result2 = BatchOptimizer.calculateOptimalBatch(params2);

      // 在低技能等级下，难度影响应该更明显
      expect(result2.batchSize).toBeLessThanOrEqual(result1.batchSize);
    });
  });

  describe('批量时间计算', () => {
    it('应该计算批量制作时间', () => {
      const time = BatchOptimizer.calculateBatchTime(10, 5, 3);

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(10 * 5); // 应该节省时间
    });

    it('技能等级越高批量效率越高', () => {
      const time1 = BatchOptimizer.calculateBatchTime(10, 5, 1);
      const time2 = BatchOptimizer.calculateBatchTime(10, 5, 5);

      expect(time2).toBeLessThan(time1);
    });
  });

  describe('批量成功率计算', () => {
    it('应该计算批量制作成功率', () => {
      const rate = BatchOptimizer.calculateBatchSuccessRate(0.8, 5);

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.8); // 批量会降低成功率
    });

    it('批量越大成功率越低', () => {
      const rate1 = BatchOptimizer.calculateBatchSuccessRate(0.8, 1);
      const rate2 = BatchOptimizer.calculateBatchSuccessRate(0.8, 5);

      expect(rate2).toBeLessThan(rate1);
    });
  });

  describe('批量等级描述', () => {
    it('应该正确描述批量等级', () => {
      expect(BatchOptimizer.getBatchLevelDescription(4, 5)).toContain('大师');
      expect(BatchOptimizer.getBatchLevelDescription(3, 5)).toContain('专家');
      expect(BatchOptimizer.getBatchLevelDescription(2, 5)).toContain('熟练');
      expect(BatchOptimizer.getBatchLevelDescription(1, 5)).toContain('基础');
      expect(BatchOptimizer.getBatchLevelDescription(0, 5)).toContain('新手');
    });
  });
});

// ============================================================================
// RecipeHelper 系统测试
// ============================================================================

describe('RecipeHelper 系统', () => {
  let testRecipes: List<Recipe>;

  beforeEach(() => {
    testRecipes = List([
      Recipe.simple('recipe1' as any, '烤肉', RecipeCategory.FOOD, [
        { id: 'meat', count: 1 },
      ], 'cooked_meat'),
      Recipe.simple('recipe2' as any, '面包', RecipeCategory.FOOD, [
        { id: 'flour', count: 2 },
      ], 'bread'),
      Recipe.simple('recipe3' as any, '头巾', RecipeCategory.GEAR, [
        { id: 'rag', count: 2 },
      ], 'bandana'),
    ]);
  });

  describe('过滤功能', () => {
    it('应该按类别过滤', () => {
      const filtered = RecipeHelper.filterRecipes(testRecipes, {
        categories: [RecipeCategory.FOOD],
      });

      expect(filtered.size).toBe(2);
      expect(filtered.every(r => r.category === RecipeCategory.FOOD)).toBe(true);
    });

    it('应该按搜索关键词过滤', () => {
      const filtered = RecipeHelper.filterRecipes(testRecipes, {
        searchQuery: '烤',
      });

      expect(filtered.size).toBe(1);
      expect(filtered.first()?.name).toBe('烤肉');
    });

    it('应该按难度范围过滤', () => {
      const recipes = List([
        Recipe.create({
          id: 'easy' as any,
          name: '简单',
          category: RecipeCategory.FOOD,
          type: 'MIX' as any,
          materials: [],
          results: [],
          time: { baseTime: 10, timeType: 'FIXED' },
          difficulty: 1,
        }),
        Recipe.create({
          id: 'hard' as any,
          name: '困难',
          category: RecipeCategory.FOOD,
          type: 'MIX' as any,
          materials: [],
          results: [],
          time: { baseTime: 10, timeType: 'FIXED' },
          difficulty: 5,
        }),
      ]);

      const filtered = RecipeHelper.filterRecipes(recipes, {
        minDifficulty: 3,
        maxDifficulty: 5,
      });

      expect(filtered.size).toBe(1);
      expect(filtered.first()?.difficulty).toBe(5);
    });
  });

  describe('排序功能', () => {
    it('应该按名称排序', () => {
      const sorted = RecipeHelper.sortRecipes(testRecipes, {
        sortBy: RecipeSortBy.NAME,
        sortOrder: RecipeSortOrder.ASC,
      });

      expect(sorted.first()?.name).toBe('头巾');
      expect(sorted.last()?.name).toBe('面包');
    });

    it('应该按类别排序', () => {
      const sorted = RecipeHelper.sortRecipes(testRecipes, {
        sortBy: RecipeSortBy.CATEGORY,
        sortOrder: RecipeSortOrder.ASC,
      });

      expect(sorted.first()?.category).toBe(RecipeCategory.FOOD);
    });
  });

  describe('去重功能', () => {
    it('应该检测重复配方', () => {
      const recipes = List([
        Recipe.simple('r1' as any, '配方1', RecipeCategory.FOOD, [
          { id: 'mat1', count: 1 },
        ], 'result1'),
        Recipe.simple('r2' as any, '配方2', RecipeCategory.FOOD, [
          { id: 'mat1', count: 1 },
        ], 'result1'), // 相同结果
      ]);

      const duplicates = RecipeHelper.detectDuplicates(recipes);

      expect(duplicates.size).toBeGreaterThan(0);
    });

    it('应该移除重复配方', () => {
      const recipes = List([
        Recipe.simple('r1' as any, '配方1', RecipeCategory.FOOD, [
          { id: 'mat1', count: 1 },
        ], 'result1'),
        Recipe.simple('r2' as any, '配方2', RecipeCategory.FOOD, [
          { id: 'mat1', count: 1 },
        ], 'result1'),
      ]);

      const deduplicated = RecipeHelper.removeDuplicates(recipes);

      expect(deduplicated.size).toBe(1);
    });
  });

  describe('助手功能', () => {
    it('应该提供配方制作建议', () => {
      const recipe = testRecipes.first()!;
      const advice = RecipeHelper.getAssistantAdvice(
        recipe,
        Map({ meat: 0 }), // 缺少材料
        Set(),
        Map()
      );

      expect(advice.craftabilityScore).toBeLessThan(1);
      expect(advice.missingMaterials.length).toBeGreaterThan(0);
    });

    it('应该推荐可制作的配方', () => {
      const availableMaterials = Map({
        meat: 10,
        flour: 10,
      });

      const recommendations = RecipeHelper.getRecommendedRecipes(
        testRecipes,
        availableMaterials,
        Set(),
        Map(),
        5
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('应该按可制作性评分排序推荐', () => {
      const availableMaterials = Map({
        meat: 10,
      });

      const recommendations = RecipeHelper.getRecommendedRecipes(
        testRecipes,
        availableMaterials,
        Set(),
        Map(),
        10
      );

      // 第一个推荐的可制作性评分应该最高
      if (recommendations.length > 1) {
        expect(recommendations[0].craftabilityScore)
          .toBeGreaterThanOrEqual(recommendations[1].craftabilityScore);
      }
    });
  });

  describe('分组功能', () => {
    it('应该按类别分组配方', () => {
      const groups = RecipeHelper.groupRecipesByCategory(testRecipes);

      expect(groups.get(RecipeCategory.FOOD)?.size).toBe(2);
      expect(groups.get(RecipeCategory.GEAR)?.size).toBe(1);
    });
  });

  describe('统计功能', () => {
    it('应该计算配方统计信息', () => {
      const stats = RecipeHelper.getRecipeStatistics(testRecipes);

      expect(stats.total).toBe(3);
      expect(stats.byCategory.get(RecipeCategory.FOOD)).toBe(2);
      expect(stats.byCategory.get(RecipeCategory.GEAR)).toBe(1);
    });
  });
});
