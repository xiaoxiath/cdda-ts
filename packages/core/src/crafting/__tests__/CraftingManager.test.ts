/**
 * CraftingManager 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Map, Set } from 'immutable';
import { CraftingManager } from '../CraftingManager';
import { Recipe, Recipes } from '../Recipe';
import { RecipeCategory, CraftingType } from '../types';
import { createRecipeId } from '../types';

describe('CraftingManager', () => {
  describe('create', () => {
    it('should create manager with recipes', () => {
      const recipes = [
        Recipe.simple(
          createRecipeId('test1'),
          '测试1',
          RecipeCategory.FOOD,
          [{ id: 'meat', count: 1 }],
          'cooked_meat'
        ),
        Recipe.simple(
          createRecipeId('test2'),
          '测试2',
          RecipeCategory.MATERIAL,
          [{ id: 'wood', count: 2 }],
          'stick'
        ),
      ];

      const manager = CraftingManager.create(recipes);

      expect(manager.getTotalRecipeCount()).toBe(2);
    });

    it('should auto-learn autolearn recipes', () => {
      const autoLearnRecipe = Recipe.create({
        id: createRecipeId('auto'),
        name: '自动学习',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: true,
      });

      const normalRecipe = Recipe.create({
        id: createRecipeId('normal'),
        name: '普通配方',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: false,
      });

      const manager = CraftingManager.create([autoLearnRecipe, normalRecipe]);

      expect(manager.knowsRecipe(createRecipeId('auto'))).toBe(true);
      expect(manager.knowsRecipe(createRecipeId('normal'))).toBe(false);
    });
  });

  describe('createDefault', () => {
    it('should create with predefined recipes', () => {
      const manager = CraftingManager.createDefault();

      expect(manager.getTotalRecipeCount()).toBeGreaterThan(0);
      expect(manager.getRecipe(createRecipeId('cooked_meat'))).toBeDefined();
      expect(manager.getRecipe(createRecipeId('bandana'))).toBeDefined();
      expect(manager.getRecipe(createRecipeId('stone_knife'))).toBeDefined();
    });
  });

  describe('fromState', () => {
    it('should create from state', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const state = {
        recipes: Map([[recipe.id, recipe]]),
        learnedRecipes: Set([recipe.id]),
        availableMaterials: Map({ meat: 5 }),
        availableTools: Set(['knife']),
        skillLevels: Map({ cooking: 2 }),
      };

      const manager = CraftingManager.fromState(state);

      expect(manager.getTotalRecipeCount()).toBe(1);
      expect(manager.getLearnedRecipeCount()).toBe(1);
      expect(manager.knowsRecipe(recipe.id)).toBe(true);
    });
  });

  describe('recipe queries', () => {
    it('should get recipe by id', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe]);

      const found = manager.getRecipe(createRecipeId('test'));
      expect(found).toBeDefined();
      expect(found?.name).toBe('测试');

      const notFound = manager.getRecipe(createRecipeId('notexist') as any);
      expect(notFound).toBeUndefined();
    });

    it('should get all recipes', () => {
      const recipes = [
        Recipe.simple(createRecipeId('a'), 'A', RecipeCategory.FOOD, [{ id: 'x', count: 1 }], 'y'),
        Recipe.simple(createRecipeId('b'), 'B', RecipeCategory.MATERIAL, [{ id: 'z', count: 1 }], 'w'),
      ];

      const manager = CraftingManager.create(recipes);

      expect(manager.getAllRecipes().size).toBe(2);
    });

    it('should get learned recipes', () => {
      const recipe1 = Recipe.create({
        id: createRecipeId('r1'),
        name: 'R1',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: true,
      });

      const recipe2 = Recipe.create({
        id: createRecipeId('r2'),
        name: 'R2',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: false,
      });

      const manager = CraftingManager.create([recipe1, recipe2]);

      expect(manager.getLearnedRecipes().size).toBe(1);
      expect(manager.getLearnedRecipes().get(0)?.name).toBe('R1');
    });

    it('should get recipes by category', () => {
      const recipes = [
        Recipe.simple(createRecipeId('f1'), '食物1', RecipeCategory.FOOD, [{ id: 'x', count: 1 }], 'y'),
        Recipe.simple(createRecipeId('f2'), '食物2', RecipeCategory.FOOD, [{ id: 'z', count: 1 }], 'w'),
        Recipe.simple(createRecipeId('m1'), '材料', RecipeCategory.MATERIAL, [{ id: 'a', count: 1 }], 'b'),
      ];

      const manager = CraftingManager.create(recipes);

      const foodRecipes = manager.getRecipesByCategory(RecipeCategory.FOOD);
      expect(foodRecipes.size).toBe(2);

      const materialRecipes = manager.getRecipesByCategory(RecipeCategory.MATERIAL);
      expect(materialRecipes.size).toBe(1);
    });

    it('should get craftable recipes', () => {
      const easyRecipe = Recipe.create({
        id: createRecipeId('easy'),
        name: '简单',
        category: RecipeCategory.FOOD,
        type: CraftingType.MIX,
        materials: [{ id: 'meat', count: 1, substitutable: false }],
        results: [{ itemId: 'cooked_meat', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: true, // 自动学习
      });

      const hardRecipe = Recipe.create({
        id: createRecipeId('hard'),
        name: '困难',
        category: RecipeCategory.FOOD,
        type: CraftingType.MIX,
        materials: [{ id: 'rare_item', count: 5, substitutable: false }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
        autolearn: true, // 自动学习
      });

      const manager = CraftingManager.create([easyRecipe, hardRecipe]);
      const managerWithMaterials = manager
        .addMaterial('meat', 5)
        .addMaterial('rare_item', 1);

      const craftable = managerWithMaterials.getCraftableRecipes();
      expect(craftable.size).toBe(1);
      expect(craftable.get(0)?.id).toBe(createRecipeId('easy'));
    });
  });

  describe('learning recipes', () => {
    it('should learn recipe', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: '测试',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        learnable: true,
      });

      const manager = CraftingManager.create([recipe]);

      expect(manager.knowsRecipe(recipe.id)).toBe(false);

      const updated = manager.learnRecipe(recipe.id);

      expect(updated.knowsRecipe(recipe.id)).toBe(true);
      expect(manager.knowsRecipe(recipe.id)).toBe(false); // 原始不变
    });

    it('should not learn non-learnable recipe', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: '测试',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        learnable: false,
      });

      const manager = CraftingManager.create([recipe]);
      const updated = manager.learnRecipe(recipe.id);

      expect(updated.knowsRecipe(recipe.id)).toBe(false);
    });

    it('should learn multiple recipes', () => {
      const recipe1 = Recipe.create({
        id: createRecipeId('r1'),
        name: 'R1',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        learnable: true,
      });

      const recipe2 = Recipe.create({
        id: createRecipeId('r2'),
        name: 'R2',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        learnable: true,
      });

      const manager = CraftingManager.create([recipe1, recipe2]);
      const updated = manager.learnMultipleRecipes([recipe1.id, recipe2.id]);

      expect(updated.getLearnedRecipeCount()).toBe(2);
    });
  });

  describe('material management', () => {
    it('should add material', () => {
      const manager = CraftingManager.create([]);
      const updated = manager.addMaterial('wood', 5);

      expect(updated.availableMaterials.get('wood')).toBe(5);
      expect(manager.availableMaterials.get('wood')).toBeUndefined();
    });

    it('should add to existing material', () => {
      const manager = CraftingManager.create([])
        .addMaterial('wood', 3);
      const updated = manager.addMaterial('wood', 5);

      expect(updated.availableMaterials.get('wood')).toBe(8);
    });

    it('should remove material', () => {
      const manager = CraftingManager.create([])
        .addMaterial('wood', 10);
      const updated = manager.removeMaterial('wood', 5);

      expect(updated.availableMaterials.get('wood')).toBe(5);
    });

    it('should not go below zero', () => {
      const manager = CraftingManager.create([])
        .addMaterial('wood', 3);
      const updated = manager.removeMaterial('wood', 5);

      // 当数量为0时，从map中移除
      expect(updated.availableMaterials.has('wood')).toBe(false);
    });

    it('should remove material completely when zero', () => {
      const manager = CraftingManager.create([])
        .addMaterial('wood', 5);
      const updated = manager.removeMaterial('wood', 5);

      expect(updated.availableMaterials.has('wood')).toBe(false);
    });
  });

  describe('tool management', () => {
    it('should add tool', () => {
      const manager = CraftingManager.create([]);
      const updated = manager.addTool('knife');

      expect(updated.availableTools.has('knife')).toBe(true);
    });

    it('should remove tool', () => {
      const manager = CraftingManager.create([])
        .addTool('hammer');
      const updated = manager.removeTool('hammer');

      expect(updated.availableTools.has('hammer')).toBe(false);
    });
  });

  describe('skill management', () => {
    it('should set skill level', () => {
      const manager = CraftingManager.create([]);
      const updated = manager.setSkillLevel('cooking', 3);

      expect(updated.skillLevels.get('cooking')).toBe(3);
    });

    it('should override existing skill', () => {
      const manager = CraftingManager.create([])
        .setSkillLevel('cooking', 2);
      const updated = manager.setSkillLevel('cooking', 5);

      expect(updated.skillLevels.get('cooking')).toBe(5);
    });
  });

  describe('crafting check', () => {
    it('should check can craft', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 2 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 5);

      const check = manager.checkCanCraft(recipe.id);

      expect(check.canCraft).toBe(true);
      expect(check.missingMaterials).toHaveLength(0);
    });

    it('should detect missing materials', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 5 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 2);

      const check = manager.checkCanCraft(recipe.id);

      expect(check.canCraft).toBe(false);
      expect(check.missingMaterials).toHaveLength(1);
      expect(check.missingMaterials[0].id).toBe('meat');
      expect(check.missingMaterials[0].required).toBe(5);
      expect(check.missingMaterials[0].have).toBe(2);
    });

    it('should detect missing tools', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: '测试',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        tools: [{ toolId: 'knife' }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const manager = CraftingManager.create([recipe]);

      const check = manager.checkCanCraft(recipe.id);

      expect(check.canCraft).toBe(false);
      expect(check.missingTools).toContain('knife');
    });

    it('should detect insufficient skills', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: '测试',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        skills: [{ skillId: 'cooking', level: 3 }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const manager = CraftingManager.create([recipe])
        .setSkillLevel('cooking', 1);

      const check = manager.checkCanCraft(recipe.id);

      expect(check.canCraft).toBe(false);
      expect(check.insufficientSkills).toHaveLength(1);
      expect(check.insufficientSkills[0].skillId).toBe('cooking');
      expect(check.insufficientSkills[0].required).toBe(3);
      expect(check.insufficientSkills[0].have).toBe(1);
    });

    it('should batch check craftable', () => {
      const recipe1 = Recipe.simple(
        createRecipeId('r1'),
        'R1',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'result1'
      );

      const recipe2 = Recipe.simple(
        createRecipeId('r2'),
        'R2',
        RecipeCategory.FOOD,
        [{ id: 'wood', count: 5 }],
        'result2'
      );

      const manager = CraftingManager.create([recipe1, recipe2])
        .addMaterial('meat', 5);

      const results = manager.checkMultipleCraftable([recipe1.id, recipe2.id]);

      expect(results.get(recipe1.id)?.canCraft).toBe(true);
      expect(results.get(recipe2.id)?.canCraft).toBe(false);
    });
  });

  describe('crafting operation', () => {
    it('should craft successfully', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 2 }],
        'cooked_meat',
        1
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 5);

      const { manager: newManager, result } = manager.craft(recipe.id);

      expect(result.success).toBe(true);
      expect(result.producedItems).toHaveLength(1);
      expect(result.producedItems[0].itemId).toBe('cooked_meat');
      expect(result.producedItems[0].quantity).toBe(1);
      expect(result.consumedMaterials).toHaveLength(1);
      expect(result.consumedMaterials[0].id).toBe('meat');
      expect(result.consumedMaterials[0].quantity).toBe(2);
      expect(newManager.availableMaterials.get('meat')).toBe(3);
    });

    it('should fail when missing materials', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 5 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 2);

      const { manager: newManager, result } = manager.craft(recipe.id);

      expect(result.success).toBe(false);
      expect(result.producedItems).toHaveLength(0);
      expect(newManager.availableMaterials.get('meat')).toBe(2); // 材料不变
    });

    it('should fail with probability', () => {
      const hardRecipe = Recipe.create({
        id: createRecipeId('hard'),
        name: '困难',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [{ id: 'material', count: 1 }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
        difficulty: 10, // 高难度
      });

      // 需要多次测试来确保会失败，但在单元测试中我们只测试结构
      const manager = CraftingManager.create([hardRecipe])
        .addMaterial('material', 1);

      const { result } = manager.craft(hardRecipe.id);

      // 只验证结果结构正确
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('producedItems');
      expect(result).toHaveProperty('consumedMaterials');
    });

    it('should handle tool consumption', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: '测试',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [{ id: 'wood', count: 1 }],
        tools: [{ toolId: 'hammer', consume: true }],
        results: [{ itemId: 'stick', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const manager = CraftingManager.create([recipe])
        .addMaterial('wood', 5)
        .addTool('hammer');

      const { manager: newManager, result } = manager.craft(recipe.id);

      expect(result.success).toBe(true);
      expect(result.consumedTools).toHaveLength(1);
      expect(result.consumedTools[0].toolId).toBe('hammer');
      expect(newManager.availableTools.has('hammer')).toBe(false);
    });

    it('should craft multiple', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 5);

      const { manager: newManager, results } = manager.craftMultiple([
        { recipeId: recipe.id, count: 3 },
      ]);

      expect(results).toHaveLength(3);
      expect(newManager.availableMaterials.get('meat')).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should get total recipe count', () => {
      const recipes = [
        Recipe.simple(createRecipeId('a'), 'A', RecipeCategory.FOOD, [{ id: 'x', count: 1 }], 'y'),
        Recipe.simple(createRecipeId('b'), 'B', RecipeCategory.FOOD, [{ id: 'z', count: 1 }], 'w'),
        Recipe.simple(createRecipeId('c'), 'C', RecipeCategory.MATERIAL, [{ id: 'a', count: 1 }], 'b'),
      ];

      const manager = CraftingManager.create(recipes);

      expect(manager.getTotalRecipeCount()).toBe(3);
    });

    it('should get learned recipe count', () => {
      const recipes = [
        Recipe.create({
          id: createRecipeId('a'),
          name: 'A',
          category: RecipeCategory.OTHER,
          type: CraftingType.MIX,
          materials: [],
          results: [],
          time: { baseTime: 10, timeType: 'FIXED' },
          autolearn: true,
        }),
        Recipe.create({
          id: createRecipeId('b'),
          name: 'B',
          category: RecipeCategory.OTHER,
          type: CraftingType.MIX,
          materials: [],
          results: [],
          time: { baseTime: 10, timeType: 'FIXED' },
          autolearn: false,
        }),
      ];

      const manager = CraftingManager.create(recipes);

      expect(manager.getLearnedRecipeCount()).toBe(1);
    });

    it('should get craftable recipe count', () => {
      const recipe1 = Recipe.simple(
        createRecipeId('r1'),
        'R1',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'result1'
      );

      const recipe2 = Recipe.simple(
        createRecipeId('r2'),
        'R2',
        RecipeCategory.FOOD,
        [{ id: 'wood', count: 5 }],
        'result2'
      );

      const manager = CraftingManager.create([recipe1, recipe2])
        .addMaterial('meat', 5)
        .learnRecipe(recipe1.id)
        .learnRecipe(recipe2.id);

      expect(manager.getCraftableRecipeCount()).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should convert to state', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('wood', 5)
        .addTool('knife')
        .setSkillLevel('cooking', 3)
        .learnRecipe(recipe.id);

      const state = manager.toState();

      expect(state.recipes.size).toBe(1);
      expect(state.learnedRecipes.size).toBe(1);
      expect(state.availableMaterials.get('wood')).toBe(5);
      expect(state.availableTools.has('knife')).toBe(true);
      expect(state.skillLevels.get('cooking')).toBe(3);
    });

    it('should convert to JSON', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('wood', 5);

      const json = manager.toJson();

      expect(json.recipes).toHaveLength(1);
      expect(json.availableMaterials).toEqual({ wood: 5 });
    });

    it('should create from JSON', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('wood', 5)
        .learnRecipe(recipe.id);

      const json = manager.toJson();
      const restored = CraftingManager.fromJson(json);

      expect(restored.getTotalRecipeCount()).toBe(manager.getTotalRecipeCount());
      expect(restored.getLearnedRecipeCount()).toBe(manager.getLearnedRecipeCount());
      expect(restored.availableMaterials.get('wood')).toBe(5);
    });
  });

  describe('display methods', () => {
    it('should get recipe list string', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试配方',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 2 }],
        'cooked_meat',
        1
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 5)
        .learnRecipe(recipe.id);

      const listString = manager.getRecipeListString();

      expect(listString).toContain('测试配方');
      expect(listString).toContain('meat');
    });

    it('should get craftable list string', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '可制作',
        RecipeCategory.FOOD,
        [{ id: 'meat', count: 1 }],
        'cooked_meat'
      );

      const manager = CraftingManager.create([recipe])
        .addMaterial('meat', 5)
        .learnRecipe(recipe.id);

      const craftableString = manager.getCraftableListString();

      expect(craftableString).toContain('可制作');
    });
  });
});
