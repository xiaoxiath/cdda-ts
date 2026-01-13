/**
 * BookManager 单元测试
 */

import { describe, it, expect } from 'vitest';
import { BookManager } from '../BookManager';
import { Skill } from '../Skill';
import { SkillDefinition } from '../SkillDefinition';
import { createSkillId, BookType } from '../types';

describe('BookManager', () => {
  let mockSkill: Skill;
  let mockDefinition: SkillDefinition;
  const meleeSkillId = createSkillId('melee');

  beforeEach(() => {
    mockDefinition = SkillDefinition.combat(
      meleeSkillId,
      '近战',
      '近战格斗技能',
      1.0
    );
    mockSkill = Skill.create(mockDefinition);
  });

  describe('checkReadingConditions', () => {
    it('should allow reading when conditions are met', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const result = BookManager.checkReadingConditions(book, 2);

      expect(result.canRead).toBe(true);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.experienceMultiplier).toBeGreaterThan(1.0);
    });

    it('should deny reading when level too low', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 3,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const result = BookManager.checkReadingConditions(book, 1);

      expect(result.canRead).toBe(false);
      expect(result.error).toContain('技能等级不足');
    });

    it('should deny reading when level too high', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 3,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const result = BookManager.checkReadingConditions(book, 5);

      expect(result.canRead).toBe(false);
      expect(result.error).toContain('已达到书籍能训练的最高等级');
    });

    it('should deny reading when intelligence too low', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.TEXTBOOK,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
        intRequired: 10,
      };

      const result = BookManager.checkReadingConditions(book, 2, 8);

      expect(result.canRead).toBe(false);
      expect(result.error).toContain('智力不足');
    });

    it('should adjust reading time based on skill level', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 10,
        baseReadingTime: 60000,
        theoryExperience: 100,
      };

      const result1 = BookManager.checkReadingConditions(book, 1);
      const result5 = BookManager.checkReadingConditions(book, 5);

      // 更高等级应该阅读更快
      expect(result5.readingTime).toBeLessThan(result1.readingTime);
    });

    it('should adjust reading time based on intelligence', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 60000,
        theoryExperience: 100,
      };

      const resultLow = BookManager.checkReadingConditions(book, 2, 6);
      const resultHigh = BookManager.checkReadingConditions(book, 2, 10);

      // 更高智力应该阅读更快
      expect(resultHigh.readingTime).toBeLessThan(resultLow.readingTime);
    });

    it('should apply experience multiplier based on level', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 10,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const result1 = BookManager.checkReadingConditions(book, 1);
      const result5 = BookManager.checkReadingConditions(book, 5);

      // 更高等级应该有更高经验倍率
      expect(result5.experienceMultiplier).toBeGreaterThan(result1.experienceMultiplier);
    });
  });

  describe('calculateBookExperience', () => {
    it('should calculate base experience correctly', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const checkResult = BookManager.checkReadingConditions(book, 2);
      const exp = BookManager.calculateBookExperience(book, 2, checkResult);

      expect(exp).toBeGreaterThan(0);
      expect(exp).toBeLessThanOrEqual(book.theoryExperience * 1.5);
    });

    it('should reduce experience at higher levels', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 10,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const checkResult1 = BookManager.checkReadingConditions(book, 1);
      const checkResult5 = BookManager.checkReadingConditions(book, 5);

      const exp1 = BookManager.calculateBookExperience(book, 1, checkResult1);
      const exp5 = BookManager.calculateBookExperience(book, 5, checkResult5);

      // 更高等级应该获得更少经验
      expect(exp5).toBeLessThan(exp1);
    });

    it('should apply experience multiplier', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 10,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const checkResult = BookManager.checkReadingConditions(book, 3);
      const expWithoutMult = Math.floor(book.theoryExperience * 0.85); // 粗略计算
      const expWithMult = BookManager.calculateBookExperience(book, 3, checkResult);

      // 应该应用了经验倍率
      expect(expWithMult).toBeGreaterThanOrEqual(expWithoutMult);
    });
  });

  describe('readBook', () => {
    it('should successfully read book when conditions met', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const skill = Skill.fromLevel(mockDefinition, 2);
      const result = BookManager.readBook(book, skill);

      expect(result.success).toBe(true);
      expect(result.theoryExperienceGained).toBeGreaterThan(0);
      expect(result.actualReadingTime).toBeGreaterThan(0);
      expect(result.message).toContain('阅读了');
    });

    it('should fail to read book when level too low', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 5,
        maxLevel: 10,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const skill = Skill.fromLevel(mockDefinition, 2);
      const result = BookManager.readBook(book, skill);

      expect(result.success).toBe(false);
      expect(result.theoryExperienceGained).toBe(0);
      expect(result.error).toContain('技能等级不足');
    });

    it('should apply theory experience to skill', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const skill = Skill.fromLevel(mockDefinition, 2);
      const result = BookManager.readBook(book, skill);

      expect(result.success).toBe(true);
      // 理论经验应该被应用到技能（虽然我们没有返回更新后的技能）
      expect(result.theoryExperienceGained).toBeGreaterThan(0);
    });

    it('should fail when intelligence too low', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.TEXTBOOK,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
        intRequired: 12,
      };

      const skill = Skill.fromLevel(mockDefinition, 2);
      const result = BookManager.readBook(book, skill, 8);

      expect(result.success).toBe(false);
      expect(result.error).toContain('智力不足');
    });
  });

  describe('getReadingProgress', () => {
    it('should return 0 when below required level', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 3,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const progress = BookManager.getReadingProgress(book, 1);

      expect(progress).toBe(0);
    });

    it('should return 100 when at or above max level', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const progress = BookManager.getReadingProgress(book, 6);

      expect(progress).toBe(100);
    });

    it('should calculate progress correctly', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 2,
        maxLevel: 6,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const progress1 = BookManager.getReadingProgress(book, 2);
      const progress2 = BookManager.getReadingProgress(book, 4);
      const progress3 = BookManager.getReadingProgress(book, 6);

      expect(progress1).toBe(0);
      expect(progress2).toBe(50); // (4-2)/(6-2) = 0.5
      expect(progress3).toBe(100);
    });
  });

  describe('getBookDescription', () => {
    it('should return full description', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.TEXTBOOK,
        skillId: meleeSkillId,
        requiredLevel: 2,
        maxLevel: 6,
        baseReadingTime: 30000,
        theoryExperience: 100,
        fun: 1,
        intRequired: 8,
        description: '这是一本测试书籍',
      };

      const desc = BookManager.getBookDescription(book, 3);

      expect(desc).toContain('测试书籍');
      expect(desc).toContain('textbook');
      expect(desc).toContain('要求等级: 2');
      expect(desc).toContain('最高等级: 6');
      expect(desc).toContain('理论经验: 100');
      expect(desc).toContain('娱乐值: 1');
      expect(desc).toContain('智力要求: 8');
      expect(desc).toContain('学习进度');
      expect(desc).toContain('这是一本测试书籍');
    });

    it('should handle books without optional fields', () => {
      const book = {
        id: 'test_book',
        name: '测试书籍',
        bookType: BookType.MANUAL,
        skillId: meleeSkillId,
        requiredLevel: 0,
        maxLevel: 5,
        baseReadingTime: 30000,
        theoryExperience: 100,
      };

      const desc = BookManager.getBookDescription(book, 2);

      expect(desc).toContain('测试书籍');
      expect(desc).toContain('要求等级: 0');
      expect(desc).toContain('最高等级: 5');
      // 不应该包含娱乐值和智力要求
      expect(desc).not.toContain('娱乐值:');
      expect(desc).not.toContain('智力要求:');
    });
  });

  describe('createManual', () => {
    it('should create manual book', () => {
      const book = BookManager.createManual(
        'test_manual',
        '测试手册',
        meleeSkillId,
        0,
        5,
        100
      );

      expect(book.id).toBe('test_manual');
      expect(book.name).toBe('测试手册');
      expect(book.bookType).toBe(BookType.MANUAL);
      expect(book.skillId).toBe(meleeSkillId);
      expect(book.requiredLevel).toBe(0);
      expect(book.maxLevel).toBe(5);
      expect(book.theoryExperience).toBe(100);
      expect(book.baseReadingTime).toBe(30000);
      expect(book.fun).toBe(1);
    });

    it('should use custom reading time', () => {
      const book = BookManager.createManual(
        'test_manual',
        '测试手册',
        meleeSkillId,
        0,
        5,
        100,
        60000
      );

      expect(book.baseReadingTime).toBe(60000);
    });
  });

  describe('createTextbook', () => {
    it('should create textbook book', () => {
      const book = BookManager.createTextbook(
        'test_textbook',
        '测试教科书',
        meleeSkillId,
        2,
        6,
        150,
        10
      );

      expect(book.id).toBe('test_textbook');
      expect(book.name).toBe('测试教科书');
      expect(book.bookType).toBe(BookType.TEXTBOOK);
      expect(book.skillId).toBe(meleeSkillId);
      expect(book.requiredLevel).toBe(2);
      expect(book.maxLevel).toBe(6);
      expect(book.theoryExperience).toBe(150);
      expect(book.intRequired).toBe(10);
      expect(book.fun).toBe(-1);
    });

    it('should use default intelligence requirement', () => {
      const book = BookManager.createTextbook(
        'test_textbook',
        '测试教科书',
        meleeSkillId,
        2,
        6,
        150
      );

      expect(book.intRequired).toBe(8);
    });
  });

  describe('createReference', () => {
    it('should create reference book', () => {
      const book = BookManager.createReference(
        'test_ref',
        '测试参考书',
        meleeSkillId,
        10,
        50
      );

      expect(book.id).toBe('test_ref');
      expect(book.name).toBe('测试参考书');
      expect(book.bookType).toBe(BookType.REFERENCE);
      expect(book.skillId).toBe(meleeSkillId);
      expect(book.requiredLevel).toBe(0);
      expect(book.maxLevel).toBe(10);
      expect(book.theoryExperience).toBe(50);
      expect(book.baseReadingTime).toBe(15000);
      expect(book.fun).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('should handle complete reading workflow', () => {
      // 1. 创建书籍
      const book = BookManager.createManual(
        'melee_guide',
        '近战指南',
        meleeSkillId,
        0,
        5,
        100
      );

      // 2. 创建技能
      const skill = Skill.fromLevel(mockDefinition, 2);

      // 3. 检查阅读条件
      const checkResult = BookManager.checkReadingConditions(book, 2);
      expect(checkResult.canRead).toBe(true);

      // 4. 获取进度
      const progress = BookManager.getReadingProgress(book, 2);
      expect(progress).toBe(40); // (2-0)/(5-0) = 0.4

      // 5. 阅读书籍
      const readResult = BookManager.readBook(book, skill);
      expect(readResult.success).toBe(true);
      expect(readResult.theoryExperienceGained).toBeGreaterThan(0);

      // 6. 获取书籍描述
      const desc = BookManager.getBookDescription(book, 2);
      expect(desc).toContain('近战指南');
    });

    it('should handle progression through multiple books', () => {
      const book1 = BookManager.createManual('book1', '初级', meleeSkillId, 0, 3, 100);
      const book2 = BookManager.createManual('book2', '中级', meleeSkillId, 2, 5, 150);
      const book3 = BookManager.createManual('book3', '高级', meleeSkillId, 4, 7, 200);

      let skill = Skill.create(mockDefinition);

      // 读取初级书
      let result = BookManager.readBook(book1, skill);
      expect(result.success).toBe(true);

      // 升级到等级 2
      skill = skill.setLevel(2);

      // 现在可以读中级书
      result = BookManager.readBook(book2, skill);
      expect(result.success).toBe(true);

      // 升级到等级 4
      skill = skill.setLevel(4);

      // 现在可以读高级书
      result = BookManager.readBook(book3, skill);
      expect(result.success).toBe(true);
    });
  });
});
