/**
 * CraftingManager - 制作管理器
 *
 * 参考 Cataclysm-DDA 的 crafting 系统
 * 管理所有配方和制作操作
 */

import { Map, Set, List } from 'immutable';
import type {
  RecipeId,
  CraftingCheckResult,
  CraftingResult,
} from './types';
import { Recipe, Recipes } from './Recipe';
import { RecipeCategory } from './types';

/**
 * CraftingManager 属性接口
 */
export interface CraftingManagerProps {
  /** 所有配方 */
  recipes: Map<RecipeId, Recipe>;
  /** 已学习的配方 */
  learnedRecipes: Set<RecipeId>;
  /** 可用材料 */
  availableMaterials: Map<string, number>;
  /** 可用工具 */
  availableTools: Set<string>;
  /** 技能等级 */
  skillLevels: Map<string, number>;
}

/**
 * CraftingManager - 制作管理器类
 *
 * 管理角色的配方和制作能力
 */
export class CraftingManager {
  readonly recipes!: Map<RecipeId, Recipe>;
  readonly learnedRecipes!: Set<RecipeId>;
  readonly availableMaterials!: Map<string, number>;
  readonly availableTools!: Set<string>;
  readonly skillLevels!: Map<string, number>;

  private constructor(props: CraftingManagerProps) {
    this.recipes = props.recipes;
    this.learnedRecipes = props.learnedRecipes;
    this.availableMaterials = props.availableMaterials;
    this.availableTools = props.availableTools;
    this.skillLevels = props.skillLevels;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建制作管理器
   */
  static create(recipes: Recipe[]): CraftingManager {
    const recipeMap = Map<RecipeId, Recipe>(
      recipes.map(r => [r.id, r] as [RecipeId, Recipe])
    );

    // 自动学习可自动学习的配方
    const learned = Set<RecipeId>(
      recipes.filter(r => r.autolearn).map(r => r.id)
    );

    return new CraftingManager({
      recipes: recipeMap,
      learnedRecipes: learned,
      availableMaterials: Map(),
      availableTools: Set(),
      skillLevels: Map(),
    });
  }

  /**
   * 从预定义配方创建
   */
  static createDefault(): CraftingManager {
    const recipes = Object.values(Recipes) as Recipe[];
    return CraftingManager.create(recipes);
  }

  /**
   * 从状态创建
   */
  static fromState(state: CraftingManagerProps): CraftingManager {
    return new CraftingManager({
      recipes: state.recipes,
      learnedRecipes: state.learnedRecipes,
      availableMaterials: state.availableMaterials,
      availableTools: state.availableTools,
      skillLevels: state.skillLevels,
    });
  }

  // ========== 配方查询 ==========

  /**
   * 获取配方
   */
  getRecipe(id: RecipeId): Recipe | undefined {
    return this.recipes.get(id);
  }

  /**
   * 获取所有配方
   */
  getAllRecipes(): Map<RecipeId, Recipe> {
    return this.recipes;
  }

  /**
   * 获取已学习的配方
   */
  getLearnedRecipes(): List<Recipe> {
    return List(
      this.learnedRecipes
        .valueSeq()
        .map(id => this.recipes.get(id))
        .filter((r): r is Recipe => r !== undefined)
    );
  }

  /**
   * 获取可制作的配方
   */
  getCraftableRecipes(): List<Recipe> {
    const learned = this.getLearnedRecipes();

    return learned.filter(recipe => {
      const check = recipe.canCraft(
        this.availableMaterials,
        this.availableTools,
        this.skillLevels
      );
      return check.canCraft;
    });
  }

  /**
   * 按类别获取配方
   */
  getRecipesByCategory(category: RecipeCategory): List<Recipe> {
    return List(
      this.recipes
        .valueSeq()
        .filter(r => r.category === category)
    );
  }

  // ========== 配方学习 ==========

  /**
   * 学习配方
   */
  learnRecipe(recipeId: RecipeId): CraftingManager {
    const recipe = this.recipes.get(recipeId);
    if (!recipe || !recipe.isLearnable()) {
      return this;
    }

    return new CraftingManager({
      ...this.asProps(),
      learnedRecipes: this.learnedRecipes.add(recipeId),
    });
  }

  /**
   * 学习多个配方
   */
  learnMultipleRecipes(recipeIds: RecipeId[]): CraftingManager {
    let newLearned = this.learnedRecipes;

    for (const id of recipeIds) {
      const recipe = this.recipes.get(id);
      if (recipe && recipe.isLearnable()) {
        newLearned = newLearned.add(id);
      }
    }

    return new CraftingManager({
      ...this.asProps(),
      learnedRecipes: newLearned,
    });
  }

  /**
   * 检查是否已学习配方
   */
  knowsRecipe(recipeId: RecipeId): boolean {
    return this.learnedRecipes.contains(recipeId);
  }

  // ========== 材料管理 ==========

  /**
   * 添加材料
   */
  addMaterial(materialId: string, count: number): CraftingManager {
    const current = this.availableMaterials.get(materialId) || 0;
    const newMaterials = this.availableMaterials.set(materialId, current + count);

    return new CraftingManager({
      ...this.asProps(),
      availableMaterials: newMaterials,
    });
  }

  /**
   * 移除材料
   */
  removeMaterial(materialId: string, count: number): CraftingManager {
    const current = this.availableMaterials.get(materialId) || 0;
    const newCount = Math.max(0, current - count);

    const newMaterials = newCount === 0
      ? this.availableMaterials.remove(materialId)
      : this.availableMaterials.set(materialId, newCount);

    return new CraftingManager({
      ...this.asProps(),
      availableMaterials: newMaterials,
    });
  }

  /**
   * 添加工具
   */
  addTool(toolId: string): CraftingManager {
    return new CraftingManager({
      ...this.asProps(),
      availableTools: this.availableTools.add(toolId),
    });
  }

  /**
   * 移除工具
   */
  removeTool(toolId: string): CraftingManager {
    return new CraftingManager({
      ...this.asProps(),
      availableTools: this.availableTools.remove(toolId),
    });
  }

  /**
   * 设置技能等级
   */
  setSkillLevel(skillId: string, level: number): CraftingManager {
    return new CraftingManager({
      ...this.asProps(),
      skillLevels: this.skillLevels.set(skillId, level),
    });
  }

  // ========== 制作检查 ==========

  /**
   * 检查是否可以制作
   */
  checkCanCraft(recipeId: RecipeId): CraftingCheckResult {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return {
        canCraft: false,
        missingMaterials: [],
        missingTools: [],
        insufficientSkills: [],
        estimatedTime: 0,
        successProbability: 0,
      };
    }

    return recipe.canCraft(
      this.availableMaterials,
      this.availableTools,
      this.skillLevels
    );
  }

