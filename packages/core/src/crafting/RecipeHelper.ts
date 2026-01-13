/**
 * RecipeHelper - 高级配方辅助类
 *
 * 提供配方过滤、排序、去重、助手建议等功能
 */

import { List, Map, Set } from 'immutable';
import type { Recipe } from './Recipe';
import type {
  RecipeFilter,
  RecipeSort,
  RecipeAssistantAdvice,
  RecipeDuplicateInfo,
} from './types';
import {
  RecipeCategory,
  RecipeSortBy,
  RecipeSortOrder,
} from './types';

/**
 * RecipeHelper - 配方辅助类
 */
export class RecipeHelper {
  // ========== 过滤功能 ==========

  /**
   * 过滤配方列表
   *
   * @param recipes 配方列表
   * @param filter 过滤条件
   * @returns 过滤后的配方列表
   */
  static filterRecipes(
    recipes: List<Recipe>,
    filter: RecipeFilter
  ): List<Recipe> {
    let filtered = recipes;

    // 按类别过滤
    if (filter.categories && filter.categories.length > 0) {
      const categorySet = Set(filter.categories);
      filtered = filtered.filter(r => categorySet.has(r.category));
    }

    // 按制作类型过滤
    if (filter.types && filter.types.length > 0) {
      const typeSet = Set(filter.types);
      filtered = filtered.filter(r => typeSet.has(r.type));
    }

    // 按所需技能过滤
    if (filter.requiredSkills && filter.requiredSkills.length > 0) {
      const skillSet = Set(filter.requiredSkills);
      filtered = filtered.filter(r =>
        r.relatedSkills.some(s => skillSet.has(s))
      );
    }

    // 按所需工具过滤
    if (filter.requiredTools && filter.requiredTools.length > 0) {
      const toolSet = Set(filter.requiredTools);
      filtered = filtered.filter(r =>
        r.tools.some(t => toolSet.has(t.toolId))
      );
    }

    // 按难度过滤
    if (filter.minDifficulty !== undefined) {
      filtered = filtered.filter(r => r.difficulty >= filter.minDifficulty!);
    }
    if (filter.maxDifficulty !== undefined) {
      filtered = filtered.filter(r => r.difficulty <= filter.maxDifficulty!);
    }

    // 搜索关键词过滤
    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.results.some(res => res.itemId.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  /**
   * 获取可制作的配方
   *
   * @param recipes 配方列表
   * @param availableMaterials 可用材料
   * @param availableTools 可用工具
   * @param skillLevels 技能等级
   * @returns 可制作的配方列表
   */
  static getCraftableRecipes(
    recipes: List<Recipe>,
    availableMaterials: Map<string, number>,
    availableTools: Set<string> = Set(),
    skillLevels: Map<string, number> = Map()
  ): List<Recipe> {
    return recipes.filter(recipe => {
      const checkResult = recipe.canCraft(
        availableMaterials,
        availableTools,
        skillLevels
      );
      return checkResult.canCraft;
    });
  }

  // ========== 排序功能 ==========

  /**
   * 排序配方列表
   *
   * @param recipes 配方列表
   * @param sort 排序参数
   * @returns 排序后的配方列表
   */
  static sortRecipes(
    recipes: List<Recipe>,
    sort: RecipeSort
  ): List<Recipe> {
    const multiplier = sort.sortOrder === RecipeSortOrder.ASC ? 1 : -1;

    return recipes.sort((a, b) => {
      let comparison = 0;

      switch (sort.sortBy) {
        case RecipeSortBy.NAME:
          comparison = a.name.localeCompare(b.name);
          break;
        case RecipeSortBy.CATEGORY:
          comparison = a.category.localeCompare(b.category);
          break;
        case RecipeSortBy.DIFFICULTY:
          comparison = a.difficulty - b.difficulty;
          break;
        case RecipeSortBy.TIME:
          comparison = a.calculateTime() - b.calculateTime();
          break;
        case RecipeSortBy.SKILL:
          // 按最高技能要求排序
          const maxSkillA = a.skills.isEmpty() ? 0 : Math.max(...a.skills.map(s => s.level));
          const maxSkillB = b.skills.isEmpty() ? 0 : Math.max(...b.skills.map(s => s.level));
          comparison = maxSkillA - maxSkillB;
          break;
      }

      return comparison * multiplier;
    });
  }

  // ========== 去重功能 ==========

  /**
   * 检测重复配方
   *
   * @param recipes 配方列表
   * @returns 重复信息映射 (配方 ID -> 重复信息)
   */
  static detectDuplicates(
    recipes: List<Recipe>
  ): Map<string, RecipeDuplicateInfo> {
    let duplicateMap = Map<string, RecipeDuplicateInfo>();
    let processedIds = Set<string>();

    for (const recipe of recipes) {
      if (processedIds.has(recipe.id)) {
        continue;
      }

      // 查找相似的配方
      const similarRecipes = recipes.filter(r =>
        r.id !== recipe.id &&
        r.results.size === recipe.results.size &&
        r.results.every((res, i) => {
          const otherRes = recipe.results.get(i);
          return otherRes !== undefined && res.itemId === otherRes.itemId;
        })
      );

      if (similarRecipes.size > 0) {
        const duplicateIds = similarRecipes.map(r => r.id).toArray();
        const allIds = [recipe.id, ...duplicateIds];

        // 确定重复类型
        let reason: 'identical' | 'similar' | 'upgrade' = 'similar';

        // 检查是否完全相同（材料、工具、技能都相同）
        const isIdentical = similarRecipes.every(r =>
          r.materials.size === recipe.materials.size &&
          r.materials.every((m, i) => {
            const otherM = recipe.materials.get(i);
            return otherM !== undefined && m.id === otherM.id && m.count === otherM.count;
          })
        );

        if (isIdentical) {
          reason = 'identical';
        }

        // 标记为重复
        const info: RecipeDuplicateInfo = {
          isDuplicate: true,
          primaryRecipeId: recipe.id,
          duplicateRecipeIds: duplicateIds,
          duplicateReason: reason,
        };

        for (const id of allIds) {
          // @ts-ignore
          duplicateMap = duplicateMap.set(id, info);
        }

        // 使用 union 替代 addAll
        // @ts-ignore
        processedIds = processedIds.union(allIds);
      }
    }

    return duplicateMap;
  }

  /**
   * 移除重复配方
   *
   * 保留最好的配方（难度最低、时间最短）
   *
   * @param recipes 配方列表
   * @returns 去重后的配方列表
   */
  static removeDuplicates(recipes: List<Recipe>): List<Recipe> {
    const duplicates = RecipeHelper.detectDuplicates(recipes);
    let idsToRemove = Set<string>();
    let processedPrimaryIds = Set<string>();

    for (const info of duplicates.valueSeq()) {
      // 跳过已处理的主配方
      if (processedPrimaryIds.has(info.primaryRecipeId)) {
        continue;
      }

      // 保留主配方，移除其他重复配方
      // @ts-ignore
      idsToRemove = idsToRemove.union(info.duplicateRecipeIds);

      // 标记为已处理
      // @ts-ignore
      processedPrimaryIds = processedPrimaryIds.add(info.primaryRecipeId);
    }

    return recipes.filter(r => !idsToRemove.has(r.id));
  }

  // ========== 助手功能 ==========

  /**
   * 获取配方助手建议
   *
   * @param recipe 配方
   * @param availableMaterials 可用材料
   * @param availableTools 可用工具
   * @param skillLevels 技能等级
   * @returns 助手建议
   */
  static getAssistantAdvice(
    recipe: Recipe,
    availableMaterials: Map<string, number>,
    availableTools: Set<string> = Set(),
    skillLevels: Map<string, number> = Map()
  ): RecipeAssistantAdvice {
    const missingMaterials: string[] = [];
    const missingTools: string[] = [];
    const suggestions: string[] = [];
    let totalSkillGap = 0;

    // 检查材料
    for (const material of recipe.materials) {
      const have = availableMaterials.get(material.id) || 0;
      if (have < material.count) {
        missingMaterials.push(`${material.id} (${material.count - have} 缺少)`);
      }
    }

    // 检查工具
    for (const tool of recipe.tools) {
      if (!availableTools.has(tool.toolId)) {
        missingTools.push(tool.toolId);
      }
    }

    // 检查技能
    for (const skill of recipe.skills) {
      const level = skillLevels.get(skill.skillId) || 0;
      if (level < skill.level) {
        const gap = skill.level - level;
        totalSkillGap += gap;
        suggestions.push(`需要提升 ${skill.skillId} 技能 ${gap} 级`);
      }
    }

    // 生成优化建议
    if (missingMaterials.length > 0) {
      suggestions.push(`收集材料: ${missingMaterials.join(', ')}`);
    }

    if (missingTools.length > 0) {
      suggestions.push(`准备工具: ${missingTools.join(', ')}`);
    }

    if (recipe.difficulty > 0 && totalSkillGap === 0) {
      suggestions.push(`此配方难度为 ${recipe.difficulty}，确保有足够的成功率`);
    }

    if (recipe.autolearn) {
      suggestions.push(`此配方会自动学习`);
    }

    if (recipe.reversible) {
      suggestions.push(`此配方可以逆向操作（拆解）`);
    }

    // 计算可制作性评分
    let craftabilityScore = 1.0;
    craftabilityScore -= missingMaterials.length * 0.3;
    craftabilityScore -= missingTools.length * 0.2;
    craftabilityScore -= totalSkillGap * 0.1;
    craftabilityScore = Math.max(0, Math.min(1, craftabilityScore));

    return {
      recipe,
      craftabilityScore,
      missingMaterials,
      missingTools,
      skillGap: totalSkillGap,
      suggestions,
    };
  }

  /**
   * 获取推荐制作的配方
   *
   * 基于可制作性评分、难度、时间等因素排序
   *
   * @param recipes 配方列表
   * @param availableMaterials 可用材料
   * @param availableTools 可用工具
   * @param skillLevels 技能等级
   * @param limit 返回数量限制
   * @returns 推荐配方列表
   */
  static getRecommendedRecipes(
    recipes: List<Recipe>,
    availableMaterials: Map<string, number>,
    availableTools: Set<string> = Set(),
    skillLevels: Map<string, number> = Map(),
    limit: number = 10
  ): RecipeAssistantAdvice[] {
    const advices = recipes
      .map(recipe =>
        RecipeHelper.getAssistantAdvice(
          recipe,
          availableMaterials,
          availableTools,
          skillLevels
        )
      )
      .toArray();

    // 按可制作性评分排序
    return advices
      .sort((a, b) => b.craftabilityScore - a.craftabilityScore)
      .slice(0, limit);
  }

  /**
   * 获取配方分组
   *
   * 按类别分组配方
   *
   * @param recipes 配方列表
   * @returns 类别 -> 配方列表
   */
  static groupRecipesByCategory(
    recipes: List<Recipe>
  ): Map<RecipeCategory, List<Recipe>> {
    let groups = Map<RecipeCategory, List<Recipe>>();

    for (const category of Object.values(RecipeCategory)) {
      const categoryRecipes = recipes.filter(r => r.category === category);
      if (!categoryRecipes.isEmpty()) {
        // @ts-ignore - Immutable.js Map set
        groups = groups.set(category, categoryRecipes);
      }
    }

    return groups;
  }

  /**
   * 获取配方统计信息
   *
   * @param recipes 配方列表
   * @returns 统计信息
   */
  static getRecipeStatistics(recipes: List<Recipe>): {
    total: number;
    byCategory: Map<RecipeCategory, number>;
    byType: Map<string, number>;
    averageDifficulty: number;
    averageTime: number;
  } {
    let byCategory = Map<RecipeCategory, number>();
    let byType = Map<string, number>();

    let totalDifficulty = 0;
    let totalTime = 0;

    for (const recipe of recipes) {
      // 按类别统计
      const currentCount = byCategory.get(recipe.category) || 0;
      // @ts-ignore
      byCategory = byCategory.set(recipe.category, currentCount + 1);

      // 按类型统计
      const currentTypeCount = byType.get(recipe.type) || 0;
      // @ts-ignore
      byType = byType.set(recipe.type, currentTypeCount + 1);

      totalDifficulty += recipe.difficulty;
      totalTime += recipe.calculateTime();
    }

    return {
      total: recipes.size,
      byCategory,
      byType,
      averageDifficulty: recipes.size > 0 ? totalDifficulty / recipes.size : 0,
      averageTime: recipes.size > 0 ? totalTime / recipes.size : 0,
    };
  }
}
