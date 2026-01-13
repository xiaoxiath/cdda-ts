/**
 * Recipe 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Map, Set } from 'immutable';
import { Recipe, Recipes } from '../Recipe';
import { RecipeCategory, CraftingType } from '../types';
import { createRecipeId } from '../types';

describe('Recipe', () => {
  describe('create', () => {
    it('should create basic recipe', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test_recipe'),
        name: '测试配方',
        category: RecipeCategory.FOOD,
        type: CraftingType.COOK,
        materials: [
          { id: 'meat', count: 1, substitutable: false },
        ],
        results: [
          {
            itemId: 'cooked_meat',
            quantity: 1,
            quantityType: 'FIXED',
          },
        ],
        time: {
          baseTime: 10,
          timeType: 'FIXED',
        },
      });

      expect(recipe.id).toBe(createRecipeId('test_recipe'));
      expect(recipe.name).toBe('测试配方');
      expect(recipe.category).toBe(RecipeCategory.FOOD);
    });

    it('should use default values', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: {
          baseTime: 5,
          timeType: 'FIXED',
        },
      });

      expect(recipe.description).toBe('');
      expect(recipe.autolearn).toBe(false);
      expect(recipe.learnable).toBe(true);
      expect(recipe.reversible).toBe(false);
      expect(recipe.batchSize).toBe(1);
      expect(recipe.difficulty).toBe(0);
    });
  });

  describe('factory methods', () => {
    it('should create simple recipe', () => {
      const recipe = Recipe.simple(
        createRecipeId('simple'),
        '简单配方',
        RecipeCategory.MATERIAL,
        [{ id: 'wood', count: 2 }],
        'stick',
        4
      );

      expect(recipe.type).toBe(CraftingType.MIX);
      expect(recipe.materials.size).toBe(1);
      expect(recipe.materials.get(0)!.id).toBe('wood');
      expect(recipe.materials.get(0)!.count).toBe(2);
      expect(recipe.results.get(0)!.itemId).toBe('stick');
      expect(recipe.results.get(0)!.quantity).toBe(4);
    });

    it('should create cooking recipe', () => {
      const recipe = Recipe.cooking(
        createRecipeId('cooking'),
        '烹饪配方',
        [{ id: 'egg', count: 2 }],
        'fried_egg',
        1,
        { skillId: 'cooking', level: 2 }
      );

      expect(recipe.type).toBe(CraftingType.COOK);
      expect(recipe.category).toBe(RecipeCategory.FOOD);
      expect(recipe.skills.size).toBe(1);
      expect(recipe.relatedSkills.size).toBe(1);
      expect(recipe.relatedSkills.get(0)).toBe('cooking');
    });

    it('should create sewing recipe', () => {
      const recipe = Recipe.sewing(
        createRecipeId('sewing'),
        '缝纫配方',
        [{ id: 'cloth', count: 1 }],
        'shirt',
        1
      );

      expect(recipe.type).toBe(CraftingType.SEW);
      expect(recipe.category).toBe(RecipeCategory.GEAR);
      expect(recipe.tools.size).toBe(1);
      expect(recipe.materials.get(0)!.substitutable).toBe(true);
    });
  });

  describe('query methods', () => {
    it('should identify food recipes', () => {
      const recipe = Recipe.simple(
        createRecipeId('food'),
        '食物',
        RecipeCategory.FOOD,
        [{ id: 'x', count: 1 }],
        'y'
      );

      expect(recipe.isFoodRecipe()).toBe(true);
      expect(recipe.isAmmoRecipe()).toBe(false);
    });

    it('should identify ammo recipes', () => {
      const recipe = Recipe.simple(
        createRecipeId('ammo'),
        '弹药',
        RecipeCategory.AMMO,
        [{ id: 'x', count: 1 }],
        'y'
      );

      expect(recipe.isAmmoRecipe()).toBe(true);
    });

    it('should check learnable', () => {
      const learnable = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        learnable: true,
      });

      const notLearnable = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        learnable: false,
      });

      expect(learnable.isLearnable()).toBe(true);
      expect(notLearnable.isLearnable()).toBe(false);
    });

    it('should check auto learn', () => {
      const auto = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        autolearn: true,
      });

      expect(auto.isAutoLearn()).toBe(true);
      expect(auto.isAutoLearn()).toBe(true);
    });

    it('should check reversible', () => {
      const reversible = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        reversible: true,
      });

      expect(reversible.isReversible()).toBe(true);
    });

    it('should check requires skill', () => {
      const withSkill = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        skills: [{ skillId: 'cooking', level: 1 }],
      });

      const withoutSkill = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
      });

      expect(withSkill.requiresSkill()).toBe(true);
      expect(withoutSkill.requiresSkill()).toBe(false);
    });

    it('should check requires tool', () => {
      const withTool = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
        tools: [{ toolId: 'knife' }],
      });

      const withoutTool = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 5, timeType: 'FIXED' },
      });

      expect(withTool.requiresTool()).toBe(true);
      expect(withoutTool.requiresTool()).toBe(false);
    });
  });

  describe('time calculation', () => {
    it('should calculate fixed time', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 30, timeType: 'FIXED' },
      });

      expect(recipe.calculateTime()).toBe(30);
    });

    it('should calculate skill based time', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 100, timeType: 'SKILL_BASED' },
        skills: [{ skillId: 'cooking', level: 2, multiplier: 1.0 }],
        relatedSkills: ['cooking'],
      });

      // No skill level
      expect(recipe.calculateTime(new Map())).toBe(100);

      // Exact required level
      expect(recipe.calculateTime(new Map({ cooking: 2 }))).toBeLessThan(100);

      // Higher level = faster
      const timeWithLevel5 = recipe.calculateTime(new Map({ cooking: 5 }));
      const timeWithLevel2 = recipe.calculateTime(new Map({ cooking: 2 }));
      expect(timeWithLevel5).toBeLessThan(timeWithLevel2);
    });

    it('should calculate quantity based time', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'QUANTITY_BASED' },
        batchSize: 5,
      });

      expect(recipe.calculateTime()).toBe(50); // 10 * 5
    });
  });

  describe('success probability', () => {
    it('should calculate base probability', () => {
      const easy = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        difficulty: 0,
      });

      expect(easy.calculateSuccessProbability()).toBeCloseTo(1.0, 1);

      const hard = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        difficulty: 10,
      });

      const prob = hard.calculateSuccessProbability();
      expect(prob).toBeLessThan(1.0);
      expect(prob).toBeGreaterThan(0);
    });

    it('should calculate with skill bonus', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        difficulty: 5,
        skills: [{ skillId: 'cooking', level: 3 }],
      });

      // No skill
      const noSkillProb = recipe.calculateSuccessProbability(new Map());

      // Exact skill level
      const exactSkillProb = recipe.calculateSuccessProbability(new Map({ cooking: 3 }));

      // Higher skill
      const highSkillProb = recipe.calculateSuccessProbability(new Map({ cooking: 7 }));

      expect(highSkillProb).toBeGreaterThan(exactSkillProb);
      expect(exactSkillProb).toBeGreaterThan(noSkillProb);
    });
  });

  describe('crafting check', () => {
    it('should pass when all requirements met', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [{ id: 'wood', count: 2 }],
        tools: [{ toolId: 'knife' }],
        skills: [{ skillId: 'carpentry', level: 1 }],
        results: [{ itemId: 'stick', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const check = recipe.canCraft(
        new Map({ wood: 5 }),
        new Set(['knife', 'hammer']),
        new Map({ carpentry: 2 })
      );

      expect(check.canCraft).toBe(true);
      expect(check.missingMaterials).toHaveLength(0);
      expect(check.missingTools).toHaveLength(0);
      expect(check.insufficientSkills).toHaveLength(0);
    });

    it('should fail when missing materials', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [{ id: 'wood', count: 2 }],
        results: [{ itemId: 'stick', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const check = recipe.canCraft(
        new Map({ wood: 1 }),
        new Set(),
        new Map()
      );

      expect(check.canCraft).toBe(false);
      expect(check.missingMaterials).toHaveLength(1);
      expect(check.missingMaterials[0].id).toBe('wood');
      expect(check.missingMaterials[0].required).toBe(2);
      expect(check.missingMaterials[0].have).toBe(1);
    });

    it('should fail when missing tools', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        tools: [{ toolId: 'knife' }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const check = recipe.canCraft(
        new Map(),
        new Set(),
        new Map()
      );

      expect(check.canCraft).toBe(false);
      expect(check.missingTools).toHaveLength(1);
      expect(check.missingTools[0]).toBe('knife');
    });

    it('should fail when insufficient skills', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        skills: [{ skillId: 'cooking', level: 3 }],
        results: [{ itemId: 'result', quantity: 1 }],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const check = recipe.canCraft(
        Map(),
        Set(),
        Map({ cooking: 1 })
      );

      expect(check.canCraft).toBe(false);
      expect(check.insufficientSkills).toHaveLength(1);
      expect(check.insufficientSkills[0].skillId).toBe('cooking');
      expect(check.insufficientSkills[0].required).toBe(3);
      expect(check.insufficientSkills[0].have).toBe(1);
    });
  });

  describe('experience', () => {
    it('should calculate experience gain', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        difficulty: 2,
        relatedSkills: ['cooking', 'tailor'],
      });

      const exp = recipe.calculateExperienceGain(true);

      expect(exp.size).toBe(2);
      expect(exp.get('cooking')).toBe(20); // 10 + 2*5
      expect(exp.get('tailor')).toBe(20);
    });

    it('should give no experience on failure', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
        relatedSkills: ['cooking'],
      });

      const exp = recipe.calculateExperienceGain(false);

      expect(exp.size).toBe(0);
    });

    it('should give no experience without related skills', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const exp = recipe.calculateExperienceGain(true);

      expect(exp.size).toBe(0);
    });
  });

  describe('display methods', () => {
    it('should get display name', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试配方',
        RecipeCategory.FOOD,
        [{ id: 'x', count: 1 }],
        'result',
        5
      );

      expect(recipe.getDisplayName()).toBe('测试配方 (result x5)');
    });

    it('should get materials description', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [
          { id: 'wood', count: 2, substitutable: false },
          { id: 'nail', count: 5, substitutable: true },
        ],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const desc = recipe.getMaterialsDescription();
      expect(desc).toContain('wood x2');
      expect(desc).toContain('nail x5 (可替换)');
    });

    it('should get skills description', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        skills: [
          { skillId: 'cooking', level: 2 },
          { skillId: 'tailor', level: 1 },
        ],
        results: [],
        time: { baseTime: 10, timeType: 'FIXED' },
      });

      const desc = recipe.getSkillsDescription();
      expect(desc).toBe('cooking Lv.2, tailor Lv.1');
    });

    it('should get time description', () => {
      const recipe = Recipe.create({
        id: createRecipeId('test'),
        name: 'Test',
        category: RecipeCategory.OTHER,
        type: CraftingType.MIX,
        materials: [],
        results: [],
        time: { baseTime: 45, timeType: 'FIXED' },
      });

      expect(recipe.getTimeDescription()).toBe('45 秒');
    });

    it('should get full description', () => {
      const recipe = Recipe.simple(
        createRecipeId('test'),
        '测试配方',
        RecipeCategory.FOOD,
        [{ id: 'food', count: 1 }],
        'cooked_food',
        1
      );

      const desc = recipe.getFullDescription();
      expect(desc).toContain('=== 测试配方 ===');
      expect(desc).toContain('类别: FOOD');
      expect(desc).toContain('材料: food x1');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = Recipe.cooking(
        createRecipeId('test'),
        '烹饪测试',
        [{ id: 'egg', count: 2 }],
        'fried_egg',
        2,
        { skillId: 'cooking', level: 3 }
      );

      const json = original.toJson();

      expect(json.id).toBeDefined();
      expect(json.name).toBe('烹饪测试');
      expect(json.category).toBe(RecipeCategory.FOOD);
      expect(json.type).toBe(CraftingType.COOK);

      const restored = Recipe.fromJson(json);
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.category).toBe(original.category);
    });
  });

  describe('predefined recipes', () => {
    it('should have COOKED_MEAT recipe', () => {
      expect(Recipes.COOKED_MEAT).toBeDefined();
      expect(Recipes.COOKED_MEAT.category).toBe(RecipeCategory.FOOD);
    });

    it('should have BANDANA recipe', () => {
      expect(Recipes.BANDANA).toBeDefined();
      expect(Recipes.BANDANA.type).toBe(CraftingType.SEW);
    });

    it('should have STONE_KNIFE recipe', () => {
      expect(Recipes.STONE_KNIFE).toBeDefined();
      expect(Recipes.STONE_KNIFE.difficulty).toBe(0);
    });
  });
});