  /**
   * 批量检查可制作性
   */
  checkMultipleCraftable(recipeIds: RecipeId[]): Map<RecipeId, CraftingCheckResult> {
    let result = Map<RecipeId, CraftingCheckResult>();

    for (const id of recipeIds) {
      result = result.set(id, this.checkCanCraft(id));
    }

    return result;
  }

  // ========== 制作操作 ==========

  /**
   * 制作物品
   */
  craft(recipeId: RecipeId): {
    manager: CraftingManager;
    result: CraftingResult;
  } {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return {
        manager: this,
        result: {
          success: false,
          producedItems: [],
          consumedMaterials: [],
          consumedTools: [],
          experienceGained: Map(),
          timeSpent: 0,
        },
      };
    }

    // 检查是否可以制作
    const check = recipe.canCraft(
      this.availableMaterials,
      this.availableTools,
      this.skillLevels
    );

    if (!check.canCraft) {
      return {
        manager: this,
        result: {
          success: false,
          producedItems: [],
          consumedMaterials: [],
          consumedTools: [],
          experienceGained: Map(),
          timeSpent: 0,
        },
      };
    }

    // 计算成功概率
    const successProbability = check.successProbability;
    const success = Math.random() < successProbability;

    if (!success) {
      // 制作失败，但仍消耗部分材料
      let newManager: CraftingManager = this;
      const consumedMaterials: Array<{ id: string; quantity: number }> = [];

      for (const material of recipe.materials) {
        // 失败时消耗一半材料
        const consumeCount = Math.ceil(material.count * 0.5);
        newManager = newManager.removeMaterial(material.id, consumeCount);
        consumedMaterials.push({ id: material.id, quantity: consumeCount });
      }

      return {
        manager: newManager,
        result: {
          success: false,
          producedItems: [],
          consumedMaterials,
          consumedTools: [],
          experienceGained: Map(),
          timeSpent: check.estimatedTime * 0.5, // 失败也花费一半时间
        },
      };
    }

    // 制作成功
    let newManager: CraftingManager = this;
    const consumedMaterials: Array<{ id: string; quantity: number }> = [];
    const consumedTools: Array<{ toolId: string; quantity: number }> = [];
    const producedItems: Array<{ itemId: string; quantity: number }> = [];

    // 消耗材料
    for (const material of recipe.materials) {
      newManager = newManager.removeMaterial(material.id, material.count);
      consumedMaterials.push({ id: material.id, quantity: material.count });
    }

    // 消耗工具（如果有消耗性工具）
    for (const tool of recipe.tools) {
      if (tool.consume) {
        newManager = newManager.removeTool(tool.toolId);
        consumedTools.push({ toolId: tool.toolId, quantity: 1 });
      }
    }

