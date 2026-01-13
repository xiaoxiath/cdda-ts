/**
 * Skill 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Skill } from '../Skill';
import { SkillDefinition } from '../SkillDefinition';
import { createSkillId, SkillCategory } from '../types';

describe('Skill', () => {
  let mockDefinition: SkillDefinition;
  let fixedTime: number;

  beforeEach(() => {
    fixedTime = 1000000;
    vi.useFakeTimers().setSystemTime(fixedTime);

    mockDefinition = SkillDefinition.combat(
      createSkillId('test_skill'),
      'Test Skill',
      'A test skill for testing',
      1.0
    );
  });

  describe('create', () => {
    it('should create new skill at level 0', () => {
      const skill = Skill.create(mockDefinition);

      expect(skill.definition).toBe(mockDefinition);
      expect(skill.level).toBe(0);
      expect(skill.experience).toBe(0);
      expect(skill.isUnlocked).toBe(true);
      expect(skill.practice.practiceCount).toBe(0);
    });

    it('should create locked skill', () => {
      const skill = Skill.locked(mockDefinition);

      expect(skill.isUnlocked).toBe(false);
      expect(skill.level).toBe(0);
      expect(skill.experience).toBe(0);
    });

    it('should create skill from level', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);

      expect(skill.level).toBe(5);
      expect(skill.experience).toBe(0);
      expect(skill.isUnlocked).toBe(true);
    });
  });

  describe('level and experience', () => {
    it('should get experience needed to level up', () => {
      const skill = Skill.create(mockDefinition);

      // At level 0, need 100 exp to level up
      expect(skill.getExperienceToLevelUp()).toBe(100);

      // With 50 exp, need 50 more
      const withExp = skill.addExperience(50);
      expect(withExp.getExperienceToLevelUp()).toBe(50);

      // With 100+ exp, need 0 more
      const ready = skill.addExperience(100);
      expect(ready.getExperienceToLevelUp()).toBe(0);
    });

    it('should check if can level up', () => {
      const skill = Skill.create(mockDefinition);

      expect(skill.canLevelUp()).toBe(false);

      const withExp = skill.addExperience(50);
      expect(withExp.canLevelUp()).toBe(false);

      const ready = skill.addExperience(100);
      expect(ready.canLevelUp()).toBe(true);
    });

    it('should practice skill and gain experience', () => {
      const skill = Skill.create(mockDefinition);

      // Practice with 10 base exp
      const practiced = skill.practiceSkill(10, fixedTime);

      expect(practiced.experience).toBe(10);
      expect(practiced.practice.practiceCount).toBe(1);
      expect(practiced.practice.lastPracticed).toBe(fixedTime);
    });

    it('should not practice when locked', () => {
      const skill = Skill.locked(mockDefinition);

      const practiced = skill.practiceSkill(10, fixedTime);

      expect(practiced.experience).toBe(0);
      expect(practiced.practice.practiceCount).toBe(0);
    });

    it('should apply difficulty multiplier to practice', () => {
      const hardDef = SkillDefinition.combat(
        createSkillId('hard'),
        'Hard',
        '',
        2.0
      );
      const hardSkill = Skill.create(hardDef);

      // Base 10 exp * 0.5 (hard multiplier) = 5
      const practiced = hardSkill.practiceSkill(10, fixedTime);
      expect(practiced.experience).toBe(5);

      const easyDef = SkillDefinition.combat(
        createSkillId('easy'),
        'Easy',
        '',
        0.5
      );
      const easySkill = Skill.create(easyDef);

      // Base 10 exp * 2.0 (easy multiplier) = 20
      const practicedEasy = easySkill.practiceSkill(10, fixedTime);
      expect(practicedEasy.experience).toBe(20);
    });

    it('should apply level penalty to practice', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);

      // At level 5, multiplier is about 0.5
      const practiced = skill.practiceSkill(10, fixedTime);
      expect(practiced.experience).toBeGreaterThan(3);
      expect(practiced.experience).toBeLessThan(7);
    });
  });

  describe('level up', () => {
    it('should try level up', () => {
      const skill = Skill.create(mockDefinition);

      // Not enough exp
      const result1 = skill.tryLevelUp();
      expect(result1.leveledUp).toBe(false);
      expect(result1.newLevel).toBe(0);

      // Enough exp
      const ready = skill.addExperience(100);
      const result2 = ready.tryLevelUp();
      expect(result2.leveledUp).toBe(true);
      expect(result2.newLevel).toBe(1);
      expect(result2.remainingExperience).toBe(0);
    });

    it('should level up to target level', () => {
      const skill = Skill.create(mockDefinition).addExperience(200);

      const leveled = skill.levelUpTo(2, 0);

      expect(leveled.level).toBe(2);
      expect(leveled.experience).toBe(0);
    });

    it('should auto level up multiple times', () => {
      const skill = Skill.create(mockDefinition).addExperience(250);

      const { skill: newSkill, result } = skill.autoLevelUp();

      // Should level up twice (250 exp = 2 levels + 50 remaining)
      expect(newSkill.level).toBe(2);
      expect(newSkill.experience).toBe(50);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    it('should not level up without enough exp', () => {
      const skill = Skill.create(mockDefinition).addExperience(50);

      const { skill: newSkill, result } = skill.autoLevelUp();

      expect(newSkill.level).toBe(0);
      expect(result.leveledUp).toBe(false);
    });
  });

  describe('state queries', () => {
    it('should check mastered level', () => {
      const novice = Skill.fromLevel(mockDefinition, 5);
      expect(novice.isMastered()).toBe(false);

      const master = Skill.fromLevel(mockDefinition, 10);
      expect(master.isMastered()).toBe(true);

      const legendary = Skill.fromLevel(mockDefinition, 15);
      expect(legendary.isMastered()).toBe(true);
    });

    it('should check expert level', () => {
      const proficient = Skill.fromLevel(mockDefinition, 5);
      expect(proficient.isExpert()).toBe(false);

      const expert = Skill.fromLevel(mockDefinition, 7);
      expect(expert.isExpert()).toBe(true);
    });

    it('should check proficient level', () => {
      const basic = Skill.fromLevel(mockDefinition, 3);
      expect(basic.isProficient()).toBe(false);

      const proficient = Skill.fromLevel(mockDefinition, 4);
      expect(proficient.isProficient()).toBe(true);
    });

    it('should check novice level', () => {
      const newbie = Skill.fromLevel(mockDefinition, 2);
      expect(newbie.isNovice()).toBe(true);

      const experienced = Skill.fromLevel(mockDefinition, 3);
      expect(experienced.isNovice()).toBe(false);
    });

    it('should get level description', () => {
      expect(Skill.fromLevel(mockDefinition, 0).getLevelDescription()).toBe('无经验');
      expect(Skill.fromLevel(mockDefinition, 1).getLevelDescription()).toBe('新手');
      expect(Skill.fromLevel(mockDefinition, 2).getLevelDescription()).toBe('基本');
      expect(Skill.fromLevel(mockDefinition, 3).getLevelDescription()).toBe('熟练');
      expect(Skill.fromLevel(mockDefinition, 4).getLevelDescription()).toBe('专业');
      expect(Skill.fromLevel(mockDefinition, 5).getLevelDescription()).toBe('专家');
      expect(Skill.fromLevel(mockDefinition, 6).getLevelDescription()).toBe('大师');
      expect(Skill.fromLevel(mockDefinition, 7).getLevelDescription()).toBe('宗师');
      expect(Skill.fromLevel(mockDefinition, 8).getLevelDescription()).toBe('传奇');
      expect(Skill.fromLevel(mockDefinition, 9).getLevelDescription()).toBe('神话');
    });

    it('should get progress percent', () => {
      const skill = Skill.create(mockDefinition);

      expect(skill.getProgressPercent()).toBe(0);

      const halfWay = skill.addExperience(50);
      expect(halfWay.getProgressPercent()).toBe(50);

      const ready = skill.addExperience(100);
      expect(ready.getProgressPercent()).toBe(100);
    });
  });

  describe('modification', () => {
    it('should unlock skill', () => {
      const skill = Skill.locked(mockDefinition);

      expect(skill.isUnlocked).toBe(false);

      const unlocked = skill.unlock();
      expect(unlocked.isUnlocked).toBe(true);

      // Unlocking again returns same
      const again = unlocked.unlock();
      expect(again === unlocked).toBe(true);
    });

    it('should set level', () => {
      const skill = Skill.create(mockDefinition);

      const leveled = skill.setLevel(5);
      expect(leveled.level).toBe(5);
      expect(leveled.experience).toBe(0);
    });

    it('should set experience', () => {
      const skill = Skill.create(mockDefinition);

      const withExp = skill.setExperience(75);
      expect(withExp.experience).toBe(75);
    });

    it('should add experience', () => {
      const skill = Skill.create(mockDefinition);

      const withExp = skill.addExperience(50);
      expect(withExp.experience).toBe(50);

      const moreExp = withExp.addExperience(30);
      expect(moreExp.experience).toBe(80);
    });
  });

  describe('decay', () => {
    it('should not decay immediately', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);

      const decayed = skill.processDecay(fixedTime, 30);

      expect(decayed.level).toBe(5);
      expect(decayed.practice.isDecaying).toBe(false);
    });

    it('should not decay within threshold', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);

      // 29 days later
      const later = fixedTime + 29 * 24 * 60 * 60 * 1000;
      const decayed = skill.processDecay(later, 30);

      expect(decayed.level).toBe(5);
      expect(decayed.practice.isDecaying).toBe(false);
    });

    it('should decay after threshold', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);

      // 80 days later - should have some rust
      const later = fixedTime + 80 * 24 * 60 * 60 * 1000;

      const decayed = skill.processDecay(later, 30);

      // With rust rate of 1.0, 80 days should add some rust level
      expect(decayed.rust.isRusted).toBe(true);
      expect(decayed.rust.rustLevel).toBeGreaterThan(0);
      expect(decayed.getEffectiveLevel()).toBeLessThan(5);
    });

    it('should not decay level 0 skills', () => {
      const skill = Skill.create(mockDefinition);

      const later = fixedTime + 100 * 24 * 60 * 60 * 1000;
      const decayed = skill.processDecay(later, 30);

      expect(decayed.level).toBe(0);
    });

    it('should not decay locked skills', () => {
      const skill = Skill.locked(mockDefinition);

      const later = fixedTime + 100 * 24 * 60 * 60 * 1000;
      const decayed = skill.processDecay(later, 30);

      expect(decayed.level).toBe(0);
    });
  });

  describe('display', () => {
    it('should get display name', () => {
      const skill = Skill.fromLevel(mockDefinition, 5);
      expect(skill.getDisplayName()).toBe('Test Skill (专家 5)');

      const locked = Skill.locked(mockDefinition);
      expect(locked.getDisplayName()).toBe('??? (未解锁)');
    });

    it('should get display info', () => {
      const skill = Skill.fromLevel(mockDefinition, 5).addExperience(50);

      const info = skill.getDisplayInfo();
      expect(info).toContain('Test Skill');
      expect(info).toContain('Lv.5');
      expect(info).toContain('专家');
      expect(info).toContain('50%');
    });

    it('should show locked message', () => {
      const locked = Skill.locked(mockDefinition);

      expect(locked.getDisplayInfo()).toBe('??? (需要解锁此技能)');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const skill = Skill.fromLevel(mockDefinition, 5)
        .addExperience(50)
        .practiceSkill(10, fixedTime);

      const json = skill.toJson();

      expect(json.id).toBe(createSkillId('test_skill'));
      expect(json.level).toBe(5);
      // At level 5, experience multiplier is about 0.5, so 10 base exp becomes 5
      expect(json.experience).toBe(55); // 50 + 5 from practice
      expect(json.isUnlocked).toBe(true);
      expect(json.practice.practiceCount).toBe(1);
    });

    it('should create from JSON', () => {
      const json = {
        id: createSkillId('test_skill'),
        level: 3,
        experience: 75,
        isUnlocked: true,
        practice: {
          practiceCount: 5,
          lastPracticed: fixedTime,
          isDecaying: false,
        },
      };

      const skill = Skill.fromJson(json, mockDefinition);

      expect(skill.level).toBe(3);
      expect(skill.experience).toBe(75);
      expect(skill.isUnlocked).toBe(true);
      expect(skill.practice.practiceCount).toBe(5);
    });

    it('should handle missing fields in JSON', () => {
      const json = {
        id: createSkillId('test_skill'),
        level: 2,
      };

      const skill = Skill.fromJson(json, mockDefinition);

      expect(skill.level).toBe(2);
      expect(skill.experience).toBe(0);
      expect(skill.isUnlocked).toBe(true);
      expect(skill.practice.practiceCount).toBe(0);
    });
  });
});
