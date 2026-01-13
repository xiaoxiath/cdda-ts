/**
 * SkillDefinition 单元测试
 */

import { describe, it, expect } from 'vitest';
import { SkillDefinition, SkillDefinitions } from '../SkillDefinition';
import { SkillCategory } from '../types';
import { createSkillId } from '../types';

describe('SkillDefinition', () => {
  describe('create', () => {
    it('should create a basic skill definition', () => {
      const def = SkillDefinition.general(
        createSkillId('test_skill'),
        'Test Skill',
        'A test skill',
        SkillCategory.COMBAT
      );

      expect(def.id).toBe(createSkillId('test_skill'));
      expect(def.name).toBe('Test Skill');
      expect(def.description).toBe('A test skill');
      expect(def.category).toBe(SkillCategory.COMBAT);
    });

    it('should use default values', () => {
      const def = SkillDefinition.general(
        createSkillId('test'),
        'Test',
        '',
        SkillCategory.GENERAL
      );

      expect(def.difficultyMultiplier).toBe(1.0);
      expect(def.isHidden).toBe(false);
      expect(def.relatedItemTypes.size).toBe(0);
      expect(def.prerequisites.size).toBe(0);
    });
  });

  describe('factory methods', () => {
    it('should create combat skill', () => {
      const combat = SkillDefinition.combat('melee' as any, '近战', '近战格斗');

      expect(combat.category).toBe(SkillCategory.COMBAT);
      expect(combat.name).toBe('近战');
      expect(combat.isCombatSkill()).toBe(true);
    });

    it('should create crafting skill', () => {
      const crafting = SkillDefinition.crafting(
        'cooking' as any,
        '烹饪',
        '食物制作',
        1.0,
        ['food', 'hotplate']
      );

      expect(crafting.category).toBe(SkillCategory.CRAFTING);
      expect(crafting.isCraftingSkill()).toBe(true);
      expect(crafting.relatedItemTypes.has('food')).toBe(true);
      expect(crafting.relatedItemTypes.has('hotplate')).toBe(true);
    });

    it('should create survival skill', () => {
      const survival = SkillDefinition.survival('survival' as any, '生存', '野外生存');

      expect(survival.category).toBe(SkillCategory.SURVIVAL);
      expect(survival.isSurvivalSkill()).toBe(true);
    });
  });

  describe('type check methods', () => {
    it('should identify combat skills', () => {
      const combat = SkillDefinition.combat('melee' as any, '近战');
      expect(combat.isCombatSkill()).toBe(true);
      expect(combat.isCraftingSkill()).toBe(false);
      expect(combat.isSurvivalSkill()).toBe(false);
      expect(combat.isWeaponSkill()).toBe(false);
    });

    it('should identify crafting skills', () => {
      const crafting = SkillDefinition.crafting('tailor' as any, '裁缝');
      expect(crafting.isCraftingSkill()).toBe(true);
      expect(crafting.isCombatSkill()).toBe(false);
    });

    it('should identify survival skills', () => {
      const survival = SkillDefinition.survival('traps' as any, '陷阱');
      expect(survival.isSurvivalSkill()).toBe(true);
      expect(survival.isCombatSkill()).toBe(false);
    });
  });

  describe('prerequisites', () => {
    it('should check if has prerequisites', () => {
      const noPrereq = SkillDefinition.combat('basic' as any, 'Basic');
      expect(noPrereq.hasPrerequisites()).toBe(false);

      const withPrereq = new SkillDefinition({
        id: createSkillId('advanced'),
        name: 'Advanced',
        description: '',
        category: SkillCategory.COMBAT,
        prerequisites: [
          { skillId: createSkillId('basic'), requiredLevel: 5 },
        ],
      });

      expect(withPrereq.hasPrerequisites()).toBe(true);
    });

    it('should check prerequisites satisfaction', () => {
      const def = new SkillDefinition({
        id: createSkillId('advanced'),
        name: 'Advanced',
        description: '',
        category: SkillCategory.COMBAT,
        prerequisites: [
          { skillId: createSkillId('basic'), requiredLevel: 5 },
          { skillId: createSkillId('intermediate'), requiredLevel: 3 },
        ],
      });

      // Not satisfied
      const notMet = new Map([
        [createSkillId('basic'), 3],
        [createSkillId('intermediate'), 5],
      ]);
      expect(def.checkPrerequisites(notMet)).toBe(false);

      // Partially satisfied
      const partial = new Map([
        [createSkillId('basic'), 5],
        [createSkillId('intermediate'), 2],
      ]);
      expect(def.checkPrerequisites(partial)).toBe(false);

      // Fully satisfied
      const met = new Map([
        [createSkillId('basic'), 5],
        [createSkillId('intermediate'), 3],
      ]);
      expect(def.checkPrerequisites(met)).toBe(true);

      // Exceeds requirements
      const exceeded = new Map([
        [createSkillId('basic'), 10],
        [createSkillId('intermediate'), 8],
      ]);
      expect(def.checkPrerequisites(exceeded)).toBe(true);
    });
  });

  describe('experience calculation', () => {
    it('should calculate experience needed for level', () => {
      const normal = SkillDefinition.combat('normal' as any, 'Normal');
      expect(normal.getExperienceForLevel(0)).toBe(100);
      expect(normal.getExperienceForLevel(5)).toBe(100);
      expect(normal.getExperienceForLevel(10)).toBe(100);

      const hard = SkillDefinition.combat('hard' as any, 'Hard', '', 2.0);
      expect(hard.getExperienceForLevel(0)).toBe(200);
      expect(hard.getExperienceForLevel(5)).toBe(200);

      const easy = SkillDefinition.combat('easy' as any, 'Easy', '', 0.5);
      expect(easy.getExperienceForLevel(0)).toBe(50);
    });

    it('should calculate experience multiplier', () => {
      const normal = SkillDefinition.combat('normal' as any, 'Normal');

      // Level 0: full multiplier
      expect(normal.getExperienceMultiplier(0)).toBe(1.0);

      // Level 5: 50% multiplier
      expect(normal.getExperienceMultiplier(5)).toBeCloseTo(0.5, 1);

      // Level 8+: minimum 20% multiplier
      expect(normal.getExperienceMultiplier(8)).toBeCloseTo(0.2, 1);
      expect(normal.getExperienceMultiplier(10)).toBeCloseTo(0.2, 1);
    });

    it('should apply difficulty multiplier to experience multiplier', () => {
      const hard = SkillDefinition.combat('hard' as any, 'Hard', '', 2.0);

      // Hard skills gain less experience per practice
      expect(hard.getExperienceMultiplier(0)).toBe(0.5);
      expect(hard.getExperienceMultiplier(5)).toBeCloseTo(0.25, 2);

      const easy = SkillDefinition.combat('easy' as any, 'Easy', '', 0.5);

      // Easy skills gain more experience per practice
      expect(easy.getExperienceMultiplier(0)).toBe(2.0);
    });
  });

  describe('display methods', () => {
    it('should get display name', () => {
      const visible = SkillDefinition.combat('melee' as any, '近战');
      expect(visible.getDisplayName()).toBe('近战');

      const hidden = new SkillDefinition({
        id: createSkillId('hidden'),
        name: 'Hidden Skill',
        description: '',
        category: SkillCategory.COMBAT,
        isHidden: true,
      });
      expect(hidden.getDisplayName()).toBe('??? (未知技能)');
    });

    it('should get display description', () => {
      const visible = SkillDefinition.combat('melee' as any, '近战', '近战格斗');
      expect(visible.getDisplayDescription()).toBe('近战格斗');

      const hidden = new SkillDefinition({
        id: createSkillId('hidden'),
        name: 'Hidden Skill',
        description: 'Secret',
        category: SkillCategory.COMBAT,
        isHidden: true,
      });
      expect(hidden.getDisplayDescription()).toBe('这是一个隐藏技能，需要特定条件才能解锁。');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = SkillDefinition.crafting(
        'electronics' as any,
        '电子',
        '电子设备制作',
        1.3,
        ['soldering_iron']
      );

      const json = original.toJson();
      expect(json.id).toBe('electronics');
      expect(json.name).toBe('电子');
      expect(json.category).toBe(SkillCategory.CRAFTING);
      expect(json.difficulty_multiplier).toBe(1.3);
      expect(json.related_items).toEqual(['soldering_iron']);

      const restored = SkillDefinition.fromJson(json);
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.description).toBe(original.description);
      expect(restored.category).toBe(original.category);
      expect(restored.difficultyMultiplier).toBe(original.difficultyMultiplier);
    });
  });

  describe('predefined skills', () => {
    it('should have all combat skills', () => {
      expect(SkillDefinitions.MELEE).toBeDefined();
      expect(SkillDefinitions.BASHING).toBeDefined();
      expect(SkillDefinitions.CUTTING).toBeDefined();
      expect(SkillDefinitions.STABBING).toBeDefined();
      expect(SkillDefinitions.UNARMED).toBeDefined();
    });

    it('should have all ranged skills', () => {
      expect(SkillDefinitions.MARKSMANSHIP).toBeDefined();
      expect(SkillDefinitions.ARCHERY).toBeDefined();
      expect(SkillDefinitions.THROW).toBeDefined();
    });

    it('should have all survival skills', () => {
      expect(SkillDefinitions.SURVIVAL).toBeDefined();
      expect(SkillDefinitions.TRAPS).toBeDefined();
      expect(SkillDefinitions.DODGE).toBeDefined();
      expect(SkillDefinitions.FIRST_AID).toBeDefined();
    });

    it('should have all crafting skills', () => {
      expect(SkillDefinitions.COOKING).toBeDefined();
      expect(SkillDefinitions.TAILOR).toBeDefined();
      expect(SkillDefinitions.ELECTRONICS).toBeDefined();
      expect(SkillDefinitions.MECHANICS).toBeDefined();
      expect(SkillDefinitions.CONSTRUCTION).toBeDefined();
    });

    it('should have social skills', () => {
      expect(SkillDefinitions.SPEECH).toBeDefined();
      expect(SkillDefinitions.BARTER).toBeDefined();
    });

    it('should have academic skills', () => {
      expect(SkillDefinitions.COMPUTER).toBeDefined();
    });

    it('should have correct categories', () => {
      expect(SkillDefinitions.MELEE.isCombatSkill()).toBe(true);
      expect(SkillDefinitions.COOKING.isCraftingSkill()).toBe(true);
      expect(SkillDefinitions.SURVIVAL.isSurvivalSkill()).toBe(true);
    });

    it('should have related item types for crafting skills', () => {
      expect(SkillDefinitions.COOKING.relatedItemTypes.has('food')).toBe(true);
      expect(SkillDefinitions.COOKING.relatedItemTypes.has('hotplate')).toBe(true);
      expect(SkillDefinitions.TAILOR.relatedItemTypes.has('needle')).toBe(true);
      expect(SkillDefinitions.TAILOR.relatedItemTypes.has('thread')).toBe(true);
    });

    it('should have correct difficulty multipliers', () => {
      expect(SkillDefinitions.UNARMED.difficultyMultiplier).toBe(1.2);
      expect(SkillDefinitions.ARCHERY.difficultyMultiplier).toBe(1.1);
      expect(SkillDefinitions.TRAPS.difficultyMultiplier).toBe(1.1);
      expect(SkillDefinitions.FIRST_AID.difficultyMultiplier).toBe(1.2);
      expect(SkillDefinitions.ELECTRONICS.difficultyMultiplier).toBe(1.3);
      expect(SkillDefinitions.MECHANICS.difficultyMultiplier).toBe(1.2);
      expect(SkillDefinitions.COMPUTER.difficultyMultiplier).toBe(1.1);
    });
  });
});