    // 产生物品
    for (const result of recipe.results) {
      const quantity = result.quantityType === 'RANDOM'
        ? Math.floor(Math.random() * result.quantity) + 1
        : result.quantity;

      producedItems.push({
        itemId: result.itemId,
        quantity,
      });
    }

    // 获得经验
    const experienceGained = recipe.calculateExperienceGain(true);

    // 应用经验
    for (const [skillId, exp] of experienceGained.entries()) {
      const currentLevel = newManager.skillLevels.get(skillId) || 0;
      // 简化的经验处理，实际应通过技能系统
      newManager = newManager.setSkillLevel(skillId, currentLevel);
    }

    return {
      manager: newManager,
      result: {
        success: true,
        producedItems,
        consumedMaterials,
        consumedTools,
        experienceGained,
        timeSpent: check.estimatedTime,
      },
    };
  }

  /**
   * 批量制作
   */
  craftMultiple(
    crafts: Array<{ recipeId: RecipeId; count: number }>
  ): {
    manager: CraftingManager;
    results: CraftingResult[];
  } {
    let currentManager: CraftingManager = this;
    const results: CraftingResult[] = [];

    for (const { recipeId, count } of crafts) {
      for (let i = 0; i < count; i++) {
        const { manager: newMgr, result } = currentManager.craft(recipeId);
        currentManager = newMgr;
        results.push(result);
      }
    }

    return {
      manager: currentManager,
      results,
    };
  }

  // ========== 统计信息 ==========

  /**
   * 获取配方总数
   */
  getTotalRecipeCount(): number {
    return this.recipes.size;
  }

  /**
   * 获取已学习配方数
   */
  getLearnedRecipeCount(): number {
    return this.learnedRecipes.size;
  }

  /**
   * 获取可制作配方数
   */
  getCraftableRecipeCount(): number {
    return this.getCraftableRecipes().size;
  }

  // ========== 显示方法 ==========

  /**
   * 获取配方列表字符串
   */
  getRecipeListString(): string {
    const lines: string[] = [];

    const learned = this.getLearnedRecipes();
    for (const recipe of learned) {
      const check = recipe.canCraft(
        this.availableMaterials,
        this.availableTools,
        this.skillLevels
      );

      const status = check.canCraft ? '✓ 可制作' : '✗ 不可制作';
      lines.push(`[${status}] ${recipe.getDisplayName()}`);
      lines.push(`  ${recipe.getMaterialsDescription()}`);
    }

    return lines.join('\n') || '没有已学习的配方';
  }

  /**
   * 获取可制作配方字符串
   */
  getCraftableListString(): string {
    const craftable = this.getCraftableRecipes();

    if (craftable.isEmpty()) {
      return '没有可制作的配方';
    }

    const lines: string[] = ['=== 可制作的配方 ===\n'];

    for (const recipe of craftable) {
      const check = recipe.canCraft(
        this.availableMaterials,
        this.availableTools,
        this.skillLevels
      );

      lines.push(`${recipe.name}`);
      lines.push(`  成功率: ${Math.floor(check.successProbability * 100)}%`);
      lines.push(`  时间: ${check.estimatedTime} 秒`);
      lines.push(`  产物: ${recipe.getResultDescription()}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ========== 辅助方法 ==========

  /**
   * 转换为属性对象
   */
  private asProps(): CraftingManagerProps {
    return {
      recipes: this.recipes,
      learnedRecipes: this.learnedRecipes,
      availableMaterials: this.availableMaterials,
      availableTools: this.availableTools,
      skillLevels: this.skillLevels,
    };
  }

  // ========== 序列化 ==========

  /**
   * 转换为状态
   */
  toState(): CraftingManagerProps {
    return this.asProps();
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      recipes: this.recipes.valueSeq().map(r => r.toJson()).toArray(),
      learnedRecipes: this.learnedRecipes.toArray(),
      availableMaterials: this.availableMaterials.toObject(),
      availableTools: this.availableTools.toArray(),
      skillLevels: this.skillLevels.toObject(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): CraftingManager {
    const recipes = json.recipes.map((r: any) => {
      return Recipe.fromJson(r);
    });

    const recipeMap = Map<RecipeId, Recipe>(
      recipes.map((r: Recipe) => [r.id, r] as [RecipeId, Recipe])
    );

    return new CraftingManager({
      recipes: recipeMap,
      learnedRecipes: Set(json.learnedRecipes as RecipeId[]),
      availableMaterials: Map<string, number>(json.availableMaterials),
      availableTools: Set(json.availableTools as string[]),
      skillLevels: Map<string, number>(json.skillLevels),
    });
  }
}
